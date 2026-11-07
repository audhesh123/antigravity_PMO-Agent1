const cron = require('node-cron');
const storage = require('./storage');

class ReminderService {
  constructor() {
    this.cronTasks = [];
    this.activeInAppAlerts = [];
    this.sentDedupKeys = new Set();
    this.init();
  }

  init() {
    this.setupSchedules();
  }

  setupSchedules() {
    // Clear existing cron jobs
    this.cronTasks.forEach(task => task.stop());
    this.cronTasks = [];

    const config = storage.getRemindersConfig();
    const tz = config.timezone || 'America/New_York';

    // Daily Reminder: 4:00 PM (16:00)
    if (config.daily?.enabled) {
      const [hour, minute] = (config.daily.time || '16:00').split(':');
      const dailyExpr = `${minute || 0} ${hour || 16} * * *`;

      if (cron.validate(dailyExpr)) {
        try {
          const task = cron.schedule(dailyExpr, () => {
            this.triggerDailyReminder('scheduled');
          }, {
            timezone: tz
          });
          this.cronTasks.push(task);
          console.log(`[ReminderService] Daily DSR reminder scheduled for ${config.daily.time} in ${tz}`);
        } catch (e) {
          console.warn(`[ReminderService] Could not set cron for timezone ${tz}:`, e.message);
        }
      }
    }

    // Weekly Reminder: Friday 3:00 PM (15:00)
    if (config.weekly?.enabled) {
      const [hour, minute] = (config.weekly.time || '15:00').split(':');
      // 5 = Friday
      const weeklyExpr = `${minute || 0} ${hour || 15} * * 5`;

      if (cron.validate(weeklyExpr)) {
        try {
          const task = cron.schedule(weeklyExpr, () => {
            this.triggerWeeklyReminder('scheduled');
          }, {
            timezone: tz
          });
          this.cronTasks.push(task);
          console.log(`[ReminderService] Weekly WSR reminder scheduled for Friday ${config.weekly.time} in ${tz}`);
        } catch (e) {
          console.warn(`[ReminderService] Could not set cron for timezone ${tz}:`, e.message);
        }
      }
    }
  }

  getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  getWeekKey() {
    const d = new Date();
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${week}`;
  }

  triggerDailyReminder(source = 'manual') {
    const config = storage.getRemindersConfig();
    const dedupKey = `DSR_${this.getTodayKey()}`;

    // If scheduled and already sent today, skip duplicate
    if (source === 'scheduled' && this.sentDedupKeys.has(dedupKey)) {
      console.log(`[ReminderService] Deduplication: DSR reminder already delivered for today (${dedupKey}). Skipping.`);
      return { skipped: true, reason: 'Duplicate prevention: already delivered today' };
    }

    this.sentDedupKeys.add(dedupKey);

    const channels = [];
    if (config.inAppNotifications) channels.push('In-App Notification');
    if (config.emailNotifications) channels.push(`Email (${config.notificationEmail})`);

    const message = config.daily?.message || "Reminder: Please submit your Daily Status Report (DSR) with today's accomplishments, ongoing activities, blockers, and next steps.";

    const logEntry = storage.logReminderEvent({
      type: 'DSR',
      channel: channels.join(' + ') || 'In-App Notification',
      recipient: config.notificationEmail || 'All Team Contributors',
      message: message,
      status: 'Delivered',
      dedupKey: dedupKey,
      meta: {
        source,
        scheduledTime: config.daily?.time || '16:00',
        timezone: config.timezone
      }
    });

    const alertItem = {
      id: logEntry.id,
      type: 'DSR',
      title: 'Daily Status Report Reminder',
      message: message,
      timestamp: new Date().toISOString(),
      actionUrl: '/#generator?type=dsr'
    };

    this.activeInAppAlerts.unshift(alertItem);
    // Keep max 10 active alerts
    if (this.activeInAppAlerts.length > 10) this.activeInAppAlerts.length = 10;

    console.log(`[ReminderService] Triggered DSR Reminder (${source}) -> ${channels.join(', ')}`);
    return { success: true, logEntry, alertItem };
  }

  triggerWeeklyReminder(source = 'manual') {
    const config = storage.getRemindersConfig();
    const dedupKey = `WSR_${this.getWeekKey()}`;

    if (source === 'scheduled' && this.sentDedupKeys.has(dedupKey)) {
      console.log(`[ReminderService] Deduplication: WSR reminder already delivered for this week (${dedupKey}). Skipping.`);
      return { skipped: true, reason: 'Duplicate prevention: already delivered this week' };
    }

    this.sentDedupKeys.add(dedupKey);

    const channels = [];
    if (config.inAppNotifications) channels.push('In-App Notification');
    if (config.emailNotifications) channels.push(`Email (${config.notificationEmail})`);

    const message = config.weekly?.message || "Reminder: Please prepare and submit your Weekly Status Report (WSR) summarizing this week's accomplishments, progress, blockers, risks, and next week's priorities.";

    const logEntry = storage.logReminderEvent({
      type: 'WSR',
      channel: channels.join(' + ') || 'In-App Notification',
      recipient: config.notificationEmail || 'Executive Stakeholders & Team',
      message: message,
      status: 'Delivered',
      dedupKey: dedupKey,
      meta: {
        source,
        scheduledTime: config.weekly?.time || '15:00',
        timezone: config.timezone
      }
    });

    const alertItem = {
      id: logEntry.id,
      type: 'WSR',
      title: 'Weekly Status Report Reminder',
      message: message,
      timestamp: new Date().toISOString(),
      actionUrl: '/#generator?type=wsr'
    };

    this.activeInAppAlerts.unshift(alertItem);
    if (this.activeInAppAlerts.length > 10) this.activeInAppAlerts.length = 10;

    console.log(`[ReminderService] Triggered WSR Reminder (${source}) -> ${channels.join(', ')}`);
    return { success: true, logEntry, alertItem };
  }

  getPendingAlerts() {
    return this.activeInAppAlerts;
  }

  dismissAlert(id) {
    this.activeInAppAlerts = this.activeInAppAlerts.filter(a => a.id !== id);
    storage.updateReminderStatus(id, 'Acknowledged');
    return true;
  }

  acknowledgeWithSubmission(reportType, reportId) {
    // Find the latest reminder of this type and mark it as submitted
    const history = storage.getReminderHistory();
    const target = history.find(item => item.type === reportType && (item.status === 'Delivered' || item.status === 'Acknowledged'));
    if (target) {
      storage.updateReminderStatus(target.id, 'Report Submitted', `Report ID: ${reportId}`);
    }
  }

  calculateNextOccurrences() {
    const config = storage.getRemindersConfig();
    const now = new Date();

    // Daily next
    const [dHour, dMin] = (config.daily?.time || '16:00').split(':').map(Number);
    const dailyTarget = new Date(now);
    dailyTarget.setHours(dHour, dMin, 0, 0);
    if (dailyTarget <= now) {
      dailyTarget.setDate(dailyTarget.getDate() + 1);
    }

    // Weekly Friday next
    const [wHour, wMin] = (config.weekly?.time || '15:00').split(':').map(Number);
    const weeklyTarget = new Date(now);
    weeklyTarget.setHours(wHour, wMin, 0, 0);
    const currentDay = weeklyTarget.getDay(); // 0 is Sun, 5 is Fri
    let daysUntilFriday = (5 - currentDay + 7) % 7;
    if (daysUntilFriday === 0 && weeklyTarget <= now) {
      daysUntilFriday = 7;
    }
    weeklyTarget.setDate(weeklyTarget.getDate() + daysUntilFriday);

    return {
      daily: {
        enabled: config.daily?.enabled,
        time: config.daily?.time,
        nextRun: dailyTarget.toISOString(),
        formattedNext: dailyTarget.toLocaleString()
      },
      weekly: {
        enabled: config.weekly?.enabled,
        time: config.weekly?.time,
        nextRun: weeklyTarget.toISOString(),
        formattedNext: weeklyTarget.toLocaleString()
      },
      timezone: config.timezone
    };
  }
}

const reminderService = new ReminderService();
module.exports = reminderService;

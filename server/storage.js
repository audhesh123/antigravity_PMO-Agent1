const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
const REMINDERS_FILE = path.join(DATA_DIR, 'reminders.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonFile(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
    return defaultValue;
  }
}

function writeJsonFile(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err.message);
    return false;
  }
}

// Storage helpers
const storage = {
  getReports() {
    return readJsonFile(REPORTS_FILE, []);
  },
  
  getReportById(id) {
    const reports = this.getReports();
    return reports.find(r => r.id === id);
  },
  
  saveReport(report) {
    const reports = this.getReports();
    const existingIndex = reports.findIndex(r => r.id === report.id);
    if (existingIndex >= 0) {
      reports[existingIndex] = { ...reports[existingIndex], ...report, updatedAt: new Date().toISOString() };
    } else {
      reports.unshift({
        ...report,
        id: report.id || `rep_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        createdAt: report.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    writeJsonFile(REPORTS_FILE, reports);
    return report;
  },
  
  deleteReport(id) {
    let reports = this.getReports();
    const beforeCount = reports.length;
    reports = reports.filter(r => r.id !== id);
    writeJsonFile(REPORTS_FILE, reports);
    return reports.length < beforeCount;
  },
  
  getRemindersConfig() {
    const defaultConfig = {
      timezone: 'America/New_York',
      emailNotifications: true,
      inAppNotifications: true,
      notificationEmail: 'team-lead@enterprise.com',
      daily: {
        enabled: true,
        time: '16:00', // 4:00 PM
        frequency: 'Daily',
        message: "Reminder: Please submit your Daily Status Report (DSR) with today's accomplishments, ongoing activities, blockers, and next steps."
      },
      weekly: {
        enabled: true,
        day: 'Friday',
        time: '15:00', // 3:00 PM
        frequency: 'Every Friday',
        message: "Reminder: Please prepare and submit your Weekly Status Report (WSR) summarizing this week's accomplishments, progress, blockers, risks, and next week's priorities."
      }
    };
    return readJsonFile(CONFIG_FILE, defaultConfig);
  },
  
  saveRemindersConfig(config) {
    const current = this.getRemindersConfig();
    const updated = { ...current, ...config, updatedAt: new Date().toISOString() };
    writeJsonFile(CONFIG_FILE, updated);
    return updated;
  },
  
  getReminderHistory() {
    return readJsonFile(REMINDERS_FILE, []);
  },
  
  logReminderEvent(event) {
    const history = this.getReminderHistory();
    const newEntry = {
      id: `rem_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: event.type, // 'DSR' or 'WSR'
      channel: event.channel || 'in-app + email',
      recipient: event.recipient || 'All Project Contributors',
      message: event.message,
      status: event.status || 'Delivered', // 'Delivered', 'Acknowledged', 'Submitted'
      dedupKey: event.dedupKey,
      meta: event.meta || {}
    };
    history.unshift(newEntry);
    // Keep max 500 entries
    if (history.length > 500) history.length = 500;
    writeJsonFile(REMINDERS_FILE, history);
    return newEntry;
  },

  updateReminderStatus(id, status, notes = '') {
    const history = this.getReminderHistory();
    const item = history.find(e => e.id === id);
    if (item) {
      item.status = status;
      item.acknowledgedAt = new Date().toISOString();
      if (notes) item.notes = notes;
      writeJsonFile(REMINDERS_FILE, history);
      return item;
    }
    return null;
  }
};

module.exports = storage;

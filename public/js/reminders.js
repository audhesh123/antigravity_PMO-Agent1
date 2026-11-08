/**
 * Reminders System Controller
 */

const Reminders = {
  config: null,
  history: [],

  init() {
    this.bindEvents();
    this.loadRemindersView();
  },

  bindEvents() {
    // Save configuration button
    document.getElementById('btn-save-reminders-config')?.addEventListener('click', () => {
      this.saveConfig();
    });

    // Test trigger buttons
    document.getElementById('btn-trigger-daily-test')?.addEventListener('click', async () => {
      await this.triggerTest('DSR');
    });

    document.getElementById('btn-trigger-weekly-test')?.addEventListener('click', async () => {
      await this.triggerTest('WSR');
    });

    // Send direct test email button
    document.getElementById('btn-send-test-email')?.addEventListener('click', async () => {
      await this.sendTestEmail();
    });

    // Provider select change
    const providerSelect = document.getElementById('reminder-provider');
    if (providerSelect) {
      providerSelect.addEventListener('change', () => this.updateProviderVisibility());
    }

    // Timezone change
    document.getElementById('reminder-timezone')?.addEventListener('change', () => {
      this.saveConfig();
    });
  },

  updateProviderVisibility() {
    const val = document.getElementById('reminder-provider')?.value || 'smtp';
    const smtpGroup = document.getElementById('group-smtp-pass');
    const formspreeGroup = document.getElementById('group-formspree-id');

    if (smtpGroup) smtpGroup.style.display = val === 'smtp' ? 'block' : 'none';
    if (formspreeGroup) formspreeGroup.style.display = val === 'formspree' ? 'block' : 'none';
  },

  async sendTestEmail() {
    const email = document.getElementById('reminder-email')?.value?.trim() || 'audhesh123@gmail.com';
    App.showLoader(true, `Dispatching test reminder email to ${email}...`);

    try {
      const res = await API.sendEmailTest(email, 'DSR');
      if (res.success) {
        if (res.result?.provider === 'simulated') {
          App.showToast('Email Preview Generated', `Prepared reminder for ${email}. (Set Gmail App Password or Formspree ID to send live).`, 'info');
        } else {
          App.showToast('Email Sent!', `Successfully dispatched DSR reminder to ${email} via ${res.result?.provider || 'mail'}!`);
        }
        await this.loadRemindersView();
      }
    } catch (err) {
      App.showToast('Email Error', err.message, 'error');
    } finally {
      App.showLoader(false);
    }
  },

  async loadRemindersView() {
    try {
      const [cfgRes, histRes] = await Promise.all([
        API.getRemindersConfig(),
        API.getReminderHistory()
      ]);

      if (cfgRes.success) {
        this.config = cfgRes.config;
        this.populateConfigForm(cfgRes.config);
      }

      if (histRes.success) {
        this.history = histRes.history || [];
        this.renderHistoryTable(this.history);
      }
    } catch (err) {
      console.error('Error loading reminders:', err);
    }
  },

  populateConfigForm(cfg) {
    if (!cfg) return;

    // Daily
    const dailyToggle = document.getElementById('toggle-daily-enabled');
    if (dailyToggle) dailyToggle.checked = !!cfg.daily?.enabled;

    const dailyTime = document.getElementById('input-daily-time');
    if (dailyTime) dailyTime.value = cfg.daily?.time || '16:00';

    const dailyMsg = document.getElementById('input-daily-message');
    if (dailyMsg) dailyMsg.value = cfg.daily?.message || '';

    // Weekly
    const weeklyToggle = document.getElementById('toggle-weekly-enabled');
    if (weeklyToggle) weeklyToggle.checked = !!cfg.weekly?.enabled;

    const weeklyTime = document.getElementById('input-weekly-time');
    if (weeklyTime) weeklyTime.value = cfg.weekly?.time || '15:00';

    const weeklyMsg = document.getElementById('input-weekly-message');
    if (weeklyMsg) weeklyMsg.value = cfg.weekly?.message || '';

    // Timezone & Channels
    const tzSelect = document.getElementById('reminder-timezone');
    if (tzSelect && cfg.timezone) tzSelect.value = cfg.timezone;

    const emailInp = document.getElementById('reminder-email');
    if (emailInp) emailInp.value = cfg.notificationEmail || 'audhesh123@gmail.com';

    const provSelect = document.getElementById('reminder-provider');
    if (provSelect && cfg.emailProvider) provSelect.value = cfg.emailProvider;

    const formspreeInp = document.getElementById('input-formspree-id');
    if (formspreeInp) formspreeInp.value = cfg.formspreeFormId || '';

    const passInp = document.getElementById('input-email-pass');
    if (passInp) passInp.value = cfg.emailPass || '';

    const chInApp = document.getElementById('channel-in-app');
    if (chInApp) chInApp.checked = !!cfg.inAppNotifications;

    const chEmail = document.getElementById('channel-email');
    if (chEmail) chEmail.checked = !!cfg.emailNotifications;

    this.updateProviderVisibility();
  },

  async saveConfig() {
    const updated = {
      timezone: document.getElementById('reminder-timezone')?.value || 'America/New_York',
      notificationEmail: document.getElementById('reminder-email')?.value || 'audhesh123@gmail.com',
      emailProvider: document.getElementById('reminder-provider')?.value || 'smtp',
      formspreeFormId: document.getElementById('input-formspree-id')?.value?.trim() || '',
      emailPass: document.getElementById('input-email-pass')?.value?.trim() || '',
      emailUser: document.getElementById('reminder-email')?.value?.trim() || 'audhesh123@gmail.com',
      inAppNotifications: document.getElementById('channel-in-app')?.checked ?? true,
      emailNotifications: document.getElementById('channel-email')?.checked ?? true,
      daily: {
        enabled: document.getElementById('toggle-daily-enabled')?.checked ?? true,
        time: document.getElementById('input-daily-time')?.value || '16:00',
        frequency: 'Daily',
        message: document.getElementById('input-daily-message')?.value || "Reminder: Please submit your Daily Status Report (DSR)."
      },
      weekly: {
        enabled: document.getElementById('toggle-weekly-enabled')?.checked ?? true,
        day: 'Friday',
        time: document.getElementById('input-weekly-time')?.value || '15:00',
        frequency: 'Every Friday',
        message: document.getElementById('input-weekly-message')?.value || "Reminder: Please prepare and submit your Weekly Status Report (WSR)."
      }
    };

    App.showLoader(true, 'Updating reminder schedules and email dispatch settings...');
    try {
      const res = await API.saveRemindersConfig(updated);
      if (res.success) {
        this.config = res.config;
        App.showToast('Schedule Saved', `Reminders configured for ${res.config.notificationEmail} (${res.config.timezone})`);
        Dashboard.loadDashboard();
      }
    } catch (err) {
      App.showToast('Error', err.message, 'error');
    } finally {
      App.showLoader(false);
    }
  },

  async triggerTest(type) {
    App.showLoader(true, `Simulating automated ${type} reminder trigger...`);
    try {
      const res = await API.triggerTestReminder(type);
      if (res.success) {
        App.showToast('Reminder Sent', `Simulated ${type} trigger delivered to in-app notification center and email.`);
        await this.loadRemindersView();
        await App.checkPendingAlerts();
      }
    } catch (err) {
      App.showToast('Trigger Error', err.message, 'error');
    } finally {
      App.showLoader(false);
    }
  },

  renderHistoryTable(items) {
    const tbody = document.getElementById('reminder-history-tbody');
    if (!tbody) return;

    if (!items || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No reminder events logged yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(entry => {
      const dateStr = new Date(entry.timestamp).toLocaleString();
      let statusClass = 'delivered';
      if (entry.status === 'Acknowledged') statusClass = 'acknowledged';
      if (entry.status === 'Report Submitted') statusClass = 'submitted';

      return `
        <tr>
          <td style="font-size: 0.825rem; font-family: var(--font-mono); color: var(--text-secondary);">
            ${dateStr}
          </td>
          <td>
            <span class="badge ${entry.type === 'WSR' ? 'badge-observation' : 'badge-primary'}">
              ${entry.type}
            </span>
          </td>
          <td style="font-size: 0.85rem;">${entry.channel}</td>
          <td style="font-size: 0.85rem; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${entry.message}">
            ${entry.message}
          </td>
          <td>
            <span class="status-chip ${statusClass}">
              ${entry.status}
            </span>
          </td>
          <td>
            ${entry.status !== 'Report Submitted' ? `
              <button class="btn btn-sm btn-outline btn-act-reminder" data-type="${entry.type}" data-id="${entry.id}">
                Submit ${entry.type} Now
              </button>
            ` : `<span style="font-size: 0.75rem; color: var(--health-green); font-weight: 600;">✓ Completed</span>`}
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.btn-act-reminder').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        App.switchTab('generator');
        Generator.setType(type);
      });
    });
  }
};

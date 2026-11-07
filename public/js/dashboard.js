/**
 * Executive Dashboard Controller
 */

const Dashboard = {
  reports: [],
  nextOccurrences: null,
  countdownInterval: null,

  init() {
    this.bindEvents();
    this.loadDashboard();
    this.startCountdownTimer();
  },

  bindEvents() {
    // Quick action buttons
    document.getElementById('dash-btn-new-dsr')?.addEventListener('click', () => {
      App.switchTab('generator');
      Generator.setType('DSR');
    });

    document.getElementById('dash-btn-new-wsr')?.addEventListener('click', () => {
      App.switchTab('generator');
      Generator.setType('WSR');
    });

    document.getElementById('dash-btn-test-reminder')?.addEventListener('click', async () => {
      App.showLoader(true, 'Triggering test reminder event...');
      try {
        const res = await API.triggerTestReminder('DSR');
        if (res.success) {
          App.showToast('Reminder Delivered', 'Daily Status Report reminder triggered and logged!');
          App.checkPendingAlerts();
          Reminders.loadRemindersView();
        }
      } catch (err) {
        App.showToast('Error', err.message, 'error');
      } finally {
        App.showLoader(false);
      }
    });

    document.getElementById('dash-btn-compare')?.addEventListener('click', () => {
      App.switchTab('comparison');
    });
  },

  async loadDashboard() {
    try {
      const [reportsRes, remindersRes] = await Promise.all([
        API.getReports(),
        API.getNextReminders()
      ]);

      if (reportsRes.success) {
        this.reports = reportsRes.reports || [];
        this.renderMetrics();
        this.renderRecentReportsTable();
      }

      if (remindersRes.success) {
        this.nextOccurrences = remindersRes.next;
        this.renderNextRemindersCountdown();
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  },

  renderMetrics() {
    const totalReports = this.reports.length;
    let greenCount = 0;
    let amberCount = 0;
    let redCount = 0;
    let totalBlockers = 0;
    let completedItemsCount = 0;

    this.reports.forEach(r => {
      const status = r.projectHealth?.status || 'Green';
      if (status === 'Green') greenCount++;
      else if (status === 'Amber') amberCount++;
      else if (status === 'Red') redCount++;

      totalBlockers += (r.blockersAndDependencies?.length || 0);
      completedItemsCount += (r.workCompletedToday?.length || r.keyAccomplishments?.length || 0);
    });

    // Update KPI numbers
    const totalEl = document.getElementById('kpi-total-reports');
    if (totalEl) totalEl.textContent = totalReports;

    const blockersEl = document.getElementById('kpi-active-blockers');
    if (blockersEl) blockersEl.textContent = totalBlockers;

    const completedEl = document.getElementById('kpi-completed-tasks');
    if (completedEl) completedEl.textContent = completedItemsCount;

    // Health bar segments
    const totalHealth = greenCount + amberCount + redCount || 1;
    const greenPct = Math.round((greenCount / totalHealth) * 100);
    const amberPct = Math.round((amberCount / totalHealth) * 100);
    const redPct = 100 - greenPct - amberPct;

    const segGreen = document.getElementById('bar-seg-green');
    const segAmber = document.getElementById('bar-seg-amber');
    const segRed = document.getElementById('bar-seg-red');

    if (segGreen) segGreen.style.width = `${greenPct}%`;
    if (segAmber) segAmber.style.width = `${amberPct}%`;
    if (segRed) segRed.style.width = `${redPct}%`;

    const healthTextEl = document.getElementById('kpi-health-summary');
    if (healthTextEl) {
      healthTextEl.textContent = `${greenCount} Green • ${amberCount} Amber • ${redCount} Red`;
    }
  },

  renderNextRemindersCountdown() {
    if (!this.nextOccurrences) return;

    const dailyEl = document.getElementById('dash-next-daily-val');
    const weeklyEl = document.getElementById('dash-next-weekly-val');

    if (dailyEl && this.nextOccurrences.daily) {
      const dailyTime = new Date(this.nextOccurrences.daily.nextRun);
      dailyEl.textContent = this.formatTimeRemaining(dailyTime);
    }

    if (weeklyEl && this.nextOccurrences.weekly) {
      const weeklyTime = new Date(this.nextOccurrences.weekly.nextRun);
      weeklyEl.textContent = this.formatTimeRemaining(weeklyTime);
    }
  },

  startCountdownTimer() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => {
      this.renderNextRemindersCountdown();
    }, 1000);
  },

  formatTimeRemaining(targetDate) {
    const diff = targetDate - new Date();
    if (diff <= 0) return 'Triggering now...';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days}d ${hours % 24}h`;
    }

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  },

  renderRecentReportsTable() {
    const tbody = document.getElementById('dash-recent-reports-tbody');
    if (!tbody) return;

    if (this.reports.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No status reports archived yet. Click "New Daily Report" to create your first report.</td></tr>`;
      return;
    }

    const recent = this.reports.slice(0, 6);
    tbody.innerHTML = recent.map(r => {
      const health = r.projectHealth?.status || 'Green';
      const badgeClass = health === 'Green' ? 'badge-green' : (health === 'Amber' ? 'badge-amber' : 'badge-red');
      const blockersCount = r.blockersAndDependencies?.length || 0;

      return `
        <tr>
          <td>
            <span class="badge ${r.reportType === 'WSR' ? 'badge-observation' : 'badge-primary'}">
              ${r.reportType}
            </span>
          </td>
          <td>
            <strong>${r.projectName}</strong>
          </td>
          <td style="font-size: 0.85rem; color: var(--text-secondary);">
            ${r.reportDate || r.reportingWeek}
          </td>
          <td>
            <span class="badge ${badgeClass}">
              <span class="status-dot ${health.toLowerCase()}"></span>
              ${health}
            </span>
          </td>
          <td>
            ${blockersCount > 0 
              ? `<span class="badge badge-red">${blockersCount} Blockers</span>` 
              : `<span class="badge badge-green">0 Blockers</span>`
            }
          </td>
          <td>
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-sm btn-outline btn-view-report" data-id="${r.id}">
                View
              </button>
              <button class="btn btn-sm btn-outline btn-pdf-report" data-id="${r.id}" title="Print / PDF">
                PDF
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Bind view buttons
    tbody.querySelectorAll('.btn-view-report').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const rep = this.reports.find(r => r.id === id);
        if (rep) {
          App.switchTab('generator');
          Generator.setType(rep.reportType);
          Generator.currentReport = rep;
          Generator.renderReport(rep);
          document.getElementById('empty-report-state').style.display = 'none';
          document.getElementById('active-report-state').style.display = 'block';
        }
      });
    });

    tbody.querySelectorAll('.btn-pdf-report').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const rep = this.reports.find(r => r.id === id);
        if (rep) {
          App.switchTab('generator');
          Generator.setType(rep.reportType);
          Generator.currentReport = rep;
          Generator.renderReport(rep);
          document.getElementById('empty-report-state').style.display = 'none';
          document.getElementById('active-report-state').style.display = 'block';
          setTimeout(() => ExportUtils.printPdf(), 300);
        }
      });
    });
  }
};

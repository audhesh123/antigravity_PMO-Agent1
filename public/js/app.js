/**
 * App Main Controller & Router
 */

const App = {
  currentTab: 'dashboard',

  init() {
    this.initTheme();
    this.bindGlobalEvents();
    this.initRouter();
    this.checkPendingAlerts();

    // Initialize sub-modules
    Dashboard.init();
    Generator.init();
    Reminders.init();
    Historical.init();

    // Periodic reminder alert polling (every 10s)
    setInterval(() => this.checkPendingAlerts(), 10000);
  },

  initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);
  },

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    this.updateThemeIcon(next);
  },

  updateThemeIcon(theme) {
    const iconBtn = document.getElementById('btn-theme-toggle');
    if (!iconBtn) return;
    iconBtn.innerHTML = theme === 'dark' ? `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
    ` : `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    `;
  },

  bindGlobalEvents() {
    // Theme toggle
    document.getElementById('btn-theme-toggle')?.addEventListener('click', () => this.toggleTheme());

    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Settings Modal
    const btnSettings = document.getElementById('btn-open-settings');
    const modalSettings = document.getElementById('settings-modal');
    btnSettings?.addEventListener('click', () => {
      document.getElementById('settings-gemini-key').value = localStorage.getItem('gemini_api_key') || '';
      modalSettings?.classList.add('active');
    });

    document.getElementById('btn-save-settings')?.addEventListener('click', () => {
      const key = document.getElementById('settings-gemini-key')?.value?.trim();
      if (key) {
        localStorage.setItem('gemini_api_key', key);
        this.showToast('Settings Saved', 'Google Gemini API key securely saved in local session.');
      } else {
        localStorage.removeItem('gemini_api_key');
        this.showToast('Offline Mode Active', 'Using built-in high-fidelity AI heuristics engine.');
      }
      modalSettings?.classList.remove('active');
    });

    // Modal close buttons
    document.querySelectorAll('.btn-modal-close, .modal-close-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
      });
    });
  },

  initRouter() {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      const cleanTab = hash.split('?')[0];
      this.switchTab(cleanTab, false);
    });

    const initial = window.location.hash.replace('#', '') || 'dashboard';
    this.switchTab(initial.split('?')[0], false);
  },

  switchTab(tabName, updateHash = true) {
    this.currentTab = tabName;
    if (updateHash) {
      window.location.hash = `#${tabName}`;
    }

    // Update nav active states
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.tab === tabName);
    });

    // Switch tab views
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });

    const activePane = document.getElementById(`tab-${tabName}`);
    if (activePane) {
      activePane.classList.add('active');
    }

    if (tabName === 'dashboard') Dashboard.loadDashboard();
    if (tabName === 'reminders') Reminders.loadRemindersView();
    if (tabName === 'archive') Historical.loadArchive();
  },

  async checkPendingAlerts() {
    try {
      const res = await API.getPendingAlerts();
      const banner = document.getElementById('active-reminder-banner');
      const badge = document.getElementById('header-reminder-badge');

      if (res.success && res.alerts && res.alerts.length > 0) {
        const topAlert = res.alerts[0];
        if (banner) {
          banner.style.display = 'flex';
          document.getElementById('banner-alert-title').textContent = topAlert.title;
          document.getElementById('banner-alert-msg').textContent = topAlert.message;

          // Action button
          const actionBtn = document.getElementById('banner-btn-submit');
          if (actionBtn) {
            actionBtn.onclick = () => {
              this.switchTab('generator');
              Generator.setType(topAlert.type);
            };
          }

          // Dismiss button
          const dismissBtn = document.getElementById('banner-btn-dismiss');
          if (dismissBtn) {
            dismissBtn.onclick = async () => {
              await API.dismissAlert(topAlert.id);
              banner.style.display = 'none';
              this.checkPendingAlerts();
            };
          }
        }

        if (badge) {
          badge.style.display = 'flex';
          badge.textContent = res.alerts.length;
        }
      } else {
        if (banner) banner.style.display = 'none';
        if (badge) badge.style.display = 'none';
      }
    } catch (err) {
      console.warn('Alert check failed:', err);
    }
  },

  showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div style="color: ${type === 'error' ? 'var(--health-red)' : 'var(--primary-400)'}; flex-shrink: 0; margin-top: 2px;">
        ${type === 'error' ? `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        ` : `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        `}
      </div>
      <div style="flex: 1;">
        <h5 style="font-size: 0.85rem; font-weight: 700; color: var(--text-main); margin-bottom: 2px;">${title}</h5>
        <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">${message}</p>
      </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  showLoader(show, text = 'Processing...') {
    const loader = document.getElementById('global-loader');
    const textEl = document.getElementById('loader-text');
    if (!loader) return;
    if (show) {
      if (textEl) textEl.textContent = text;
      loader.classList.add('active');
    } else {
      loader.classList.remove('active');
    }
  }
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

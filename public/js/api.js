/**
 * Frontend API client for AI Status Reporting Agent
 */

const API = {
  baseURL: '',

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = options.headers || {};

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, err);
      throw err;
    }
  },

  // 1. Health check
  async getHealth() {
    return this.request('/api/health');
  },

  // 2. File Upload Ingestion
  async uploadFiles(fileList) {
    const formData = new FormData();
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }
    return this.request('/api/ingest/upload', {
      method: 'POST',
      body: formData
    });
  },

  // 3. Load Sample Dataset
  async loadSample(sampleKey) {
    return this.request('/api/ingest/sample', {
      method: 'POST',
      body: JSON.stringify({ sampleKey })
    });
  },

  // 4. Generate Reports
  async generateDSR(payload) {
    return this.request('/api/generate-dsr', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async generateWSR(payload) {
    return this.request('/api/generate-wsr', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // 5. Clarify Report
  async clarifyReport(report, answers) {
    return this.request('/api/clarify', {
      method: 'POST',
      body: JSON.stringify({ report, answers })
    });
  },

  // 6. Reports CRUD
  async getReports(filters = {}) {
    const query = new URLSearchParams(filters).toString();
    return this.request(`/api/reports${query ? '?' + query : ''}`);
  },

  async getReportById(id) {
    return this.request(`/api/reports/${id}`);
  },

  async saveReport(report) {
    return this.request('/api/reports', {
      method: 'POST',
      body: JSON.stringify(report)
    });
  },

  async deleteReport(id) {
    return this.request(`/api/reports/${id}`, {
      method: 'DELETE'
    });
  },

  // 7. Historical Comparison
  async compareReports(idA, idB) {
    return this.request(`/api/reports/compare/${idA}/${idB}`);
  },

  // 8. Reminders System
  async getRemindersConfig() {
    return this.request('/api/reminders/config');
  },

  async saveRemindersConfig(config) {
    return this.request('/api/reminders/config', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  },

  async getReminderHistory() {
    return this.request('/api/reminders/history');
  },

  async getPendingAlerts() {
    return this.request('/api/reminders/alerts');
  },

  async dismissAlert(id) {
    return this.request(`/api/reminders/dismiss/${id}`, {
      method: 'POST'
    });
  },

  async triggerTestReminder(type = 'DSR') {
    return this.request('/api/reminders/trigger-test', {
      method: 'POST',
      body: JSON.stringify({ type })
    });
  },

  async getNextReminders() {
    return this.request('/api/reminders/next');
  }
};

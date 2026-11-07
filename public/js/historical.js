/**
 * Historical Reports and Comparison Controller
 */

const Historical = {
  reports: [],

  init() {
    this.bindEvents();
    this.loadArchive();
  },

  bindEvents() {
    // Archive filters
    const searchInp = document.getElementById('archive-search-input');
    const typeFilter = document.getElementById('archive-type-filter');
    const healthFilter = document.getElementById('archive-health-filter');

    const handleFilterChange = () => {
      this.filterAndRenderArchive();
    };

    searchInp?.addEventListener('input', handleFilterChange);
    typeFilter?.addEventListener('change', handleFilterChange);
    healthFilter?.addEventListener('change', handleFilterChange);

    // Comparison select change
    const selA = document.getElementById('compare-select-a');
    const selB = document.getElementById('compare-select-b');
    const btnCompare = document.getElementById('btn-run-comparison');

    btnCompare?.addEventListener('click', () => {
      const idA = selA.value;
      const idB = selB.value;
      if (idA && idB) {
        this.runComparison(idA, idB);
      } else {
        App.showToast('Select Reports', 'Please select two reports to compare.', 'error');
      }
    });
  },

  async loadArchive() {
    try {
      const res = await API.getReports();
      if (res.success) {
        this.reports = res.reports || [];
        this.filterAndRenderArchive();
        this.populateComparisonSelects();
      }
    } catch (err) {
      console.error('Error loading archive:', err);
    }
  },

  filterAndRenderArchive() {
    const searchVal = document.getElementById('archive-search-input')?.value?.toLowerCase() || '';
    const typeVal = document.getElementById('archive-type-filter')?.value || '';
    const healthVal = document.getElementById('archive-health-filter')?.value || '';

    let filtered = this.reports;

    if (typeVal) {
      filtered = filtered.filter(r => r.reportType === typeVal);
    }
    if (healthVal) {
      filtered = filtered.filter(r => (r.projectHealth?.status || '').toLowerCase() === healthVal.toLowerCase());
    }
    if (searchVal) {
      filtered = filtered.filter(r => 
        (r.projectName && r.projectName.toLowerCase().includes(searchVal)) ||
        (r.executiveSummary && r.executiveSummary.toLowerCase().includes(searchVal))
      );
    }

    const tbody = document.getElementById('archive-reports-tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching reports found in archive.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(r => {
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
          <td><strong>${r.projectName}</strong></td>
          <td style="font-size: 0.85rem; color: var(--text-secondary);">${r.reportDate || r.reportingWeek}</td>
          <td>
            <span class="badge ${badgeClass}">
              <span class="status-dot ${health.toLowerCase()}"></span>
              ${health}
            </span>
          </td>
          <td>
            <span class="badge ${blockersCount > 0 ? 'badge-red' : 'badge-green'}">
              ${blockersCount} Blockers
            </span>
          </td>
          <td>
            <div style="display: flex; gap: 0.4rem;">
              <button class="btn btn-sm btn-outline btn-arch-view" data-id="${r.id}">View</button>
              <button class="btn btn-sm btn-danger btn-arch-del" data-id="${r.id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Bind archive actions
    tbody.querySelectorAll('.btn-arch-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const rep = this.reports.find(r => r.id === btn.dataset.id);
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

    tbody.querySelectorAll('.btn-arch-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this status report?')) {
          try {
            await API.deleteReport(btn.dataset.id);
            App.showToast('Report Deleted', 'Report removed from repository.');
            this.loadArchive();
            Dashboard.loadDashboard();
          } catch (err) {
            App.showToast('Error', err.message, 'error');
          }
        }
      });
    });
  },

  populateComparisonSelects() {
    const selA = document.getElementById('compare-select-a');
    const selB = document.getElementById('compare-select-b');
    if (!selA || !selB) return;

    const options = this.reports.map(r => `
      <option value="${r.id}">
        [${r.reportType}] ${r.projectName} (${r.reportDate || r.reportingWeek}) - ${r.projectHealth?.status}
      </option>
    `).join('');

    selA.innerHTML = '<option value="">Select Baseline Report (A)...</option>' + options;
    selB.innerHTML = '<option value="">Select Comparison Report (B)...</option>' + options;

    if (this.reports.length >= 2) {
      selA.selectedIndex = 2; // e.g. previous
      selB.selectedIndex = 1; // e.g. latest
      this.runComparison(this.reports[1].id, this.reports[0].id);
    }
  },

  async runComparison(idA, idB) {
    App.showLoader(true, 'Computing delta across historical reports...');
    try {
      const res = await API.compareReports(idA, idB);
      const repA = this.reports.find(r => r.id === idA);
      const repB = this.reports.find(r => r.id === idB);

      if (res.success && repA && repB) {
        this.renderComparisonResults(res.comparison, repA, repB);
      }
    } catch (err) {
      App.showToast('Comparison Error', err.message, 'error');
    } finally {
      App.showLoader(false);
    }
  },

  renderComparisonResults(comp, repA, repB) {
    const container = document.getElementById('comparison-results-container');
    if (!container) return;

    container.style.display = 'block';

    // Summary Delta Cards
    const healthBadgeA = repA.projectHealth?.status === 'Green' ? 'badge-green' : (repA.projectHealth?.status === 'Amber' ? 'badge-amber' : 'badge-red');
    const healthBadgeB = repB.projectHealth?.status === 'Green' ? 'badge-green' : (repB.projectHealth?.status === 'Amber' ? 'badge-amber' : 'badge-red');

    document.getElementById('comp-health-transition').innerHTML = `
      <span class="badge ${healthBadgeA}">${repA.projectHealth?.status}</span>
      <span style="color: var(--text-muted); font-size: 1.1rem;">→</span>
      <span class="badge ${healthBadgeB}">${repB.projectHealth?.status}</span>
    `;

    document.getElementById('comp-resolved-blockers').textContent = comp.resolvedBlockers?.length || 0;
    document.getElementById('comp-new-blockers').textContent = comp.newBlockers?.length || 0;
    document.getElementById('comp-carryover-blockers').textContent = comp.carryOverItems?.length || 0;

    // Detailed Side-by-Side comparison
    const sideBySide = document.getElementById('comp-side-by-side');
    if (sideBySide) {
      sideBySide.innerHTML = `
        <div class="glass-panel" style="padding: 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
            <h4>Baseline Report A</h4>
            <span class="badge badge-primary">${repA.reportType}</span>
          </div>
          <p style="font-weight: 700; color: var(--text-main);">${repA.projectName}</p>
          <p style="font-size: 0.8rem; color: var(--text-muted);">${repA.reportDate || repA.reportingWeek}</p>
          <div class="exec-summary-box" style="margin-top: 1rem; margin-bottom: 1rem;">
            <p style="font-size: 0.85rem;">${repA.executiveSummary}</p>
          </div>
          <h5 style="font-size: 0.85rem; text-transform: uppercase; margin-bottom: 0.5rem; color: var(--text-secondary);">Blockers (${repA.blockersAndDependencies?.length || 0})</h5>
          <ul style="font-size: 0.85rem; padding-left: 1.25rem;">
            ${(repA.blockersAndDependencies || []).map(b => `<li>${b.description} <em>(${b.owner})</em></li>`).join('') || '<li>None</li>'}
          </ul>
        </div>

        <div class="glass-panel" style="padding: 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
            <h4>Comparison Report B</h4>
            <span class="badge badge-primary">${repB.reportType}</span>
          </div>
          <p style="font-weight: 700; color: var(--text-main);">${repB.projectName}</p>
          <p style="font-size: 0.8rem; color: var(--text-muted);">${repB.reportDate || repB.reportingWeek}</p>
          <div class="exec-summary-box" style="margin-top: 1rem; margin-bottom: 1rem;">
            <p style="font-size: 0.85rem;">${repB.executiveSummary}</p>
          </div>
          <h5 style="font-size: 0.85rem; text-transform: uppercase; margin-bottom: 0.5rem; color: var(--text-secondary);">Blockers (${repB.blockersAndDependencies?.length || 0})</h5>
          <ul style="font-size: 0.85rem; padding-left: 1.25rem;">
            ${(repB.blockersAndDependencies || []).map(b => `<li>${b.description} <em>(${b.owner})</em></li>`).join('') || '<li>None</li>'}
          </ul>
        </div>
      `;
    }
  }
};

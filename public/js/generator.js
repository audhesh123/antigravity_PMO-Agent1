/**
 * Report Generator Controller (DSR / WSR interactive studio)
 */

const Generator = {
  currentType: 'DSR', // 'DSR' or 'WSR'
  uploadedExcelData: null,
  uploadedTranscriptData: null,
  uploadedFilesList: [],
  currentReport: null,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Type selector toggles
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = btn.dataset.type;
        this.setType(type);
      });
    });

    // File input change
    const fileInput = document.getElementById('file-upload-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files?.length) {
          this.handleFiles(e.target.files);
        }
      });
    }

    // Dropzone drag-and-drop
    const dropzone = document.getElementById('dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files?.length) {
          this.handleFiles(e.dataTransfer.files);
        }
      });
      dropzone.addEventListener('click', () => {
        fileInput?.click();
      });
    }

    // Demo dataset buttons
    document.querySelectorAll('[data-demo-key]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const key = btn.dataset.demoKey;
        await this.loadDemoDataset(key);
      });
    });

    // Generate Report button
    const btnGenerate = document.getElementById('btn-generate-report');
    if (btnGenerate) {
      btnGenerate.addEventListener('click', () => this.generate());
    }

    // Reset Generator button
    const btnReset = document.getElementById('btn-reset-generator');
    if (btnReset) {
      btnReset.addEventListener('click', () => this.resetInputs());
    }

    // Save report button
    const btnSave = document.getElementById('btn-save-report');
    if (btnSave) {
      btnSave.addEventListener('click', () => this.saveCurrentReport());
    }

    // Export buttons
    document.getElementById('btn-copy-md')?.addEventListener('click', () => {
      if (!this.currentReport) return;
      const md = ExportUtils.toMarkdown(this.currentReport);
      navigator.clipboard.writeText(md);
      App.showToast('Copied to clipboard', 'Markdown report copied successfully!');
    });

    document.getElementById('btn-copy-slack')?.addEventListener('click', () => {
      if (!this.currentReport) return;
      const slack = ExportUtils.toSlack(this.currentReport);
      navigator.clipboard.writeText(slack);
      App.showToast('Copied to clipboard', 'Slack/Teams formatted update copied!');
    });

    document.getElementById('btn-email-preview')?.addEventListener('click', () => {
      if (!this.currentReport) return;
      this.openEmailModal();
    });

    // Send report email from modal
    document.getElementById('btn-dispatch-report-email')?.addEventListener('click', () => {
      this.sendReportEmail();
    });

    document.getElementById('btn-print-pdf')?.addEventListener('click', () => {
      ExportUtils.printPdf();
    });

    document.getElementById('btn-download-json')?.addEventListener('click', () => {
      if (!this.currentReport) return;
      ExportUtils.downloadJson(this.currentReport);
    });
  },

  setType(type) {
    this.currentType = type;
    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });

    const titleEl = document.getElementById('generator-title');
    if (titleEl) {
      titleEl.textContent = type === 'DSR' 
        ? 'Daily Status Report (DSR/DRS) Generator' 
        : 'Weekly Status Report (WSR) Generator';
    }
  },

  async handleFiles(files) {
    App.showLoader(true, 'Parsing files and extracting project entities...');
    try {
      const res = await API.uploadFiles(files);
      if (res.success) {
        if (res.data.excelData) {
          this.uploadedExcelData = res.data.excelData;
        }
        if (res.data.transcriptData) {
          this.uploadedTranscriptData = res.data.transcriptData;
        }
        this.renderUploadedFilesBadges(files, res.data);
        App.showToast('Files Ingested', `Processed ${files.length} file(s) with table rows & transcripts.`);
      }
    } catch (err) {
      App.showToast('Upload Error', err.message, 'error');
    } finally {
      App.showLoader(false);
    }
  },

  async loadDemoDataset(sampleKey) {
    App.showLoader(true, `Loading demo dataset: ${sampleKey}...`);
    try {
      const res = await API.loadSample(sampleKey);
      if (res.success) {
        this.uploadedExcelData = res.data.excelData;
        this.uploadedTranscriptData = res.data.transcriptData;

        // Auto-fill project title and instructions
        const projInput = document.getElementById('input-project-name');
        if (projInput) projInput.value = res.projectName || '';

        const notesInput = document.getElementById('input-user-notes');
        if (notesInput) notesInput.value = res.suggestedPrompt || '';

        // Render file badges
        const badgesContainer = document.getElementById('parsed-files-container');
        if (badgesContainer) {
          badgesContainer.innerHTML = `
            <div class="file-item-badge">
              <div class="file-item-info">
                <span class="badge badge-primary">Excel Tracker</span>
                <span>${res.data.excelData?.filename || 'tracker.xlsx'} (${res.data.excelData?.totalTasks || 0} tasks)</span>
              </div>
              <span class="badge badge-green">Ready</span>
            </div>
            ${res.data.transcriptData ? `
            <div class="file-item-badge">
              <div class="file-item-info">
                <span class="badge badge-observation">Transcript</span>
                <span>${res.data.transcriptData.filename} (${res.data.transcriptData.lineCount} lines, ${res.data.transcriptData.speakers?.length || 0} speakers)</span>
              </div>
              <span class="badge badge-green">Ready</span>
            </div>` : ''}
          `;
        }

        App.showToast('Demo Dataset Loaded', `Loaded sample data for "${res.projectName}"! Click "Generate Report" to run.`);
      }
    } catch (err) {
      App.showToast('Error', err.message, 'error');
    } finally {
      App.showLoader(false);
    }
  },

  renderUploadedFilesBadges(rawFiles, parsedData) {
    const container = document.getElementById('parsed-files-container');
    if (!container) return;

    let html = '';
    if (parsedData.excelData) {
      html += `
        <div class="file-item-badge">
          <div class="file-item-info">
            <span class="badge badge-primary">Excel/CSV</span>
            <strong>${parsedData.excelData.filename}</strong>
            <span style="color: var(--text-muted); font-size: 0.75rem;">(${parsedData.excelData.totalTasks} tasks identified)</span>
          </div>
          <span class="badge badge-green">Parsed</span>
        </div>
      `;
    }

    if (parsedData.transcriptData) {
      html += `
        <div class="file-item-badge">
          <div class="file-item-info">
            <span class="badge badge-observation">Transcript</span>
            <strong>${parsedData.transcriptData.filename}</strong>
            <span style="color: var(--text-muted); font-size: 0.75rem;">(${parsedData.transcriptData.speakers?.length || 0} speakers, ${parsedData.transcriptData.actionItems?.length || 0} actions)</span>
          </div>
          <span class="badge badge-green">Parsed</span>
        </div>
      `;
    }

    container.innerHTML = html || '<p style="font-size: 0.8rem; color: var(--text-muted);">No files uploaded yet.</p>';
  },

  resetInputs() {
    this.uploadedExcelData = null;
    this.uploadedTranscriptData = null;
    document.getElementById('input-project-name').value = '';
    document.getElementById('input-user-notes').value = '';
    document.getElementById('parsed-files-container').innerHTML = '';
    document.getElementById('report-clarification-container').innerHTML = '';
    document.getElementById('empty-report-state').style.display = 'block';
    document.getElementById('active-report-state').style.display = 'none';
    this.currentReport = null;
    App.showToast('Reset Complete', 'Inputs cleared. Ready for fresh submission.');
  },

  async generate(userAnswers = {}) {
    const projectName = document.getElementById('input-project-name')?.value?.trim();
    const userNotes = document.getElementById('input-user-notes')?.value?.trim();
    const apiKey = localStorage.getItem('gemini_api_key') || '';

    const payload = {
      excelData: this.uploadedExcelData,
      transcriptData: this.uploadedTranscriptData,
      userNotes,
      rawText: userNotes,
      userAnswers: { ...userAnswers, ...(projectName ? { projectName } : {}) },
      apiKey
    };

    App.showLoader(true, `AI Agent is synthesizing ${this.currentType}...`);

    try {
      let res;
      if (this.currentType === 'DSR') {
        res = await API.generateDSR(payload);
      } else {
        res = await API.generateWSR(payload);
      }

      if (res.success && res.report) {
        this.currentReport = res.report;
        this.renderClarificationBox(res.report);
        this.renderReport(res.report);

        // Switch empty state to active
        document.getElementById('empty-report-state').style.display = 'none';
        document.getElementById('active-report-state').style.display = 'block';

        App.showToast('Report Generated', `${this.currentType} successfully generated with health status [${res.report.projectHealth?.status}].`);
      }
    } catch (err) {
      App.showToast('Generation Failed', err.message, 'error');
    } finally {
      App.showLoader(false);
    }
  },

  renderClarificationBox(report) {
    const container = document.getElementById('report-clarification-container');
    if (!container) return;

    if (!report.clarificationNeeded || !report.missingInformation || report.missingInformation.length === 0) {
      container.innerHTML = '';
      return;
    }

    const questions = report.missingInformation;
    let questionsHtml = '';

    questions.forEach(q => {
      questionsHtml += `
        <div class="form-group" style="margin-bottom: 0.85rem;">
          <label class="form-label" style="color: var(--text-main); font-weight: 600;">
            ${q.question}
          </label>
          <input type="text" class="form-control clarification-field" data-field="${q.field}" placeholder="${q.placeholder || ''}" />
          ${q.suggestedOptions ? `
            <div style="display: flex; gap: 0.4rem; margin-top: 0.4rem; flex-wrap: wrap;">
              ${q.suggestedOptions.map(opt => `
                <button type="button" class="btn btn-sm btn-outline btn-suggested-opt" data-target-field="${q.field}" data-val="${opt}">
                  + ${opt}
                </button>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    });

    container.innerHTML = `
      <div class="clarification-card">
        <div class="clarification-header">
          <h4>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            AI Agent Clarification Notice: Missing Information Detected
          </h4>
          <span class="badge badge-amber">${questions.length} Items To Clarify</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-main);">
          The AI Agent avoids inventing facts not found in source trackers. Please specify or select suggested values below to refine this report:
        </p>
        <div class="clarification-questions-list">
          ${questionsHtml}
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem;">
          <button type="button" class="btn btn-sm btn-secondary" id="btn-skip-clarify">
            Use "Not Provided"
          </button>
          <button type="button" class="btn btn-sm btn-primary" id="btn-submit-clarify">
            Apply Clarifications & Update Report
          </button>
        </div>
      </div>
    `;

    // Bind suggestion chips
    container.querySelectorAll('.btn-suggested-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const fieldName = btn.dataset.targetField;
        const val = btn.dataset.val;
        const input = container.querySelector(`.clarification-field[data-field="${fieldName}"]`);
        if (input) input.value = val;
      });
    });

    // Skip button
    container.querySelector('#btn-skip-clarify')?.addEventListener('click', () => {
      container.innerHTML = '';
    });

    // Submit clarification button
    container.querySelector('#btn-submit-clarify')?.addEventListener('click', async () => {
      const answers = {};
      container.querySelectorAll('.clarification-field').forEach(inp => {
        const val = inp.value.trim();
        if (val) answers[inp.dataset.field] = val;
      });

      App.showLoader(true, 'Updating report with clarifications...');
      try {
        const res = await API.clarifyReport(this.currentReport, answers);
        if (res.success && res.report) {
          this.currentReport = res.report;
          this.renderReport(res.report);
          container.innerHTML = '';
          App.showToast('Report Clarified', 'Updated report with your confirmed project attributes.');
        }
      } catch (err) {
        App.showToast('Error', err.message, 'error');
      } finally {
        App.showLoader(false);
      }
    });
  },

  renderReport(report) {
    const isWSR = report.reportType === 'WSR';
    const health = report.projectHealth?.status || 'Green';
    const healthBadgeClass = health === 'Green' ? 'badge-green' : (health === 'Amber' ? 'badge-amber' : 'badge-red');

    // Document header
    document.getElementById('rep-title').textContent = report.projectName || 'Project Status Report';
    document.getElementById('rep-date-chip').textContent = report.reportDate || report.reportingWeek;
    document.getElementById('rep-type-badge').textContent = isWSR ? 'Weekly Status Report (WSR)' : 'Daily Status Report (DSR)';

    // Health Large Pill
    const healthContainer = document.getElementById('rep-health-container');
    if (healthContainer) {
      healthContainer.innerHTML = `
        <div class="health-pill-large ${healthBadgeClass}">
          <span class="status-dot ${health.toLowerCase()}"></span>
          STATUS: ${health.toUpperCase()}
        </div>
        <span style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">
          AI Confidence: ${report.projectHealth?.confidenceScore || 95}% • Trend: ${report.projectHealth?.trend || 'Stable'}
        </span>
      `;
    }

    // Executive Summary
    document.getElementById('rep-exec-summary').textContent = report.executiveSummary;

    // Management Attention Box (For WSR)
    const mgmtBox = document.getElementById('rep-mgmt-attention-box');
    if (mgmtBox) {
      if (isWSR && report.managementAttentionRequired) {
        mgmtBox.style.display = 'flex';
        document.getElementById('rep-mgmt-text').textContent = report.managementAttentionRequired;
      } else {
        mgmtBox.style.display = 'none';
      }
    }

    // Deliverables: Work Completed / Key Accomplishments
    const completedTitle = document.getElementById('rep-completed-title');
    if (completedTitle) {
      completedTitle.textContent = isWSR ? 'Key Accomplishments This Week' : 'Work Completed Today';
    }

    const completedTableBody = document.getElementById('rep-completed-tbody');
    if (completedTableBody) {
      const items = isWSR ? (report.keyAccomplishments || []) : (report.workCompletedToday || []);
      completedTableBody.innerHTML = items.map(item => `
        <tr>
          <td>
            <strong>${item.headline || item.task}</strong>
            ${item.impact ? `<div style="font-size: 0.8rem; color: var(--text-muted);">${item.impact}</div>` : ''}
            ${item.notes ? `<div style="font-size: 0.8rem; color: var(--text-muted);">${item.notes}</div>` : ''}
          </td>
          <td><span class="badge badge-primary">${item.owner || 'Team'}</span></td>
          <td>
            <span class="badge ${item.type === 'AI Observation' ? 'badge-observation' : 'badge-confirmed'}">
              ${item.type || item.source || 'Confirmed Fact'}
            </span>
          </td>
        </tr>
      `).join('') || '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Not Provided</td></tr>';
    }

    // Tasks In Progress
    const inProgressTableBody = document.getElementById('rep-inprogress-tbody');
    if (inProgressTableBody) {
      const tasks = report.tasksInProgress || [];
      inProgressTableBody.innerHTML = tasks.map(t => `
        <tr>
          <td><strong>${t.task}</strong></td>
          <td><span class="badge badge-primary">${t.owner || 'Team'}</span></td>
          <td><span class="badge badge-amber">${t.status || 'In Progress'}</span></td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">${t.targetDate || t.dueDate || 'Current Sprint'}</td>
        </tr>
      `).join('') || '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">None Active</td></tr>';
    }

    // Next Steps / Planned Activities
    const upcomingTitle = document.getElementById('rep-upcoming-title');
    if (upcomingTitle) {
      upcomingTitle.textContent = isWSR ? 'Planned Activities for Next Week' : 'Upcoming Activities / Next Steps';
    }

    const upcomingTableBody = document.getElementById('rep-upcoming-tbody');
    if (upcomingTableBody) {
      const activities = isWSR ? (report.plannedActivitiesNextWeek || []) : (report.upcomingActivities || []);
      upcomingTableBody.innerHTML = activities.map(act => `
        <tr>
          <td><strong>${act.activity || act.task}</strong></td>
          <td><span class="badge badge-primary">${act.owner || 'Assigned'}</span></td>
          <td><span class="badge badge-confirmed">${act.priority || 'Medium'}</span></td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">${act.targetRelease || act.targetDate || 'Tomorrow'}</td>
        </tr>
      `).join('') || '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">None Scheduled</td></tr>';
    }

    // Blockers and Dependencies
    const blockersContainer = document.getElementById('rep-blockers-container');
    if (blockersContainer) {
      const blockers = report.blockersAndDependencies || [];
      if (blockers.length === 0) {
        blockersContainer.innerHTML = `
          <div style="padding: 1rem; border-radius: var(--radius-md); background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); color: var(--health-green); font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Zero active blockers reported. Development velocity is unimpeded.
          </div>
        `;
      } else {
        blockersContainer.innerHTML = blockers.map(b => `
          <div class="blocker-card">
            <div class="blocker-top">
              <span class="badge badge-red">${b.severity || 'High'} Severity</span>
              <span style="font-size: 0.75rem; color: var(--text-muted);">Owner: <strong style="color: var(--text-main);">${b.owner || 'Unassigned'}</strong></span>
            </div>
            <div class="blocker-desc">${b.description}</div>
            ${b.impact ? `<div class="blocker-footer"><span>Impact: ${b.impact}</span></div>` : ''}
          </div>
        `).join('');
      }
    }

    // Risks and Issues
    const risksContainer = document.getElementById('rep-risks-container');
    if (risksContainer) {
      const risks = report.risksAndIssues || [];
      risksContainer.innerHTML = risks.map(r => `
        <div class="risk-card">
          <div class="risk-header">
            <strong>${r.risk}</strong>
            <span class="badge ${r.severity === 'High' ? 'badge-red' : 'badge-amber'}">
              ${r.severity || r.impact || 'Medium'} Impact
            </span>
          </div>
          ${r.mitigation ? `
            <div class="risk-mitigation">
              <strong>Mitigation Strategy:</strong> ${r.mitigation}
            </div>
          ` : ''}
        </div>
      `).join('') || '<p style="color: var(--text-muted); font-size: 0.85rem;">No critical risks detected.</p>';
    }

    // Key Decisions
    const decisionsContainer = document.getElementById('rep-decisions-container');
    if (decisionsContainer) {
      const decisions = report.keyDecisions || [];
      decisionsContainer.innerHTML = decisions.map(d => `
        <li style="margin-bottom: 0.5rem; font-size: 0.875rem;">
          <strong>${d.decision}</strong> 
          <span style="color: var(--text-muted);">— ${d.owner || d.stakeholder || 'Team'}</span>
        </li>
      `).join('') || '<li style="color: var(--text-muted); font-size: 0.85rem;">No major architecture or scope decisions recorded today.</li>';
    }

    // Action Items
    const actionsTableBody = document.getElementById('rep-actions-tbody');
    if (actionsTableBody) {
      const actions = report.actionItems || report.pendingActionItems || [];
      actionsTableBody.innerHTML = actions.map(a => `
        <tr>
          <td><strong>${a.task || a.action}</strong></td>
          <td><span class="badge badge-primary">${a.owner}</span></td>
          <td><span class="badge ${a.priority === 'High' ? 'badge-red' : 'badge-amber'}">${a.priority || 'Medium'}</span></td>
          <td><span class="badge badge-confirmed">${a.status || 'Pending'}</span></td>
        </tr>
      `).join('') || '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Zero pending actions</td></tr>';
    }

    // Additional Comments
    const commentsEl = document.getElementById('rep-additional-comments');
    if (commentsEl) {
      commentsEl.textContent = report.additionalComments || 'None provided.';
    }
  },

  async saveCurrentReport() {
    if (!this.currentReport) return;
    App.showLoader(true, 'Saving report to archive...');
    try {
      const res = await API.saveReport(this.currentReport);
      if (res.success) {
        App.showToast('Saved Successfully', 'Report archived and delivery status logged!');
        // Refresh dashboard and archive
        Dashboard.loadDashboard();
        Reminders.loadRemindersView();
      }
    } catch (err) {
      App.showToast('Error', err.message, 'error');
    } finally {
      App.showLoader(false);
    }
  },

  openEmailModal() {
    const modal = document.getElementById('email-preview-modal');
    const container = document.getElementById('email-modal-body');
    if (!modal || !container || !this.currentReport) return;

    // Pre-populate email fields
    const toInput = document.getElementById('email-to-input');
    if (toInput) {
      toInput.value = localStorage.getItem('last_report_email_to') || 'audhesh123@gmail.com';
    }

    const ccInput = document.getElementById('email-cc-input');
    if (ccInput) {
      ccInput.value = localStorage.getItem('last_report_email_cc') || '';
    }

    const fromInput = document.getElementById('email-from-input');
    if (fromInput) {
      fromInput.value = 'noreplyststus@company.com';
    }

    const subjectInput = document.getElementById('email-subject-input');
    if (subjectInput) {
      const repType = this.currentReport.reportType || 'DSR';
      const health = this.currentReport.projectHealth?.status?.toUpperCase() || 'GREEN';
      subjectInput.value = `[${repType}] ${this.currentReport.projectName} - Executive Status Update (${health})`;
    }

    // Render HTML preview
    const emailHtml = ExportUtils.toEmailHtml(this.currentReport);
    container.innerHTML = emailHtml;

    modal.classList.add('active');
  },

  async sendReportEmail() {
    if (!this.currentReport) return;

    const to = document.getElementById('email-to-input')?.value?.trim();
    const cc = document.getElementById('email-cc-input')?.value?.trim();
    const from = document.getElementById('email-from-input')?.value?.trim() || 'noreplyststus@company.com';
    const subject = document.getElementById('email-subject-input')?.value?.trim();

    if (!to) {
      App.showToast('Recipient Missing', 'Please enter at least one recipient email address in the To field.', 'error');
      document.getElementById('email-to-input')?.focus();
      return;
    }

    // Persist To and CC for convenience next time
    localStorage.setItem('last_report_email_to', to);
    if (cc) localStorage.setItem('last_report_email_cc', cc);

    const emailHtml = ExportUtils.toEmailHtml(this.currentReport);
    App.showLoader(true, `Dispatching ${this.currentReport.reportType} from ${from} to ${to}...`);

    try {
      const res = await API.sendReportEmail({
        to,
        cc,
        from,
        subject,
        html: emailHtml,
        report: this.currentReport
      });

      if (res.success) {
        document.getElementById('email-preview-modal')?.classList.remove('active');
        if (res.result?.provider === 'simulated') {
          App.showToast(
            'Report Prepared (Simulated)',
            `Report formatted from ${from} to ${to}${cc ? ' (CC: ' + cc + ')' : ''}. Set your Gmail App Password in Reminders to send live.`,
            'info'
          );
        } else {
          App.showToast(
            'Report Dispatched!',
            `Successfully sent executive status brief to ${to}${cc ? ' (CC: ' + cc + ')' : ''} from ${from}!`,
            'success'
          );
        }

        // Refresh delivery audit logs
        Reminders.loadRemindersView();
        Dashboard.loadDashboard();
      } else {
        App.showToast('Dispatch Error', res.error || 'Failed to dispatch email.', 'error');
      }
    } catch (err) {
      App.showToast('Email Error', err.message, 'error');
    } finally {
      App.showLoader(false);
    }
  }
};

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = require('./storage');
const fileParser = require('./file-parser');
const aiEngine = require('./ai-engine');
const reminderService = require('./reminders');
const { generateSamples, SAMPLES_DIR } = require('./sample-data-generator');

// Initialize sample data on startup
generateSamples();

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Multer storage for uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

/* ==========================================================================
   API ROUTES
   ========================================================================== */

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    service: 'AI Status Reporting Agent Engine',
    timestamp: new Date().toISOString()
  });
});

// 2. Ingest Uploaded Files (Excel, CSV, Transcript txt/docs)
app.post('/api/ingest/upload', upload.array('files', 10), (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const parsedResults = {
      excelData: null,
      transcriptData: null,
      otherFiles: []
    };

    files.forEach(file => {
      const ext = path.extname(file.originalname).toLowerCase();

      if (['.xlsx', '.xls', '.csv'].includes(ext)) {
        const parsedExcel = fileParser.parseExcelBuffer(file.buffer, file.originalname);
        parsedResults.excelData = parsedExcel;
      } else if (['.txt', '.doc', '.docx', '.md', '.log', '.vtt', '.srt'].includes(ext)) {
        const textContent = file.buffer.toString('utf-8');
        const parsedTranscript = fileParser.parseTranscriptText(textContent, file.originalname);
        parsedResults.transcriptData = parsedTranscript;
      } else {
        parsedResults.otherFiles.push({
          filename: file.originalname,
          size: file.size,
          mimetype: file.mimetype
        });
      }
    });

    res.json({
      success: true,
      message: `Parsed ${files.length} file(s) successfully`,
      data: parsedResults
    });
  } catch (err) {
    console.error('Upload ingestion error:', err);
    res.status(500).json({ error: 'Failed to parse uploaded files', details: err.message });
  }
});

// 3. Load Sample Datasets for 1-Click Interactive Demo
app.post('/api/ingest/sample', (req, res) => {
  try {
    const { sampleKey } = req.body;
    let excelData = null;
    let transcriptData = null;
    let suggestedPrompt = '';
    let projectName = '';

    if (sampleKey === 'mobile-app') {
      const xlsxFile = path.join(SAMPLES_DIR, 'mobile_app_sprint_tracker.xlsx');
      const txtFile = path.join(SAMPLES_DIR, 'sprint_retro_transcript.txt');

      if (fs.existsSync(xlsxFile)) {
        const buf = fs.readFileSync(xlsxFile);
        excelData = fileParser.parseExcelBuffer(buf, 'mobile_app_sprint_tracker.xlsx');
      }
      if (fs.existsSync(txtFile)) {
        const txt = fs.readFileSync(txtFile, 'utf-8');
        transcriptData = fileParser.parseTranscriptText(txt, 'sprint_retro_transcript.txt');
      }
      suggestedPrompt = 'Focus on the Stripe 3D-Secure vendor blocker and highlight the Biometric auth completion.';
      projectName = 'Fintech Mobile Banking App 3.0';
    } else if (sampleKey === 'cloud-migration') {
      const csvFile = path.join(SAMPLES_DIR, 'cloud_migration_tracker.csv');
      if (fs.existsSync(csvFile)) {
        const buf = fs.readFileSync(csvFile);
        excelData = fileParser.parseExcelBuffer(buf, 'cloud_migration_tracker.csv');
      }
      suggestedPrompt = 'Emphasize database replication latency and IAM policy approvals for upcoming cutover.';
      projectName = 'Enterprise AWS Cloud Migration';
    } else {
      return res.status(400).json({ error: 'Unknown sample key' });
    }

    res.json({
      success: true,
      sampleKey,
      projectName,
      suggestedPrompt,
      data: {
        excelData,
        transcriptData
      }
    });
  } catch (err) {
    console.error('Error loading sample data:', err);
    res.status(500).json({ error: 'Failed to load sample dataset', details: err.message });
  }
});

// 4. Generate Daily Status Report (DSR)
app.post('/api/generate-dsr', async (req, res) => {
  try {
    let { excelData, transcriptData, userNotes, rawText, userAnswers = {}, apiKey = '' } = req.body;

    // Automatically parse rawText or userNotes if transcriptData is not explicitly provided
    if (!transcriptData && (rawText || userNotes)) {
      const textToParse = (rawText || userNotes).trim();
      if (textToParse) {
        transcriptData = fileParser.parseTranscriptText(textToParse, 'input_transcript.txt');
      }
    }

    const previousReports = storage.getReports();

    let report;
    if (apiKey && apiKey.trim().length > 15) {
      try {
        const prompt = `You are an elite Project Management AI Agent. Generate a strict JSON Daily Status Report (DSR) from these inputs:
        Excel Data: ${JSON.stringify(excelData?.tasks?.slice(0, 20) || [])}
        Transcript Data: ${JSON.stringify(transcriptData?.actionItems || [])} ${JSON.stringify(transcriptData?.decisions || [])} ${JSON.stringify(transcriptData?.blockers || [])}
        User Notes: ${userNotes || ''}
        Raw Text: ${rawText || ''}
        Clarifications: ${JSON.stringify(userAnswers)}
        Return JSON schema with: reportType='DSR', reportDate, projectName, projectHealth: {status: 'Green'|'Amber'|'Red', rationale, trend, confidenceScore}, executiveSummary, workCompletedToday: [{task, owner, notes}], tasksInProgress: [{task, owner, status, dueDate}], upcomingActivities: [{task, owner, targetDate}], blockersAndDependencies: [{description, relatedTask, owner, severity, impact}], risksAndIssues: [{risk, severity, mitigation}], keyDecisions: [{decision, owner}], actionItems: [{task, owner, priority, status}], additionalComments.`;
        report = await aiEngine.generateGeminiReport(prompt, apiKey.trim());
      } catch (geminiErr) {
        console.warn('Gemini API call failed, falling back to built-in high-fidelity engine:', geminiErr.message);
        report = aiEngine.generateOfflineDSR({ excelData, transcriptData, userNotes, rawText, userAnswers, previousReports });
        report.apiFallbackNotice = 'Generated with built-in high-fidelity NLP engine (Gemini API fallback)';
      }
    } else {
      report = aiEngine.generateOfflineDSR({ excelData, transcriptData, userNotes, rawText, userAnswers, previousReports });
    }

    res.json({ success: true, report });
  } catch (err) {
    console.error('Error generating DSR:', err);
    res.status(500).json({ error: 'Failed to generate DSR', details: err.message });
  }
});

// 5. Generate Weekly Status Report (WSR)
app.post('/api/generate-wsr', async (req, res) => {
  try {
    let { excelData, transcriptData, userNotes, rawText, userAnswers = {}, apiKey = '' } = req.body;

    // Automatically parse rawText or userNotes if transcriptData is not explicitly provided
    if (!transcriptData && (rawText || userNotes)) {
      const textToParse = (rawText || userNotes).trim();
      if (textToParse) {
        transcriptData = fileParser.parseTranscriptText(textToParse, 'input_transcript.txt');
      }
    }

    const previousReports = storage.getReports();

    let report;
    if (apiKey && apiKey.trim().length > 15) {
      try {
        const prompt = `You are an elite Executive Project Management AI Agent. Generate a strict JSON Weekly Status Report (WSR) consolidating these inputs:
        Excel Data: ${JSON.stringify(excelData?.tasks?.slice(0, 25) || [])}
        Transcript Data: ${JSON.stringify(transcriptData || {})}
        Historical Context: ${JSON.stringify(previousReports.slice(0, 3))}
        User Notes: ${userNotes || ''}
        Clarifications: ${JSON.stringify(userAnswers)}
        Return JSON schema with: reportType='WSR', reportingWeek, projectName, projectHealth: {status: 'Green'|'Amber'|'Red', rationale, trend, confidenceScore}, executiveSummary, managementAttentionRequired, keyAccomplishments: [{headline, impact, owner, type: 'Confirmed Fact'}], tasksCompleted: [{task, owner, source}], tasksInProgress: [{task, owner, status, targetDate}], plannedActivitiesNextWeek: [{activity, owner, targetRelease, priority}], milestonesAchieved: [{milestone, dateAchieved, status}], milestonesUpcoming: [{milestone, targetDate, status, owner}], risksAndIssues: [{risk, probability, impact, mitigation, owner, type: 'AI Observation'}], blockersAndDependencies: [{description, owner, severity, impact}], keyDecisions: [{decision, stakeholder, date}], pendingActionItems: [{action, owner, priority, dueDate}], additionalComments.`;
        report = await aiEngine.generateGeminiReport(prompt, apiKey.trim());
      } catch (geminiErr) {
        console.warn('Gemini API call failed, falling back to built-in high-fidelity engine:', geminiErr.message);
        report = aiEngine.generateOfflineWSR({ excelData, transcriptData, userNotes, rawText, userAnswers, previousReports });
        report.apiFallbackNotice = 'Generated with built-in high-fidelity NLP engine (Gemini API fallback)';
      }
    } else {
      report = aiEngine.generateOfflineWSR({ excelData, transcriptData, userNotes, rawText, userAnswers, previousReports });
    }

    res.json({ success: true, report });
  } catch (err) {
    console.error('Error generating WSR:', err);
    res.status(500).json({ error: 'Failed to generate WSR', details: err.message });
  }
});

// 6. Report Clarification Update
app.post('/api/clarify', (req, res) => {
  try {
    const { report, answers } = req.body;
    if (!report) return res.status(400).json({ error: 'Report object required' });

    // Apply user answers directly to report
    const updated = { ...report };

    if (answers.projectName) {
      updated.projectName = answers.projectName;
      updated.executiveSummary = updated.executiveSummary.replace(/Enterprise Transformation Initiative|Untitled Project/g, answers.projectName);
    }

    if (answers.blockerOwners) {
      if (updated.blockersAndDependencies) {
        updated.blockersAndDependencies.forEach(b => {
          if (!b.owner || b.owner === 'Needs Assignment' || b.owner === 'Unassigned') {
            b.owner = answers.blockerOwners;
          }
        });
      }
    }

    if (answers.nextSteps) {
      if (updated.upcomingActivities) {
        updated.upcomingActivities.unshift({
          task: answers.nextSteps,
          owner: 'Assigned Lead',
          targetDate: 'Next Cycle'
        });
      }
      if (updated.plannedActivitiesNextWeek) {
        updated.plannedActivitiesNextWeek.unshift({
          activity: answers.nextSteps,
          owner: 'Assigned Lead',
          targetRelease: 'Next Sprint',
          priority: 'High'
        });
      }
    }

    if (answers.upcomingMilestone && updated.milestonesUpcoming) {
      updated.milestonesUpcoming.unshift({
        milestone: answers.upcomingMilestone,
        targetDate: 'Target Date',
        status: 'Scheduled',
        owner: 'Project Lead'
      });
    }

    updated.clarificationNeeded = false;
    updated.missingInformation = [];
    updated.clarifiedAt = new Date().toISOString();

    res.json({ success: true, report: updated });
  } catch (err) {
    console.error('Clarification error:', err);
    res.status(500).json({ error: 'Failed to apply clarifications', details: err.message });
  }
});

// 7. Reports CRUD
app.get('/api/reports', (req, res) => {
  const { type, health, search } = req.query;
  let reports = storage.getReports();

  if (type) {
    reports = reports.filter(r => (r.reportType || '').toUpperCase() === type.toUpperCase());
  }
  if (health) {
    reports = reports.filter(r => (r.projectHealth?.status || '').toLowerCase() === health.toLowerCase());
  }
  if (search) {
    const term = search.toLowerCase();
    reports = reports.filter(r => 
      (r.projectName && r.projectName.toLowerCase().includes(term)) ||
      (r.executiveSummary && r.executiveSummary.toLowerCase().includes(term))
    );
  }

  res.json({ success: true, count: reports.length, reports });
});

app.get('/api/reports/:id', (req, res) => {
  const report = storage.getReportById(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json({ success: true, report });
});

app.post('/api/reports', (req, res) => {
  try {
    const reportData = req.body;
    if (!reportData || !reportData.reportType) {
      return res.status(400).json({ error: 'Invalid report data' });
    }
    const saved = storage.saveReport(reportData);

    // Acknowledge reminder if one was open
    reminderService.acknowledgeWithSubmission(saved.reportType, saved.id);

    res.json({ success: true, report: saved });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save report', details: err.message });
  }
});

app.delete('/api/reports/:id', (req, res) => {
  const success = storage.deleteReport(req.params.id);
  if (!success) return res.status(404).json({ error: 'Report not found or could not be deleted' });
  res.json({ success: true, message: 'Report deleted successfully' });
});

// 8. Historical Comparison between Two Reports
app.get('/api/reports/compare/:idA/:idB', (req, res) => {
  const repA = storage.getReportById(req.params.idA);
  const repB = storage.getReportById(req.params.idB);

  if (!repA || !repB) {
    return res.status(404).json({ error: 'One or both reports not found for comparison' });
  }

  // Calculate comparison metrics
  const comparison = {
    reportA: { id: repA.id, type: repA.reportType, date: repA.reportDate || repA.reportingWeek, health: repA.projectHealth?.status },
    reportB: { id: repB.id, type: repB.reportType, date: repB.reportDate || repB.reportingWeek, health: repB.projectHealth?.status },
    healthTrend: repA.projectHealth?.status === repB.projectHealth?.status ? 'Unchanged' : `${repA.projectHealth?.status} → ${repB.projectHealth?.status}`,
    blockerCountA: repA.blockersAndDependencies?.length || 0,
    blockerCountB: repB.blockersAndDependencies?.length || 0,
    blockerDelta: (repB.blockersAndDependencies?.length || 0) - (repA.blockersAndDependencies?.length || 0),
    resolvedBlockers: [],
    newBlockers: [],
    carryOverItems: []
  };

  const blockersA = (repA.blockersAndDependencies || []).map(b => b.description.toLowerCase());
  const blockersB = (repB.blockersAndDependencies || []).map(b => b.description.toLowerCase());

  // Check resolved vs new
  (repA.blockersAndDependencies || []).forEach(bA => {
    if (!blockersB.includes(bA.description.toLowerCase())) {
      comparison.resolvedBlockers.push(bA);
    }
  });

  (repB.blockersAndDependencies || []).forEach(bB => {
    if (!blockersA.includes(bB.description.toLowerCase())) {
      comparison.newBlockers.push(bB);
    } else {
      comparison.carryOverItems.push(bB);
    }
  });

  res.json({ success: true, comparison });
});

// 9. Automated Reminder System Endpoints
app.get('/api/reminders/config', (req, res) => {
  const config = storage.getRemindersConfig();
  const nextOccurrences = reminderService.calculateNextOccurrences();
  res.json({ success: true, config, nextOccurrences });
});

app.post('/api/reminders/config', (req, res) => {
  try {
    const updated = storage.saveRemindersConfig(req.body);
    reminderService.setupSchedules(); // reload cron
    const nextOccurrences = reminderService.calculateNextOccurrences();
    res.json({ success: true, config: updated, nextOccurrences });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update reminder settings', details: err.message });
  }
});

app.get('/api/reminders/history', (req, res) => {
  const history = storage.getReminderHistory();
  res.json({ success: true, count: history.length, history });
});

app.get('/api/reminders/alerts', (req, res) => {
  const alerts = reminderService.getPendingAlerts();
  res.json({ success: true, alerts });
});

app.post('/api/reminders/dismiss/:id', (req, res) => {
  reminderService.dismissAlert(req.params.id);
  res.json({ success: true, message: 'Alert acknowledged' });
});

// Instant manual test trigger for Daily or Weekly reminder
app.post('/api/reminders/trigger-test', (req, res) => {
  const { type = 'DSR' } = req.body;
  let result;
  if (type.toUpperCase() === 'WSR') {
    result = reminderService.triggerWeeklyReminder('manual_test');
  } else {
    result = reminderService.triggerDailyReminder('manual_test');
  }
  res.json({ success: true, result });
});

app.get('/api/reminders/next', (req, res) => {
  const next = reminderService.calculateNextOccurrences();
  res.json({ success: true, next });
});

// Test direct email delivery to notification email
app.post('/api/reminders/send-email-test', async (req, res) => {
  try {
    const { to, type = 'DSR', emailPass, emailUser, formspreeFormId, emailProvider } = req.body;
    
    // If credentials passed in test call, automatically persist them
    if (emailPass || formspreeFormId || emailProvider || emailUser) {
      storage.saveRemindersConfig({
        ...(emailPass ? { emailPass } : {}),
        ...(emailUser ? { emailUser } : {}),
        ...(formspreeFormId ? { formspreeFormId } : {}),
        ...(emailProvider ? { emailProvider } : {})
      });
    }

    const config = storage.getRemindersConfig();
    const mailer = require('./mailer');
    const result = await mailer.sendReminderEmail({
      to: to || config.notificationEmail || 'audhesh123@gmail.com',
      type,
      message: config.daily?.message || "Please submit your Daily Status Report (DSR).",
      scheduledTime: config.daily?.time,
      timezone: config.timezone,
      emailPass: emailPass || config.emailPass,
      emailUser: emailUser || config.emailUser || config.notificationEmail || 'audhesh123@gmail.com',
      formspreeId: formspreeFormId || config.formspreeFormId
    });

    if (result.success === false) {
      return res.status(400).json({ success: false, error: result.error, provider: result.provider });
    }

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` AI Status Reporting Agent Engine listening on port ${PORT}`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});

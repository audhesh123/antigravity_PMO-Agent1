const XLSX = require('xlsx');

/**
 * Normalizes header strings for flexible column matching
 */
function normalizeHeader(str) {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Classifies task status based on text heuristics
 */
function classifyStatus(statusStr) {
  if (!statusStr) return 'in_progress';
  const s = String(statusStr).toLowerCase().trim();
  if (s.includes('done') || s.includes('complete') || s.includes('closed') || s.includes('resolved') || s.includes('shipped') || s.includes('merged')) {
    return 'completed';
  }
  if (s.includes('block') || s.includes('stuck') || s.includes('hold') || s.includes('imped') || s.includes('dependency')) {
    return 'blocked';
  }
  if (s.includes('progress') || s.includes('ongoing') || s.includes('dev') || s.includes('active') || s.includes('testing') || s.includes('review')) {
    return 'in_progress';
  }
  if (s.includes('todo') || s.includes('to do') || s.includes('planned') || s.includes('backlog') || s.includes('next') || s.includes('upcoming')) {
    return 'upcoming';
  }
  return 'in_progress';
}

/**
 * Parses Excel buffer (XLSX, XLS, CSV) into structured items
 */
function parseExcelBuffer(buffer, originalFilename = 'data.xlsx') {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetNames = workbook.SheetNames;
    const allSheetsData = [];
    const extractedTasks = [];
    const extractedBlockers = [];

    sheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

      if (rows.length === 0) return;

      allSheetsData.push({
        sheetName,
        rowCount: rows.length,
        headers: Object.keys(rows[0]),
        sample: rows.slice(0, 5)
      });

      // Analyze rows for project tasks and blockers
      rows.forEach((row, idx) => {
        const keys = Object.keys(row);
        let taskName = '';
        let status = '';
        let owner = '';
        let priority = '';
        let blocker = '';
        let dueDate = '';
        let notes = '';

        keys.forEach(k => {
          const norm = normalizeHeader(k);
          const val = String(row[k]).trim();
          if (!val) return;

          if (norm.includes('task') || norm.includes('item') || norm.includes('summary') || norm.includes('title') || norm.includes('story') || norm.includes('feature') || norm.includes('description') && !taskName) {
            taskName = val;
          } else if (norm.includes('status') || norm.includes('state')) {
            status = val;
          } else if (norm.includes('assignee') || norm.includes('owner') || norm.includes('resource') || norm.includes('lead')) {
            owner = val;
          } else if (norm.includes('priority') || norm.includes('severity')) {
            priority = val;
          } else if (norm.includes('block') || norm.includes('impediment') || norm.includes('risk') || norm.includes('dependency')) {
            blocker = val;
          } else if (norm.includes('due') || norm.includes('date') || norm.includes('target') || norm.includes('deadline')) {
            dueDate = val;
          } else if (norm.includes('note') || norm.includes('comment') || norm.includes('update')) {
            notes = val;
          }
        });

        // If no explicit taskName was found but first column has text
        if (!taskName && keys.length > 0 && row[keys[0]]) {
          taskName = String(row[keys[0]]).trim();
        }

        if (taskName && taskName.length > 2) {
          const category = classifyStatus(status);
          const taskObj = {
            id: `task_${idx + 1}`,
            task: taskName,
            status: status || (category === 'completed' ? 'Completed' : 'In Progress'),
            category,
            owner: owner || 'Not Specified',
            priority: priority || 'Medium',
            dueDate: dueDate || '',
            notes: notes || '',
            sourceSheet: sheetName
          };
          extractedTasks.push(taskObj);

          if (blocker && blocker.toLowerCase() !== 'none' && blocker.toLowerCase() !== 'no' && blocker.toLowerCase() !== 'n/a') {
            extractedBlockers.push({
              id: `blk_${idx + 1}`,
              description: blocker,
              relatedTask: taskName,
              owner: owner || 'Unassigned',
              severity: priority.toLowerCase().includes('high') ? 'High' : 'Medium'
            });
          }
        }
      });
    });

    return {
      success: true,
      filename: originalFilename,
      sheets: sheetNames,
      sheetsMeta: allSheetsData,
      tasks: extractedTasks,
      blockers: extractedBlockers,
      totalTasks: extractedTasks.length
    };
  } catch (err) {
    console.error('Error parsing Excel:', err);
    return {
      success: false,
      filename: originalFilename,
      error: err.message,
      tasks: [],
      blockers: []
    };
  }
}

/**
 * Parses meeting transcripts, speaker statements, decisions, and action items
 */
function parseTranscriptText(text, filename = 'transcript.txt') {
  if (!text) return { success: false, filename, error: 'Empty transcript text' };

  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const speakers = new Set();
  const decisions = [];
  const actionItems = [];
  const blockers = [];
  const accomplishments = [];
  const inProgressUpdates = [];

  const decisionKeywords = ['decided', 'decision:', 'agreed to', 'agreed that', 'conclusion', 'consensus', 'will proceed with'];
  const blockerKeywords = ['blocked by', 'blocker:', 'stuck on', 'waiting on', 'waiting for', 'dependency:', 'impediment', 'delay due to', 'cannot proceed'];
  const actionKeywords = ['action item', 'action:', 'todo:', 'will take care of', 'will follow up', 'assigned to', 'assigned:', 'needs to complete', 'take the lead'];
  const accomplishmentKeywords = ['completed', 'finished', 'deployed', 'launched', 'shipped', 'merged', 'done with', 'resolved'];
  const inProgressKeywords = ['currently working on', 'working on', 'in progress', 'investigating', 'building', 'testing', 'reviewing'];

  lines.forEach((line, idx) => {
    // Check for speaker pattern: "Name: Content" or "Name (Role): Content" or "[00:12] Name: Content"
    const speakerMatch = line.match(/^(?:\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*)?([A-Z][a-zA-Z\s.-]+?)(?:\s*\([^)]+\))?:\s*(.+)$/i);
    let speaker = '';
    let speechContent = line;

    if (speakerMatch) {
      speaker = speakerMatch[1].trim();
      speechContent = speakerMatch[2].trim();
      if (speaker.length < 30 && !speaker.toLowerCase().includes('action') && !speaker.toLowerCase().includes('decision')) {
        speakers.add(speaker);
      }
    }

    const lower = speechContent.toLowerCase();

    // Decisions
    if (decisionKeywords.some(kw => lower.includes(kw))) {
      decisions.push({
        id: `dec_${idx + 1}`,
        statement: speechContent,
        speaker: speaker || 'Team',
        line: idx + 1
      });
    }

    // Blockers
    if (blockerKeywords.some(kw => lower.includes(kw))) {
      // Find owner if mentioned
      blockers.push({
        id: `blk_tr_${idx + 1}`,
        description: speechContent,
        owner: speaker || 'Unassigned',
        severity: lower.includes('critical') || lower.includes('urgent') || lower.includes('sever') ? 'High' : 'Medium'
      });
    }

    // Action items
    if (actionKeywords.some(kw => lower.includes(kw))) {
      // extract assignee
      let owner = speaker || 'Unassigned';
      const assignMatch = speechContent.match(/(?:for|to|owner:?)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (assignMatch && assignMatch[1]) {
        owner = assignMatch[1].trim();
      }

      actionItems.push({
        id: `act_${idx + 1}`,
        task: speechContent.replace(/^(action\s*item:?|todo:?)\s*/i, '').trim(),
        owner: owner,
        priority: lower.includes('high') || lower.includes('urgent') || lower.includes('asap') ? 'High' : 'Medium',
        status: 'Pending'
      });
    }

    // Accomplishments
    if (accomplishmentKeywords.some(kw => lower.includes(kw)) && !lower.includes('not completed') && !lower.includes('haven\'t')) {
      accomplishments.push({
        id: `acc_${idx + 1}`,
        description: speechContent,
        speaker: speaker || 'Team'
      });
    }

    // In-Progress
    if (inProgressKeywords.some(kw => lower.includes(kw))) {
      inProgressUpdates.push({
        id: `inp_${idx + 1}`,
        description: speechContent,
        speaker: speaker || 'Team'
      });
    }
  });

  return {
    success: true,
    filename,
    lineCount: lines.length,
    speakers: Array.from(speakers),
    decisions,
    actionItems,
    blockers,
    accomplishments,
    inProgressUpdates,
    rawText: text
  };
}

module.exports = {
  parseExcelBuffer,
  parseTranscriptText,
  classifyStatus
};

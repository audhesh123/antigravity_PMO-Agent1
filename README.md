# AI-Powered Daily & Weekly Status Reporting Agent

An intelligent, executive-grade AI agent that automatically generates professional **Daily Status Reports (DSR/DRS)** and **Weekly Status Reports (WSR)** from multi-format user inputs (Excel spreadsheets, meeting transcripts, and plain text notes), combined with an **Automated Reminder System** and **Historical Comparison Engine**.

---

## 🌟 Key Features

### 1. Multi-Format Input Ingestion
- **Excel Spreadsheets (`.xlsx`, `.xls`, `.csv`)**: Automatic parsing of sheets, task columns, assignees, priorities, and status indicators using SheetJS.
- **Meeting Transcripts (`.txt`, `.docx`, markdown)**: NLP extraction of speaker turns, technical decisions, blockers, and assigned action items.
- **Plain Text / Quick Notes**: Custom instructions, sprint notes, and direct developer standup summaries.
- **Multi-File Consolidation**: Combines sprint trackers with retro transcripts and leadership directives.
- **1-Click Interactive Demo Datasets**:
  - *Fintech Mobile App Sprint 4* (Authentic `.xlsx` backlog + audio standup transcript)
  - *AWS Cloud Migration & Security* (Infrastructure `.csv` tracker with database replication metrics)

### 2. Daily Status Report (DSR/DRS) Generation
Generates structured executive reports containing:
- **Report Date & Project Name**
- **Executive Summary**
- **Overall Project Status**: Dynamic **Green / Amber / Red** evaluation with confidence scores and clear justifications.
- **Work Completed Today**: Tabular deliverable view tagged as confirmed source facts.
- **Tasks Currently in Progress**: Active workstreams, owners, and target dates.
- **Upcoming Activities / Next Steps**: Immediate priorities for the next working cycle.
- **Blockers & Dependencies**: Severity level, impact analysis, and assigned resolver.
- **Risks & Issues Heatmap**: Proactive mitigations before schedule slippage occurs.
- **Key Decisions Logged**: Architectural and scope consensus from meeting transcripts.
- **Action Items & Owners**: Clear assignees, priorities, and pending statuses.
- **Additional Comments & Context Retention**

### 3. Weekly Status Report (WSR) Generation
Consolidates daily updates, multi-day trackers, and historical context into:
- **Reporting Week & Project Name**
- **Executive Summary**
- **Management Attention Required**: High-visibility escalation callout box for leadership intervention.
- **Key Accomplishments This Week**: Confirmed deliverables with business impact.
- **Tasks Completed vs In Progress**
- **Planned Activities for Next Week**
- **Milestones**: Achieved milestones and scheduled upcoming targets.
- **Risks & Issues Heatmap**: Probability vs Impact with strategic mitigations.
- **Blockers & Dependencies**
- **Pending Action Items & Key Decisions**
- **Confirmed Facts vs AI Observations**: Explicit visual tags distinguishing documented facts from AI-generated recommendations.

### 4. Interactive Follow-up Clarification System
- When source inputs lack critical attributes (e.g., missing project title, unassigned blocker owners, unclear deadlines), the AI agent displays an **Interactive Clarification Notice**.
- Asks targeted questions with pre-populated suggested options instead of inventing or hallucinating information.
- Updates the live report in real-time once answered.

### 5. Automated Reminder System
- **Daily Status Report Reminder**:
  - *Frequency*: Every day at **4:00 PM**
  - *Message*: *"Reminder: Please submit your Daily Status Report (DSR) with today's accomplishments, ongoing activities, blockers, and next steps."*
- **Weekly Status Report Reminder**:
  - *Frequency*: Every Friday at **3:00 PM**
  - *Message*: *"Reminder: Please prepare and submit your Weekly Status Report (WSR) summarizing this week's accomplishments, progress, blockers, risks, and next week's priorities."*
- **Timezone Support**: Configurable across all major world timezones (EST, PST, CST, GMT, CET, IST, SGT, UTC).
- **Channels**: In-App notifications banner/bell and simulated email dispatch.
- **Deduplication Guard**: Prevents redundant alerts within the same time window.
- **Delivery Audit Log**: Complete history tracking delivery status (`Delivered`, `Acknowledged`, `Report Submitted`).
- **Live Countdown Timers**: Real-time counter showing hours/minutes until the next reminder triggers.
- **Instant Test Trigger**: Simulates automated 4:00 PM and Friday 3:00 PM triggers immediately with one click.

### 6. Historical Comparison & Delta Engine
- Select any two reports (Baseline A vs Comparison B).
- Automatically calculates:
  - **Health Transition** (e.g., Amber → Green)
  - **Resolved Blockers** (impediments cleared between cycles)
  - **New Blockers** (newly identified risks)
  - **Carry-Over Items** (unresolved tasks persisting across cycles)
  - Side-by-side executive view

### 7. Multi-Format Export Options
- **Markdown**: Formatted for GitHub, GitLab, and Jira.
- **Slack / Microsoft Teams**: Ready-to-paste emoji and markdown format.
- **Clean HTML Email**: Executive email template with simulated send and preview.
- **Print / PDF Export**: High-resolution print styling for PDF generation.
- **JSON**: Machine-readable format for pipeline integrations.

---

## 🛠️ Technology Stack
- **Backend**: Node.js & Express
- **File Parsing**: SheetJS (`xlsx`) for Excel spreadsheets and CSVs
- **Scheduler**: `node-cron` with timezone management
- **Frontend**: Vanilla HTML5, Vanilla JavaScript, and a custom **Vanilla CSS Design System** (Glassmorphism, dark/light mode, micro-animations, no Tailwind dependency)
- **AI Engine**: High-fidelity offline heuristic NLP analyzer with optional **Google Gemini 2.0 Flash** integration via user-supplied API key.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
```bash
# Clone the repository
git clone https://github.com/audhesh123/antigravity_PMO-Agent1.git
cd antigravity_PMO-Agent1

# Install dependencies
npm install
```

### Running the Application
```bash
# Start server
npm start

# Or start in watch mode for development
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 📁 Project Structure

```
AD_AI_AGENT/
├── server/
│   ├── index.js                  # Express API server & routes
│   ├── ai-engine.js              # DSR/WSR heuristic NLP & Gemini integration
│   ├── file-parser.js            # Excel, CSV, and transcript parser
│   ├── reminders.js              # Automated cron reminder scheduler & deduplication
│   ├── sample-data-generator.js  # Pre-seeds demo datasets & authentic reports
│   └── storage.js                # JSON persistence layer
├── data/
│   ├── samples/
│   │   ├── mobile_app_sprint_tracker.xlsx
│   │   ├── sprint_retro_transcript.txt
│   │   └── cloud_migration_tracker.csv
│   ├── reports.json              # Saved reports repository
│   ├── reminders.json            # Reminder delivery audit log
│   └── config.json               # Reminder schedules and timezone settings
├── public/
│   ├── index.html                # Executive dashboard & report studio
│   ├── css/
│   │   ├── design-system.css     # CSS variables, typography, buttons, glassmorphism
│   │   └── style.css             # Component styling, layouts, and print CSS
│   └── js/
│       ├── api.js                # Client API methods
│       ├── app.js                # Global router, theme toggle, and alert polling
│       ├── dashboard.js          # KPI metrics, health distribution, recent reports
│       ├── generator.js          # File drag-and-drop, AI generation & clarification
│       ├── reminders.js          # Reminder schedules, tests, and audit logs
│       ├── historical.js         # Archive search & side-by-side delta comparison
│       └── export-utils.js       # Markdown, Slack, Email, PDF, and JSON exporters
└── package.json
```

---

## 🛡️ License
MIT License. Built for advanced engineering teams and project managers.

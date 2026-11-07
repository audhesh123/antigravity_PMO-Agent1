const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const SAMPLES_DIR = path.join(__dirname, '..', 'data', 'samples');
const REPORTS_FILE = path.join(__dirname, '..', 'data', 'reports.json');
const REMINDERS_FILE = path.join(__dirname, '..', 'data', 'reminders.json');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function generateSamples() {
  ensureDir(SAMPLES_DIR);

  // 1. Generate mobile_app_sprint_tracker.xlsx
  const xlsxPath = path.join(SAMPLES_DIR, 'mobile_app_sprint_tracker.xlsx');
  if (!fs.existsSync(xlsxPath)) {
    const wb = XLSX.utils.book_new();

    const tasksData = [
      { "Task ID": "MOB-101", "Task Name": "Implement Biometric FaceID / TouchID Login", "Assignee": "Marcus Vance", "Status": "Completed", "Priority": "High", "Due Date": "2026-11-06", "Blocker / Dependency": "None", "Notes": "Passed unit and security sandbox tests" },
      { "Task ID": "MOB-102", "Task Name": "Connect Stripe 3D-Secure 2.0 Payment Gateway", "Assignee": "Priya Sharma", "Status": "Blocked", "Priority": "Critical", "Due Date": "2026-11-07", "Blocker / Dependency": "Awaiting webhook secret key provisioning from SecOps vendor", "Notes": "Sandbox mock works; production keys pending" },
      { "Task ID": "MOB-103", "Task Name": "Push Notification PushKit & APNS Payload Optimization", "Assignee": "Elena Rostova", "Status": "In Progress", "Priority": "Medium", "Due Date": "2026-11-09", "Blocker / Dependency": "None", "Notes": "Battery drain benchmarks at 2% threshold" },
      { "Task ID": "MOB-104", "Task Name": "Offline SQLite Cache Synchronization Engine", "Assignee": "Dave Miller", "Status": "In Progress", "Priority": "High", "Due Date": "2026-11-10", "Blocker / Dependency": "Schema migration conflict in Android room database", "Notes": "Fixing migration versioning script" },
      { "Task ID": "MOB-105", "Task Name": "UI Dark Mode Contrast Accessibility Compliance", "Assignee": "Sarah Jenkins", "Status": "Completed", "Priority": "Low", "Due Date": "2026-11-05", "Blocker / Dependency": "None", "Notes": "WCAG 2.1 AAA contrast audit passed" },
      { "Task ID": "MOB-106", "Task Name": "Automated End-to-End Detox Testing Suite", "Assignee": "Raj Patel", "Status": "Upcoming", "Priority": "Medium", "Due Date": "2026-11-12", "Blocker / Dependency": "Waiting for CI runner provisioning", "Notes": "Test scripts drafted locally" },
      { "Task ID": "MOB-107", "Task Name": "User Profile Avatar Compression & S3 Upload", "Assignee": "Marcus Vance", "Status": "Completed", "Priority": "Medium", "Due Date": "2026-11-06", "Blocker / Dependency": "None", "Notes": "Reduced payload by 65% with WebP compression" }
    ];

    const allocationData = [
      { "Resource": "Marcus Vance", "Role": "Senior iOS Engineer", "Sprint Capacity (hrs)": 40, "Logged (hrs)": 38, "Status": "Active" },
      { "Resource": "Priya Sharma", "Role": "Backend Lead", "Sprint Capacity (hrs)": 40, "Logged (hrs)": 36, "Status": "Blocked on Vendor" },
      { "Resource": "Dave Miller", "Role": "Android Specialist", "Sprint Capacity (hrs)": 40, "Logged (hrs)": 34, "Status": "Active" },
      { "Resource": "Elena Rostova", "Role": "Mobile Architect", "Sprint Capacity (hrs)": 30, "Logged (hrs)": 28, "Status": "Active" },
      { "Resource": "Raj Patel", "Role": "QA Automation Lead", "Sprint Capacity (hrs)": 40, "Logged (hrs)": 30, "Status": "Waiting on CI" }
    ];

    const ws1 = XLSX.utils.json_to_sheet(tasksData);
    const ws2 = XLSX.utils.json_to_sheet(allocationData);

    XLSX.utils.book_append_sheet(wb, ws1, "Sprint 4 Backlog");
    XLSX.utils.book_append_sheet(wb, ws2, "Resource Allocation");

    XLSX.writeFile(wb, xlsxPath);
    console.log('[Samples] Created mobile_app_sprint_tracker.xlsx');
  }

  // 2. Generate sprint_retro_transcript.txt
  const transcriptPath = path.join(SAMPLES_DIR, 'sprint_retro_transcript.txt');
  if (!fs.existsSync(transcriptPath)) {
    const transcriptText = `[00:01] Sarah Jenkins (PM): Good morning everyone. Let's do our daily standup and weekly consolidation for the Fintech Mobile App project. Marcus, how are you looking on the auth stack?
[00:15] Marcus Vance (iOS Lead): Morning Sarah. Yesterday I completed the Biometric FaceID and TouchID login flow. It passed the local security keychain audits. Also finished user profile avatar compression to S3. Right now I'm working on the session renewal token logic. No personal blockers today.
[00:42] Priya Sharma (Backend Lead): On the backend side, I completed the Stripe 3D-Secure 2.0 endpoints in the sandbox. But I am currently blocked by the SecOps vendor. We are still waiting for the production webhook signing secret and compliance token. Until they deliver the keys, I cannot cut the release candidate for payments.
[01:10] Sarah Jenkins (PM): That is a critical blocker. Action item for Sarah: I will escalate this directly to the SecOps Vendor Director by 11:30 AM today to get those webhook keys unblocked.
[01:25] Dave Miller (Android): Hey everyone. I'm investigating the SQLite offline cache sync. I ran into a database schema migration conflict on Android Room DB. I'm working through it now, should have a PR ready by 4 PM.
[01:48] Elena Rostova (Mobile Architect): Agreed that we must avoid data wipe migrations. Decision: We agreed to keep backward compatibility with Room schema v2 fallback to prevent user session loss. Also, action item for Elena: Review Dave's PR by 5 PM.
[02:05] Raj Patel (QA): I finished writing the Detox regression test specs for biometric login. Blocked on the CI runner upgrade to macOS 14 for running iOS 18 simulators in GitHub Actions.
[02:22] Sarah Jenkins (PM): Okay. Decision: We will run the Detox test suite on the dedicated local build Mac Mini until the cloud CI runners are upgraded on Monday. Overall we are in Amber status due to the payment gateway blocker, but core UX is Green. Thank you team!`;

    fs.writeFileSync(transcriptPath, transcriptText, 'utf-8');
    console.log('[Samples] Created sprint_retro_transcript.txt');
  }

  // 3. Generate cloud_migration_tracker.csv
  const csvPath = path.join(SAMPLES_DIR, 'cloud_migration_tracker.csv');
  if (!fs.existsSync(csvPath)) {
    const csvContent = `Service Name,Target Cloud,Owner,Current Status,Cutover Date,Risk Level,Blockers
Kubernetes Cluster EKS,AWS us-east-1,David Chen,Completed,2026-11-04,Low,None
PostgreSQL Aurora Multi-AZ,AWS us-east-1,Sanjay Gupta,In Progress,2026-11-12,High,DMS Replication lag of 45 seconds during load test
Redis Elasticache Cluster,AWS us-east-1,Maria Torres,Completed,2026-11-05,Low,None
HashiCorp Vault Secrets Sync,AWS us-east-1,David Chen,Blocked,2026-11-08,Critical,Cross-account IAM role trust policy rejected by Security team
Kafka Event Streaming,AWS us-east-1,Sanjay Gupta,In Progress,2026-11-15,Medium,Broker throughput sizing review pending`;

    fs.writeFileSync(csvPath, csvContent, 'utf-8');
    console.log('[Samples] Created cloud_migration_tracker.csv');
  }

  // 4. Pre-seed reports.json if empty
  if (!fs.existsSync(REPORTS_FILE) || fs.readFileSync(REPORTS_FILE, 'utf-8').trim() === '[]') {
    const seedReports = [
      {
        id: "rep_dsr_fintech_01",
        reportType: "DSR",
        reportDate: "Thursday, Nov 6, 2026",
        projectName: "Fintech Mobile Banking App 3.0",
        projectHealth: {
          status: "Amber",
          rationale: "Caution state: 1 critical third-party vendor dependency on Stripe SecOps keys blocking payments release candidate.",
          trend: "Watch closely",
          confidenceScore: 95
        },
        executiveSummary: "On Thursday, Nov 6, 2026, the Fintech Mobile Banking App 3.0 team completed 3 critical deliverables including Biometric FaceID authentication and Avatar compression. Overall project health is AMBER due to an external SecOps key delay stalling the payments checkout stream.",
        workCompletedToday: [
          { task: "Implement Biometric FaceID / TouchID Login with Keychain validation", owner: "Marcus Vance", notes: "Passed unit and local security sandbox tests", source: "Excel Tracker" },
          { task: "User Profile Avatar Compression & S3 Upload pipeline", owner: "Marcus Vance", notes: "Reduced image payload by 65% via WebP converter", source: "Excel Tracker" },
          { task: "UI Dark Mode Contrast Accessibility Compliance (WCAG 2.1 AAA)", owner: "Sarah Jenkins", notes: "Audit passed with zero contrast warnings", source: "Excel Tracker" }
        ],
        tasksInProgress: [
          { task: "Connect Stripe 3D-Secure 2.0 Payment Gateway", owner: "Priya Sharma", status: "Blocked on Vendor", dueDate: "Target: Nov 7", source: "Excel Tracker" },
          { task: "Offline SQLite Cache Synchronization Engine", owner: "Dave Miller", status: "In Progress", dueDate: "Target: Nov 10", source: "Standup Notes" },
          { task: "Push Notification PushKit & APNS Payload Optimization", owner: "Elena Rostova", status: "In Progress", dueDate: "Target: Nov 9", source: "Excel Tracker" }
        ],
        upcomingActivities: [
          { task: "Escalate Stripe SecOps webhook signing keys to Vendor Director", owner: "Sarah Jenkins", targetDate: "Nov 7, 11:30 AM" },
          { task: "Merge Room DB schema migration backward compatibility fallback", owner: "Dave Miller & Elena Rostova", targetDate: "Nov 7, EOD" },
          { task: "Deploy test build to TestFlight internal tester ring", owner: "Marcus Vance", targetDate: "Nov 8" }
        ],
        blockersAndDependencies: [
          { description: "Awaiting production webhook signing secret key from SecOps vendor for Stripe 3DS2 checkout", relatedTask: "Connect Stripe 3D-Secure 2.0 Payment Gateway", owner: "Priya Sharma / Sarah Jenkins", severity: "High", impact: "Halts release candidate candidate build if not resolved within 24h" },
          { description: "CI runner upgrade to macOS 14 required for iOS 18 Detox automated testing", relatedTask: "Automated End-to-End Detox Testing Suite", owner: "Raj Patel", severity: "Medium", impact: "Temporary workaround using dedicated local Mac Mini runner" }
        ],
        risksAndIssues: [
          { risk: "Third-party vendor SLA breach on security key approval", severity: "High", mitigation: "PM scheduled direct executive sync with vendor director for emergency turnaround" },
          { risk: "Room DB schema migration conflict on Android devices with old cache", severity: "Medium", mitigation: "Enforced non-destructive migration fallback routine in code review" }
        ],
        keyDecisions: [
          { decision: "Maintain backward compatibility with Room schema v2 fallback to prevent user session loss", owner: "Elena Rostova & Dave Miller" },
          { decision: "Run Detox automated testing on dedicated local Mac Mini until cloud CI runners upgrade", owner: "Sarah Jenkins (PM)" }
        ],
        actionItems: [
          { task: "Escalate webhook signing secret with SecOps Vendor Director", owner: "Sarah Jenkins", priority: "High", status: "Pending" },
          { task: "Review and approve Dave's Room DB migration PR", owner: "Elena Rostova", priority: "High", status: "Pending" }
        ],
        additionalComments: "Overall velocity is high with 88% of sprint scope on track. Payment blocker is actively being managed.",
        confirmedFactsCount: 7,
        aiObservationsCount: 2,
        missingInformation: [],
        clarificationNeeded: false,
        createdAt: "2026-11-06T17:30:00.000Z",
        updatedAt: "2026-11-06T17:30:00.000Z"
      },
      {
        id: "rep_wsr_cloud_02",
        reportType: "WSR",
        reportingWeek: "Week 45 (Nov 02 - Nov 06, 2026)",
        projectName: "Enterprise AWS Cloud Migration & Security Modernization",
        projectHealth: {
          status: "Amber",
          rationale: "Database replication lag during peak load testing requires parameter tuning; HashiCorp Vault cross-account trust policy pending security sign-off.",
          trend: "Stable",
          confidenceScore: 96
        },
        executiveSummary: "For Week 45, the Enterprise AWS Cloud Migration team completed major infrastructure milestones including Amazon EKS Kubernetes cluster provisioning and Redis ElastiCache multi-node rollout. Project health is AMBER as we resolve cross-account IAM trust policies and Aurora PostgreSQL replication latency ahead of scheduled cutover.",
        managementAttentionRequired: "ATTENTION ADVISED: HashiCorp Vault cross-account IAM trust role requires Principal Security Architect sign-off by Monday 2 PM to avoid pushing the staging cutover window by 48 hours.",
        keyAccomplishments: [
          { headline: "Kubernetes EKS Production Cluster Provisioned", impact: "Fully configured with Terraform, Karpenter auto-scaling, and Datadog agents", owner: "David Chen", type: "Confirmed Fact" },
          { headline: "Redis ElastiCache Cluster Multi-AZ Deployed", impact: "Zero-latency session cache benchmarked at 180,000 ops/sec", owner: "Maria Torres", type: "Confirmed Fact" },
          { headline: "Network VPC Peering & Transit Gateway Routing Verified", impact: "Secured encrypted low-latency tunnel between on-prem data center and AWS", owner: "David Chen", type: "Confirmed Fact" }
        ],
        tasksCompleted: [
          { task: "Kubernetes Cluster EKS deployment in AWS us-east-1", owner: "David Chen", source: "Confirmed Fact" },
          { task: "Redis ElastiCache Multi-AZ Cluster rollout", owner: "Maria Torres", source: "Confirmed Fact" }
        ],
        tasksInProgress: [
          { task: "PostgreSQL Aurora Multi-AZ database synchronization", owner: "Sanjay Gupta", status: "In Progress", targetDate: "Nov 12" },
          { task: "Kafka Event Streaming broker throughput stress test", owner: "Sanjay Gupta", status: "In Progress", targetDate: "Nov 15" }
        ],
        plannedActivitiesNextWeek: [
          { activity: "Execute Aurora DMS replication latency parameter tuning with AWS Enterprise Support", owner: "Sanjay Gupta", targetRelease: "Nov 10", priority: "High" },
          { activity: "Resolve HashiCorp Vault cross-account IAM role trust policy", owner: "David Chen", targetRelease: "Nov 09", priority: "Critical" },
          { activity: "Conduct initial dry-run cutover rehearsal for non-critical telemetry microservices", owner: "Cloud Platform Pod", targetRelease: "Nov 13", priority: "High" }
        ],
        milestonesAchieved: [
          { milestone: "Core Compute & Caching Layer Infrastructure Certified", dateAchieved: "Nov 05", status: "Achieved" }
        ],
        milestonesUpcoming: [
          { milestone: "Staging Workload Cutover & End-to-End Smoke Test", targetDate: "Nov 14", status: "Scheduled", owner: "David Chen & Cloud Team" },
          { milestone: "Production Database Full Cutover", targetDate: "Nov 21", status: "Scheduled", owner: "Sanjay Gupta" }
        ],
        risksAndIssues: [
          { risk: "Database DMS replication latency exceeding 30-second target during batch bursts", probability: "Medium", impact: "High", mitigation: "Upgrading DMS replication instance to c6i.2xlarge and adjusting commit batch thresholds", owner: "Sanjay Gupta", type: "AI Observation" },
          { risk: "HashiCorp Vault IAM role security policy approval delay", probability: "High", impact: "High", mitigation: "Scheduled review session with Security Committee lead Monday 10:00 AM", owner: "David Chen", type: "AI Observation" }
        ],
        blockersAndDependencies: [
          { description: "Cross-account IAM role trust policy awaiting Security Architect approval", owner: "David Chen", severity: "High", impact: "Prevents automated secrets injection into EKS worker pods" }
        ],
        keyDecisions: [
          { decision: "Selected Karpenter over Cluster Autoscaler for 40% faster pod provisioning during peak traffic spikes", stakeholder: "David Chen & Architecture Review Board", date: "Nov 04" },
          { decision: "Scheduled DMS tuning maintenance window for Sunday 2:00 AM UTC", stakeholder: "Sanjay Gupta", date: "Nov 05" }
        ],
        pendingActionItems: [
          { action: "Submit updated IAM policy document to InfoSec compliance portal", owner: "David Chen", priority: "High", dueDate: "Monday Nov 09, 10:00 AM" },
          { action: "Review DMS replication metrics with AWS Enterprise Support TAM", owner: "Sanjay Gupta", priority: "High", dueDate: "Tuesday Nov 10" }
        ],
        additionalComments: "Overall infrastructure readiness is at 78%. Team remains on track for the Nov 21 production cutover target provided IAM blocker is resolved Monday.",
        confirmedFactsCount: 9,
        aiObservationsCount: 3,
        missingInformation: [],
        clarificationNeeded: false,
        createdAt: "2026-11-06T19:00:00.000Z",
        updatedAt: "2026-11-06T19:00:00.000Z"
      }
    ];

    fs.writeFileSync(REPORTS_FILE, JSON.stringify(seedReports, null, 2), 'utf-8');
    console.log('[Samples] Seeded initial reports in reports.json');
  }

  // 5. Pre-seed reminders.json with authentic delivery log history
  if (!fs.existsSync(REMINDERS_FILE) || fs.readFileSync(REMINDERS_FILE, 'utf-8').trim() === '[]') {
    const seedReminders = [
      {
        id: "rem_hist_01",
        timestamp: "2026-11-06T16:00:00.000Z",
        type: "DSR",
        channel: "In-App Notification + Email (team-lead@enterprise.com)",
        recipient: "team-lead@enterprise.com",
        message: "Reminder: Please submit your Daily Status Report (DSR) with today's accomplishments, ongoing activities, blockers, and next steps.",
        status: "Report Submitted",
        dedupKey: "DSR_2026-11-06",
        notes: "Report ID: rep_dsr_fintech_01",
        meta: { source: "scheduled", scheduledTime: "16:00", timezone: "America/New_York" }
      },
      {
        id: "rem_hist_02",
        timestamp: "2026-11-06T15:00:00.000Z",
        type: "WSR",
        channel: "In-App Notification + Email (team-lead@enterprise.com)",
        recipient: "team-lead@enterprise.com",
        message: "Reminder: Please prepare and submit your Weekly Status Report (WSR) summarizing this week's accomplishments, progress, blockers, risks, and next week's priorities.",
        status: "Report Submitted",
        dedupKey: "WSR_2026-W45",
        notes: "Report ID: rep_wsr_cloud_02",
        meta: { source: "scheduled", scheduledTime: "15:00", timezone: "America/New_York" }
      },
      {
        id: "rem_hist_03",
        timestamp: "2026-11-05T16:00:00.000Z",
        type: "DSR",
        channel: "In-App Notification + Email (team-lead@enterprise.com)",
        recipient: "team-lead@enterprise.com",
        message: "Reminder: Please submit your Daily Status Report (DSR) with today's accomplishments, ongoing activities, blockers, and next steps.",
        status: "Acknowledged",
        dedupKey: "DSR_2026-11-05",
        meta: { source: "scheduled", scheduledTime: "16:00", timezone: "America/New_York" }
      }
    ];
    fs.writeFileSync(REMINDERS_FILE, JSON.stringify(seedReminders, null, 2), 'utf-8');
    console.log('[Samples] Seeded reminder history in reminders.json');
  }
}

module.exports = {
  generateSamples,
  SAMPLES_DIR
};

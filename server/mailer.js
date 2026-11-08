const nodemailer = require('nodemailer');
const storage = require('./storage');

/**
 * Mailer service supporting Gmail SMTP, Formspree, Resend, and simulated dispatch
 */
class MailerService {
  constructor() {
    this.transporter = null;
  }

  /**
   * Generates a modern HTML email template for DSR / WSR reminders
   */
  generateReminderHtml({ to, type, message, scheduledTime, timezone, appUrl = 'http://localhost:3000' }) {
    const isWSR = type === 'WSR';
    const title = isWSR ? 'Weekly Status Report (WSR) Reminder' : 'Daily Status Report (DSR) Reminder';
    const reportLabel = isWSR ? 'Weekly WSR' : 'Daily DSR';
    const frequencyText = isWSR ? 'Every Friday' : 'Daily';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #f8fafc; }
    .card { max-width: 600px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 24px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-top: 8px; }
    .body { padding: 28px 24px; line-height: 1.6; color: #cbd5e1; }
    .greeting { font-size: 16px; color: #f8fafc; font-weight: 600; margin-bottom: 12px; }
    .message-box { background: #0f172a; border-left: 4px solid #6366f1; padding: 16px; border-radius: 6px; margin: 18px 0; color: #e2e8f0; font-size: 15px; }
    .checklist { background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 8px; padding: 16px; margin: 20px 0; }
    .checklist h3 { margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #818cf8; }
    .checklist ul { margin: 0; padding-left: 20px; }
    .checklist li { margin-bottom: 6px; font-size: 14px; color: #cbd5e1; }
    .btn-container { text-align: center; margin: 30px 0 15px 0; }
    .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4); }
    .footer { background: #0f172a; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #334155; }
    .meta-tag { display: inline-block; margin: 0 4px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🚀 ${title}</h1>
      <span class="badge">Action Required • ${reportLabel}</span>
    </div>
    <div class="body">
      <div class="greeting">Hello Audhesh,</div>
      <p>This is your automated reminder to compile and dispatch today's <strong>${reportLabel}</strong> to your stakeholders and team contributors.</p>
      
      <div class="message-box">
        "${message}"
      </div>

      <div class="checklist">
        <h3>📋 What to Include in Today's Update:</h3>
        <ul>
          <li><strong>Work Completed Today:</strong> Confirmed deliverables, merged PRs, and resolved tickets.</li>
          <li><strong>Tasks In Progress:</strong> Active workstreams, current owners, and target completion dates.</li>
          <li><strong>Blockers & Dependencies:</strong> Any roadblocks requiring PM or leadership escalation.</li>
          <li><strong>Next Steps:</strong> Priority items queued for the next working cycle.</li>
        </ul>
      </div>

      <div class="btn-container">
        <a href="${appUrl}" class="btn" target="_blank">Open AI Status Reporting Agent &rarr;</a>
      </div>
      <p style="text-align: center; font-size: 13px; color: #94a3b8; margin-top: 10px;">
        You can upload your Excel sprint tracker, paste standup notes, or click <em>Generate Report</em> in 1 click.
      </p>
    </div>
    <div class="footer">
      <div>Scheduled Frequency: <span class="meta-tag"><strong>${frequencyText} at ${scheduledTime || '16:00'}</strong> (${timezone || 'America/New_York'})</span></div>
      <div style="margin-top: 6px;">Triggered for: <strong>${to}</strong> • Antigravity AI Status Reporting Agent</div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Dispatches email via Gmail/SMTP, Formspree, Resend, or Simulated Fallback
   */
  async sendReminderEmail(options = {}) {
    const config = storage.getRemindersConfig();
    const {
      to,
      type = 'DSR',
      message,
      scheduledTime,
      timezone,
      appUrl
    } = options;

    const recipient = to || options.emailUser || config.notificationEmail || 'audhesh123@gmail.com';
    const subject = type === 'WSR' 
      ? `⏰ [Action Required] Weekly Status Report (WSR) Reminder - ${new Date().toLocaleDateString()}`
      : `⏰ [Action Required] Daily Status Report (DSR) Reminder - ${new Date().toLocaleDateString()}`;

    const html = this.generateReminderHtml({
      to: recipient,
      type,
      message,
      scheduledTime,
      timezone: timezone || config.timezone,
      appUrl
    });

    const plainText = `${type} Reminder:\n\n${message}\n\nPlease submit your status report at: ${appUrl || 'http://localhost:3000'}`;

    // 1. Check for Formspree integration
    const formspreeId = options.formspreeId || process.env.FORMSPREE_FORM_ID || config.formspreeFormId;
    if (config.emailProvider === 'formspree' && formspreeId) {
      try {
        console.log(`[MailerService] Sending via Formspree (Form: ${formspreeId}) to ${recipient}...`);
        const response = await fetch(`https://formspree.io/f/${formspreeId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            email: recipient,
            subject: subject,
            message: plainText,
            reportType: type,
            date: new Date().toISOString()
          })
        });

        if (response.ok) {
          console.log(`[MailerService] Successfully delivered via Formspree to ${recipient}`);
          return { success: true, provider: 'formspree', recipient };
        } else {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`Formspree error: ${response.status} ${JSON.stringify(errData)}`);
        }
      } catch (err) {
        console.warn(`[MailerService] Formspree dispatch failed: ${err.message}. Falling back.`);
      }
    }

    // 2. Check for SMTP / Gmail credentials (via options, environment, or config)
    const emailUser = options.emailUser || process.env.EMAIL_USER || config.emailUser || config.notificationEmail || 'audhesh123@gmail.com';
    let emailPass = (options.emailPass || process.env.EMAIL_PASS || config.emailPass || '').trim();

    // Strip any spaces from the 16-character Google App Password (e.g. "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
    if (emailPass) {
      emailPass = emailPass.replace(/\s+/g, '');
    }

    if (emailUser && emailPass) {
      try {
        console.log(`[MailerService] Dispatching via Gmail SMTP (${emailUser}) to ${recipient}...`);
        
        // Use Gmail service transport for Google accounts, or custom host if configured
        const transportConfig = emailUser.toLowerCase().includes('@gmail.com')
          ? {
              service: 'gmail',
              auth: {
                user: emailUser,
                pass: emailPass
              }
            }
          : {
              host: config.smtpHost || 'smtp.gmail.com',
              port: parseInt(config.smtpPort || 465, 10),
              secure: config.smtpSecure !== false,
              auth: {
                user: emailUser,
                pass: emailPass
              }
            };

        const transporter = nodemailer.createTransport(transportConfig);

        const info = await transporter.sendMail({
          from: `"AI Status Reporting Agent" <${emailUser}>`,
          to: recipient,
          subject: subject,
          text: plainText,
          html: html
        });

        console.log(`[MailerService] Email successfully sent to ${recipient}! Message ID: ${info.messageId}`);
        return { success: true, provider: 'smtp', messageId: info.messageId, recipient };
      } catch (err) {
        console.error(`[MailerService] SMTP sending failed:`, err);
        let userFriendlyError = err.message;
        if (err.code === 'EAUTH' || err.message.includes('535') || err.message.includes('BadCredentials')) {
          userFriendlyError = 'Gmail rejected authentication. Please ensure you generated a 16-character App Password at myaccount.google.com/apppasswords (do not use your regular personal Gmail password).';
        }
        return { success: false, provider: 'smtp', error: userFriendlyError };
      }
    }

    // 3. Fallback: Log and record simulated dispatch
    console.log(`[MailerService] [SIMULATED DISPATCH] No active SMTP/Formspree password configured. Prepared notification for ${recipient}.`);
    return {
      success: true,
      provider: 'simulated',
      recipient,
      note: 'To send live emails, enter your 16-character Gmail App Password and click Save Schedule Settings.'
    };
  }
}

module.exports = new MailerService();

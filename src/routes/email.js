import express from 'express';
import nodemailer from 'nodemailer';
import EmailLog from '../models/EmailLog.js';

const router = express.Router();

function buildTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || 'true') === 'true';
  const user = process.env.SMTP_USER || 'help@getallscripts.com';
  const pass = process.env.SMTP_PASS || '8v+swT4uz=O';

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

// Send email and log result
router.post('/send', async (req, res) => {
  const { to, subject, html, attachments, meta } = req.body || {};
  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'to, subject and html are required' });
  }

  const log = await EmailLog.create({ to, subject, html, status: 'queued', meta });

  try {
    const transporter = buildTransporter();
    const fromName = process.env.FROM_NAME || 'ZipBill';
    const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER || 'help@getallscripts.com';

    const info = await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
      attachments: attachments || [],
    });

    log.status = 'sent';
    log.provider_message_id = info.messageId;
    await log.save();

    res.json({ ok: true, messageId: info.messageId, log_id: log._id });
  } catch (err) {
    console.error('Email send failed:', err);
    log.status = 'failed';
    log.error = err?.message || String(err);
    await log.save();
    res.status(500).json({ error: log.error, log_id: log._id });
  }
});

export default router;
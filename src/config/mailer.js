const nodemailer = require('nodemailer');

let transporterPromise = null;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;

  const {
    SMTP_HOST,
    SMTP_PORT = '587',
    SMTP_SECURE,                 // "true"/"false"
    SMTP_USER,
    SMTP_PASS,
    SMTP_IGNORE_TLS_ERRORS,      // "true" pour dev local avec certs self-signed
  } = process.env;

  if (SMTP_HOST) {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: (SMTP_SECURE === 'true') || Number(SMTP_PORT) === 465,
      auth: (SMTP_USER && SMTP_PASS) ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
      tls: SMTP_IGNORE_TLS_ERRORS === 'true' ? { rejectUnauthorized: false } : undefined,
    });
    transporterPromise = Promise.resolve(transporter);
    return transporterPromise;
  }

  // --- MODE DEV AUTO : compte de test Ethereal ---
  const test = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: test.user, pass: test.pass },
  });
  transporter._isEthereal = true;
  transporterPromise = Promise.resolve(transporter);
  return transporterPromise;
}

async function sendMail({ to, subject, html, text }) {
  const transporter = await getTransporter();
  const from = process.env.MAIL_FROM || 'ABGYhuDJ <no-reply@abgyhudj.local>';
  const info = await transporter.sendMail({ from, to, subject, html, text });

  if (transporter._isEthereal) {
    const url = nodemailer.getTestMessageUrl(info);
    console.log('[mailer] Ethereal preview URL:', url);
  }
  return info;
}

module.exports = { sendMail };
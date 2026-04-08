const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  if (!to) throw new Error('Email recipient missing');
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('Email send not configured (SMTP_USER/SMTP_PASS missing).');
    return { success: true, warning: 'Email backend not configured; no real email sent.' };
  }

  const mailOptions = {
    from: `"${process.env.FROM_NAME || 'SheetalDies ERP'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
  return { success: true };
};

const sendSms = async (phone, message) => {
  if (!phone) throw new Error('SMS recipient missing');
  console.info(`SMS send requested to ${phone}: ${message}`);

  if (process.env.SMS_PROVIDER === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) {
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const resp = await twilio.messages.create({ body: message, from: process.env.TWILIO_FROM, to: phone });
    return { success: true, provider: 'twilio', sid: resp.sid };
  }

  return { success: true, warning: 'SMS provider not configured; only dummy log performed.' };
};

const sendWhatsApp = async (phone, message) => {
  if (!phone) throw new Error('WhatsApp recipient missing');
  console.info(`WhatsApp send requested to ${phone}: ${message}`);

  if (process.env.WHATSAPP_PROVIDER === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM) {
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const resp = await twilio.messages.create({ body: message, from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`, to: `whatsapp:${phone}` });
    return { success: true, provider: 'twilio', sid: resp.sid };
  }

  return { success: true, warning: 'WhatsApp provider not configured; only dummy log performed.' };
};

module.exports = { sendEmail, sendSms, sendWhatsApp };
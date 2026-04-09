const nodemailer = require('nodemailer');
const { toInt } = require('./normalize');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   toInt(process.env.SMTP_PORT, 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Send OTP Email ────────────────────────────────────────────
const sendOtpEmail = async (to, name, otp) => {
  const mailOptions = {
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to,
    subject: 'Your OTP - Sheetal Dies ERP Login',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #1B263B; padding: 24px 32px;">
          <h2 style="color: #fff; margin: 0; font-size: 18px; letter-spacing: 2px;">SHEETAL DIES ERP</h2>
          <p style="color: #94a3b8; margin: 4px 0 0; font-size: 11px;">Precision Engineering</p>
        </div>
        <div style="padding: 32px;">
          <p style="color: #1e293b; font-size: 15px;">Hi <strong>${name}</strong>,</p>
          <p style="color: #475569; font-size: 14px;">Your One-Time Password (OTP) for login is:</p>
          <div style="background: #f1f5f9; border-left: 4px solid #1B263B; padding: 20px 32px; margin: 24px 0; text-align: center;">
            <span style="font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #1B263B;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 12px;">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #cbd5e1; font-size: 11px;">Sheetal Dies & Tools Pvt. Ltd. &bull; ${process.env.COMPANY_ADDRESS}</p>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

// ── Send Welcome Email ────────────────────────────────────────
const sendWelcomeEmail = async (to, name, tempPassword) => {
  const mailOptions = {
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to,
    subject: 'Welcome to Sheetal Dies ERP - Account Created',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 480px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #1B263B; padding: 24px 32px;">
          <h2 style="color: #fff; margin: 0; font-size: 18px; letter-spacing: 2px;">SHEETAL DIES ERP</h2>
        </div>
        <div style="padding: 32px;">
          <p style="color: #1e293b; font-size: 15px;">Hi <strong>${name}</strong>, welcome aboard!</p>
          <p style="color: #475569; font-size: 14px;">Your ERP account has been created. Here are your login credentials:</p>
          <table style="width: 100%; background: #f8fafc; border-radius: 6px; padding: 16px; margin: 16px 0;">
            <tr><td style="font-size: 12px; color: #94a3b8; padding: 4px 0;">Email</td><td style="font-size: 13px; font-weight: 600; color: #1e293b;">${to}</td></tr>
            <tr><td style="font-size: 12px; color: #94a3b8; padding: 4px 0;">Temp Password</td><td style="font-size: 13px; font-weight: 600; color: #1e293b;">${tempPassword}</td></tr>
          </table>
          <p style="color: #ef4444; font-size: 12px;">Please change your password after first login.</p>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendOtpEmail, sendWelcomeEmail };

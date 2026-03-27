const nodemailer = require('nodemailer');
const { Resend }  = require('resend');

async function sendOtpEmail(toEmail, otpCode, type = 'reset') {
  // Always log OTP to console as fallback
  console.log(`[OTP] ${type.toUpperCase()} code for ${toEmail}: ${otpCode}`);

  const isRegister = type === 'register';
  const subject    = isRegister ? 'Verify Your PS-CRM Account' : 'Reset Your PS-CRM Password';
  const title      = isRegister ? 'Verify Your Email' : 'Reset Your Password';
  const message    = isRegister
    ? 'Welcome to PS-CRM! Please use the following 6-digit code to verify your account:'
    : 'We received a request to reset your password. Here is your 6-digit OTP:';

  const html = `
    <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
      <h2 style="color: #1e3a8a;">${title}</h2>
      <p>${message}</p>
      <div style="background: #f8fafc; padding: 20px; text-align: center; border-radius: 6px; margin: 20px 0;">
        <h1 style="color: #ff9933; letter-spacing: 8px; font-size: 36px; margin: 0; font-family: monospace;">${otpCode}</h1>
      </div>
      <p style="color: #64748b; font-size: 14px;">This code will expire in 24 hours.</p>
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">Smart Public Service CRM • Government of India Initiative</p>
    </div>
  `;

  // Priority 1: Gmail SMTP (works for any recipient)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: parseInt(process.env.EMAIL_PORT) === 465,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        tls: { rejectUnauthorized: false }
      });
      await transporter.sendMail({
        from: `"PS-CRM Admin" <${process.env.EMAIL_USER}>`,
        to: toEmail, subject, html
      });
      console.log(`[Email] ${type} OTP sent to ${toEmail} via Gmail`);
      return;
    } catch (err) {
      console.error('[Email] Gmail SMTP failed:', err.message, '→ trying Resend...');
    }
  }

  // Priority 2: Resend (fallback for Railway where SMTP is blocked)
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'PS-CRM <onboarding@resend.dev>',
        to: [toEmail], subject, html
      });
      console.log(`[Email] ${type} OTP sent to ${toEmail} via Resend`);
      return;
    } catch (err) {
      console.error('[Email] Resend failed:', err.message);
    }
  }

  console.log('[Email Mock] No email provider configured — OTP logged above only.');
}

module.exports = { sendOtpEmail };

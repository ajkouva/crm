const nodemailer = require('nodemailer');

// Use env variables. If missing, this will fail gracefully or just alert during send
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: parseInt(process.env.EMAIL_PORT) === 465, // true for 465, false for 587 (STARTTLS)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: { 
    rejectUnauthorized: false
  }
});

async function sendOtpEmail(toEmail, otpCode, type = 'reset') {
  // In development, if no email creds exist, just log it.
  if (!process.env.EMAIL_USER) {
    console.log(`[Email Mock] Would send ${type} OTP ${otpCode} to ${toEmail}`);
    return;
  }

  const isRegister = type === 'register';
  const subject    = isRegister ? 'Verify Your PS-CRM Account' : 'Reset Your PS-CRM Password';
  const title      = isRegister ? 'Verify Your Email' : 'Reset Your Password';
  const message    = isRegister 
    ? 'Welcome to PS-CRM! Please use the following 6-digit code to verify your account:'
    : 'We received a request to reset your password. Here is your 6-digit OTP:';

  try {
    const mailOptions = {
      from: `"PS-CRM Admin" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: subject,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #1e3a8a;">${title}</h2>
          <p>${message}</p>
          <div style="background: #f8fafc; padding: 20px; text-align: center; border-radius: 6px; margin: 20px 0;">
            <h1 style="color: #ff9933; letter-spacing: 8px; font-size: 36px; margin: 0; font-family: monospace;">${otpCode}</h1>
          </div>
          <p style="color: #64748b; font-size: 14px;">This code will expire in 24 hours. If you did not request this, please ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">Smart Public Service CRM • Government of India Initiative</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Email] ${type} OTP sent to ${toEmail}`);
  } catch (error) {
    console.error('[Email Error]', error.message);
  }
}

module.exports = { sendOtpEmail };

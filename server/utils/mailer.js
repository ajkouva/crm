const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendOtpEmail(toEmail, otpCode, type = 'reset') {
  // Always log OTP to console as fallback (visible in Railway logs)
  console.log(`[OTP] ${type.toUpperCase()} code for ${toEmail}: ${otpCode}`);

  if (!process.env.RESEND_API_KEY) {
    console.log('[Email Mock] RESEND_API_KEY not set — OTP logged above only.');
    return;
  }

  const isRegister = type === 'register';
  const subject    = isRegister ? 'Verify Your PS-CRM Account' : 'Reset Your PS-CRM Password';
  const title      = isRegister ? 'Verify Your Email' : 'Reset Your Password';
  const message    = isRegister
    ? 'Welcome to PS-CRM! Please use the following 6-digit code to verify your account:'
    : 'We received a request to reset your password. Here is your 6-digit OTP:';

  try {
    await resend.emails.send({
      from: 'PS-CRM <onboarding@resend.dev>',
      to: [toEmail],
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #1e3a8a;">${title}</h2>
          <p>${message}</p>
          <div style="background: #f8fafc; padding: 20px; text-align: center; border-radius: 6px; margin: 20px 0;">
            <h1 style="color: #ff9933; letter-spacing: 8px; font-size: 36px; margin: 0; font-family: monospace;">${otpCode}</h1>
          </div>
          <p style="color: #64748b; font-size: 14px;">This code will expire in 24 hours.</p>
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">Smart Public Service CRM • Government of India Initiative</p>
        </div>
      `
    });
    console.log(`[Email] ${type} OTP sent to ${toEmail} via Resend`);
  } catch (error) {
    console.error('[Email Error]', error.message);
  }
}

module.exports = { sendOtpEmail };

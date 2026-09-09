import pkg from '@getbrevo/brevo';
const { TransactionalEmailsApi, SendSmtpEmail, ApiClient } = pkg;

ApiClient.instance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;

const apiInstance = new TransactionalEmailsApi();

export const sendVerificationEmail = async (email, displayName, role, verificationLink) => {
  const roleDisplay = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User';
  const name = displayName || 'there';
  const year = new Date().getFullYear();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: #eef6f3;
          padding: 24px 16px;
          -webkit-font-smoothing: antialiased;
        }
        .wrapper {
          max-width: 600px;
          margin: 0 auto;
        }
        .container {
          background: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 24px 48px -12px rgba(6, 78, 59, 0.18);
          border: 1px solid #e5efe9;
        }
        .header {
          background: linear-gradient(135deg, #0f766e 0%, #059669 55%, #10b981 100%);
          padding: 44px 40px 34px;
          text-align: center;
        }
        .logo-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 20px;
  margin-bottom: 20px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  padding: 16px;
  overflow: hidden;
}
        .header h1 {
          font-size: 26px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.3px;
          margin-bottom: 6px;
        }
        .header p {
          color: rgba(255, 255, 255, 0.88);
          font-size: 15px;
          font-weight: 500;
        }
        .content {
          padding: 40px 40px 8px;
        }
        .eyebrow {
          display: inline-block;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: #059669;
          background: #ecfdf5;
          border: 1px solid #d1fae5;
          padding: 5px 12px;
          border-radius: 999px;
          margin-bottom: 18px;
        }
        .greeting {
          font-size: 21px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 14px;
        }
        .greeting span {
          color: #0d9488;
        }
        .message {
          color: #475569;
          line-height: 1.75;
          font-size: 15px;
        }
        .message p + p {
          margin-top: 10px;
        }
        .message strong {
          color: #0f172a;
        }
        .info-card {
          margin-top: 22px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .info-card .label {
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 4px;
        }
        .info-card .value {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }
        .info-card .role-chip {
          display: inline-block;
          background: #d1fae5;
          color: #047857;
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
        }
        .button-container {
          text-align: center;
          margin: 34px 0 8px;
        }
        .verify-button {
          display: inline-block;
          background: linear-gradient(135deg, #0d9488, #059669);
          color: #ffffff !important;
          padding: 16px 54px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          text-decoration: none;
          letter-spacing: 0.2px;
          box-shadow: 0 10px 24px -8px rgba(5, 150, 105, 0.55);
        }
        .expiry-note {
          text-align: center;
          font-size: 13px;
          color: #94a3b8;
          margin-top: 14px;
        }
        .divider {
          border: none;
          border-top: 1px solid #eef2f6;
          margin: 32px 0 24px;
        }
        .fallback {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px 18px;
        }
        .fallback p:first-child {
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .fallback .link-text {
          word-break: break-all;
          color: #0d9488;
          font-size: 13px;
          font-family: 'SFMono-Regular', Consolas, monospace;
        }
        .security-note {
          margin-top: 22px;
          padding: 14px 18px;
          border-radius: 12px;
          background: #fffbeb;
          border: 1px solid #fde68a;
        }
        .security-note p {
          color: #92400e;
          font-size: 13px;
          line-height: 1.6;
        }
        .footer {
          background: #f8fafc;
          padding: 28px 40px;
          text-align: center;
          border-top: 1px solid #eef2f6;
        }
        .footer .brand {
          color: #0d9488;
          font-weight: 700;
          font-size: 14px;
        }
        .footer p {
          color: #94a3b8;
          font-size: 12px;
          line-height: 1.7;
          margin-top: 4px;
        }
        .footer .links {
          margin-top: 14px;
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .footer .links a {
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
        }
        .footer .disclaimer {
          margin-top: 14px;
          font-size: 11px;
          color: #cbd5e1;
        }
        @media (max-width: 480px) {
          .header { padding: 32px 24px 26px; }
          .content { padding: 30px 24px 6px; }
          .footer { padding: 22px 24px; }
          .header h1 { font-size: 22px; }
          .info-card { flex-direction: column; align-items: flex-start; gap: 8px; }
          .verify-button { padding: 14px 0; width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <div class="logo-placeholder">
  <img src="https://firebasestorage.googleapis.com/v0/b/aarogyasandesh-1e4b8.firebasestorage.app/o/public%2FLogo.png?alt=media&token=760c0009-f56f-4983-9d29-97920b2a8c2f" alt="AarogyaSandesh Logo" style="width: 100%; height: 100%; object-fit: contain;" />
</div>
            <h1>AarogyaSandesh</h1>
            <p>A Health Update, Delivered</p>
          </div>

          <div class="content">
            <span class="eyebrow">Email Verification</span>
            <div class="greeting">Hello${name ? ` <span>${name}</span>` : ''} 👋</div>

            <div class="message">
              <p>Thank you for choosing <strong>AarogyaSandesh</strong> to manage your health updates.</p>
              <p>You're just one step away from accessing your dashboard. Please verify your email address to complete your registration.</p>
            </div>

            <div class="info-card">
              <div>
                <div class="label">Account</div>
                <div class="value">${email}</div>
              </div>
              <span class="role-chip">${roleDisplay}</span>
            </div>

            <div class="button-container">
              <a href="${verificationLink}" class="verify-button">Verify My Account</a>
            </div>
            <p class="expiry-note">This link is valid for a limited time.</p>

            <hr class="divider">

            <div class="fallback">
              <p>Or copy and paste this link into your browser:</p>
              <p class="link-text">${verificationLink}</p>
            </div>

            <div class="security-note">
              <p><strong>Didn't request this?</strong> If you didn't create an account with AarogyaSandesh, you can safely ignore this email — no further action is needed.</p>
            </div>
          </div>

          <div class="footer">
            <div class="brand">AarogyaSandesh</div>
            <p>Bringing healthcare closer to you.</p>
            <div class="links">
              <a href="http://localhost:5173/login">Login</a>
              <a href="http://localhost:5173/register">Register</a>
              <a href="mailto:aarogyasandesh.support@gmail.com">Support</a>
            </div>
            <p class="disclaimer">© ${year} AarogyaSandesh. All rights reserved.<br>You received this email because you registered on AarogyaSandesh.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hello ${name},

Thank you for choosing AarogyaSandesh to manage your health updates.

You're just one step away from accessing your ${roleDisplay} dashboard.
Please verify your email address by clicking the link below:

${verificationLink}

If you didn't request this, you can safely ignore this email.

---
AarogyaSandesh — Bringing healthcare closer to you.
© ${year} AarogyaSandesh. All rights reserved.
  `;

  const sendSmtpEmail = new SendSmtpEmail();
  sendSmtpEmail.subject = `🔐 Verify Your AarogyaSandesh Account`;
  sendSmtpEmail.to = [{ email: email, name: displayName || 'User' }];
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.textContent = textContent;
  sendSmtpEmail.sender = {
    name: 'AarogyaSandesh',
    email: 'aarogyasandesh.support@gmail.com'
  };
  sendSmtpEmail.replyTo = {
    email: 'aarogyasandesh.support@gmail.com',
    name: 'AarogyaSandesh Support'
  };

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Verification email sent to:', email);
    console.log('📧 Message ID:', response.messageId);
    return { success: true, messageId: response.messageId };
  } catch (error) {
    console.error('❌ Brevo error:', error.response?.body || error.message);
    throw error;
  }
};

export const sendPasswordResetEmail = async (email, displayName, resetLink) => {
  const name = displayName || 'User';
  const year = new Date().getFullYear();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #eef6f3; padding: 24px 16px; -webkit-font-smoothing: antialiased; }
        .wrapper { max-width: 600px; margin: 0 auto; }
        .container { background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 24px 48px -12px rgba(6, 78, 59, 0.18); border: 1px solid #e5efe9; }
        .header { background: linear-gradient(135deg, #0f766e 0%, #059669 55%, #10b981 100%); padding: 44px 40px 34px; text-align: center; }
        .logo-placeholder { display: inline-flex; align-items: center; justify-content: center; width: 100px; height: 100px; background: rgba(255,255,255,0.16); border-radius: 20px; margin-bottom: 20px; border: 2px solid rgba(255,255,255,0.35); padding: 16px; overflow: hidden; }
        .header h1 { font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px; margin-bottom: 6px; }
        .header p { color: rgba(255,255,255,0.88); font-size: 15px; font-weight: 500; }
        .content { padding: 40px 40px 8px; }
        .eyebrow { display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: #059669; background: #ecfdf5; border: 1px solid #d1fae5; padding: 5px 12px; border-radius: 999px; margin-bottom: 18px; }
        .greeting { font-size: 21px; font-weight: 700; color: #0f172a; margin-bottom: 14px; }
        .greeting span { color: #0d9488; }
        .message { color: #475569; line-height: 1.75; font-size: 15px; }
        .message p + p { margin-top: 10px; }
        .message strong { color: #0f172a; }
        .button-container { text-align: center; margin: 34px 0 8px; }
        .reset-button { display: inline-block; background: linear-gradient(135deg, #0d9488, #059669); color: #ffffff !important; padding: 16px 54px; border-radius: 12px; font-size: 16px; font-weight: 700; text-decoration: none; letter-spacing: 0.2px; box-shadow: 0 10px 24px -8px rgba(5, 150, 105, 0.55); }
        .expiry-note { text-align: center; font-size: 13px; color: #94a3b8; margin-top: 14px; }
        .divider { border: none; border-top: 1px solid #eef2f6; margin: 32px 0 24px; }
        .fallback { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; }
        .fallback p:first-child { color: #64748b; font-size: 13px; font-weight: 600; margin-bottom: 8px; }
        .fallback .link-text { word-break: break-all; color: #0d9488; font-size: 13px; font-family: 'SFMono-Regular', Consolas, monospace; }
        .security-note { margin-top: 22px; padding: 14px 18px; border-radius: 12px; background: #fffbeb; border: 1px solid #fde68a; }
        .security-note p { color: #92400e; font-size: 13px; line-height: 1.6; }
        .footer { background: #f8fafc; padding: 28px 40px; text-align: center; border-top: 1px solid #eef2f6; }
        .footer .brand { color: #0d9488; font-weight: 700; font-size: 14px; }
        .footer p { color: #94a3b8; font-size: 12px; line-height: 1.7; margin-top: 4px; }
        .footer .links { margin-top: 14px; display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }
        .footer .links a { color: #64748b; font-size: 12px; font-weight: 600; text-decoration: none; }
        .footer .disclaimer { margin-top: 14px; font-size: 11px; color: #cbd5e1; }
        @media (max-width: 480px) {
          .header { padding: 32px 24px 26px; }
          .content { padding: 30px 24px 6px; }
          .footer { padding: 22px 24px; }
          .header h1 { font-size: 22px; }
          .reset-button { padding: 14px 0; width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <div class="logo-placeholder">
              <img src="https://firebasestorage.googleapis.com/v0/b/aarogyasandesh-1e4b8.firebasestorage.app/o/public%2FLogo.png?alt=media&token=760c0009-f56f-4983-9d29-97920b2a8c2f" alt="AarogyaSandesh Logo" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>
            <h1>AarogyaSandesh</h1>
            <p>Reset Your Password</p>
          </div>

          <div class="content">
            <span class="eyebrow">Password Reset</span>
            <div class="greeting">Hello <span>${name}</span> 👋</div>

            <div class="message">
              <p>We received a request to reset the password for your <strong>AarogyaSandesh</strong> account.</p>
              <p>Click the button below to create a new password.</p>
            </div>

            <div class="button-container">
              <a href="${resetLink}" class="reset-button">Reset My Password</a>
            </div>
            <p class="expiry-note">This link is valid for a limited time.</p>

            <hr class="divider">

            <div class="fallback">
              <p>Or copy and paste this link into your browser:</p>
              <p class="link-text">${resetLink}</p>
            </div>

            <div class="security-note">
              <p><strong>Didn't request this?</strong> If you didn't request a password reset, you can safely ignore this email — your account remains secure.</p>
            </div>
          </div>

          <div class="footer">
            <div class="brand">AarogyaSandesh</div>
            <p>Bringing healthcare closer to you.</p>
            <div class="links">
              <a href="http://localhost:5173/login">Login</a>
              <a href="http://localhost:5173/register">Register</a>
              <a href="mailto:aarogyasandesh.support@gmail.com">Support</a>
            </div>
            <p class="disclaimer">© ${year} AarogyaSandesh. All rights reserved.<br>You received this email because you requested a password reset.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hello ${name},

We received a request to reset the password for your AarogyaSandesh account.

Click the link below to create a new password:
${resetLink}

If you didn't request this, you can safely ignore this email.

---
AarogyaSandesh — Bringing healthcare closer to you.
© ${year} AarogyaSandesh. All rights reserved.
  `;

  const sendSmtpEmail = new SendSmtpEmail();
  sendSmtpEmail.subject = '🔐 Reset Your AarogyaSandesh Password';
  sendSmtpEmail.to = [{ email: email, name: displayName || 'User' }];
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.textContent = textContent;
  sendSmtpEmail.sender = {
    name: 'AarogyaSandesh',
    email: 'aarogyasandesh.support@gmail.com'
  };
  sendSmtpEmail.replyTo = {
    email: 'aarogyasandesh.support@gmail.com',
    name: 'AarogyaSandesh Support'
  };

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Password reset email sent to:', email);
    console.log('📧 Message ID:', response.messageId);
    return { success: true, messageId: response.messageId };
  } catch (error) {
    console.error('❌ Brevo error:', error.response?.body || error.message);
    throw error;
  }
};

export const sendConsentOTPEmail = async (email, displayName, consentType, explanation, otp) => {
  const name = displayName || 'User';
  const year = new Date().getFullYear();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Consent Request OTP</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #eef6f3; padding: 24px 16px; }
        .wrapper { max-width: 600px; margin: 0 auto; }
        .container { background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 24px 48px -12px rgba(6, 78, 59, 0.18); border: 1px solid #e5efe9; }
        .header { background: linear-gradient(135deg, #0f766e 0%, #059669 55%, #10b981 100%); padding: 44px 40px 34px; text-align: center; }
        .logo-placeholder { display: inline-flex; align-items: center; justify-content: center; width: 100px; height: 100px; background: rgba(255,255,255,0.16); border-radius: 20px; margin-bottom: 20px; border: 2px solid rgba(255,255,255,0.35); padding: 16px; overflow: hidden; }
        .header h1 { font-size: 26px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px; margin-bottom: 6px; }
        .header p { color: rgba(255,255,255,0.88); font-size: 15px; font-weight: 500; }
        .content { padding: 40px 40px 8px; }
        .otp-box { background: #f0fdfa; border: 2px solid #0d9488; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0; }
        .otp-code { font-size: 48px; font-weight: 700; color: #0d9488; letter-spacing: 12px; font-family: 'Courier New', monospace; }
        .divider { border: none; border-top: 1px solid #eef2f6; margin: 32px 0 24px; }
        .footer { background: #f8fafc; padding: 28px 40px; text-align: center; border-top: 1px solid #eef2f6; }
        .footer .brand { color: #0d9488; font-weight: 700; font-size: 14px; }
        .footer p { color: #94a3b8; font-size: 12px; line-height: 1.7; margin-top: 4px; }
        @media (max-width: 480px) {
          .header { padding: 32px 24px 26px; }
          .content { padding: 30px 24px 6px; }
          .footer { padding: 22px 24px; }
          .otp-code { font-size: 32px; letter-spacing: 8px; }
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <div class="logo-placeholder">
              <img src="https://firebasestorage.googleapis.com/v0/b/aarogyasandesh-1e4b8.firebasestorage.app/o/public%2FLogo.png?alt=media&token=760c0009-f56f-4983-9d29-97920b2a8c2f" alt="AarogyaSandesh Logo" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>
            <h1>AarogyaSandesh</h1>
            <p>Consent Request</p>
          </div>

          <div class="content">
            <h2 style="color: #0f172a; font-size: 22px; margin-bottom: 12px;">Hello ${name} 👋</h2>
            <p style="color: #475569; line-height: 1.75; font-size: 15px;">
              A new consent request has been submitted for your family member.
            </p>
            <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin: 16px 0;">
              <p style="font-size: 14px; color: #64748b;"><strong>Type:</strong> ${consentType}</p>
              <p style="font-size: 14px; color: #64748b;"><strong>Explanation:</strong> ${explanation}</p>
            </div>
            <p style="color: #475569; line-height: 1.75; font-size: 15px;">
              Please use the following OTP to approve or reject this consent request:
            </p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            <p style="color: #94a3b8; font-size: 13px; text-align: center;">
              This OTP is valid for a limited time.
            </p>
            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 14px 18px; margin-top: 22px;">
              <p style="color: #92400e; font-size: 13px; line-height: 1.6;">
                <strong>Security Note:</strong> Never share this OTP with anyone. AarogyaSandesh staff will never ask for your OTP.
              </p>
            </div>
          </div>

          <div class="footer">
            <div class="brand">AarogyaSandesh</div>
            <p>Bringing healthcare closer to you.</p>
            <p class="disclaimer" style="margin-top: 14px; font-size: 11px; color: #cbd5e1;">© ${year} AarogyaSandesh. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Hello ${name},

A new consent request has been submitted for your family member.

Type: ${consentType}
Explanation: ${explanation}

Your OTP to approve/reject this consent is: ${otp}

This OTP is valid for a limited time.

Security Note: Never share this OTP with anyone.

---
AarogyaSandesh — Bringing healthcare closer to you.
© ${year} AarogyaSandesh. All rights reserved.
  `;

  const sendSmtpEmail = new SendSmtpEmail();
  sendSmtpEmail.subject = `🔐 Consent Request OTP - AarogyaSandesh`;
  sendSmtpEmail.to = [{ email: email, name: displayName || 'User' }];
  sendSmtpEmail.htmlContent = htmlContent;
  sendSmtpEmail.textContent = textContent;
  sendSmtpEmail.sender = {
    name: 'AarogyaSandesh',
    email: 'aarogyasandesh.support@gmail.com'
  };
  sendSmtpEmail.replyTo = {
    email: 'aarogyasandesh.support@gmail.com',
    name: 'AarogyaSandesh Support'
  };

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Consent OTP email sent to:', email);
    return { success: true, messageId: response.messageId };
  } catch (error) {
    console.error('❌ Brevo error:', error.response?.body || error.message);
    throw error;
  }
};
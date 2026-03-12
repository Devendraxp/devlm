import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "DevLM"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log("Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

// Shared email wrapper — keeps all templates consistent
function emailWrapper(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f7f3;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;margin:40px auto;">
    <!-- Header -->
    <tr>
      <td style="background-color:#1a3d2b;padding:32px;text-align:center;border-radius:12px 12px 0 0;">
        <div style="display:inline-block;width:44px;height:44px;background-color:#3a9e6e;border-radius:10px;text-align:center;line-height:44px;margin-bottom:12px;font-size:22px;font-weight:700;color:#ffffff;">D</div>
        <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">DevLM</div>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="background-color:#ffffff;padding:40px 40px 32px;border-left:1px solid #d1e8db;border-right:1px solid #d1e8db;">
        ${bodyHtml}
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background-color:#f8faf9;padding:24px;text-align:center;border:1px solid #d1e8db;border-top:none;border-radius:0 0 12px 12px;">
        <p style="color:#6b7280;font-size:12px;margin:0;line-height:1.6;">
          This is an automated message from DevLM. Please do not reply to this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function getVerificationEmailTemplate(verificationUrl: string) {
  const body = `
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;font-weight:700;">Verify your email address</h2>
    <p style="color:#374151;margin:0 0 24px;font-size:15px;line-height:1.6;">
      Thanks for signing up! Click the button below to verify your email and get automatically signed in to DevLM.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${verificationUrl}"
         style="display:inline-block;background-color:#3a9e6e;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.1px;">
        Verify Email &amp; Sign In
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:0 0 12px;line-height:1.6;">
      This link will expire in <strong>1 hour</strong>. If you didn&apos;t create a DevLM account, you can safely ignore this email.
    </p>
    <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.5;word-break:break-all;">
      Or copy this link into your browser:<br>
      <a href="${verificationUrl}" style="color:#3a9e6e;">${verificationUrl}</a>
    </p>
  `;

  return {
    subject: "Verify your email address – DevLM",
    html: emailWrapper("Verify Your Email", body),
    text: `Verify your DevLM email by clicking: ${verificationUrl}\n\nThis link expires in 1 hour.`,
  };
}

export function getOTPEmailTemplate(
  otp: string,
  title: string = "Your Verification Code",
  expiresInMinutes: number = 10,
) {
  const body = `
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;font-weight:700;">${title}</h2>
    <p style="color:#374151;margin:0 0 24px;font-size:15px;line-height:1.6;">
      Use the code below to complete your sign-in. Do not share this code with anyone.
    </p>
    <div style="background-color:#e6f4ed;border:1px solid #b4d9c6;border-radius:10px;padding:28px;text-align:center;margin:0 0 24px;">
      <div style="font-size:40px;font-weight:700;letter-spacing:12px;color:#1a3d2b;font-family:'Courier New',Courier,monospace;">
        ${otp}
      </div>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:0 0 8px;line-height:1.6;">
      This code expires in <strong>${expiresInMinutes} minutes</strong>.
    </p>
    <p style="color:#6b7280;font-size:13px;margin:0;line-height:1.6;">
      If you didn&apos;t request this code, please ignore this email or contact support.
    </p>
  `;

  return {
    subject: `${title} – DevLM`,
    html: emailWrapper(title, body),
    text: `Your ${title} is: ${otp}\n\nThis code expires in ${expiresInMinutes} minutes. If you didn't request this, please ignore this email.`,
  };
}

export function getPasswordResetEmailTemplate(resetUrl: string) {
  const body = `
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;font-weight:700;">Reset your password</h2>
    <p style="color:#374151;margin:0 0 24px;font-size:15px;line-height:1.6;">
      We received a request to reset your DevLM password. Click the button below to choose a new password.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}"
         style="display:inline-block;background-color:#3a9e6e;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.1px;">
        Reset Password
      </a>
    </div>
    <p style="color:#6b7280;font-size:13px;margin:0 0 12px;line-height:1.6;">
      This link expires in <strong>1 hour</strong>. If you didn&apos;t request a password reset, you can safely ignore this email.
    </p>
    <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.5;word-break:break-all;">
      Or copy this link into your browser:<br>
      <a href="${resetUrl}" style="color:#3a9e6e;">${resetUrl}</a>
    </p>
  `;

  return {
    subject: "Reset your password – DevLM",
    html: emailWrapper("Reset Your Password", body),
    text: `Reset your DevLM password by clicking: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, please ignore this email.`,
  };
}

export function getWelcomeEmailTemplate(
  name: string,
  email: string,
  temporaryPassword?: string,
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  const body = `
    <h2 style="color:#111827;margin:0 0 8px;font-size:22px;font-weight:700;">Welcome to DevLM, ${name || "there"}!</h2>
    <p style="color:#374151;margin:0 0 24px;font-size:15px;line-height:1.6;">
      Your account has been created by an administrator. Here are your account details:
    </p>
    <div style="background-color:#e6f4ed;border:1px solid #b4d9c6;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
      <p style="margin:0 0 8px;font-size:14px;color:#374151;"><strong>Email:</strong> ${email}</p>
      ${temporaryPassword
        ? `<p style="margin:0;font-size:14px;color:#374151;"><strong>Temporary Password:</strong> <code style="background-color:#ffffff;padding:2px 6px;border-radius:4px;font-family:'Courier New',Courier,monospace;">${temporaryPassword}</code></p>`
        : ""}
    </div>
    ${temporaryPassword
      ? `<p style="color:#b45309;font-size:14px;margin:0 0 24px;line-height:1.6;background-color:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;">
          Please change your password after your first sign-in for security.
        </p>`
      : ""}
    <div style="text-align:center;margin:32px 0;">
      <a href="${appUrl}/login"
         style="display:inline-block;background-color:#3a9e6e;color:#ffffff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.1px;">
        Sign In to DevLM
      </a>
    </div>
  `;

  return {
    subject: "Welcome to DevLM – Your account is ready",
    html: emailWrapper("Welcome to DevLM", body),
    text: `Welcome to DevLM, ${name || "there"}!\n\nYour account has been created.\nEmail: ${email}${temporaryPassword ? `\nTemporary Password: ${temporaryPassword}\n\nPlease change your password after signing in.` : ""}\n\nSign in at: ${appUrl}/login`,
  };
}

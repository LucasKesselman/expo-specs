/**
 * Email sending via Resend for Cloud Functions.
 * Config: apiKey and from are passed by the caller (from env or Firebase config).
 */

import { Resend } from "resend";

export type EmailConfig = { apiKey: string; from: string };

export async function sendWelcomeEmail(
  config: EmailConfig,
  to: string,
  displayName?: string | null
): Promise<void> {
  const resend = new Resend(config.apiKey);
  const name = displayName ?? to.split("@")[0];
  await resend.emails.send({
    from: config.from,
    to: [to],
    subject: "Welcome to Artie Apparel",
    html: `
      <h1>Welcome, ${escapeHtml(name)}!</h1>
      <p>Thanks for signing up. We're glad to have you.</p>
      <p>You can start exploring designs and shop tees in the app.</p>
      <p>— The Artie Apparel team</p>
    `.trim(),
  });
}

export async function sendPasswordResetEmail(
  config: EmailConfig,
  to: string,
  resetLink: string
): Promise<void> {
  const resend = new Resend(config.apiKey);
  await resend.emails.send({
    from: config.from,
    to: [to],
    subject: "Reset your password – Artie Apparel",
    html: `
      <p>You requested a password reset for your Artie Apparel account.</p>
      <p><a href="${escapeHtml(resetLink)}" style="display:inline-block; padding:10px 20px; background:#007AFF; color:#fff; text-decoration:none; border-radius:8px;">Reset password</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
      <p>This link expires in 1 hour.</p>
      <p>— Artie Apparel</p>
    `.trim(),
  });
}

export async function sendEmailVerificationEmail(
  config: EmailConfig,
  to: string,
  verificationLink: string
): Promise<void> {
  const resend = new Resend(config.apiKey);
  await resend.emails.send({
    from: config.from,
    to: [to],
    subject: "Verify your email – Artie Apparel",
    html: `
      <p>Please verify your email address for your Artie Apparel account.</p>
      <p><a href="${escapeHtml(verificationLink)}" style="display:inline-block; padding:10px 20px; background:#007AFF; color:#fff; text-decoration:none; border-radius:8px;">Verify email</a></p>
      <p>If you didn't create an account, you can ignore this email.</p>
      <p>This link expires in 24 hours.</p>
      <p>— Artie Apparel</p>
    `.trim(),
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

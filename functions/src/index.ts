/**
 * Firebase Cloud Functions – Stripe placeholders + Auth emails (Resend).
 *
 * Secrets: set via Firebase config or env (emulator/Secret Manager).
 * - Stripe: stripe.secret_key, stripe.webhook_secret
 * - Email: email.resend_api_key, email.from (e.g. "App <noreply@yourdomain.com>")
 *
 * Auth emails (Resend):
 * - sendPasswordReset: callable, generates reset link and sends email.
 * - sendEmailVerification: callable, generates verification link and sends email.
 * - auth user onCreate: sends welcome email.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  type EmailConfig,
} from "./email";

admin.initializeApp();

// Prefer process.env (emulator/Secret Manager); fallback to Firebase config for production.
const firebaseConfig = () =>
  functions.config() as {
    stripe?: { secret_key?: string; webhook_secret?: string };
    email?: { resend_api_key?: string; from?: string };
  };
const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? firebaseConfig().stripe?.secret_key;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? firebaseConfig().stripe?.webhook_secret;

function getEmailConfig(): EmailConfig {
  const apiKey = process.env.RESEND_API_KEY ?? firebaseConfig().email?.resend_api_key;
  const from = process.env.RESEND_FROM ?? firebaseConfig().email?.from ?? "Artie Apparel <onboarding@resend.dev>";
  if (!apiKey) throw new Error("RESEND_API_KEY or email.resend_api_key not set");
  return { apiKey, from };
}

/**
 * Creates a Stripe PaymentIntent. Call from the app with the user's ID token.
 * Amount and currency should be validated server-side (e.g. from your product/order data).
 *
 * Set STRIPE_SECRET_KEY in Firebase config:
 *   firebase functions:config:set stripe.secret_key="sk_..."
 * or use Secret Manager in production.
 */
export const createPaymentIntent = functions.https.onCall(
  async (data: { amountInCents: number; currency?: string }, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be signed in."
      );
    }
    if (!stripeSecretKey) {
      // Placeholder: no key configured
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Stripe is not configured. Set STRIPE_SECRET_KEY in function config or env."
      );
    }
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    const amount = Number(data?.amountInCents);
    if (!Number.isInteger(amount) || amount < 1) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "amountInCents must be a positive integer."
      );
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: data?.currency ?? "usd",
      automatic_payment_methods: { enabled: true },
      metadata: { userId: context.auth.uid },
    });
    return { clientSecret: paymentIntent.client_secret };
  }
);

/**
 * Stripe webhook endpoint. Configure this URL in Stripe Dashboard → Webhooks.
 * Set STRIPE_WEBHOOK_SECRET in function config (signing secret from Stripe).
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }
  const sig = req.headers["stripe-signature"];
  if (typeof sig !== "string" || !stripeWebhookSecret) {
    res.status(400).send("Missing Stripe signature or webhook secret");
    return;
  }
  const Stripe = (await import("stripe")).default;
  // constructEvent only needs the webhook secret; Stripe() needs some key for instantiation
  const stripe = new Stripe(stripeSecretKey ?? "sk_placeholder", {
    apiVersion: "2023-10-16",
  });
  let event: import("stripe").Stripe.Event;
  try {
    const rawBody = (req as { rawBody?: Buffer }).rawBody ?? req.body;
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      stripeWebhookSecret
    );
  } catch (err) {
    res.status(400).send(`Webhook signature verification failed`);
    return;
  }
  // Placeholder: handle events (e.g. payment_intent.succeeded)
  switch (event.type) {
    case "payment_intent.succeeded":
      // Optional: update order state, send confirmation, etc.
      break;
    case "payment_intent.payment_failed":
      break;
    default:
      break;
  }
  res.status(200).send({ received: true });
});

// ---------- Auth emails (Resend) ----------

/**
 * Sends a password reset email with a link generated via Admin SDK.
 * Call from the app instead of Firebase sendPasswordResetEmail when using custom emails.
 * Request: { email: string }
 */
export const sendPasswordReset = functions.https.onCall(
  async (data: { email?: string }, context) => {
    const email = typeof data?.email === "string" ? data.email.trim() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new functions.https.HttpsError("invalid-argument", "Valid email is required.");
    }
    try {
      const actionCodeSettings = process.env.APP_URL
        ? { url: process.env.APP_URL }
        : undefined;
      const link = await admin.auth().generatePasswordResetLink(email, actionCodeSettings as { url: string } | undefined);
      const config = getEmailConfig();
      await sendPasswordResetEmail(config, email, link);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send reset email.";
      throw new functions.https.HttpsError("internal", msg);
    }
  }
);

/**
 * Sends an email verification link for the given email (or the signed-in user's email).
 * Request: { email?: string } – if omitted and user is signed in, uses auth user's email.
 */
export const sendEmailVerification = functions.https.onCall(
  async (data: { email?: string }, context) => {
    let email: string;
    if (typeof data?.email === "string" && data.email.trim()) {
      email = data.email.trim();
    } else if (context.auth?.token?.email) {
      email = context.auth.token.email as string;
    } else {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Provide email or be signed in."
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new functions.https.HttpsError("invalid-argument", "Valid email is required.");
    }
    try {
      const actionCodeSettings = process.env.APP_URL
        ? { url: process.env.APP_URL }
        : undefined;
      const link = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings as { url: string } | undefined);
      const config = getEmailConfig();
      await sendEmailVerificationEmail(config, email, link);
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send verification email.";
      throw new functions.https.HttpsError("internal", msg);
    }
  }
);

/**
 * Sends a welcome email when a new user is created (email/password or Google).
 */
export const onAuthUserCreated = functions.auth.user().onCreate(async (user) => {
  const email = user.email;
  if (!email) return;
  try {
    const config = getEmailConfig();
    await sendWelcomeEmail(config, email, user.displayName ?? null);
  } catch (err) {
    functions.logger.warn("Welcome email failed", { uid: user.uid, error: err });
  }
});

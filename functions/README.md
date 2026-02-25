# Cloud Functions (Stripe placeholders)

Placeholder Cloud Functions for Stripe: create PaymentIntents and handle webhooks. The Stripe secret key and webhook secret must **never** live in the app; they are used only here (via environment config or Secret Manager).

## Setup

1. Install dependencies: `npm install`
2. Build: `npm run build`
3. Set secrets (choose one):
   - **Local emulator:** Copy `.env.example` to `.env` and set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
   - **Production:** Use Firebase config (`firebase functions:config:set stripe.secret_key="sk_..."`) or Google Secret Manager and read them in the function.

## Functions

- **createPaymentIntent** (callable): Call from the app with the user’s Firebase ID token. Creates a Stripe PaymentIntent and returns `clientSecret`. Validate amount and currency server-side.
- **stripeWebhook** (HTTPS): Point Stripe Dashboard → Webhooks to this URL. Verifies signature with `STRIPE_WEBHOOK_SECRET` and handles events (placeholder handling).

## Deploy

From project root: `firebase deploy --only functions`

# Security and backend architecture

## Auth: keep it in the app

User sign-in, sign-up, and password reset run in the app using the **Firebase Auth client SDK** ([hooks/useAuth.ts](hooks/useAuth.ts)). Do **not** move these flows to Cloud Functions.

- Firebase Auth is designed for client-side use and handles tokens and refresh securely.
- Cloud Functions are used **with** auth (e.g. call a Function from the app and send the user’s ID token; the Function verifies the token and then runs privileged logic).

## Firestore

- **Security Rules** in [firebase/firestore.rules](firebase/firestore.rules) restrict access so only the signed-in user can read/write `users/{userId}/savedDesigns`. All other paths are denied.
- Deploy rules from the project root: `firebase deploy --only firestore`. See [firebase/README.md](firebase/README.md).

## Stripe and secrets

- The **Stripe secret key** and **webhook signing secret** must never live in the app. They are used only in **Cloud Functions** ([functions/](functions/)), via environment config or Secret Manager.
- The app calls the `createPaymentIntent` callable function (with the user’s ID token); the Function creates the PaymentIntent and returns the client secret. Stripe webhooks are sent to the `stripeWebhook` HTTPS function.

## Auth emails (Resend)

Cloud Functions send **forgot password**, **email verification**, and **welcome** emails via [Resend](https://resend.com):

- **sendPasswordReset** (callable): generates a reset link with the Admin SDK and sends it via Resend. The app calls this for "Forgot password"; if the callable is unavailable, it falls back to Firebase's built-in `sendPasswordResetEmail`.
- **sendEmailVerification** (callable): generates a verification link and sends it via Resend. Called after sign-up so the user receives a custom verification email.
- **onAuthUserCreated** (trigger): when a new user is created, sends a welcome email.

Configure Resend: `firebase functions:config:set email.resend_api_key="re_..."` and optionally `email.from="Artie Apparel <noreply@yourdomain.com>"`. Or set env `RESEND_API_KEY` and `RESEND_FROM`. Without these, the callables may fail (forgot password falls back to Firebase's email); the welcome trigger logs a warning and skips sending.

## Optional: trusted logic in Cloud Functions

For rules that must not be bypassable by a modified client (e.g. “max 5 saved designs,” applying discounts, or server-side pricing), implement that logic in a Cloud Function. The app calls the Function with the user’s Firebase ID token; the Function verifies the token and then enforces the rule or performs the calculation.

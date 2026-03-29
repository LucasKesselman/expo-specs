# Artie Clean Slate

This project has been intentionally reset to a minimal Expo Router app with a single landing page.

## Current state

- Only `app/_layout.tsx` and `app/index.tsx` are active app code.
- Root layout uses an Expo UI `Host` wrapper on iOS (with RN fallback).
- Old backend, feature flows, and UI system were removed.

## Run

```bash
npm install
npm start
```

## Firebase Backend

Firebase is the only backend runtime for this app.

- Stripe is managed by the installed Firebase Stripe extension (extension-only approach).
- Custom Cloud Functions in `functions/` are reserved for non-Stripe backend utilities.

### Backend setup

1. Update `.firebaserc` with your Firebase project ID.
1. Install dependencies for functions:

```bash
cd functions
npm install
```

1. Deploy backend:

```bash
npm run deploy
```

### Implemented custom function endpoints

- `healthCheck`
- `generateGarmentQRCodes`

See `functions/README.md` for local emulator usage and calling the QR generation endpoint.

`generateGarmentQRCodes` is IAM-protected and should be invoked with a Google identity token.

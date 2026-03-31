# Firebase Functions

This project uses the Firebase Stripe extension and also includes a custom Stripe webhook handler for garment creation.

## Implemented functions

- `generateGarmentQRCodes` (HTTP): manual admin endpoint to generate garment QR PNGs.
- `createGarment` (HTTP): Stripe webhook endpoint for `checkout.session.completed` that creates `Garments` records.

## `createGarment` behavior

- Verifies Stripe webhook signatures.
- Processes only `checkout.session.completed`.
- Reads garment fields from Stripe metadata (line item/product/price metadata first, then session metadata fallback):
  - `owner` (or `ownerUid`/`uid`)
  - `physicalDesignId` (or `physicalDesign`)
  - optional: `digitalDesignId` (or `digitalDesign`)
  - optional: `size` (defaults to `M`)
  - optional: `color` (defaults to `UNSPECIFIED`)
  - optional: `version`
- Writes garment docs into `Garments/{garmentId}` with:
  - `printStatus: "NOT_PRINTED"`
  - `qrCodeStatus: "NOT_GENERATED"`
- Updates `Users/{owner}.ownedGarments` using `arrayUnion`.
- Uses idempotency records in `StripeWebhookEvents/{eventId}` to prevent duplicate processing.

## Checkout sessions (Firebase Stripe extension)

The app creates Checkout Session documents for signed-in users and lets the extension create Stripe Checkout sessions:

- Primary path: `customers/{uid}/checkout_sessions`

Session docs should include:

- `price` (Stripe price ID)
- `mode: "payment"`
- `success_url`
- `cancel_url`
- `metadata.owner` and `metadata.physicalDesignId`

## `generateGarmentQRCodes` behavior

- Reads all docs in the `Garments` Firestore collection.
- Uses `garmentId` from each document, with doc ID fallback if missing.
- Skips documents where `garmentQRCodeStatus` is already `Generated`.
- Generates a small QR PNG containing plain-text garment ID.
- Uploads directly to:
  - `gs://qr-assets-bucket/Garments/<garmentId>/code_1200x1200.png`
- Updates Firestore document:
  - `garmentQRCodeStatus: "Generated"`
- Returns plain-text summary:
  - number generated
  - number skipped
  - total garments scanned

## Security

`generateGarmentQRCodes` is IAM-protected:

- Function is deployed with `invoker: "private"`.
- Caller must present a valid Google identity token.
- Caller must have `Cloud Run Invoker` permission on the function service.

## Local development

```bash
cd functions
npm install
npm run build
npm run serve
```

Set required env vars for `createGarment` in your function runtime:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Call endpoint manually:

```bash
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  "https://generategarmentqrcodes-ypsnqgqppa-uc.a.run.app"
```

## Deploy

```bash
cd functions
npm run deploy
```

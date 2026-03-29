# Firebase Functions (Non-Stripe Utilities)

Stripe is extension-only in this project. Custom Stripe functions are intentionally removed to avoid overlap with the installed Firebase Stripe extension instance.

## Implemented functions

- `generateGarmentQRCodes` (HTTP): manual admin endpoint to generate garment QR PNGs.

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

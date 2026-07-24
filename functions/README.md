# Firebase Functions

This project uses the Firebase Stripe extension and also includes a custom Stripe webhook handler for garment creation.

## Implemented functions

- `generateGarmentQRCodes` (HTTP): manual admin endpoint to generate garment QR PNGs.
- `generateInventoryGarments` (HTTP): ops endpoint to bulk-create unassigned Garments with auto-IDs and QR codes.
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

## `generateInventoryGarments` behavior

Ops inventory creation (not the Stripe checkout path). Creates many `Garments` docs with Firestore auto-IDs, leaves `owner` and `digitalDesign` unset, then generates QR PNGs via `generateGarmentQRCodesForGarments`.

### Request

- Method: `POST`
- Headers: `Content-Type: application/json`, `Authorization: Bearer <gcloud-identity-token>`
- Body (explicit quantity/size):

```json
{
  "physicalDesignId": "<PhysicalDesigns doc id>",
  "quantity": 50,
  "size": "L",
  "backprintVersion": "00"
}
```

- Or combined `quantitySize` string:

```json
{
  "physicalDesignId": "<PhysicalDesigns doc id>",
  "quantitySize": "50, L",
  "backprintVersion": "00"
}
```

- Required: `backprintVersion` (string). Appended to the physical design’s `designNumber` to form garment `version` (e.g. `"2601G"` + `"00"` → `"2601G00"`).
- If both `quantity`/`size` and `quantitySize` are present, explicit `quantity` + `size` win.
- Validation: `physicalDesignId` must exist and have a non-empty `designNumber`; `quantity` is a positive integer up to 500; `size` is `XS|S|M|L|XL|XXL`; `backprintVersion` is required.

### Written garment fields

- `id`: Firestore auto doc id
- `physicalDesign`: reference to `PhysicalDesigns/{physicalDesignId}`
- `printStatus`: `NOT_PRINTED`
- `shippedStatus`: `ORDERED`
- `shippedUpdate` / `createdAt`: server timestamps
- `size`, `color` (from physical design, else `UNSPECIFIED`)
- `version`: `designNumber + backprintVersion`
- `verificationStatus`: `NOT_VERIFIED`
- `qrCodeStatus`: starts `PENDING`, then updated by QR helper to `GENERATED`
- `owner` / `digitalDesign`: omitted

### IAM private invoker

- Deployed with `invoker: "private"` (same as `generateGarmentQRCodes`).
- URL is not publicly callable; Cloud Run rejects unauthenticated requests.
- Caller must have **Cloud Run Invoker** and send an OIDC identity token (`gcloud auth print-identity-token`), not a Firebase ID token.

### Example curl

```bash
# Requires: gcloud auth login (or ADC) + Cloud Run Invoker on the function
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  -H "Content-Type: application/json" \
  -d '{"physicalDesignId":"YOUR_PHYSICAL_DESIGN_ID","quantitySize":"3, S","backprintVersion":"00"}' \
  "https://generateinventorygarments-<hash>-uc.a.run.app"
```

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

`generateGarmentQRCodes` and `generateInventoryGarments` are IAM-protected:

- Functions are deployed with `invoker: "private"`.
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

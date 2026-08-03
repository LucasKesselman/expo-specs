---
name: Garment inventory field update
overview: "Update generateInventoryGarments to match the revised Garments schema: require backprintVersion, set version from PhysicalDesigns.designNumber + backprintVersion, add verificationStatus, and align qrCodeStatus defaults with Artie DB."
todos:
  - id: update-inventory-fields
    content: "Update generateInventoryGarments: backprintVersion input, version = designNumber+backprintVersion, verificationStatus, qr PENDING"
    status: completed
  - id: update-inventory-readme
    content: Update functions/README.md for new request field and garment defaults
    status: completed
isProject: false
---

# Update generateInventoryGarments for revised Garment schema

## Gap vs current function

[`functions/src/generateInventoryGarments.ts`](functions/src/generateInventoryGarments.ts) already writes core inventory fields. Against [`documentation/Artie DB design.txt`](documentation/Artie%20DB%20design.txt) Garments (lines 103–117), these updates are needed:

| Field | Today | Target |
|-------|--------|--------|
| `version` | Optional raw `body.version` | **Required**; `PhysicalDesigns.designNumber + backprintVersion` (direct concat, e.g. `"2601G"` + `"00"` → `"2601G00"`) |
| `verificationStatus` | Missing | `"NOT_VERIFIED"` |
| `qrCodeStatus` initial | `"NOT_GENERATED"` | `"PENDING"` (schema: `PENDING` \| `GENERATED`) |
| `owner` / `digitalDesign` / `printedAt` | Omitted | Keep omitted (inventory / not printed yet) |

Unchanged: `id`, `physicalDesign`, `printStatus: NOT_PRINTED`, `shippedStatus: ORDERED`, `shippedUpdate`, `size`, `color`, `createdAt`, then QR helper → `GENERATED`.

## API change

**New required body field:** `backprintVersion` (non-empty string).

Remove support for optional `body.version` (replaced by computed `version`).

Example:

```json
{
  "physicalDesignId": "abc123",
  "quantitySize": "3, S",
  "backprintVersion": "00"
}
```

**Validation:**

- `backprintVersion`: required trimmed string
- After loading PhysicalDesign: `designNumber` must be a non-empty string; else `400` (`PhysicalDesign is missing designNumber`)
- `version = designNumber + backprintVersion` (no separator)

## Code changes in [`generateInventoryGarments.ts`](functions/src/generateInventoryGarments.ts)

1. Require `backprintVersion` via `normalizeRequiredString`.
2. Read `designNumber` from the physical design snapshot; fail if missing.
3. Compute `const version = `${designNumber}${backprintVersion}``.
4. On each garment payload, always set:
   - `version`
   - `verificationStatus: "NOT_VERIFIED"`
   - `qrCodeStatus: "PENDING"` (replace `NOT_GENERATED`)
5. Drop optional `body.version` handling.

Confirm [`generateGarmentQRCodesForGarments`](functions/src/generateGarmentQRCodes.ts) still flips status to `"GENERATED"` after PNG upload (it already does).

## Docs

Update [`functions/README.md`](functions/README.md) `generateInventoryGarments` section: request examples include `backprintVersion`; document `version` composition and new defaults (`verificationStatus`, `qrCodeStatus: PENDING`).

## Test plan

- Valid physical design with `designNumber: "2601G"` + `backprintVersion: "00"` → garments have `version: "2601G00"`, `verificationStatus: "NOT_VERIFIED"`, initial `qrCodeStatus: "PENDING"`, then `"GENERATED"` after QR
- Missing `backprintVersion` or missing `designNumber` on physical design → `400`, no writes
- `owner` / `digitalDesign` still absent

# artieBulkTool

Internal admin CLI for Firestore CSV export/import and inventory garment creation. Runs **only** on an operator machine via terminal. Uses the Firebase Admin SDK (bypasses client security rules). Inventory writes and QR generation stay in the `generateInventoryGarments` Cloud Function; this tool is a wrapper around that endpoint. It is not part of the Expo app or the Cloud Functions deploy.

## Setup

1. Copy `.env.example` to `.env` in this folder (optional for export/import; required for `generateInventoryGarments --processingMode=active`).
2. Point `GOOGLE_APPLICATION_CREDENTIALS` at a service account JSON key. Relative paths resolve from `tools/artie-bulk-tool/`. If unset, the tool uses `scripts/serviceAccountKey.json` at the repo root, then Application Default Credentials.
3. For inventory generation, set `GENERATE_INVENTORY_GARMENTS_URL` to the function’s Cloud Run URL (`https://generateinventorygarments-<hash>-uc.a.run.app`). The same service account needs **Cloud Run Invoker** on that function; Firestore Admin access is not enough. Optional `GENERATE_INVENTORY_GARMENTS_AUDIENCE` only if the OIDC audience must differ from the URL.
4. Install this package once:

```bash
npm install --prefix tools/artie-bulk-tool
```

Never commit a service account key. `scripts/serviceAccountKey.json` is gitignored.

## Commands

Pass flags after an extra `--` so npm does not swallow them.

```bash
# From the repo root
npm run artieBulkTool -- export --collection=DigitalDesigns

npm run artieBulkTool -- import --collection=DigitalDesigns --input="$HOME/Downloads/artie-export-DigitalDesigns-20260821-160900.csv" \
  --recordUpdateMode=UPDATE_ONLY --processingMode=pretend --columnCheckMode=ALLOW_EXTRA
```

Or from this folder: `npm run artieBulkTool -- export --collection=DigitalDesigns`.

```bash
npm run artieBulkTool -- generateInventoryGarments \
  --physicalDesignId=abc123 \
  --quantity=50 --size=L \
  --backprintVersion=00 \
  --processingMode=pretend
```

### Export

Fetches every document in a top-level collection (paginated), flattens nested fields, and writes to your **Downloads** folder (`~/Downloads`):

`artie-export-[collection]-[yyyyMMdd-HHmmss].csv`

Override with `--output=<dir>` if needed.

### Import

Parses the sheet, matches rows to documents, diffs fields, always writes a processing report. Writes to Firestore only when `--processingMode=active`.

`artie-processing-report-[collection]-[processingMode]-[recordUpdateMode]-[yyyyMMdd-HHmmss].csv`

Reports go to your **Downloads** folder (`~/Downloads`) unless you pass `--output=<dir>`. CSV rows use a `section` column (`run`, `summary`, `diff`, `error`) in place of separate sheets.

### generateInventoryGarments

Operator wrapper around the private `generateInventoryGarments` HTTP function. Validates flags locally, loads the PhysicalDesign (for `designNumber` / `version` / `color`), then either writes a preview report or POSTs to the function.

```bash
# Combined quantity/size (same as the function body)
npm run artieBulkTool -- generateInventoryGarments \
  --physicalDesignId=abc123 \
  --quantitySize="50, L" \
  --backprintVersion=00 \
  --processingMode=active
```

Flags:

- `--physicalDesignId` (required)
- `--backprintVersion` (required) — appended to the design’s `designNumber` (e.g. `2601G` + `00` → `2601G00`)
- `--quantity` and `--size` together, or `--quantitySize="50, L"` (explicit quantity+size win if both are passed)
- `--processingMode` (required): `pretend` or `active`
- `--output` — report directory (default `~/Downloads`)

Quantity is a positive integer up to 500. Size is `XS|S|M|L|XL|XXL`.

`pretend` never calls the function. `active` prompts:

```text
⚠️ This will create 50 Garments for PhysicalDesign abc123 (version 2601G00, size L) and generate QR codes. Proceed? (y/n)
```

Only `y` / `Y` continues. The function creates the Garments and QR codes; this CLI does not write those docs itself.

Report: `artie-inventory-garments-[processingMode]-[yyyyMMdd-HHmmss].csv` with `run`, `summary`, `garment` (ids on active), and `error` sections.

## Modes

`--processingMode` (required; omitting it exits with an error)

- `pretend` — parse, match, diff; no Firestore writes. For `generateInventoryGarments`, preview only (no HTTP call).
- `active` — apply creates/updates/deletes with BulkWriter. For `generateInventoryGarments`, confirm then POST to the Cloud Function.

`--recordUpdateMode`

- `UPDATE_ONLY` — update existing docs when fields differ; missing doc → ERROR
- `CREATE_ONLY` — create when the id is new; existing id → ERROR
- `CREATE_AND_UPDATE` — upsert; identical rows are SKIP
- `SYNC` — upsert, then delete Firestore docs whose ids are not in the sheet

`SYNC` + `active` always prompts:

```text
⚠️ WARNING: SYNC mode will delete documents in Firestore. Proceed? (y/n)
```

Only `y` / `Y` continues. Any other answer writes a cancelled report and exits non-zero with no writes.

`--columnCheckMode` (runs before any row matching)

DB fields = union of dotted field paths inferred from the collection (plus reserved `__docId`).

- `ALLOW_EXTRA` — extra CSV columns ignored; missing DB fields fail
- `EXACT_MATCH` — no extra, no missing
- `ALLOW_MISSING` — omitted DB fields are not overwritten; extra columns fail
- `ALLOW_EXTRA_AND_MISSING` — both extra and missing allowed

## Safety

v1 allowlist: `DigitalDesigns`, `PhysicalDesigns`, `Garments`.

`Users`, `StripeWebhookEvents`, and `customers` are denied. To force an unlisted collection, pass `--allowUnlistedCollection` and type the collection name at the prompt.

`--collection` must be a top-level id (no subcollections).

`createdAt` is immutable on UPDATE. `lastUpdatedAt` is stamped on applied writes and ignored in diffs.

## CSV mapping

| Firestore | CSV |
|---|---|
| Nested map `{ a: { b: 1 } }` | column `a.b` |
| Timestamp | `ts:2026-08-21T16:09:00.000Z` |
| DocumentReference | `ref:PhysicalDesigns/abc123` |
| Arrays (`tags`) | `json:["streetwear","limited"]` |
| `null` | `null:` |
| empty string | `empty:` |

Blank cell → omit (do not patch). `__docId` is the Firestore document id (`id` is a fallback). `__docId` / `id` are quoted as text in CSV.

Garment `physicalDesign` / `digitalDesign` round-trip as `ref:Collection/id`.

## First operator loop

1. `export --collection=DigitalDesigns`
2. Edit a few rows in the CSV
3. `import` with `UPDATE_ONLY` + `pretend` + `ALLOW_EXTRA`
4. Inspect the processing report
5. Re-run with `--processingMode=active`
6. Only then consider `SYNC`

## Tests

```bash
npm test --prefix tools/artie-bulk-tool
```

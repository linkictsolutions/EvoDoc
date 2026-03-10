# EvoDoc MVP

EvoDoc is a Next.js + Firebase webapp for coffee export documentation.

## MVP Features

- Multi-step contract wizard (contract, buyer, shipping, banking, processing).
- Shipment capture with computed weights and bag totals.
- Server-side business rule enforcement (not UI-only):
  - Contract/price/weight plausibility checks
  - Shipment-vs-contract deviation checks
  - Document-generation precondition checks
- Document generation for:
  - Commercial Invoice
  - Packing List
  - Shipping Instructions
- Review workflow:
  - Draft -> Under Review -> Approved / Returned to Draft
- Print-ready HTML document view.
- Firestore audit logs and in-app notifications.
- RBAC model (`admin`, `editor`, `viewer`, plus `isApprover`).

## Stack

- Next.js App Router + TypeScript
- Firebase Auth
- Firestore + Security Rules
- Cloud Functions (status-change hooks)
- Zod + React Hook Form
- Decimal.js for deterministic calculations

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template:

```bash
cp .env.example .env.local
```

3. Fill Firebase client/admin environment variables.

4. Run app:

```bash
npm run dev
```

## Excel Intake

Place workbook at:

- `docs/source/excel/Coffee Doc-Praxis-V2.xlsm`

Update mappings in:

- `src/domain/mapping/excel-field-map.ts`
- `src/domain/mapping/formula-parity-spec.ts`

## Firestore Model

- Contract-centric source storage is documented in:
  - `docs/firestore-data-model.md`
- Source inputs are persisted under:
  - `organizations/{orgId}/contracts/{contractId}/sourceInputs/{sourceType}`

## API Endpoints

- `POST /api/contracts`
- `POST /api/contracts/:id/shipments`
- `POST /api/documents/generate`
- `POST /api/documents/:id/submit-review`
- `POST /api/documents/:id/decision`
- `GET /api/documents/:id/print-data`

## Tests

Run domain tests:

```bash
npm test
```

Run Firestore rules tests with emulator:

```bash
npm run test:rules
```

## Deployment

- Next.js app: Vercel
- Firebase: Auth, Firestore, Functions, Rules

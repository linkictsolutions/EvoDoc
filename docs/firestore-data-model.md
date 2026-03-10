# Firestore Data Model (Contract-Centric Source Inputs)

This project now stores source inputs under each contract, keyed by `contractId`.

## Contract Anchor

`organizations/{orgId}/contracts/{contractId}`

- Holds the currently resolved working state (`terms`, `shipping`, `banking`, etc.).
- Used by document generation and the `Contract-SI-LC` final resolver.

## Source Inputs (New)

`organizations/{orgId}/contracts/{contractId}/sourceInputs/{sourceType}`

- `sourceType` values:
  - `contract_sheet`
  - `shipping_instruction_sheet`
  - `bank_lc_sheet`
- Each source doc stores:
  - `payload` (exact source-page submission)
  - `updatedBy`
  - `lastRequestId`
  - `createdAt`, `updatedAt`

Example path:

`organizations/demo-org/contracts/ABC123/sourceInputs/shipping_instruction_sheet`

## Source Revisions (Immutable)

`organizations/{orgId}/contracts/{contractId}/sourceInputs/{sourceType}/revisions/{revisionId}`

- Appends an immutable revision on every save.
- Stores:
  - `payload`
  - `requestId`
  - `actorUid`
  - `timestamp`

This gives auditability for “who changed which source sheet and when”.

## Current APIs Writing Source Inputs

- `POST /api/contracts/core` -> `sourceInputs/contract_sheet`
- `POST /api/contracts/shipping` -> `sourceInputs/shipping_instruction_sheet`
- `POST /api/contracts/bank-lc` -> `sourceInputs/bank_lc_sheet`

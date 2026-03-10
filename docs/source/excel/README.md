# Excel Source Of Truth

Current workbook:

- `Coffee Doc-Praxis-V2.xlsm`

Extraction artifacts generated from this workbook:

- `docs/source/excel/extraction-summary.md`
- `docs/source/excel/extraction-report.json`
- `docs/source/excel/macro-analysis.md`

Primary input sheets used by the web app:

1. `Form Configuration`
2. `Contract`
3. `Shipping Instruction`
4. `Bank & LC`
5. `Bookings`
6. `Processing`
7. `Contract-SI-LC` (consolidation layer with final values in column `K`)

MVP output templates aligned in code:

1. `Commercial Invoice`
2. `Packing List`
3. `SI`

Workbook-specific mapping/parity sources:

- `src/domain/mapping/excel-field-map.ts`
- `src/domain/mapping/formula-parity-spec.ts`

Notes from workbook inspection:

1. There is one legacy defined name: `_21_08_2006`.
2. The file is macro-enabled (`.xlsm`), but macro logic is not yet implemented in the web app.
3. Several formulas use Excel `_xlfn.CONCAT`; web parity currently uses TypeScript string composition.

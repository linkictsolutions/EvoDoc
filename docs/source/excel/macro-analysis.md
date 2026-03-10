# Macro Analysis: Coffee Doc-Praxis-V2.xlsm

Date: 2026-03-03

Workbook scanned with `oletools.olevba`.

## Result

- VBA macros are present.
- Only one functional module with business behavior was found: `Module1.bas`.

## Functional VBA found

1. `NumberToWords(ByVal MyNumber)`
2. Supporting helpers:
   - `GetHundreds`
   - `GetTens`
   - `GetDigit`

Usage discovered in workbook formulas:

- `Commercial Invoice(Permit)!C21`
- `Commercial Invoice!C22`
- `Commercial Invoice(ICC)!D30`

These formulas build amount-in-words text from invoice totals.

## Non-functional VBA modules

- `ThisWorkbook` and all `Sheet*.cls` modules contain only metadata attributes.
- No event handlers (`Workbook_Open`, `Worksheet_Change`, etc.) were found.
- No hidden macro-driven persistence/business workflow was found in VBA.

## Webapp parity action taken

- Implemented TypeScript amount-to-words conversion in `src/domain/amount-words.ts`.
- Wired invoice output to include "Amount in Words" via domain mapping.

## Remaining gap

- None from VBA business-logic perspective; formulas remain the primary source of business behavior.

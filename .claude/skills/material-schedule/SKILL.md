---
name: material-schedule
description: Build or update the project's material schedule — coded entries (ST-01, VT-01…) with location, finish, format, origin, supplier, sample status, verification and cost — from validated Material records, flagging unknowns and wet-floor safety gaps. Use when assembling or revising a finishes schedule, preparing samples for approval, or handing materials to procurement.
---

# Material schedule

The schedule is the single list of every finish in the project. Codes are stable, locations are
explicit and nothing unknown is disguised.

## Inputs

- Material records (`design-system/schemas/material.ts`) and the rooms they belong to.
- Category code prefixes and finish vocabulary from `materialTokens` and `finishTokens`.

## Procedure

1. **Code** each material with its category prefix and a two-digit number: `ST-01` natural stone,
   `VT-01` vitrified tile, `VN-01` veneer, `PT-01` paint… The schema rejects mismatched prefixes.
   Never reuse a retired code.
2. **Describe** — name, category, reference material (e.g. `kota-stone`), origin, supplier, colour,
   finish id (must exist in `finishes.json` and apply to the category), format L × W × T in mm.
3. **Applications and locations** — list applications (`floor`, `wet-area-floor`, `vanity-top`…) and
   the rooms (`roomIds`).
4. **Properties** — slip resistance and water absorption come from supplier test reports for the
   specified finish; sealing and maintenance from the supplier. Unknown stays unknown.
5. **Samples** — track `sampleStatus`; a material cannot be `client-approved` before its physical sample
   is approved (schema-enforced).
6. **Cost and lead time** — INR per unit (`m2`, `running-metre`, `piece`, `litre`…), GST inclusion
   stated or unknown.
7. **Safety check** — any material on `wet-area-floor` or `shower-floor` needs confirmed slip
   resistance; a finish with `wetFloorGuidance: "avoid"` (e.g. polished stone, glossy tile) must not
   be used there. The design audit flags both.

## Output format

| Code | Material | Finish | Format (mm) | Applications | Rooms | Supplier | Sample | Verification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ST-01 | Kota stone, honed | Honed | 600 × 600 × unknown | Floor | Living, bedrooms | Unknown | Requested | Sample data |

Show unknown values as "Unknown" or "Requires verification", never blank. Swatch colours
(`displayColor`) are screen references only — approval is always on physical samples.

Use `MaterialCard` for visual review. Validate with `validateMaterialLibrary(materials)` or
`npm run validate:products`.

Related: `materials-specialist` agent, `design-audit` skill.

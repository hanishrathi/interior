# Design principles

These principles govern the product, the data and the code. Where a principle can be enforced
mechanically, it is — the table at the end shows where.

## 1. Practical for professional work

The system follows how studios actually work: intake, brief, concept, product and material
integration, technical review, presentation, approvals. Records carry the details that matter on site —
WC outlet types, water pressure, sunken depth, IP zones, slip resistance, sample status, GST.

## 2. Real products, not just references

A product record describes a specific, purchasable item: brand, model number, source document,
dimensions, installation requirements, finish, status and verification. Mood images and references
belong in the brief, not in the product list.

## 3. Provenance before polish

Every product records model number, source, dimensions, installation requirements, finish, status and
verification state. Missing information is recorded as missing.

## 4. Never invent product information

No values from memory, similar models or typical ranges. A gap is `{ "value": null, "certainty":
"unknown" }` with a note saying what to obtain.

## 5. Unknown is visible

Unknown values render as dashed "Unknown" badges — never blanks, dashes or zeros. Unknown values sort
last in tables. Compatibility checks with missing inputs return "Cannot check", not "Pass".

## 6. Metric throughout

Millimetres, square metres, bar, lux, kelvin. Validators flag ft, inches, sq ft and sft in any text.

## 7. Five levels of certainty

Every major recommendation distinguishes:

| Level | Meaning | Required |
| --- | --- | --- |
| Confirmed | Verified against a cited source | `source` |
| Assumed | A working assumption | `note` (values) |
| Unknown | Not known | `value: null` |
| Requires verification | Recorded but unchecked | source or note |
| Requires approval | Proposed, awaiting a decision | `owner` (statements) |

Conclusions are only as certain as their weakest input (`combineCertainty`).

## 8. Premium, calm, architectural

Warm stone neutrals, an ink primary, a single bronze accent for focus and links. Hairline borders,
small radii, generous whitespace, a restrained serif for display headings and a quiet grotesk for the
interface. Hierarchy comes from type and space before colour or shadow.

## 9. Nothing gimmicky

No gradients, no saturated or childish colours, no decorative animation. Motion is limited to
120 ms colour and border transitions and is removed under `prefers-reduced-motion`.

## 10. Accessible by construction

Semantic HTML (tables with captions and scoped headers, description lists, native `<dialog>`),
labelled controls with linked hints and errors, WAI-ARIA tabs with arrow-key navigation, visible focus
rings, keyboard-scrollable table regions, AA contrast for every declared pairing, and status that never
relies on colour alone (text labels, dots, dashed outlines).

## 11. Reusable and typed

Every component and function is typed; record types are inferred from Zod schemas so types and
runtime validation never drift.

## 12. Logic outside components

Rules live in `utils/` as pure, tested functions. Components render records and precomputed results.

## 13. Realistic, Indian context

Sample data describes a fictional three-generation family in Bengaluru: INR budgets in lakh, GST
status, Vastu preferences and a pooja unit, a health faucet beside the WC, a geyser, low gravity-fed
water pressure, Kota and Kadappa stone, Athangudi tile and lime plaster.

## 14. Kohler only as sample data

Kohler appears only in sample records explicitly marked `sample-data`, unverified, with no model
numbers and no confirmed values.

## 15. Concept is never construction-ready

Document status is a first-class field. Concept-phase projects cannot issue `for-construction`
information; design briefs never can. The audit flags construction-ready language ("issued for
construction", "GFC", "final drawings") in concept data. Planning dimensions are guidance, not code
compliance.

## Enforcement map

| Principle | Enforced by |
| --- | --- |
| 3, 4 | `productSchema` (required fields, sample rules), `checkProductCompleteness`, audit rule `product-information-missing` |
| 5 | `SpecValueText`, `StatusBadge` (dashed), `sortRows` (nulls last), compatibility `unknown` results |
| 6 | `findImperialUnits` in the audit and `validate-product-data` |
| 7 | `specValue()`, `statementSchema`, `recommendationSchema`, `combineCertainty` |
| 8, 9 | Tokens; `validate-design-system` (no raw colours in CSS or components) |
| 10 | `jsx-a11y` lint, contrast tests, component tests, browser tests (keyboard, focus, dialogs) |
| 11 | Strict TypeScript, `z.infer` types |
| 12 | `validate-design-system` (no `zod` in components), code review |
| 14 | `checkSampleDataPolicy`, `productSchema` sample rules |
| 15 | `projectSchema`, `designBriefSchema`, audit rules `construction-claim` and `document-status-premature` |

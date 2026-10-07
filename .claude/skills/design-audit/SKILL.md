---
name: design-audit
description: Run the automated design quality audit on a project, interpret the findings and readiness gates, and turn them into a prioritised action plan. Use before a client presentation, before moving to the next project phase, after significant changes, or when asked how ready a project is.
---

# Design audit

`auditDesign` (`design-system/utils/designQualityAudit.ts`) reviews the project's records against the
Clawed Design principles. It flags — it never fixes and never certifies.

## Run it

```bash
npm run review:project -- --project=path/project.json --client=path/client.json --rooms=path/rooms.json \
  --products=path/products.json --materials=path/materials.json --as-of=2026-10-05
```

It validates the records first (the audit only runs on valid records), then prints compatibility per
room, every finding with its recommendation, and the readiness gates. From code, call
`reviewProject(files, asOf)` or `auditDesign({ project, client, rooms, products, materials, asOf })`
from `design-system/index.ts`. Always pass `asOf` explicitly so results are reproducible.

## What it checks

| Rule | Looks for |
| --- | --- |
| `product-information-missing` / `-unconfirmed` | Model numbers, dimensions, installation data unknown or unconfirmed |
| `sample-data-in-use` | Demonstration data still in the project |
| `approved-before-verification` | Client approval of unverified items |
| `wet-floor-finish`, `wet-floor-slip-data` | Unsuitable finishes or missing slip data on wet floors |
| `wet-zone-ip-rating` | Unknown or insufficient IP ratings in bathroom zones 0–2 |
| `requirement-not-met`, `requirement-unsupported` | Unmet requirements; "met" with nothing linked |
| `accessibility-coverage` | Wet rooms without accessibility requirements where the household needs them |
| `approval-overdue`, `open-critical-issue`, `open-major-issue` | Stalled decisions and unresolved critical or major issues |
| `construction-claim`, `document-status-premature` | Concept information presented as construction-ready |
| `imperial-units` | ft, inches, sq ft, sft in any text |
| `palette-restraint`, `colour-temperature-consistency` | Design quality signals |
| `information-maturity` | Share of unknown values |

Severity scales with the phase: missing product information is `minor` at concept, `major` in design
development and `critical` from documentation onwards.

## Interpret it

- **Score** (0–100) is a trend indicator, not a grade. Each rule's deduction is capped so one repeated
  gap cannot dominate.
- **Readiness** gates: `clientPresentation` (no critical findings), `coordination` (design development
  or later, no critical or major findings), `construction` (documentation or later, everything
  verified, no pending approvals, no critical or major findings). Quote the blockers verbatim.

## Output

1. One-line status: score, counts by severity, readiness gates.
2. Action plan grouped by severity: finding → why it matters → next step → owner.
3. Findings you believe are false positives, with reasons. Do not suppress them in code.

Never describe a project as construction-ready unless `readiness.construction.ready` is true *and* a
qualified human has reviewed the documentation.

Related: `technical-review` skill, `technical-reviewer` and `design-director` agents.

---
name: technical-review
description: Run an independent technical review of a room or project — clearances, services, product compatibility, bathroom electrical zones, slip resistance, accessibility, structural dependencies and approvals — and record each problem as an Issue with severity and owner. Use before presenting a concept, before issuing information to consultants or contractors, and whenever products or layouts change.
---

# Technical review

A technical review finds problems early and states them plainly. It does not fix the design and it
never declares information construction-ready.

## Inputs

- Project, rooms, products, materials and lighting plans (validated).
- `assessRoomProducts`, `checkClearance`, `checkIpRating`, `auditDesign` from `design-system/utils`.

## Procedure

1. **Validate records** — run `npm run review:project -- --project=… --client=… --rooms=… --products=… --materials=…` on the project's files (it also runs compatibility and the audit). Schema
   errors are blocking.
2. **Compatibility** — run `assessRoomProducts(room, products)` per room. For each check:
   - `fail` → issue, usually `major` or `critical`;
   - `warning` → condition to resolve or accept (e.g. pressure pump, outlet conversion);
   - `unknown` → missing information with an owner.
3. **Clearances and circulation** — fixture allowances against `planningGuidance`; doors, paths, aisles.
4. **Services** — WC outlet type, drainage falls, water pressure, hot water, electrical points,
   ventilation, gas (kitchens).
5. **Electrical safety in wet rooms** — every fixture in zones 0–2 has a known, sufficient IP rating.
6. **Materials** — slip resistance and finish suitability on wet floors; sealing; maintenance.
7. **Accessibility** — door widths, level access, grab bars and fixings, reach ranges for the household.
8. **Structure and building** — anything touching lintels, slabs, shafts or society rules needs a
   structural engineer or the society's approval; record as an issue, never assume.
9. **Approvals** — pending or overdue approvals blocking progress (`isApprovalOverdue`).
10. **Language** — no construction-ready claims about concept information; metric units only.

## Severity

| Severity | Meaning |
| --- | --- |
| `critical` | Safety, legal or contractual risk, or blocks progress (insufficient IP rating in zone 1, polished stone on a shower floor, ordering an unverified product). Needs an owner. |
| `major` | Must be resolved before the next issue of information (outlet conversion feasibility, unknown slip resistance, door below minimum clear opening). |
| `minor` | Should be resolved; does not block (clearance below recommended but above minimum). |
| `info` | For awareness. |

## Output

- `Issue` records (`design-system/schemas/issue.ts`) with `raisedBy: "technical-review"`, owner and due date.
- A summary table: issue, severity, owner, due, and what would resolve it.
- A readiness statement in the form "Not ready for X because Y" — use `auditDesign(...).readiness`.

Related: `technical-reviewer` agent, `design-audit` skill.

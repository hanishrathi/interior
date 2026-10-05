---
name: concept-development
description: Develop room-by-room design concepts from an approved brief — zoning, layout options, fixture allowances, material and lighting direction, and recommendations with certainty — and update the Room records. Use when moving from brief to concept, when comparing layout options, or when a room's concept needs revising.
---

# Concept development

A concept shows the design intent clearly enough for the client to decide, and honestly enough that
nobody mistakes it for construction information.

## Inputs

- The design brief and client record.
- Room records with site-measured dimensions (`dimensions.*` with certainty and source).
- Planning guidance: `planningGuidance` from `design-system/tokens` (clearances and heights in mm).

## Procedure

1. **Check the survey.** List which room dimensions are `confirmed` (measured, with source) and which
   are not. A concept on assumed dimensions must say so on every sheet.
2. **Zone the room.** Wet/dry for bathrooms; cooking, preparation and washing for kitchens; sleeping,
   dressing and working for bedrooms. Record bathroom zones in `room.bathroom.zones`.
3. **Develop two or three options** only where there is a genuine choice. For each option record:
   - fixture allowances (`room.fixtureAllowances`) — width, depth and front clearance in mm, certainty
     `requires-approval` and source "Concept layout rev A";
   - what it does well, what it gives up, and what it depends on (e.g. sunken depth, lintel check).
4. **Check allowances against guidance** with `checkClearance` / `assessRoomProducts`. A clearance below
   the guidance minimum is a problem to solve, not a note.
5. **Material and lighting direction** — reference material ids and lighting layers; leave specific
   products to `product-integration`.
6. **Update requirements** — set each requirement's `status` honestly (`met`, `partially-met`,
   `not-met`, `not-assessed`) and link `addressedBy` ids.
7. **Recommendations** — each with rationale, certainty and owner.
8. **Label everything** "Concept — not for construction". Revision letters (rev A, rev B) go in sources.

## Output

- Updated `Room` records valid against `roomSchema`.
- An options comparison table:

| Option | Gains | Costs | Depends on | Recommendation |
| --- | --- | --- | --- | --- |

- An `Approval` record (`subject.kind: "layout"`) for each layout the client must decide.

Never describe a concept as final, buildable or GFC. Planning guidance values are not code compliance.

Related: `bathroom-design`, `technical-review`, `space-planner` and `lighting-specialist` agents.

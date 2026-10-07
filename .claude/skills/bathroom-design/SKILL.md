---
name: bathroom-design
description: Design or review a bathroom or powder room end to end — wet/dry zoning, drainage and falls, waterproofing, WC outlet type, health faucet, hot water, ventilation, electrical zones and IP ratings, slip resistance and accessibility for older users. Use for any bathroom concept, renovation, fixture selection or bathroom review.
---

# Bathroom design

Bathrooms concentrate risk: water, electricity, slipping, and services hidden in walls and floors.
Design them with the most rigour and the least guesswork.

## Inputs

- The room record: measured dimensions, openings, existing services, site conditions (water pressure,
  wall construction, sunken depth).
- Household accessibility needs from the client record.
- Products and materials proposed for the room.

## Procedure

1. **Survey gaps first.** Before designing, list what is unknown: sunken depth, WC outlet position
   and type, pressure at the shower point, wall construction where grab bars and frames will fix,
   condition of existing waterproofing. Each becomes an open item with an owner.
2. **Zone** — wet zone (shower) and dry zone (WC, basin), recorded in `room.bathroom.zones`. Typical
   Indian bathrooms separate them with a fixed glass screen or a change in level; prefer level access
   where the sunken depth allows.
3. **Drainage** — floor trap or linear drain location, falls towards the drain, and how the WC connects
   (floor vs wall outlet). A wall-hung WC on an existing floor outlet needs a plumbing conversion —
   raise it as an issue, do not assume it is possible.
4. **Waterproofing** — record the system and extent as `requires-verification` until the contractor
   confirms; recommend full re-waterproofing where damp is visible.
5. **Fixtures** — WC, health faucet (expected in Indian bathrooms), basin and mixer, shower mixer and
   head, water heater (geyser), exhaust. Use the `product-integration` skill; never fill specifications
   from memory.
6. **Electrical zones** — assign every light and electrical item a bathroom zone and check its IP rating
   against `lightingTokens.bathroomZones` (zone 0 IPX7, zones 1–2 IPX4 minimum). Zone boundaries are
   confirmed by the electrical consultant.
7. **Slip resistance** — floors in wet and dry zones need the supplier's slip-resistance data for the
   specified finish. Polished finishes are unsuitable for wet floors (`wetFloorGuidance: "avoid"`).
8. **Accessibility** — for older users: grab bars beside the WC and in the shower (positions agreed by
   mock-up), level access, outward-opening door with a wider clear opening, a higher WC seat if suited,
   night lighting, storage reachable while seated. Record each as a requirement with priority.
9. **Clearances** — check fixture allowances against `planningGuidance.clearances` (`wcFrontClear`,
   `basinFrontClear`, `showerAreaInternal`, `bathroomDoorClearOpening`). These are guidance, not code.

## Checklist

- [ ] Every dimension metric and sourced, or marked unknown
- [ ] Wet and dry zones recorded
- [ ] WC outlet type matched to the WC (or conversion issue raised)
- [ ] Site pressure vs product minimums checked
- [ ] Hot water and geyser electrical point provided
- [ ] Every fixture in zones 0–2 has a known, sufficient IP rating (or an open issue)
- [ ] Wet-floor material has slip-resistance data (or a major finding)
- [ ] Accessibility requirements recorded and addressed
- [ ] Waterproofing extent agreed with the contractor
- [ ] Labelled "Concept — not for construction" until documentation phase

Run `npm run review:project` on the project's files (compatibility and audit) before presenting.

Related: `product-integration`, `technical-review`, `bathroom-specialist` and `lighting-specialist` agents.

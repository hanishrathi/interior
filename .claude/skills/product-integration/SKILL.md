---
name: product-integration
description: Add real products to a project with full provenance — model number, source, dimensions, installation requirements, finish, status and verification — then check completeness and compatibility with the room. Use whenever a product (sanitaryware, fittings, lighting, appliances, hardware, furniture) is proposed, shortlisted, selected, verified or ordered.
---

# Product integration

Clawed Design integrates *real* products. A product record is only as good as its source; a missing
fact recorded as unknown is far more useful than a plausible guess.

## The golden rule

**Never invent product information.** Not from memory, not from "similar models", not from typical
values. If you cannot cite it, record `{ "value": null, "certainty": "unknown" }` (or
`requires-verification` with a note saying what to obtain).

## Procedure

1. **Identify the product** — brand, collection and model number from a primary source: the
   manufacturer's current specification sheet or catalogue, a dealer quotation, or the physical
   product. Record `source.kind`, `source.reference` (document title / quotation number), `url` and
   `retrievedOn`.
2. **Record every required field** (`design-system/schemas/product.ts`):
   - `modelNumber`, `brand`, `dimensions.widthMm/depthMm/heightMm` (mm), `finish.name/code`;
   - `installation`: `mounting`, `waterSupply`, `drainage`, `electrical`, plus category-specific
     fields — WC `outletSetOutMm`; basin `tapHoles`; shower `minWaterPressureBar`; anything electrical
     `ipRating`; `requiredComponents` (cistern frames, concealed bodies, drivers) and notes;
   - `status`, `verification`, `roomIds`, `quantity`, `documents`.
   Values copied from a document are `confirmed` with that document as `source`. Values you have not
   checked yet are `requires-verification`.
3. **Check completeness** — `checkProductCompleteness(product)`; list what is missing.
4. **Check compatibility** — `assessRoomProducts(room, products)`: fit against fixture allowances,
   clearances, services (WC floor vs wall outlet, site water pressure, hot water, electrical points),
   IP rating for the bathroom zone, and pairings (basin ↔ mixer tap holes, WC ↔ concealed cistern,
   shower mixer ↔ head). Read every `unknown` check as a task.
5. **Verify** — when the essentials are checked against documentation, set
   `verification: { state: "verified", verifiedBy, verifiedOn, method }`. The schema requires confirmed
   model number and dimensions for this.
6. **Progress status** — `proposed → shortlisted → selected → client-approved → ordered → delivered →
   installed`. Ordering requires `verified` (schema-enforced). Record client approval as an `Approval`.

## Sample data and Kohler

Kohler appears in this repository only as sample data: `source.kind: "sample-data"`, `isSample: true`,
verification `sample-data`, `modelNumber.value: null`, no `confirmed` values. Sample records cannot be
selected or ordered. Replace them with a sourced record before selection.

## Indian project specifics

- Ask whether the existing WC has a floor (S-trap) or wall (P-trap) outlet before choosing a wall-hung WC.
- Measure site water pressure at the shower point; gravity-fed overhead tanks are often low.
- Check that a health faucet, geyser point and exhaust are provided for.
- Quote prices in INR and record whether GST is included.

## Validate

```bash
npm run validate:products                       # sample dataset
npx tsx scripts/validate-product-data.ts --products=path/to/products.json
```

Related: `bathroom-design`, `technical-review`, `product-coordinator` agent, `docs/product-integration-workflow.md`.

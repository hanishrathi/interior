# Product integration workflow

How a real product moves from idea to installation, and what must be true at each step.

## Lifecycle

```
proposed → shortlisted → selected → client-approved → ordered → delivered → installed
                                                   ↘ rejected / discontinued
```

| Status | Meaning | Gate |
| --- | --- | --- |
| `proposed` | Suggested for consideration | Any source, including sample data |
| `shortlisted` | Under active consideration | — (sample data may go no further) |
| `selected` | Designer's choice | Real source (not sample data) |
| `client-approved` | Client has approved | Record an `Approval` with evidence; the audit flags approval before verification |
| `ordered` / `delivered` / `installed` | Committed | `verification.state` must be `verified` (schema-enforced) |

## Required information

Every product records — as known values or explicitly as unknown:

| Field | Notes |
| --- | --- |
| `brand`, `collection`, `modelNumber` | Exact model, from the source document |
| `source` | `kind`, `reference` (document title / quotation number), `url`, `retrievedOn`, `isSample` |
| `dimensions` | Width, depth, height in mm |
| `finish` | Manufacturer's finish name and code; optional link to `finishes.json` |
| `installation` | Mounting, water supply, drainage, electrical; WC outlet set-out; basin tap holes; minimum water pressure; IP rating; required components; notes |
| `status`, `verification` | Lifecycle and verification state (verified needs who, when, how) |
| `roomIds`, `quantity`, `price`, `leadTimeWeeks`, `documents` | Context and procurement |

## Sources, in order of preference

1. Manufacturer's current specification sheet or installation guide for the exact model.
2. Manufacturer's current catalogue or website page (record the URL and date).
3. Authorised dealer quotation (record the quotation number and date).
4. Inspection of the physical product or sample.

Not sources: memory, a similar model, a typical range, an old project, a marketplace listing.

## Certainty when recording

| Situation | Record |
| --- | --- |
| Copied from a source document | `confirmed` + `source` |
| Seen somewhere but not checked against the document | `requires-verification` + where it came from |
| Design intent awaiting the client (e.g. quantity, custom size) | `requires-approval` + source (drawing revision) |
| A working assumption | `assumed` + `note` |
| Not known | `value: null`, `unknown` |

## Checks

1. **Schema** — `validateProductCatalogue(products)` or `npm run validate:products`.
2. **Completeness** — `checkProductCompleteness(product)`: missing vs unconfirmed fields, including
   category-specific ones (a basin without a recorded tap-hole field is flagged as *not recorded*).
3. **Compatibility** — `assessRoomProducts(room, products)`:
   - fit against the room's fixture allowances (20 mm tolerance flagged as tight);
   - clearances against planning guidance (guidance, not code);
   - services: WC floor vs wall outlet, site water pressure vs product minimum, hot water, electrical points;
   - IP rating against the fixture's bathroom zone;
   - pairings: basin ↔ mixer tap holes, WC ↔ concealed cistern, shower mixer ↔ head.
4. **Outcome** — `incompatible` (any fail) → `cannot-determine` (any unknown) → `conditional` (any
   condition) → `compatible`. Certainty is the weakest input's.
5. **Audit** — `auditDesign(...)` places product gaps in the context of the whole project.

## Verification

Set `verification.state` to `verified` only when the model number and dimensions are confirmed against
documentation (schema-enforced), and record `verifiedBy`, `verifiedOn` and `method`. Use
`partially-verified` while some fields remain unchecked.

## Sample data and Kohler

The repository's sample products use Kohler as a named brand **only** as sample data:

- `source.kind: "sample-data"`, `isSample: true`, with a disclaimer note;
- `verification.state: "sample-data"`;
- `modelNumber.value: null` and no `confirmed` values anywhere;
- status no further than `shortlisted`.

`checkSampleDataPolicy` enforces this for the sample dataset. To use a real Kohler (or any) product,
create a new record from a primary source; never edit sample records into real ones.

## Validating a real catalogue

```bash
npx tsx scripts/validate-product-data.ts --products=catalogue/products.json --materials=catalogue/materials.json
```

Exit code 1 means at least one error. Read the completeness table: every "missing" field is a task.

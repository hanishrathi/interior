---
name: client-presentation
description: Prepare a client-facing presentation of a brief, concept or selection — narrative, decisions needed, what is confirmed versus assumed, verification still pending and approvals requested — in calm, plain language. Use before a client meeting, when sending a concept for review, or when requesting approvals.
---

# Client presentation

Clients decide well when they can see what is settled, what is proposed and what is still unknown.
A good presentation is honest about all three without being alarming.

## Inputs

- Brief, room concepts, product and material records, open issues and pending approvals.
- The design audit (`auditDesign`) — present only if `readiness.clientPresentation.ready` is true.

## Structure

1. **Where we are** — the phase and the document status in one line, e.g. "Concept for your review —
   not for construction."
2. **What we heard** — three to five points from the brief, in the client's words.
3. **The proposal** — room by room: the idea, how it meets their needs, the key materials and products.
4. **What is confirmed, assumed and still to check** — a short table:

| Item | Status | What happens next |
| --- | --- | --- |
| Bathroom size 2,400 × 1,650 mm | Confirmed (site survey, 22 Aug) | — |
| Level-access shower | Requires verification | We open up the floor to check the depth |
| Wall-hung WC | Requires approval | Your decision, after the outlet check |

5. **Decisions we need from you** — each as a clear question with options and a date; record them as
   `Approval` records.
6. **Next steps** — who does what by when.

## Language rules

- Plain English (or the client's preferred language), short sentences, no jargon without explanation.
- Metric units, with everyday comparisons where helpful.
- Money in INR with lakh/crore formatting (`formatINRCompact`) and GST status stated.
- Never call anything final, approved, construction-ready or GFC unless it is — concept work is
  "for your review".
- Never present sample or unverified product data as a confirmed selection; say "proposed — model to
  be confirmed".
- Show certainty with the same labels as the system: Confirmed, Assumed, Unknown, Requires
  verification, Requires approval.

## Components

`DesignBriefView`, `RoomCard`, `ProductCard`, `MaterialCard`, `ApprovalCard`, `RequirementsMatrix`.

Related: `client-presentation-writer` agent, `design-brief` skill.

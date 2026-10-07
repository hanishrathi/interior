---
name: client-intake
description: Capture a new client's household, lifestyle, preferences, cultural and accessibility needs, budget and timeline as a validated Client record with explicit certainty on every fact. Use at the start of a project, after an intake meeting, or when turning meeting notes or a questionnaire into structured data.
---

# Client intake

Turn what the client said into a `Client` record (`design-system/schemas/client.ts`) that a designer
can rely on: every fact sourced, every guess labelled, every gap listed as an open question.

## Inputs

- Meeting notes, a call transcript, a questionnaire or the designer's summary.
- The date, the person who conducted the intake and the method (in person, video call, phone, questionnaire).

## Procedure

1. **Read everything first.** Do not start filling fields until you have read all the notes.
2. **Household** — one `members[]` entry per person, described by role and age group (`child`,
   `teen`, `adult`, `senior`), never by sensitive detail beyond what the design needs. Record needs per
   member as statements (e.g. knee pain, works from home, needs a study desk).
3. **Lifestyle** — cooking style (daily Indian cooking with tempering changes extraction needs),
   entertaining (how many guests, how often), domestic help (none / part-time / full-time / live-in),
   pets, work from home, routines.
4. **Preferences** — style keywords in the client's own words, likes, dislikes, colours, materials.
   Distinguish what they said from your interpretation.
5. **Cultural considerations** — ask, never assume: pooja space and orientation, Vastu (and how strictly),
   footwear at the entrance, kitchen practices. Record the client's flexibility explicitly.
6. **Accessibility needs** — older members, mobility, sight, hearing, children's safety. These drive
   bathroom and circulation requirements later.
7. **Budget** — record the range in INR exactly as stated with its source. Record whether it includes
   GST; if not discussed, `includesGst` is `{ "value": null, "certainty": "unknown" }`. Note what the
   budget covers (e.g. excludes appliances).
8. **Timeline** — the client's target is usually `assumed` (a wish, not a programme). Record society
   rules on working hours and debris removal as `requires-verification` until seen in writing.
9. **Decision makers and communication** — who approves, preferred channel (WhatsApp, email…),
   languages, availability.
10. **Open questions** — everything you could not establish, each with an owner.

## Certainty rules

| The client… | Record as |
| --- | --- |
| stated it clearly | `confirmed`, `source`: "Intake meeting, 12 Aug 2026" |
| implied it, or you inferred it | `assumed` (statements) — explain in the text or source |
| was unsure or it was not discussed | `unknown` (value `null`) and add an open question |
| said it but it depends on a third party (society, builder) | `requires-verification` with an owner |

Never upgrade certainty to make a record look complete.

## Output

1. The JSON record, valid against `clientSchema` (see `design-system/data/sample-client.json`).
2. A short summary for the designer: who the household is, the three to five decisions that will shape
   the design, and the open questions in priority order.

## Validate

```ts
import { clientSchema, validateWith } from './design-system'; // from the repository root
const result = validateWith(clientSchema, record, 'client');
```

All measurements metric. No imperial units, even if the client used them — record only the metric
value as `requires-verification` with a source such as "Client's estimate at intake, converted to mm".

Related: `design-brief` skill, `design-director` agent.

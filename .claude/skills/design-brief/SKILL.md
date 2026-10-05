---
name: design-brief
description: Write or update a project's design brief — objectives, style direction, palette, functional requirements, constraints, budget, timeline, recommendations, assumptions and open questions — as a validated DesignBrief that is always labelled as concept. Use after client intake, when the brief needs revising, or before concept development starts.
---

# Design brief

The brief is the agreement on *what* the design must achieve. It is conceptual by definition: its
`documentStatus` can only be `draft`, `concept` or `for-client-review` (the schema enforces this).

## Inputs

- The validated `Client` record (`client-intake` skill).
- The `Project` record: scope, rooms, budget, team.
- Any site survey information already gathered.

## Procedure

1. **Summary** — two or three sentences a client would recognise as their home, not a style label.
2. **Objectives** — four to six outcomes, each a `statement` with certainty. Client-stated objectives
   are `confirmed` with a source; designer-proposed ones are `requires-approval` with the client as owner.
3. **Style direction** — keywords, a short narrative written around materials and light, references
   (described in words, with the client's reaction and date), and an explicit *avoid* list.
4. **Palette** — reference materials by id (`palette.materialIds`); add a note that choices are
   conceptual until physical samples are approved.
5. **Functional requirements** — the non-negotiables: pooja orientation, storage counts, study corner,
   seating for guests. Estimates (e.g. "about 20 pairs of shoes") are `requires-verification`.
6. **Constraints** — structure, society rules, existing services, budget limits, programme.
7. **Budget and timeline** — copy from the client record; never round or reinterpret. GST stays
   `unknown` until asked.
8. **Recommendations** — each with `rationale`, `certainty` and `owner`. A recommendation that depends
   on something unmeasured (e.g. level-access shower vs. sunken depth) is `requires-verification`.
9. **Assumptions** — things you are treating as true for now. Never `confirmed`.
10. **Open questions** — each `unknown`, `requires-verification` or `requires-approval`, with an owner.

## Writing rules

- Plain, specific language. "Seat 10 to 12 guests for weekend lunches" beats "flexible entertaining".
- Metric units only.
- Never call the brief final, approved or construction-ready. Record approval as an `Approval` record
  (`subject.kind: "design-brief"`) with the evidence reference.

## Output

- `project.designBrief` valid against `designBriefSchema`.
- Render check: `<DesignBriefView brief={…} materials={…} />` — it always shows the
  "Concept — not for construction" banner.
- A list of approvals to request and the questions to ask at the next meeting.

Run `npm run validate:products` (validates the sample project) or `validateWith(projectSchema, …)`.

Related: `concept-development`, `client-presentation`, `design-director` agent.

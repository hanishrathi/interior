# Clawed Design — instructions for Claude Code

Clawed Design is an interior-design operating system: client intake, briefs, concepts, real-product
integration, materials, documentation and client presentation. This repository holds its design
system — tokens, typed React components, Zod schemas, business-logic utilities, sample data, and the
skills and agents that help designers use it.

## Commands

| Task | Command |
| --- | --- |
| Everything (run before you finish) | `npm run check` |
| Type checking | `npm run typecheck` |
| Lint (type-aware, React hooks, jsx-a11y) | `npm run lint` |
| Unit tests (Vitest, Node) | `npm test` |
| Browser tests (keyboard, focus, dialogs in Chromium) | `npm run test:browser` |
| Install the browser for browser tests (once per machine) | `npx playwright install chromium` |
| Library build (types + bundle + CSS) | `npm run build` |
| Validate tokens, CSS, components, docs, skills, agents | `npm run validate:design-system` |
| Validate sample product and material data | `npm run validate:products` |
| Review a real project (records, compatibility, audit, readiness) | `npm run review:project -- --project=… --client=… --rooms=… --products=… --materials=…` |
| Validate a real catalogue | `npx tsx scripts/validate-product-data.ts --products=path.json --materials=path.json` |
| Regenerate `styles/tokens.css` after editing tokens | `npm run tokens:css` |

Stack: TypeScript 6 (strict, `noUncheckedIndexedAccess`), React 19, Zod 4, Vite 8, Vitest 5 (Node and
browser mode via Playwright), ESLint 9, npm. Styling is plain CSS custom properties generated from the
token JSON — there is no Tailwind. To run the browser tests against a Chromium that is already
installed, set `CHROMIUM_EXECUTABLE_PATH` to its executable.

CI (`.github/workflows/check.yml`) runs `npm ci`, installs Playwright's headless Chromium, then
`npm run check` on every pull request and on pushes to `main`; a red check means `npm run check`
fails — reproduce it locally first.

## Map

```
design-system/
  tokens/      *.json token sources (DTCG-style) + index.ts (resolver, CSS builder, domain vocabularies)
  schemas/     Zod schemas and inferred types — the source of truth for every record
  utils/       Pure business logic: validation, status, formatting, productCompatibility, designQualityAudit
  components/  Presentational React components (no business logic, no zod)
  styles/      tokens.css (generated — never edit) and components.css
  data/        Sample dataset: Mehta Residence, Bengaluru (all product data is unverified sample data)
scripts/       validate-design-system, validate-product-data, generate-token-css
tests/         Vitest suites (tests/browser/ runs in Chromium)
docs/          Architecture, principles, usage guides, workflow, assumptions
.claude/       Settings, skills (workflows) and agents (specialists)
```

## Non-negotiable rules

1. **Never invent product information.** Model numbers, dimensions, finishes, pressures, IP ratings,
   prices and lead times come from a cited source (manufacturer document, dealer quotation, site
   measurement) or are recorded as `value: null` with certainty `unknown` / `requires-verification`.
   Do not fill gaps from memory, "typical" values or other models in the same range.
2. **Every claim carries a certainty**: `confirmed` (needs `source`), `assumed` (needs `note`; a statement may give its basis in `source`),
   `unknown` (value must be `null`), `requires-verification`, `requires-approval` (statements need an
   `owner`). Use `specValue()` for values and `statementSchema` / `recommendationSchema` for sentences.
   Every major recommendation states its rationale and certainty.
3. **Every product records** model number, source, dimensions, installation requirements, finish,
   status and verification state — as unknown if unknown, never omitted.
4. **Metric only.** Millimetres for dimensions, m² for areas, bar for pressure, lux, kelvin. The audit
   and validators flag ft, inches, sq ft and sft.
5. **Concept is never construction-ready.** Do not write "final", "GFC", "issued for construction" or
   "construction-ready" about concept or unverified information. Projects before documentation phase
   cannot carry `for-construction`; briefs never can. Planning dimensions in `tokens/dimensions.json`
   are guidance, not code compliance.
6. **Kohler appears only as sample data**: `source.kind: "sample-data"`, `isSample: true`, verification
   `sample-data`, model number `null`. The sample-data policy (`checkSampleDataPolicy`) enforces this.
7. **Business logic stays out of components.** Compute in `utils/` (pure, tested); pass results such
   as `CompatibilityReport` or `RequirementSummary` into components as props. Components never import
   `zod`.
8. **Tokens only.** No hex values or raw colours in components or `components.css`; use
   `var(--cd-…)`. Change tokens in JSON, then run `npm run tokens:css`.
9. **Accessible by default.** Semantic HTML, labelled controls, keyboard support, visible focus,
   AA contrast (enforced by tests), status conveyed by text not colour alone.
10. **Premium, calm, architectural.** Hairline borders, generous space, restrained motion, no
    gradients, no novelty colours, no generic SaaS chrome.

## Working on this repository

- **Adding or changing a record type**: edit the schema first, then sample data, then utils and
  components; add tests for every new rule. Keep vocabularies (`as const` arrays) next to the schema.
- **Adding a token**: edit the JSON, run `npm run tokens:css`, and add a contrast requirement in
  `tokens/index.ts` for any new text/background pairing.
- **Adding a component**: one file per component in `design-system/components/`, named export matching
  the file, exported from `design-system/index.ts`, covered in `tests/components.test.tsx` (plus
  `tests/browser/` when it has keyboard, focus or dialog behaviour) and documented in
  `docs/component-usage.md`.
- **Adding product data**: follow `docs/product-integration-workflow.md` and the `product-integration`
  skill; run `npm run validate:products`.
- Record any new assumption in `docs/assumptions.md`.
- Finish with `npm run check` and report the result honestly, including warnings.

## Skills and agents

Skills (`.claude/skills/`) are step-by-step workflows: `client-intake`, `design-brief`,
`concept-development`, `product-integration`, `bathroom-design`, `material-schedule`,
`technical-review`, `client-presentation`, `design-audit`.

Agents (`.claude/agents/`) are specialists: `design-director` (orchestrates), `space-planner`,
`product-coordinator`, `materials-specialist`, `bathroom-specialist`, `lighting-specialist`,
`technical-reviewer` (independent, read-only) and `client-presentation-writer`.

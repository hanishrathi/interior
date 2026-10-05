# Architecture

Clawed Design is organised in four layers. Each layer may depend only on the layers above it in this
list, never below.

```
tokens      design-system/tokens       JSON token sources, resolver, CSS builder, domain vocabularies
   ↑
schemas     design-system/schemas      Zod schemas → TypeScript types; the rules every record obeys
   ↑
utils       design-system/utils        Pure business logic: validation, status, formatting,
   ↑                                   productCompatibility, designQualityAudit
components  design-system/components   Presentational React; renders records and precomputed results
```

`design-system/index.ts` re-exports all four layers. `design-system/data` holds sample records and is
never imported by the library entry point.

## Layers

### Tokens

- **Visual tokens** (`colors`, `typography`, `spacing`, `radii`, `shadows`, `dimensions.size`) use a
  DTCG-style format (`$value`, `$type`, `$description`, `{alias}` references). `tokens/resolve.ts`
  flattens and resolves them; `buildTokenCss()` emits `styles/tokens.css`, with aliases kept as
  `var()` references so a theme can override palette values.
- **Domain tokens** (`materials`, `finishes`, `lighting`, `dimensions.planning`) are structured design
  knowledge — material categories and code prefixes, finish suitability, lighting guidance, bathroom
  IP zones, planning clearances. They are validated with Zod when the module loads, so a malformed token
  file fails immediately.
- **Contrast requirements** (`CONTRAST_REQUIREMENTS`) list every text/background pairing the components
  use; tests and the validator fail if any pair drops below WCAG AA.

### Schemas

One file per record type: `client`, `project` (including the design brief), `room` (including
requirements, fixture allowances and bathroom details), `product`, `material`, `lighting`, `approval`,
`issue`, plus `common` for shared primitives.

The central primitive is the **spec value**:

```ts
{ value: T | null, certainty: 'confirmed' | 'assumed' | 'unknown' | 'requires-verification' | 'requires-approval', source?, note? }
```

with rules: confirmed needs a source; assumed needs a note; unknown means `null`; empty values can only
be unknown or requires-verification. Sentences use `statementSchema`; recommendations add a rationale.

Cross-field rules live in `superRefine` blocks next to the data they protect — ordering requires
verification, sample data cannot be confirmed or progressed, concept phases cannot issue
`for-construction`, decided approvals need evidence, and so on.

### Utils

Pure, deterministic functions with no React and no I/O:

| Module | Responsibility |
| --- | --- |
| `validation.ts` | `validateWith`, catalogue and library validation, referential integrity, sample-data policy, text scanning for imperial units and construction-ready claims |
| `status.ts` | Status vocabulary → label, tone and description; certainty arithmetic (`combineCertainty`); summaries |
| `formatting.ts` | `en-IN` formatting: mm, m², INR with lakh/crore, dates, spec values, labels |
| `productCompatibility.ts` | Completeness, fit, clearances, services, IP ratings, pairings → `CompatibilityReport` |
| `designQualityAudit.ts` | Rule-based project audit with phase-scaled severity, capped scoring and readiness gates |

Every check returns a result *and* the certainty of the inputs it used. A check on assumed dimensions
returns an assumed result; a check on missing data returns `unknown`, never an optimistic default.

### Components

Typed function components (React 19), one per file, styled with `cd-` classes from
`styles/components.css`. Components:

- receive records and precomputed results (`CompatibilityReport`, `RequirementSummary`, `overdue`)
  as props — the container computes, the component renders;
- may call formatting and status-description helpers, but never validate, never import `zod` and never
  hard-code colours (both checked by `validate-design-system`).

## Build and distribution

`npm run build` cleans `dist/`, regenerates `tokens.css`, emits declarations with `tsc -p
tsconfig.build.json` and bundles `design-system/index.ts` with Vite 8 in library mode (ESM, React and
Zod external). The stylesheets are copied to `dist/tokens.css` and `dist/components.css`.

Consumers:

```ts
import '@clawed/design-system/tokens.css';
import '@clawed/design-system/components.css';
import { ProductCard, assessRoomProducts } from '@clawed/design-system';
```

## Quality gates

| Gate | Command | Covers |
| --- | --- | --- |
| Types | `npm run typecheck` | Strict TypeScript across library, scripts and tests |
| Lint | `npm run lint` | typescript-eslint (type-aware), React hooks, jsx-a11y |
| Tests | `npm test` | Tokens, schemas, compatibility, audit, components |
| Design system | `npm run validate:design-system` | Token resolution, contrast, generated CSS, CSS variables, component exports and hygiene, docs, skills and agents |
| Product data | `npm run validate:products` | Schemas, sample-data policy, integrity, completeness, compatibility, units and language |
| Build | `npm run build` | Declarations and bundle |

`npm run check` runs them all.

## Claude Code layer

`CLAUDE.md` sets the rules; `.claude/skills/*` are workflows (intake → brief → concept → integration →
review → presentation → audit); `.claude/agents/*` are specialists that apply them. The design-system
validator checks that every skill and agent exists with valid frontmatter.

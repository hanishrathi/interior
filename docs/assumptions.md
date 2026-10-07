# Assumptions

Decisions made while setting up the repository, recorded so they can be revisited. Add to this file
whenever you make a new assumption.

## Repository and tooling

| # | Assumption | Reason |
| --- | --- | --- |
| A1 | The repository was empty (no commits, no `package.json`), so the empty-repository defaults apply: TypeScript, React and plain CSS custom properties. | Nothing existed to reuse or overwrite. |
| A2 | **npm** is the package manager (`package-lock.json` committed). | Default with Node; pnpm, yarn and bun were also available but not configured. |
| A3 | Tailwind CSS is **not** used — it was not installed — so styling uses CSS custom properties generated from tokens plus `components.css`. | Brief: "Tailwind if already installed, otherwise plain CSS variables". |
| A4 | **Zod** and **Vitest** were installed as part of the initial setup, since a new repository has no "available" libraries. | Schemas and tests are core requirements; hand-rolled validators would be weaker. |
| A5 | TypeScript is pinned to **6.0.x** and ESLint to **9.x**, not the newest majors. | `typescript-eslint` supports TypeScript < 6.1; `eslint-plugin-jsx-a11y` supports ESLint ≤ 9. |
| A6 | React **19** is a peer dependency (dev dependency for tests). Components use React 19 conventions (`ref` as a prop). | Current stable React. |
| A7 | The package is ESM-only (`"type": "module"`), built with Vite 8 library mode plus `tsc` declarations. | Single modern target; React and Zod external. |
| A8 | Component markup tests render to static markup (`react-dom/server`) instead of using jsdom; interactive behaviour (Tabs keyboard, Modal focus and dismissal) is tested in a real browser instead (A12). | Static markup covers structure and accessibility attributes cheaply; a real browser exercises native `<dialog>` modality, focus, inertness and the shipped CSS, which a simulated DOM only approximates. |
| A9 | Scripts run with **tsx**. | Runs the TypeScript sources directly, including JSON imports. |
| A10 | Additional files beyond the requested structure: `schemas/common.ts`, `tokens/resolve.ts`, `components/{cx,Field,DetailList,SpecValueText,StatementList}`, `styles/*.css`, `scripts/lib/reporter.ts`, `tests/fixtures.ts`, `tests/components.test.tsx`. | Shared primitives and helpers keep the requested files focused. |
| A11 | CI runs on GitHub-hosted `ubuntu-latest` with Node **22** (the version everything was verified on), installs with `npm ci` from the committed lockfile, installs Playwright's headless Chromium and runs `npm run check`. Actions are pinned to major versions (`actions/checkout@v5`, `actions/setup-node@v5`). | Mirrors the local definition of done; widen the Node matrix (e.g. 24) once verified. |
| A12 | Browser tests use Vitest browser mode with the Playwright provider in **headless Chromium only** (`@vitest/browser-playwright`, `playwright`, `vitest-browser-react`), in a separate `browser` test project. CI installs the headless shell that matches the locked Playwright version; locally, `npx playwright install chromium` once. `CHROMIUM_EXECUTABLE_PATH` points the tests at an already installed Chromium instead — useful where downloads are blocked, but that build may differ from the one Playwright expects. | Chromium covers the native `<dialog>` and focus behaviour the components rely on. Add Firefox and WebKit instances when cross-browser support is required. |

| A13 | "Deploy" means the static preview site in `site/`, hosted on cPanel. The library is `private` and is consumed as a package, so it is not published; the site is built locally or in CI and uploaded as static files (File Manager zip now, FTPS/SFTP from CI once the account details exist). | The repository has no application. The user chose cPanel; shared cPanel hosting typically offers static hosting only. |

## Tokens and design

| # | Assumption | Reason |
| --- | --- | --- |
| B1 | Tokens follow a DTCG-*style* format (`$value`, `$type`, aliases) but keep dimensions and shadows as CSS strings rather than DTCG object values. | Readability; easy to migrate if a tool requires strict DTCG. |
| B2 | Fonts — Cormorant Garamond (display), Instrument Sans (interface), IBM Plex Mono (data) — are referenced by name with system fallbacks and are not bundled. | Font loading and licensing belong to the host application. |
| B3 | Only a light theme ships. Aliases are emitted as `var()` so a dark theme can override palette values later. | Scope. |
| B4 | Planning clearances and heights in `dimensions.json` are generic residential planning guidance chosen for early conflict detection. They are not taken from, and do not claim compliance with, any code. | Codes vary; verification belongs to qualified professionals. |
| B5 | Illuminance targets and CRI guidance in `lighting.json` are typical residential design targets, not code values. | Same as B4. |
| B6 | Bathroom IP minimums follow the widely used IEC 60364-7-701 zone concept (zone 0 IPX7; zones 1 and 2 IPX4; IPX5 where water jets are used). They must be confirmed by the project's electrical consultant against applicable Indian standards. | Common reference model; local confirmation required. |
| B7 | Reference materials (Kota, Kadappa, Jaisalmer, Makrana, Tandur, Athangudi, red oxide, terrazzo, teak, sheesham, lime plaster) are described qualitatively only. Display colours are approximate screen references. | No technical property is asserted without supplier data. |
| B8 | A wet-floor finish guidance of `avoid` is a design signal for generally slippery finishes (polished stone, glossy tile), not a test result. | Slip resistance must come from supplier test data. |

## Data and domain

| # | Assumption | Reason |
| --- | --- | --- |
| C1 | Sample data describes a **fictional** client (the Mehta family), studio team and apartment in Koramangala, Bengaluru. Any resemblance to real people is unintended. Email addresses use `example.com`; no phone numbers are included. | Realistic Indian context without real personal data. |
| C2 | All product and material records in `design-system/data` are sample data. Kohler is the only named brand, every Kohler record has no model number and no confirmed values, and the source note says it was not taken from a Kohler catalogue. | Brief: Kohler only as explicitly marked sample data; never invent specifications. |
| C3 | Site conditions in the sample (dimensions, 0.8 bar water pressure, floor outlet, 700 mm door) are fictional survey data, carrying certainty as they would on a real project. | Exercises the compatibility and audit rules realistically. |
| C4 | Currency defaults to INR with `en-IN` formatting (lakh/crore grouping); budgets record GST inclusion explicitly, as unknown when not discussed. | Indian practice. |
| C5 | Dates are ISO `YYYY-MM-DD` and formatted in UTC so calendar dates never shift. The audit takes an explicit `asOf` date. | Deterministic results. |
| C6 | Statuses: products and materials share one lifecycle (`proposed` → `installed`); ordering requires verification; sample data cannot progress beyond `shortlisted`. Client approval before verification is allowed but flagged. | Mirrors studio practice while protecting procurement. |
| C7 | Document status maxima by phase: intake `draft`; brief and concept `for-client-review`; design development `for-coordination`; documentation onwards `for-construction`. Briefs are capped at `for-client-review`. | "Never describe conceptual design information as construction-ready." |
| C8 | Audit scoring: critical 20, major 8, minor 3, info 0, with each rule's total capped at twice its largest deduction. Missing product information is minor at concept, major in design development and critical from documentation. | A score that reflects risk at the current phase without one repeated gap dominating. |
| C9 | Construction-readiness and imperial-unit detection are heuristics (pattern-based, negation-aware). A human reviews every finding. | Language is ambiguous; false positives are cheaper than misses. |
| C10 | A 20 mm margin is treated as the threshold for a "tight fit". | Allows for finishes build-up and installation tolerances; adjust per project. |

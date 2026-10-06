# Clawed Design System

Design tokens, typed React components, Zod schemas and business logic for **Clawed Design** — a
premium interior-design operating system for collecting client information, developing concepts,
integrating real products, managing materials, generating documentation and presenting design
decisions.

```bash
npm install
npx playwright install chromium   # once, for the browser tests
npm run check                     # typecheck, lint, unit and browser tests, validators and build
```

| Read | For |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | Rules and commands (for people and for Claude Code) |
| [`docs/architecture.md`](docs/architecture.md) | How the layers fit together |
| [`docs/design-principles.md`](docs/design-principles.md) | The principles and how they are enforced |
| [`docs/component-usage.md`](docs/component-usage.md) | Using the components |
| [`docs/token-usage.md`](docs/token-usage.md) | Using and extending tokens |
| [`docs/product-integration-workflow.md`](docs/product-integration-workflow.md) | Adding real products safely |
| [`docs/assumptions.md`](docs/assumptions.md) | Decisions to revisit |

All sample data is fictional. Kohler appears only as explicitly marked, unverified sample data — no
model numbers or specifications are asserted.

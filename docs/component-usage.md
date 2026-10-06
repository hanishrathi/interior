# Component usage

## Setup

Load the stylesheets once, in this order, and wrap the application in `.cd-app` for base typography:

```tsx
import '@clawed/design-system/tokens.css';
import '@clawed/design-system/components.css';

export function App({ children }: { children: React.ReactNode }) {
  return <div className="cd-app">{children}</div>;
}
```

Fonts (Cormorant Garamond, Instrument Sans, IBM Plex Mono) are referenced by name with system
fallbacks; load them in the host application if you want them.

## Containers compute, components render

Components never validate data or run business rules. Compute in a container and pass the result:

```tsx
const reports = assessRoomProducts(room, products);
const summary = summariseRequirements(room.requirements);

<RoomCard room={room} requirementSummary={summary} />
<ProductIntegrationTable products={products} reports={reports} />
<ProductCard product={product} completeness={checkProductCompleteness(product)} report={reports[product.id]} />
```

## Primitives

| Component | Use | Notes |
| --- | --- | --- |
| `Button` | Actions | `variant` primary / secondary / ghost / danger; `size` sm / md / lg; `loading` announces `loadingText` and blocks clicks. Defaults to `type="button"`. |
| `Card` | Grouped content | `eyebrow`, `title`, `titleAs`, `actions`, `footer`, `variant` outlined / muted / raised. Labels its region with the title. |
| `Badge` | Tags and categories | Six tones; `dot`, `dashed`. Always contains text. |
| `StatusBadge` | Any status | `kind` + `value` from the shared registry (`certainty`, `item`, `verification`, `approval`, `severity`, `issue`, `document`, `phase`, `room`, `requirement`, `priority`, `sample`, `check`, `compatibility`). |
| `Input`, `Select`, `Textarea` | Forms | `label` required; `hint` and `error` linked via `aria-describedby`; `Input` takes a metric `unit` ("mm", "m²") announced with the label. |
| `Modal` | Focused tasks | Native `<dialog>`: focus containment, Escape and focus return built in. Controlled by `open` / `onClose`. |
| `Tabs` | Switching views | WAI-ARIA tabs; Arrow keys, Home and End; controlled or uncontrolled. |
| `DataTable` | Tabular records | Captioned, sortable (`sortValue`), row headers (`isRowHeader`), keyboard-scrollable on small screens. Unknown values sort last. |
| `ProgressBar` | Coverage and completion | `label` required; `valueText` is shown and announced. |
| `SectionHeader` | Section titles | Choose `level` for the document outline, not for size. |
| `EmptyState` | Empty regions | Say why it is empty and what to do next. |
| `DetailList` | Term / detail pairs | Semantic `<dl>`; stacks in narrow containers. |
| `SpecValueText` | Any spec value | Formats known values and shows certainty; missing values render as a certainty badge. |
| `StatementList` | Statements and recommendations | Always shows certainty, source, owner and rationale. |

## Domain components

| Component | Props | Shows |
| --- | --- | --- |
| `ClientBriefCard` | `client` | Household, budget with certainty and GST, target date, style keywords, accessibility, cultural considerations, open questions |
| `RoomCard` | `room`, `requirementSummary?`, `openIssueCount?` | Measured dimensions with certainty, area, contents, requirement coverage |
| `ProductCard` | `product`, `completeness?`, `report?` | Sample-data notice, brand, model, dimensions, finish, installation, status, verification, compatibility checks |
| `MaterialCard` | `material` | Code, category, swatch (screen reference only), origin, supplier, finish, format, slip resistance, applications, sample status |
| `ApprovalCard` | `approval`, `overdue?`, `actions?` | Subject, revision, approver, dates, evidence, conditions |
| `IssueCard` | `issue`, `actions?` | Severity, status, owner, dates, resolution |
| `ProductIntegrationTable` | `products`, `reports?`, `renderName?` | The working product list with model numbers, dimensions, status, verification and compatibility |
| `RequirementsMatrix` | `requirements`, `summary?`, `resolveLabel?` | Requirements traced to the items that address them |
| `DesignBriefView` | `brief`, `materials?`, `projectName?` | The brief as a document with the "not for construction" status banner |
| `DesignTokenPreview` | `tokens?`, `contrast?` | Colour roles, type styles, spacing, radii, elevation and contrast results |

Domain cards accept `headingLevel` (2 or 3) so they fit the page outline.

## Accessibility checklist for new components

- Use the native element first (`button`, `dialog`, `table`, `dl`, `progress` semantics).
- Every control has a visible label; hints and errors are linked.
- Keyboard: everything reachable, nothing trapped, visible focus (`:focus-visible` ring from tokens).
- Status is never colour alone — include text.
- Test markup in `tests/components.test.tsx`; test keyboard, focus and dialog behaviour in
  `tests/browser/` (real Chromium, `npm run test:browser`).

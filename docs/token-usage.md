# Token usage

## Files

| File | Kind | Contents |
| --- | --- | --- |
| `colors.json` | Visual | `palette` (raw values) and `color` (semantic roles that alias the palette) |
| `typography.json` | Visual | Font families, weights, sizes, line heights, letter spacing, composite `textStyle`s |
| `spacing.json` | Visual | 4 px-based `space` scale in rem |
| `radii.json` | Visual | `radius` scale |
| `shadows.json` | Visual | `shadow` elevations |
| `dimensions.json` | Visual + domain | `size` (interface sizes, emitted to CSS) and `planning` (mm clearances and heights — guidance only) |
| `materials.json` | Domain | Material categories with schedule code prefixes; Indian reference materials |
| `finishes.json` | Domain | Finish vocabulary with sheen, wet-floor guidance and maintenance |
| `lighting.json` | Domain | Colour temperatures, CRI guidance, illuminance targets, layers, beam angles, bathroom IP zones |

## Format

Visual tokens use a DTCG-style structure:

```json
{
  "color": {
    "$type": "color",
    "text": {
      "primary": { "$value": "{palette.stone.900}", "$description": "Body text." }
    }
  }
}
```

- `$type` may be set on a group and is inherited.
- `{path.to.token}` is an alias; aliases resolve recursively and cycles are rejected.
- Composite `typography` tokens expand to one CSS variable per property.
- Dimensions are strings with units (`"1rem"`) rather than DTCG's object form, for readability.

## CSS variables

Token paths become custom properties with a `--cd-` prefix and kebab-case segments:

| Token | CSS variable |
| --- | --- |
| `color.text.primary` | `--cd-color-text-primary` |
| `color.action.primaryHover` | `--cd-color-action-primary-hover` |
| `space.4` | `--cd-space-4` |
| `textStyle.heading1` (fontSize) | `--cd-text-style-heading1-font-size` |
| `size.controlHeight.md` | `--cd-size-control-height-md` |

Aliases are emitted as `var()` references (`--cd-color-text-primary: var(--cd-palette-stone-900)`), so
a theme can override palette values and every role follows.

In TypeScript:

```ts
import { cssVar, getToken, colorValue } from '@clawed/design-system';

cssVar('color.border.focus');          // 'var(--cd-color-border-focus)'
getToken('space.6').value;             // '1.5rem'
colorValue('color.text.primary');      // '#1F1D1A'
```

## Rules

1. Components and `components.css` use semantic `color.*` roles only — never palette values, never hex.
   `validate-design-system` enforces this.
2. `styles/tokens.css` is generated. Edit JSON, then run `npm run tokens:css`. A test fails if the
   committed file is stale.
3. Every new text/background pairing gets an entry in `CONTRAST_REQUIREMENTS`
   (`design-system/tokens/index.ts`): 4.5:1 for text, 3:1 for borders and focus rings.
4. `stone.400` and lighter are decorative only; `color.text.muted` (`stone.600`) is the lowest-contrast
   text allowed.
5. Planning dimensions are guidance for early conflict detection, not code compliance. When you add a
   clearance or height, add its key to `PLANNING_CLEARANCE_KEYS` / `PLANNING_HEIGHT_KEYS` — the
   loader rejects any mismatch.
6. Material category prefixes must stay unique; material schemas check codes against them.
7. Lighting values describe typical residential targets. Bathroom zone IP minimums follow the IEC
   60364-7-701 zone concept and must be confirmed by the project's electrical consultant.

## Theming

To theme, override palette variables after `tokens.css`:

```css
.theme-dusk {
  --cd-palette-stone-50: #f4f1ec;
}
```

Check contrast for any override: add a test or run `auditContrast()` against the new values.

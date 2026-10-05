import { useId, type CSSProperties } from 'react';
import { designTokens, type ContrastResult, type ResolvedToken } from '../tokens';
import { DataTable, type DataTableColumn } from './DataTable';
import { SectionHeader } from './SectionHeader';
import { StatusBadge } from './StatusBadge';

export interface DesignTokenPreviewProps {
  tokens?: readonly ResolvedToken[];
  /** From `auditContrast()`. Omit to hide the contrast table. */
  contrast?: readonly ContrastResult[];
}

const byPrefix = (tokens: readonly ResolvedToken[], prefix: string) =>
  tokens.filter((token) => token.path.startsWith(`${prefix}.`));

const display = (token: ResolvedToken) =>
  Array.isArray(token.value) ? token.value.join(', ') : typeof token.value === 'object' ? '' : String(token.value);

/** Living reference for the token set: colours, type, spacing, radii and elevation. */
export function DesignTokenPreview({ tokens = designTokens, contrast }: DesignTokenPreviewProps) {
  const baseId = useId();
  const sectionId = (name: string) => `${baseId}-${name}`;
  const colorTokens = byPrefix(tokens, 'color');
  const textStyles = byPrefix(tokens, 'textStyle');

  const contrastColumns: DataTableColumn<ContrastResult>[] = [
    { id: 'context', header: 'Use', isRowHeader: true, cell: (r) => r.context },
    { id: 'pair', header: 'Foreground / background', cell: (r) => <span className="cd-mono">{`${r.foreground} / ${r.background}`}</span> },
    { id: 'ratio', header: 'Ratio', align: 'end', sortValue: (r) => r.ratio, cell: (r) => `${r.ratio.toFixed(2)}:1` },
    { id: 'minimum', header: 'Minimum', align: 'end', cell: (r) => `${r.minimum}:1` },
    {
      id: 'result',
      header: 'Result',
      cell: (r) => <StatusBadge kind="check" value={r.passes ? 'pass' : 'fail'} size="sm" />,
    },
  ];

  return (
    <div className="cd-token-preview">
      <section aria-labelledby={sectionId('colour')}>
        <SectionHeader id={sectionId('colour')} title="Colour roles" description="Components use semantic roles only, never raw palette values." />
        <ul className="cd-token-grid">
          {colorTokens.map((token) => (
            <li key={token.path} className="cd-token">
              <span className="cd-token__swatch" style={{ backgroundColor: `var(${token.cssVariable})` }} aria-hidden="true" />
              <span className="cd-token__name cd-mono">{token.path}</span>
              <span className="cd-token__value cd-mono">
                {display(token)}
                {token.aliasOf ? ` ← ${token.aliasOf}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={sectionId('type')}>
        <SectionHeader id={sectionId('type')} title="Type styles" />
        <ul className="cd-type-specimens">
          {textStyles.map((token) => {
            const style: CSSProperties = {
              fontFamily: `var(${token.cssVariable}-font-family)`,
              fontSize: `var(${token.cssVariable}-font-size)`,
              fontWeight: `var(${token.cssVariable}-font-weight)`,
              lineHeight: `var(${token.cssVariable}-line-height)`,
              letterSpacing: `var(${token.cssVariable}-letter-spacing)`,
            };
            return (
              <li key={token.path} className="cd-type-specimen">
                <span className="cd-token__name cd-mono">{token.path}</span>
                <span style={style}>Parents&apos; bathroom — 2,400 × 1,650 mm</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby={sectionId('space')}>
        <SectionHeader id={sectionId('space')} title="Spacing" />
        <ul className="cd-scale">
          {byPrefix(tokens, 'space').map((token) => (
            <li key={token.path} className="cd-scale__row">
              <span className="cd-token__name cd-mono">{token.path}</span>
              <span className="cd-scale__bar" style={{ width: `var(${token.cssVariable})` }} aria-hidden="true" />
              <span className="cd-token__value cd-mono">{display(token)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={sectionId('shape')}>
        <SectionHeader id={sectionId('shape')} title="Radii and elevation" />
        <ul className="cd-token-grid">
          {[...byPrefix(tokens, 'radius'), ...byPrefix(tokens, 'shadow')].map((token) => (
            <li key={token.path} className="cd-token">
              <span
                className="cd-token__shape"
                style={
                  token.path.startsWith('radius')
                    ? { borderRadius: `var(${token.cssVariable})` }
                    : { boxShadow: `var(${token.cssVariable})` }
                }
                aria-hidden="true"
              />
              <span className="cd-token__name cd-mono">{token.path}</span>
              <span className="cd-token__value cd-mono">{display(token)}</span>
            </li>
          ))}
        </ul>
      </section>

      {contrast ? (
        <section aria-labelledby={sectionId('contrast')}>
          <SectionHeader id={sectionId('contrast')} title="Contrast (WCAG 2.2 AA)" />
          <DataTable
            caption="Contrast checks"
            captionHidden
            columns={contrastColumns}
            rows={contrast}
            getRowKey={(r) => `${r.foreground}|${r.background}`}
            density="compact"
          />
        </section>
      ) : null}
    </div>
  );
}

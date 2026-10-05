import type { ReactNode } from 'react';
import type { Product } from '../schemas/product';
import { humanize } from '../utils/formatting';
import type { CompatibilityReport, ProductCompleteness } from '../utils/productCompatibility';
import { Card } from './Card';
import { DetailList } from './DetailList';
import { DimensionsText } from './DimensionsText';
import { SpecValueText } from './SpecValueText';
import { StatusBadge } from './StatusBadge';

export interface ProductCardProps {
  product: Product;
  /** From `checkProductCompleteness(product)`. */
  completeness?: ProductCompleteness;
  /** From `assessProduct` / `assessRoomProducts`. */
  report?: CompatibilityReport;
  headingLevel?: 2 | 3;
  actions?: ReactNode;
}

export function ProductCard({ product, completeness, report, headingLevel = 3, actions }: ProductCardProps) {
  const Sub = headingLevel === 2 ? 'h3' : 'h4';
  const { installation } = product;

  return (
    <Card
      eyebrow={humanize(product.category)}
      title={product.name}
      titleAs={headingLevel === 2 ? 'h2' : 'h3'}
      actions={actions}
      footer={
        <div className="cd-badge-row">
          <StatusBadge kind="item" value={product.status} />
          <StatusBadge kind="verification" value={product.verification.state} />
        </div>
      }
    >
      {product.source.isSample ? (
        <p className="cd-notice" role="note">
          <strong>Sample data — not a verified source.</strong> {product.source.note}
        </p>
      ) : null}
      <DetailList
        items={[
          { term: 'Brand', detail: <SpecValueText spec={product.brand} /> },
          { term: 'Model number', detail: <SpecValueText spec={product.modelNumber} className="cd-mono" /> },
          { term: 'Dimensions', detail: <DimensionsText dimensions={product.dimensions} /> },
          { term: 'Finish', detail: <SpecValueText spec={product.finish.name} /> },
          { term: 'Mounting', detail: <SpecValueText spec={installation.mounting} format={humanize} /> },
          { term: 'Water', detail: <SpecValueText spec={installation.waterSupply} format={humanize} /> },
          { term: 'Drainage', detail: <SpecValueText spec={installation.drainage} format={humanize} /> },
          { term: 'Electrical', detail: <SpecValueText spec={installation.electrical} format={humanize} /> },
          { term: 'Source', detail: product.source.reference ?? humanize(product.source.kind) },
        ]}
      />

      {completeness && completeness.missing.length > 0 ? (
        <p className="cd-callout cd-callout--caution">
          Missing: {completeness.missing.map((field) => field.label.toLowerCase()).join(', ')}.
        </p>
      ) : null}

      {report ? (
        <>
          <div className="cd-inline-heading">
            <Sub className="cd-subheading">Compatibility</Sub>
            <StatusBadge kind="compatibility" value={report.outcome} />
          </div>
          <ul className="cd-checks">
            {report.checks.map((check) => (
              <li key={check.id} className="cd-check">
                <StatusBadge kind="check" value={check.result} size="sm" />
                <div>
                  <p className="cd-check__label">{check.label}</p>
                  <p className="cd-check__message">{check.message}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Card>
  );
}

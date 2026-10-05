import type { ReactNode } from 'react';
import type { Material } from '../schemas/material';
import { finishTokens, materialTokens } from '../tokens';
import { formatMm, humanize } from '../utils/formatting';
import { Badge } from './Badge';
import { Card } from './Card';
import { DetailList } from './DetailList';
import { SpecValueText } from './SpecValueText';
import { StatusBadge } from './StatusBadge';

export interface MaterialCardProps {
  material: Material;
  headingLevel?: 2 | 3;
  actions?: ReactNode;
}

export function MaterialCard({ material, headingLevel = 3, actions }: MaterialCardProps) {
  const category = materialTokens.categories[material.category];
  const { format, properties } = material;
  return (
    <Card
      eyebrow={
        <>
          <span className="cd-mono">{material.code}</span> · {category.label}
        </>
      }
      title={material.name}
      titleAs={headingLevel === 2 ? 'h2' : 'h3'}
      actions={actions}
      footer={
        <div className="cd-badge-row">
          <StatusBadge kind="item" value={material.status} />
          <StatusBadge kind="sample" value={material.sampleStatus} />
          <StatusBadge kind="verification" value={material.verification.state} />
        </div>
      }
    >
      <div className="cd-material">
        {material.displayColor ? (
          <figure className="cd-swatch">
            <span className="cd-swatch__chip" style={{ backgroundColor: material.displayColor }} aria-hidden="true" />
            <figcaption className="cd-swatch__caption">Screen reference only</figcaption>
          </figure>
        ) : null}
        <DetailList
          items={[
            { term: 'Origin', detail: <SpecValueText spec={material.origin} /> },
            { term: 'Supplier', detail: <SpecValueText spec={material.supplier} /> },
            {
              term: 'Finish',
              detail: <SpecValueText spec={material.finish} format={(id) => finishTokens[id]?.label ?? humanize(id)} />,
            },
            { term: 'Colour', detail: <SpecValueText spec={material.colour} /> },
            { term: 'Length', detail: <SpecValueText spec={format.lengthMm} format={formatMm} /> },
            { term: 'Width', detail: <SpecValueText spec={format.widthMm} format={formatMm} /> },
            { term: 'Thickness', detail: <SpecValueText spec={format.thicknessMm} format={formatMm} /> },
            { term: 'Slip resistance', detail: <SpecValueText spec={properties.slipResistance} /> },
          ]}
        />
      </div>
      <ul className="cd-tag-list" aria-label="Applications">
        {material.applications.map((application) => (
          <li key={application}>
            <Badge size="sm">{humanize(application)}</Badge>
          </li>
        ))}
      </ul>
      {material.source.isSample ? (
        <p className="cd-notice" role="note">
          <strong>Sample data — not a verified source.</strong> {material.source.note}
        </p>
      ) : null}
    </Card>
  );
}

import type { ReactNode } from 'react';
import type { Room } from '../schemas/room';
import { areaM2FromMm, formatAreaM2, formatMm, humanize, pluralize } from '../utils/formatting';
import { combineCertainty, type RequirementSummary } from '../utils/status';
import { Card } from './Card';
import { DetailList } from './DetailList';
import { ProgressBar } from './ProgressBar';
import { SpecValueText } from './SpecValueText';
import { StatusBadge } from './StatusBadge';

export interface RoomCardProps {
  room: Room;
  /** From `summariseRequirements(room.requirements)`. Omit to hide the coverage bar. */
  requirementSummary?: RequirementSummary;
  openIssueCount?: number;
  headingLevel?: 2 | 3;
  footer?: ReactNode;
}

export function RoomCard({ room, requirementSummary, openIssueCount, headingLevel = 3, footer }: RoomCardProps) {
  const { lengthMm, widthMm, ceilingHeightMm, falseCeilingHeightMm } = room.dimensions;
  const area =
    lengthMm.value !== null && widthMm.value !== null
      ? {
          value: areaM2FromMm(lengthMm.value, widthMm.value),
          certainty: combineCertainty(lengthMm.certainty, widthMm.certainty),
        }
      : null;

  return (
    <Card
      eyebrow={humanize(room.type)}
      title={room.name}
      titleAs={headingLevel === 2 ? 'h2' : 'h3'}
      actions={<StatusBadge kind="room" value={room.status} />}
      footer={footer}
    >
      <DetailList
        items={[
          { term: 'Length', detail: <SpecValueText spec={lengthMm} format={formatMm} /> },
          { term: 'Width', detail: <SpecValueText spec={widthMm} format={formatMm} /> },
          {
            term: 'Area',
            detail: area ? (
              <SpecValueText spec={{ value: area.value, certainty: area.certainty }} format={formatAreaM2} />
            ) : (
              <StatusBadge kind="certainty" value="unknown" size="sm" />
            ),
          },
          { term: 'Floor to soffit', detail: <SpecValueText spec={ceilingHeightMm} format={formatMm} /> },
          ...(falseCeilingHeightMm
            ? [{ term: 'False ceiling', detail: <SpecValueText spec={falseCeilingHeightMm} format={formatMm} /> }]
            : []),
          {
            term: 'Contents',
            detail: `${pluralize(room.productIds.length, 'product')} · ${pluralize(room.materialIds.length, 'material')}`,
          },
          ...(openIssueCount !== undefined ? [{ term: 'Open issues', detail: String(openIssueCount) }] : []),
        ]}
      />
      {requirementSummary ? (
        <>
          <ProgressBar
            label="Requirements covered"
            value={requirementSummary.percentCovered}
            valueText={`${requirementSummary.met} met, ${requirementSummary.partiallyMet} partly, ${
              requirementSummary.notMet + requirementSummary.notAssessed
            } open`}
            tone={requirementSummary.openMusts > 0 ? 'caution' : 'positive'}
          />
          {requirementSummary.openMusts > 0 ? (
            <p className="cd-callout cd-callout--caution">
              {pluralize(requirementSummary.openMusts, 'must-have requirement')} not yet fully met.
            </p>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}

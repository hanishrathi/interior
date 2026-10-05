import type { ReactNode } from 'react';
import type { Approval } from '../schemas/approval';
import { formatDate, humanize } from '../utils/formatting';
import { Badge } from './Badge';
import { Card } from './Card';
import { DetailList } from './DetailList';
import { StatusBadge } from './StatusBadge';

export interface ApprovalCardProps {
  approval: Approval;
  /** From `isApprovalOverdue(approval, today)`. */
  overdue?: boolean;
  headingLevel?: 2 | 3;
  /** Decision controls (e.g. Record approval / Record rejection). Business logic stays with the caller. */
  actions?: ReactNode;
}

export function ApprovalCard({ approval, overdue = false, headingLevel = 3, actions }: ApprovalCardProps) {
  const Sub = headingLevel === 2 ? 'h3' : 'h4';
  return (
    <Card
      eyebrow={`Approval · ${humanize(approval.subject.kind)} · Rev ${approval.revision}`}
      title={approval.title}
      titleAs={headingLevel === 2 ? 'h2' : 'h3'}
      actions={
        <div className="cd-badge-row">
          <StatusBadge kind="approval" value={approval.status} />
          {overdue ? (
            <Badge tone="critical" dot>
              Overdue
            </Badge>
          ) : null}
        </div>
      }
      footer={actions}
    >
      <p>{approval.description}</p>
      <DetailList
        items={[
          { term: 'Approver', detail: approval.approver },
          { term: 'Requested', detail: `${formatDate(approval.requestedOn)} by ${approval.requestedBy}` },
          ...(approval.dueOn ? [{ term: 'Due', detail: formatDate(approval.dueOn) }] : []),
          ...(approval.decidedOn ? [{ term: 'Decided', detail: formatDate(approval.decidedOn) }] : []),
          ...(approval.recordedVia ? [{ term: 'Recorded via', detail: humanize(approval.recordedVia) }] : []),
          ...(approval.evidenceRef ? [{ term: 'Evidence', detail: approval.evidenceRef }] : []),
        ]}
      />
      {approval.conditions.length > 0 ? (
        <>
          <Sub className="cd-subheading">Conditions</Sub>
          <ul className="cd-list">
            {approval.conditions.map((condition) => (
              <li key={condition}>{condition}</li>
            ))}
          </ul>
        </>
      ) : null}
      {approval.comments ? <p className="cd-muted">{approval.comments}</p> : null}
    </Card>
  );
}

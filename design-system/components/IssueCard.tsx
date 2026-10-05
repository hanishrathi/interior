import type { ReactNode } from 'react';
import type { Issue } from '../schemas/issue';
import { formatDate, humanize } from '../utils/formatting';
import { Card } from './Card';
import { DetailList } from './DetailList';
import { StatusBadge } from './StatusBadge';

export interface IssueCardProps {
  issue: Issue;
  headingLevel?: 2 | 3;
  actions?: ReactNode;
}

export function IssueCard({ issue, headingLevel = 3, actions }: IssueCardProps) {
  return (
    <Card
      eyebrow={`Issue · ${humanize(issue.category)}`}
      title={issue.title}
      titleAs={headingLevel === 2 ? 'h2' : 'h3'}
      className={`cd-issue cd-issue--${issue.severity}`}
      actions={
        <div className="cd-badge-row">
          <StatusBadge kind="severity" value={issue.severity} />
          <StatusBadge kind="issue" value={issue.status} />
        </div>
      }
      footer={actions}
    >
      <p>{issue.description}</p>
      <DetailList
        items={[
          { term: 'Raised', detail: `${formatDate(issue.raisedOn)} · ${humanize(issue.raisedBy)}` },
          { term: 'Owner', detail: issue.owner ?? 'Unassigned' },
          ...(issue.dueOn ? [{ term: 'Due', detail: formatDate(issue.dueOn) }] : []),
          ...(issue.resolution ? [{ term: 'Resolution', detail: issue.resolution }] : []),
          ...(issue.resolvedOn ? [{ term: 'Resolved', detail: formatDate(issue.resolvedOn) }] : []),
        ]}
      />
    </Card>
  );
}

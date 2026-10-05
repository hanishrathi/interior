import type { ReactNode } from 'react';
import { REQUIREMENT_PRIORITIES, REQUIREMENT_STATUSES, type Requirement } from '../schemas/room';
import { humanize } from '../utils/formatting';
import type { RequirementSummary } from '../utils/status';
import { DataTable, type DataTableColumn } from './DataTable';
import { ProgressBar } from './ProgressBar';
import { StatusBadge } from './StatusBadge';

export interface RequirementsMatrixProps {
  requirements: readonly Requirement[];
  /** From `summariseRequirements(requirements)`. Omit to hide the coverage bar. */
  summary?: RequirementSummary;
  /** Turns an `addressedBy` id into a readable label (product, material or recommendation name). */
  resolveLabel?: (id: string) => string;
  caption?: ReactNode;
}

/** Requirements traced to the design decisions that address them. */
export function RequirementsMatrix({
  requirements,
  summary,
  resolveLabel = (id) => id,
  caption = 'Requirements',
}: RequirementsMatrixProps) {
  const columns: DataTableColumn<Requirement>[] = [
    { id: 'requirement', header: 'Requirement', isRowHeader: true, cell: (r) => r.text },
    { id: 'category', header: 'Category', sortValue: (r) => r.category, cell: (r) => humanize(r.category) },
    {
      id: 'priority',
      header: 'Priority',
      sortValue: (r) => REQUIREMENT_PRIORITIES.indexOf(r.priority),
      cell: (r) => <StatusBadge kind="priority" value={r.priority} size="sm" />,
    },
    { id: 'source', header: 'Source', sortValue: (r) => r.source, cell: (r) => humanize(r.source) },
    { id: 'certainty', header: 'Certainty', cell: (r) => <StatusBadge kind="certainty" value={r.certainty} size="sm" /> },
    {
      id: 'status',
      header: 'Status',
      sortValue: (r) => REQUIREMENT_STATUSES.indexOf(r.status),
      cell: (r) => <StatusBadge kind="requirement" value={r.status} size="sm" />,
    },
    {
      id: 'addressedBy',
      header: 'Addressed by',
      cell: (r) =>
        r.addressedBy.length > 0 ? (
          <ul className="cd-cell-list">
            {r.addressedBy.map((id) => (
              <li key={id}>{resolveLabel(id)}</li>
            ))}
          </ul>
        ) : (
          <span className="cd-muted">Nothing yet</span>
        ),
    },
  ];

  return (
    <div className="cd-stack">
      {summary ? (
        <ProgressBar
          label="Coverage"
          value={summary.percentCovered}
          valueText={`${summary.percentCovered}% · ${summary.openMusts} must-have open`}
          tone={summary.openMusts > 0 ? 'caution' : 'positive'}
        />
      ) : null}
      <DataTable
        caption={caption}
        columns={columns}
        rows={requirements}
        getRowKey={(r) => r.id}
        density="compact"
        emptyState="No requirements recorded. Capture them during client intake."
      />
    </div>
  );
}

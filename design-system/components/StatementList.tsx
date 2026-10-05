import type { Recommendation, Statement } from '../schemas/common';
import { cx } from './cx';
import { StatusBadge } from './StatusBadge';

export interface StatementListProps {
  statements: readonly (Statement | Recommendation)[];
  emptyText?: string;
  className?: string;
}

/** Statements and recommendations, each with its certainty, source, owner and (for recommendations) rationale. */
export function StatementList({ statements, emptyText = 'None recorded.', className }: StatementListProps) {
  if (statements.length === 0) return <p className={cx('cd-muted', className)}>{emptyText}</p>;
  return (
    <ul className={cx('cd-statements', className)}>
      {statements.map((statement) => {
        const meta = [
          statement.source ? `Source: ${statement.source}` : null,
          statement.owner ? `Owner: ${statement.owner}` : null,
        ].filter(Boolean);
        return (
          <li key={statement.id} className="cd-statement">
            <div className="cd-statement__body">
              <p className="cd-statement__text">{statement.text}</p>
              {'rationale' in statement ? <p className="cd-statement__rationale">{statement.rationale}</p> : null}
              {meta.length > 0 ? <p className="cd-statement__meta">{meta.join(' · ')}</p> : null}
            </div>
            <StatusBadge kind="certainty" value={statement.certainty} size="sm" className="cd-statement__badge" />
          </li>
        );
      })}
    </ul>
  );
}

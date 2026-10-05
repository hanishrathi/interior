import type { Material } from '../schemas/material';
import type { DesignBrief } from '../schemas/project';
import { formatBudgetRange, formatDate } from '../utils/formatting';
import { describeStatus } from '../utils/status';
import { Badge } from './Badge';
import { SectionHeader } from './SectionHeader';
import { SpecValueText } from './SpecValueText';
import { StatementList } from './StatementList';
import { StatusBadge } from './StatusBadge';

export interface DesignBriefViewProps {
  brief: DesignBrief;
  /** Materials referenced by `brief.palette.materialIds`, for names and swatches. */
  materials?: readonly Material[];
  /** Project name shown above the title. */
  projectName?: string;
}

/**
 * The design brief as a readable document. The document status banner is always shown so
 * conceptual content can never be mistaken for construction information.
 */
export function DesignBriefView({ brief, materials = [], projectName }: DesignBriefViewProps) {
  const status = describeStatus('document', brief.documentStatus);
  const palette = brief.palette.materialIds.map((id) => ({ id, material: materials.find((m) => m.id === id) }));

  return (
    <article className="cd-brief" aria-labelledby={`${brief.id}-title`}>
      <header className="cd-brief__header">
        {projectName ? <p className="cd-eyebrow">{projectName}</p> : null}
        <h1 id={`${brief.id}-title`} className="cd-brief__title">
          Design brief
        </h1>
        <p className="cd-brief__meta">
          Version {brief.version} · Prepared by {brief.preparedBy} · {formatDate(brief.preparedOn)}
        </p>
        <p className={`cd-banner cd-banner--${status.tone}`} role="note">
          <StatusBadge kind="document" value={brief.documentStatus} />
          <span>{status.description}</span>
        </p>
      </header>

      <section className="cd-brief__section" aria-labelledby={`${brief.id}-summary`}>
        <SectionHeader id={`${brief.id}-summary`} title="Summary" />
        <p className="cd-lead">{brief.summary}</p>
      </section>

      <section className="cd-brief__section" aria-labelledby={`${brief.id}-objectives`}>
        <SectionHeader id={`${brief.id}-objectives`} title="Objectives" />
        <StatementList statements={brief.objectives} />
      </section>

      <section className="cd-brief__section" aria-labelledby={`${brief.id}-style`}>
        <SectionHeader id={`${brief.id}-style`} title="Style direction" description={brief.styleDirection.narrative} />
        <ul className="cd-tag-list">
          {brief.styleDirection.keywords.map((keyword) => (
            <li key={keyword}>
              <Badge>{keyword}</Badge>
            </li>
          ))}
        </ul>
        <SectionHeader level={3} title="References" />
        <StatementList statements={brief.styleDirection.references} />
        <SectionHeader level={3} title="Avoid" />
        <StatementList statements={brief.styleDirection.avoid} />
      </section>

      <section className="cd-brief__section" aria-labelledby={`${brief.id}-palette`}>
        <SectionHeader id={`${brief.id}-palette`} title="Material palette" />
        <ul className="cd-palette">
          {palette.map(({ id, material }) => (
            <li key={id} className="cd-palette__item">
              <span
                className="cd-swatch__chip"
                style={material?.displayColor ? { backgroundColor: material.displayColor } : undefined}
                aria-hidden="true"
              />
              <span className="cd-palette__label">
                {material ? (
                  <>
                    <span className="cd-mono">{material.code}</span> {material.name}
                  </>
                ) : (
                  id
                )}
              </span>
            </li>
          ))}
        </ul>
        <p className="cd-muted">Swatches are screen references only. Approve physical samples.</p>
        <StatementList statements={brief.palette.notes} />
      </section>

      <section className="cd-brief__section" aria-labelledby={`${brief.id}-function`}>
        <SectionHeader id={`${brief.id}-function`} title="Functional requirements" />
        <StatementList statements={brief.functionalRequirements} />
      </section>

      <section className="cd-brief__section" aria-labelledby={`${brief.id}-constraints`}>
        <SectionHeader id={`${brief.id}-constraints`} title="Constraints" />
        <StatementList statements={brief.constraints} />
      </section>

      <section className="cd-brief__section" aria-labelledby={`${brief.id}-budget`}>
        <SectionHeader id={`${brief.id}-budget`} title="Budget and timeline" />
        <p className="cd-spec">
          <span className="cd-spec__value">{formatBudgetRange(brief.budget)}</span>
          <StatusBadge kind="certainty" value={brief.budget.range.certainty} size="sm" />
        </p>
        <p>
          GST included: <SpecValueText spec={brief.budget.includesGst} format={(included) => (included ? 'yes' : 'no')} />
        </p>
        {brief.budget.covers ? <p className="cd-muted">{brief.budget.covers}</p> : null}
        <StatementList statements={brief.timeline} />
      </section>

      <section className="cd-brief__section" aria-labelledby={`${brief.id}-recommendations`}>
        <SectionHeader id={`${brief.id}-recommendations`} title="Recommendations" />
        <StatementList statements={brief.recommendations} />
      </section>

      <section className="cd-brief__section" aria-labelledby={`${brief.id}-assumptions`}>
        <SectionHeader id={`${brief.id}-assumptions`} title="Assumptions" />
        <StatementList statements={brief.assumptions} />
      </section>

      <section className="cd-brief__section" aria-labelledby={`${brief.id}-questions`}>
        <SectionHeader id={`${brief.id}-questions`} title="Open questions" />
        <StatementList statements={brief.openQuestions} emptyText="No open questions." />
      </section>
    </article>
  );
}

import type { ReactNode } from 'react';
import type { Client } from '../schemas/client';
import { formatBudgetRange, formatDate, formatHousehold } from '../utils/formatting';
import { Badge } from './Badge';
import { Card } from './Card';
import { DetailList } from './DetailList';
import { SpecValueText } from './SpecValueText';
import { StatementList } from './StatementList';
import { StatusBadge } from './StatusBadge';

export interface ClientBriefCardProps {
  client: Client;
  /** Level of the card title; subsections use the next level down. */
  headingLevel?: 2 | 3;
  actions?: ReactNode;
}

/** One-glance summary of who the client is, what they can spend and what must be respected. */
export function ClientBriefCard({ client, headingLevel = 3, actions }: ClientBriefCardProps) {
  const Sub = headingLevel === 2 ? 'h3' : 'h4';
  const { budget } = client;
  return (
    <Card eyebrow="Client" title={client.displayName} titleAs={headingLevel === 2 ? 'h2' : 'h3'} actions={actions}>
      <DetailList
        items={[
          { term: 'Household', detail: formatHousehold(client.household.members) },
          {
            term: 'Budget',
            detail: (
              <span className="cd-spec">
                <span className="cd-spec__value">{formatBudgetRange(budget)}</span>
                <StatusBadge kind="certainty" value={budget.range.certainty} size="sm" />
              </span>
            ),
          },
          {
            term: 'GST included',
            detail: <SpecValueText spec={budget.includesGst} format={(included) => (included ? 'Yes' : 'No')} />,
          },
          {
            term: 'Target completion',
            detail: <SpecValueText spec={client.timeline.targetCompletion} format={formatDate} quietConfirmed={false} />,
          },
          { term: 'Decision makers', detail: client.decisionMakers.join(', ') },
          { term: 'Languages', detail: client.communication.languages.join(', ') },
        ]}
      />

      <Sub className="cd-subheading">Style keywords</Sub>
      <ul className="cd-tag-list">
        {client.preferences.styleKeywords.map((keyword) => (
          <li key={keyword}>
            <Badge>{keyword}</Badge>
          </li>
        ))}
      </ul>

      <Sub className="cd-subheading">Accessibility needs</Sub>
      <StatementList statements={client.accessibilityNeeds} />

      <Sub className="cd-subheading">Cultural considerations</Sub>
      <StatementList statements={client.culturalConsiderations} />

      {client.openQuestions.length > 0 ? (
        <>
          <Sub className="cd-subheading">Open questions</Sub>
          <StatementList statements={client.openQuestions} />
        </>
      ) : null}
    </Card>
  );
}

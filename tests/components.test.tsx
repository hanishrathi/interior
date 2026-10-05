import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ApprovalCard,
  Badge,
  Button,
  Card,
  ClientBriefCard,
  DataTable,
  DesignBriefView,
  DesignTokenPreview,
  EmptyState,
  Input,
  IssueCard,
  MaterialCard,
  Modal,
  ProductCard,
  ProductIntegrationTable,
  ProgressBar,
  RequirementsMatrix,
  RoomCard,
  SectionHeader,
  Select,
  StatusBadge,
  Tabs,
  Textarea,
  assessRoomProducts,
  auditContrast,
  checkProductCompleteness,
  isApprovalOverdue,
  sortRows,
  summariseRequirements,
} from '../design-system';
import { sample } from './fixtures';

const html = (element: React.ReactElement) => renderToStaticMarkup(element);

describe('primitives', () => {
  it('Button defaults to type="button" and announces loading', () => {
    expect(html(<Button>Save</Button>)).toContain('type="button"');
    const loading = html(
      <Button loading loadingText="Saving…">
        Save
      </Button>,
    );
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain('disabled=""');
    expect(loading).toContain('Saving…');
  });

  it('Card labels its region with the title', () => {
    const markup = html(<Card title="Parents' bathroom">Body</Card>);
    expect(markup).toMatch(/<article[^>]*aria-labelledby="([^"]+)"/);
    const id = /aria-labelledby="([^"]+)"/.exec(markup)?.[1];
    expect(markup).toContain(`<h3 id="${id}"`);
  });

  it('Badge always renders text with its tone', () => {
    expect(html(<Badge tone="caution">Pending</Badge>)).toContain('cd-badge--caution');
  });

  it('form controls associate labels, hints and errors', () => {
    const input = html(<Input label="Width" unit="mm" hint="Finished dimension" error="Required" required />);
    const id = /<input[^>]*\sid="([^"]+)"/.exec(input)?.[1];
    expect(input).toContain(`for="${id}"`);
    expect(input).toContain(`aria-describedby="${id}-hint ${id}-error"`);
    expect(input).toContain('aria-invalid="true"');
    expect(input).toContain('(mm)');

    const select = html(<Select label="Finish" options={[{ value: 'honed', label: 'Honed' }]} placeholder="Choose" />);
    expect(select).toContain('<option value="">Choose</option>');
    expect(html(<Textarea label="Notes" />)).toContain('rows="4"');
  });

  it('Modal uses a labelled native dialog', () => {
    const markup = html(
      <Modal open={false} onClose={() => undefined} title="Record approval" description="Attach the evidence.">
        Body
      </Modal>,
    );
    expect(markup).toMatch(/<dialog[^>]*aria-labelledby=/);
    expect(markup).toContain('aria-label="Close"');
  });

  it('Tabs follow the WAI-ARIA pattern with one tab in the tab order', () => {
    const markup = html(
      <Tabs
        label="Room details"
        items={[
          { id: 'products', label: 'Products', content: 'P' },
          { id: 'materials', label: 'Materials', content: 'M' },
        ]}
      />,
    );
    expect(markup).toContain('role="tablist"');
    expect(markup.match(/role="tab"/g)).toHaveLength(2);
    expect(markup.match(/tabindex="0"/g)).toHaveLength(3); // selected tab + both panels
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toMatch(/role="tabpanel"[^>]*hidden=""/);
  });

  it('DataTable renders a captioned, keyboard-scrollable table', () => {
    const markup = html(
      <DataTable
        caption="Rooms"
        rows={[{ id: 'a', name: 'Kitchen' }]}
        getRowKey={(row) => row.id}
        columns={[{ id: 'name', header: 'Name', cell: (row) => row.name, isRowHeader: true, sortValue: (row) => row.name }]}
      />,
    );
    expect(markup).toContain('<caption');
    expect(markup).toContain('role="region"');
    expect(markup).toContain('<th scope="row"');
    expect(markup).toContain('cd-table__sort');
  });

  it('sorts unknown values last in both directions', () => {
    const rows = [{ v: 2 }, { v: null }, { v: 1 }];
    expect(sortRows(rows, (r) => r.v, 'ascending').map((r) => r.v)).toEqual([1, 2, null]);
    expect(sortRows(rows, (r) => r.v, 'descending').map((r) => r.v)).toEqual([2, 1, null]);
  });

  it('StatusBadge marks unknown information with a dashed outline', () => {
    expect(html(<StatusBadge kind="certainty" value="unknown" />)).toContain('cd-badge--dashed');
    expect(html(<StatusBadge kind="certainty" value="requires-verification" />)).toContain('Requires verification');
  });

  it('ProgressBar exposes value semantics', () => {
    const markup = html(<ProgressBar label="Verified" value={3} max={12} valueText="3 of 12" />);
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuenow="3"');
    expect(markup).toContain('aria-valuetext="3 of 12"');
  });

  it('SectionHeader and EmptyState render their content', () => {
    expect(html(<SectionHeader title="Products" level={3} />)).toContain('<h3');
    expect(html(<EmptyState title="No products yet" description="Add one." />)).toContain('No products yet');
  });
});

describe('domain components', () => {
  const reports = assessRoomProducts(sample.bathroom, sample.products);
  const wc = sample.products.find((p) => p.id === 'prd-wc-01')!;

  it('ClientBriefCard shows budget, certainty and open questions', () => {
    const markup = html(<ClientBriefCard client={sample.client} />);
    expect(markup).toContain('₹35 lakh – ₹45 lakh');
    expect(markup).toContain('4 members: 2 adults, 1 senior, 1 child');
    expect(markup).toContain('Open questions');
  });

  it('RoomCard shows measured dimensions and requirement coverage', () => {
    const markup = html(<RoomCard room={sample.bathroom} requirementSummary={summariseRequirements(sample.bathroom.requirements)} />);
    expect(markup).toContain('2,400 mm');
    expect(markup).toContain('3.96 m²');
    expect(markup).toContain('role="progressbar"');
  });

  it('ProductCard never hides that sample data is unverified', () => {
    const markup = html(<ProductCard product={wc} completeness={checkProductCompleteness(wc)} report={reports[wc.id]} />);
    expect(markup).toContain('Sample data — not a verified source.');
    expect(markup).toContain('Requires verification');
    expect(markup).toContain('Missing:');
    expect(markup).toContain('Cannot determine');
  });

  it('MaterialCard labels the swatch as a screen reference', () => {
    const markup = html(<MaterialCard material={sample.materials[0]!} />);
    expect(markup).toContain('ST-01');
    expect(markup).toContain('Screen reference only');
  });

  it('ApprovalCard flags overdue approvals', () => {
    const approval = sample.project.approvals.find((a) => a.id === 'apr-bath-layout')!;
    expect(html(<ApprovalCard approval={approval} overdue={isApprovalOverdue(approval, '2026-10-05')} />)).toContain('Overdue');
  });

  it('IssueCard shows severity and owner', () => {
    const markup = html(<IssueCard issue={sample.project.issues[0]!} />);
    expect(markup).toContain('Major');
    expect(markup).toContain('Arjun Nair');
  });

  it('ProductIntegrationTable lists every product with its compatibility', () => {
    const markup = html(<ProductIntegrationTable products={sample.products} reports={reports} />);
    expect(markup.match(/<tr>/g)).toHaveLength(sample.products.length + 1);
    expect(markup).toContain('Compatibility');
  });

  it('RequirementsMatrix resolves linked items', () => {
    const names = new Map(sample.products.map((p) => [p.id, p.name]));
    const markup = html(
      <RequirementsMatrix
        requirements={sample.bathroom.requirements}
        summary={summariseRequirements(sample.bathroom.requirements)}
        resolveLabel={(id) => names.get(id) ?? id}
      />,
    );
    expect(markup).toContain('Health faucet (Kohler, model to be selected)');
  });

  it('DesignBriefView always states that the brief is not for construction', () => {
    const markup = html(
      <DesignBriefView brief={sample.project.designBrief!} materials={sample.materials} projectName={sample.project.name} />,
    );
    expect(markup).toContain('Concept — not for construction');
    expect(markup).toContain('<h1');
  });

  it('DesignTokenPreview renders tokens and contrast results', () => {
    const markup = html(<DesignTokenPreview contrast={auditContrast()} />);
    expect(markup).toContain('color.text.primary');
    expect(markup).toContain('Contrast checks');
  });
});

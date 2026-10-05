import type { ReactNode } from 'react';
import type { Product } from '../schemas/product';
import { ITEM_STATUSES } from '../schemas/common';
import { humanize } from '../utils/formatting';
import type { CompatibilityReport } from '../utils/productCompatibility';
import { DataTable, type DataTableColumn } from './DataTable';
import { DimensionsText } from './DimensionsText';
import { SpecValueText } from './SpecValueText';
import { StatusBadge } from './StatusBadge';

export interface ProductIntegrationTableProps {
  products: readonly Product[];
  /** Keyed by product id, from `assessRoomProducts`. Omit to hide the compatibility column. */
  reports?: Readonly<Record<string, CompatibilityReport>>;
  caption?: ReactNode;
  /** Renders the product name as a control, e.g. a link or a button opening a detail panel. */
  renderName?: (product: Product) => ReactNode;
}

/** The working table for integrating real products: identity, specification, status, verification and fit. */
export function ProductIntegrationTable({
  products,
  reports,
  caption = 'Product integration',
  renderName,
}: ProductIntegrationTableProps) {
  const columns: DataTableColumn<Product>[] = [
    {
      id: 'product',
      header: 'Product',
      isRowHeader: true,
      sortValue: (p) => p.name,
      cell: (p) => (
        <div className="cd-cell-stack">
          <span className="cd-cell-title">{renderName ? renderName(p) : p.name}</span>
          <span className="cd-muted">{humanize(p.category)}</span>
        </div>
      ),
    },
    {
      id: 'model',
      header: 'Model number',
      sortValue: (p) => p.modelNumber.value,
      cell: (p) => <SpecValueText spec={p.modelNumber} className="cd-mono" />,
    },
    {
      id: 'dimensions',
      header: 'Dimensions',
      cell: (p) => <DimensionsText dimensions={p.dimensions} />,
    },
    { id: 'finish', header: 'Finish', cell: (p) => <SpecValueText spec={p.finish.name} /> },
    {
      id: 'installation',
      header: 'Installation',
      cell: (p) => <SpecValueText spec={p.installation.mounting} format={humanize} />,
    },
    {
      id: 'status',
      header: 'Status',
      sortValue: (p) => ITEM_STATUSES.indexOf(p.status),
      cell: (p) => <StatusBadge kind="item" value={p.status} size="sm" />,
    },
    {
      id: 'verification',
      header: 'Verification',
      sortValue: (p) => p.verification.state,
      cell: (p) => <StatusBadge kind="verification" value={p.verification.state} size="sm" />,
    },
  ];

  if (reports) {
    columns.push({
      id: 'compatibility',
      header: 'Compatibility',
      sortValue: (p) => reports[p.id]?.outcome ?? null,
      cell: (p) => {
        const report = reports[p.id];
        if (!report) return <span className="cd-muted">Not assessed</span>;
        const first = report.missingInformation[0];
        return (
          <div className="cd-cell-stack">
            <StatusBadge kind="compatibility" value={report.outcome} size="sm" />
            {first ? <span className="cd-muted">{first}</span> : null}
          </div>
        );
      },
    });
  }

  return (
    <DataTable
      caption={caption}
      columns={columns}
      rows={products}
      getRowKey={(p) => p.id}
      emptyState="No products yet. Add products with a cited source; mark anything unknown as unknown."
    />
  );
}

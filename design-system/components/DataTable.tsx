import { useId, useState, type ReactNode } from 'react';
import { cx } from './cx';

export type SortDirection = 'ascending' | 'descending';

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'start' | 'center' | 'end';
  /** CSS width, e.g. "12rem". */
  width?: string;
  /** Makes the column sortable. `null` (unknown) values always sort last. */
  sortValue?: (row: T) => string | number | null;
  /** Renders this column's cells as row headers (`<th scope="row">`). */
  isRowHeader?: boolean;
}

export interface DataTableProps<T> {
  caption: ReactNode;
  /** Keeps the caption for assistive technology while hiding it visually. */
  captionHidden?: boolean;
  columns: readonly DataTableColumn<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  emptyState?: ReactNode;
  density?: 'comfortable' | 'compact';
  initialSort?: { columnId: string; direction: SortDirection };
  className?: string;
}

export function sortRows<T>(
  rows: readonly T[],
  value: (row: T) => string | number | null,
  direction: SortDirection,
): T[] {
  return [...rows].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    if (left === right) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    const order =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right), 'en-IN', { numeric: true });
    return direction === 'ascending' ? order : -order;
  });
}

/** Semantic, sortable table inside a keyboard-scrollable region for narrow screens. */
export function DataTable<T>({
  caption,
  captionHidden = false,
  columns,
  rows,
  getRowKey,
  emptyState = 'No records.',
  density = 'comfortable',
  initialSort,
  className,
}: DataTableProps<T>) {
  const captionId = useId();
  const [sort, setSort] = useState(initialSort ?? null);

  const sortColumn = sort ? columns.find((column) => column.id === sort.columnId) : undefined;
  const visibleRows = sort && sortColumn?.sortValue ? sortRows(rows, sortColumn.sortValue, sort.direction) : rows;

  const toggleSort = (columnId: string) => {
    setSort((current) =>
      current?.columnId === columnId
        ? { columnId, direction: current.direction === 'ascending' ? 'descending' : 'ascending' }
        : { columnId, direction: 'ascending' },
    );
  };

  return (
    <div className={cx('cd-table-wrap', className)} role="region" aria-labelledby={captionId} tabIndex={0}>
      <table className={cx('cd-table', `cd-table--${density}`)}>
        <caption id={captionId} className={cx('cd-table__caption', captionHidden && 'cd-visually-hidden')}>
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const active = sort?.columnId === column.id;
              return (
                <th
                  key={column.id}
                  scope="col"
                  style={column.width ? { width: column.width } : undefined}
                  className={cx('cd-table__header', `cd-align-${column.align ?? 'start'}`)}
                  aria-sort={active ? sort.direction : undefined}
                >
                  {column.sortValue ? (
                    <button type="button" className="cd-table__sort" onClick={() => toggleSort(column.id)}>
                      {column.header}
                      <span className="cd-table__sort-icon" aria-hidden="true">
                        {active ? (sort.direction === 'ascending' ? '↑' : '↓') : '↕'}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {visibleRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="cd-table__empty">
                {emptyState}
              </td>
            </tr>
          ) : (
            visibleRows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => {
                  const cellClass = cx('cd-table__cell', `cd-align-${column.align ?? 'start'}`);
                  return column.isRowHeader ? (
                    <th key={column.id} scope="row" className={cx(cellClass, 'cd-table__row-header')}>
                      {column.cell(row)}
                    </th>
                  ) : (
                    <td key={column.id} className={cellClass}>
                      {column.cell(row)}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

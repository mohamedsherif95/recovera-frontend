import { cn } from '@/lib/utils';

/**
 * Generic data table
 * columns: [
 *   { key: 'fullName', header: 'Full name', className?, cellClassName?, cell?: (row) => ReactNode }
 * ]
 */
export function DataTable({
  columns,
  data,
  getRowId,
  onRowClick,
  className,
  headerClassName,
  bodyClassName,
  direction = 'ltr',
  mobileCard,
  mobileCardClassName,
}) {
  const resolveRowId = (row, index) => {
    if (getRowId) return getRowId(row, index);
    if (row && (row.id || row._id)) return row.id || row._id;
    return index;
  };

  const isRtl = direction === 'rtl';

  const clickable = typeof onRowClick === 'function';

  return (
    <>
      {mobileCard && (
        <div className={cn('grid gap-3 md:hidden', mobileCardClassName)}>
          {data.map((row, index) => {
            const id = resolveRowId(row, index);

            return (
              <div
                key={id}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                className={cn(
                  'rounded-md border bg-card p-3 text-sm shadow-sm',
                  clickable &&
                    'cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
                onClick={clickable ? () => onRowClick(row) : undefined}
                onKeyDown={
                  clickable
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
              >
                {mobileCard(row)}
              </div>
            );
          })}
        </div>
      )}

      <div className={cn('overflow-x-auto', mobileCard && 'hidden md:block', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr
            className={cn(
              'border-b bg-muted/50 text-xs uppercase text-muted-foreground',
              isRtl ? 'text-right' : 'text-left',
              headerClassName
            )}
          >
            {columns.map((col) => (
              <th key={col.key} className={cn('px-4 py-3 font-medium', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={bodyClassName}>
          {data.map((row, index) => {
            const id = resolveRowId(row, index);
            return (
              <tr
                key={id}
                className={cn(
                  'border-b last:border-b-0',
                  clickable && 'cursor-pointer hover:bg-muted/40'
                )}
                onClick={clickable ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3', col.cellClassName)}>
                    {typeof col.cell === 'function' ? col.cell(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </>
  );
}

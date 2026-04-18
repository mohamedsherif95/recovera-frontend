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
}) {
  const resolveRowId = (row, index) => {
    if (getRowId) return getRowId(row, index);
    if (row && (row.id || row._id)) return row.id || row._id;
    return index;
  };

  const isRtl = direction === 'rtl';

  return (
    <div className={cn('overflow-x-auto', className)}>
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
            const clickable = typeof onRowClick === 'function';
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
  );
}

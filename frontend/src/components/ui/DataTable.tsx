import { type ReactNode } from 'react'
import { motion } from 'framer-motion'

interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: string
  loading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 animate-shimmer rounded w-3/4" />
        </td>
      ))}
    </tr>
  )
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  loading,
  emptyMessage = 'No data found',
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-light/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-light/10">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-semibold text-mist uppercase tracking-wider ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-light/5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={columns.length} />)
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-ghost">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <motion.tr
                key={row[keyField]}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                onClick={() => onRowClick?.(row)}
                className={`
                  transition-colors duration-150
                  ${onRowClick ? 'cursor-pointer hover:bg-white/[0.02]' : ''}
                `}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-cloud ${col.className || ''}`}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </motion.tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

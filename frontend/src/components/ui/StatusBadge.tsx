const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  PLANNED: { bg: 'bg-info/10', text: 'text-info', dot: 'bg-info' },
  STARTED: { bg: 'bg-flux-cyan/10', text: 'text-flux-cyan', dot: 'bg-flux-cyan' },
  END_REQUESTED: { bg: 'bg-warn/10', text: 'text-warn', dot: 'bg-warn' },
  COMPLETED: { bg: 'bg-ok/10', text: 'text-ok', dot: 'bg-ok' },
  CANCELLED: { bg: 'bg-danger/10', text: 'text-danger', dot: 'bg-danger' },
  ACTIVE: { bg: 'bg-ok/10', text: 'text-ok', dot: 'bg-ok' },
  INACTIVE: { bg: 'bg-ghost/10', text: 'text-ghost', dot: 'bg-ghost' },
  LOW: { bg: 'bg-info/10', text: 'text-info', dot: 'bg-info' },
  MEDIUM: { bg: 'bg-warn/10', text: 'text-warn', dot: 'bg-warn' },
  HIGH: { bg: 'bg-danger/10', text: 'text-danger', dot: 'bg-danger' },
  CRITICAL: { bg: 'bg-red-900/20', text: 'text-red-400', dot: 'bg-red-400' },
}

const fallback = { bg: 'bg-ghost/10', text: 'text-ghost', dot: 'bg-ghost' }

export default function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || fallback
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
      {status.replace(/_/g, ' ')}
    </span>
  )
}

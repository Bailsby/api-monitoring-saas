type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info'

type StatsCardProps = {
  label: string
  value: string | number
  subtitle?: string
  variant?: Variant
  icon?: React.ReactNode
}

const variantStyles: Record<
  Variant,
  { bg: string; accent: string; label: string; value: string }
> = {
  default: {
    bg: 'bg-white',
    accent: 'bg-slate-100',
    label: 'text-slate-500',
    value: 'text-slate-900',
  },
  success: {
    bg: 'bg-white',
    accent: 'bg-emerald-50',
    label: 'text-emerald-700',
    value: 'text-emerald-800',
  },
  warning: {
    bg: 'bg-white',
    accent: 'bg-amber-50',
    label: 'text-amber-700',
    value: 'text-amber-800',
  },
  danger: {
    bg: 'bg-white',
    accent: 'bg-red-50',
    label: 'text-red-700',
    value: 'text-red-800',
  },
  info: {
    bg: 'bg-white',
    accent: 'bg-blue-50',
    label: 'text-blue-700',
    value: 'text-blue-800',
  },
}

export default function StatsCard({
  label,
  value,
  subtitle,
  variant = 'default',
  icon,
}: StatsCardProps) {
  const styles = variantStyles[variant]

  return (
    <div className={`${styles.bg} card p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-medium uppercase tracking-wider ${styles.label}`}
        >
          {label}
        </span>
        {icon && (
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg ${styles.accent}`}
          >
            {icon}
          </div>
        )}
      </div>

      <div className={`text-3xl font-semibold tabular-nums ${styles.value}`}>
        {value}
      </div>

      {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
    </div>
  )
}

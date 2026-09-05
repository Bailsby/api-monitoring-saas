/**
 * Human-readable duration, e.g. "45m", "2h 10m", "3d 4h".
 */
export const formatDuration = (ms: number): string => {
  const totalMinutes = Math.max(1, Math.round(ms / 60_000))

  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`

  return `${minutes}m`
}

export const formatDateTime = (value: string | Date): string =>
  new Date(value).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

/** "dns_error" -> "Dns error" */
export const formatCause = (cause: string): string => {
  const spaced = cause.replace(/_/g, ' ')

  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

import type { DotItemDotProps } from 'recharts/types/util/types'

/**
 * Draws a dot only for points that stand alone.
 *
 * Recharts draws a line between adjacent points, so a point whose neighbours
 * have no data produces no line — and with dots off, it renders as nothing at
 * all. Sparse data can therefore make a chart look empty while the numbers
 * beside it say otherwise.
 *
 * Marking only isolated points keeps dense charts clean: where a line already
 * shows the shape, dots would be noise.
 */
export const createIsolatedDot = (
  name: string,
  color: string,
  isIsolated: (payload: Record<string, unknown>) => boolean,
) => {
  const IsolatedDot = ({ cx, cy, payload }: DotItemDotProps) => {
    if (cx == null || cy == null) return null
    if (!isIsolated((payload ?? {}) as Record<string, unknown>)) return null

    return <circle cx={cx} cy={cy} r={3} fill={color} />
  }

  IsolatedDot.displayName = name

  return IsolatedDot
}

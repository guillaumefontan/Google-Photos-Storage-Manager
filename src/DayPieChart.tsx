import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import type { TooltipContentProps } from "recharts"
import type { DaySlice } from "./types"
import { formatBytes, formatDay } from "./lib/format"

const PHOTO_COLORS = [
  "#7c2d12",
  "#9a3412",
  "#c2410c",
  "#ea580c",
  "#f97316",
  "#f59e0b",
  "#d97706",
  "#b45309",
  "#a8a29e",
  "#57534e",
]

const VIDEO_COLORS = [
  "#164e63",
  "#0e7490",
  "#0369a1",
  "#1d4ed8",
  "#4338ca",
  "#155e75",
  "#334155",
  "#475569",
  "#64748b",
  "#94a3b8",
]

type ChartRow = DaySlice & { label: string }

function DayTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.[0]) return null
  const row = payload[0].payload as ChartRow
  return (
    <div className="grid gap-0.5 rounded-[10px] border border-line bg-card px-2.5 py-2 text-[13px] text-ink shadow-card">
      <strong className="font-semibold">{row.label}</strong>
      <span>{formatBytes(row.bytes)}</span>
      <span className="text-xs text-muted">
        {row.count.toLocaleString()} {row.count === 1 ? "item" : "items"}
      </span>
    </div>
  )
}

export function DayPieChart({
  title,
  days,
  colors,
  loading,
  empty,
}: {
  title: string
  days: DaySlice[]
  colors: string[]
  loading: boolean
  empty: string
}) {
  const data: ChartRow[] = days.map((day) => ({
    ...day,
    label: formatDay(day.date),
  }))
  const total = data.reduce((sum, day) => sum + day.bytes, 0)

  return (
    <article className="rounded-[18px] border border-line bg-card px-5.5 pt-5.5 pb-5 shadow-card">
      <div className="flex items-center gap-2.5">
        <h2 className="m-0 text-[13px] font-semibold tracking-[0.04em] text-muted uppercase">
          {title}
        </h2>
      </div>
      <p className="mt-2.5 mb-0 text-[13px] text-muted">
        {loading
          ? "Grouping by day…"
          : data.length > 0
            ? `${formatBytes(total)} across the top ${data.length} days`
            : empty}
      </p>
      {loading ? (
        <div
          className="mt-4 h-60 animate-shimmer rounded-xl bg-linear-to-r from-line via-paper to-line bg-size-[200%_100%]"
          aria-hidden="true"
        />
      ) : data.length === 0 ? (
        <div className="mt-4 h-60 rounded-xl bg-paper" />
      ) : (
        <div className="mt-2">
          <div className="min-w-0">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="bytes"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius="50%"
                  outerRadius="100%"
                  paddingAngle={0}
                  stroke="var(--color-card)"
                  strokeWidth={2}
                >
                  {data.map((row, index) => (
                    <Cell
                      key={row.date}
                      fill={colors[index % colors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={DayTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </article>
  )
}

export { PHOTO_COLORS, VIDEO_COLORS }

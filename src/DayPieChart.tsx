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
    <div className="chart-tooltip">
      <strong>{row.label}</strong>
      <span>{formatBytes(row.bytes)}</span>
      <span className="chart-tooltip-count">
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
    <article className="card chart-card">
      <div className="card-top">
        <h2>{title}</h2>
      </div>
      <p className="hint">
        {loading
          ? "Grouping by day…"
          : data.length > 0
            ? `${formatBytes(total)} across the top ${data.length} days`
            : empty}
      </p>
      {loading ? (
        <div className="chart-skeleton" aria-hidden="true" />
      ) : data.length === 0 ? (
        <div className="chart-empty" />
      ) : (
        <div className="chart-body">
          <div className="chart-plot">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="bytes"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius="88%"
                  paddingAngle={1.5}
                  stroke="var(--card)"
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
          <ol className="chart-legend">
            {data.map((row, index) => (
              <li key={row.date}>
                <span
                  className="swatch"
                  style={{ background: colors[index % colors.length] }}
                />
                <span className="legend-label">{row.label}</span>
                <span className="legend-value">{formatBytes(row.bytes)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  )
}

export { PHOTO_COLORS, VIDEO_COLORS }

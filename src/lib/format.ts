import type { DayMediaItem } from "../types"

/** Google account storage uses SI units: 1 GB = 1 billion bytes. */
const KB = 1000
const MB = 1_000_000
const GB = 1_000_000_000

export function formatBytes(bytes: number): string {
  if (bytes < KB) return `${bytes} B`
  if (bytes < MB) return `${(bytes / KB).toFixed(1)} KB`
  if (bytes < GB) {
    const mb = bytes / MB
    return `${mb.toFixed(mb >= 10 ? 1 : 2)} MB`
  }
  const gb = bytes / GB
  return `${gb.toFixed(gb >= 10 ? 1 : 2)} GB`
}

export function formatGigabytes(bytes: number): string {
  const gb = bytes / GB
  return `${gb.toFixed(gb >= 10 ? 1 : 2)} GB`
}

export function formatCount(value: number): string {
  return value.toLocaleString()
}

export function yearRange(years: number[]): string {
  if (years.length === 0) return ""
  if (years.length === 1) return String(years[0])
  return `${years[0]}–${years[years.length - 1]}`
}

export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`
}

export function itemCaption(item: DayMediaItem): string {
  const size = formatBytes(item.size)
  if (item.kind !== "video") return size
  if (item.durationSeconds == null) return size
  return `${size} · ${formatDuration(item.durationSeconds)}`
}

export function formatDay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  if (!year || !month || !day) return isoDate
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

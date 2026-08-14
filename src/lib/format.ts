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

export function formatCount(value: number): string {
  return value.toLocaleString()
}

export function yearRange(years: number[]): string {
  if (years.length === 0) return ""
  if (years.length === 1) return String(years[0])
  return `${years[0]}–${years[years.length - 1]}`
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

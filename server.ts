import { readdir, stat } from "node:fs/promises"
import { join } from "node:path"
import { readVideoDurationSeconds } from "./videoDuration.ts"

const PORT = 3000
const PHOTOS_ROOT =
  process.env.PHOTOS_ROOT ?? "/Users/guillaumefontan/Pictures/Google Photos"

const YEAR_FOLDER = /^Photos from (\d{4})$/
const VIDEO_EXT = new Set([
  ".mp4",
  ".mov",
  ".m4v",
  ".avi",
  ".webm",
  ".mkv",
  ".3gp",
  ".mts",
  ".m2ts",
  ".wmv",
])
const PHOTO_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".heic",
  ".heif",
  ".webp",
  ".gif",
  ".bmp",
  ".dng",
  ".tif",
  ".tiff",
  ".avif",
  ".mp",
  ".jxl",
  ".raw",
])

type MediaKind = "photo" | "video"

type TakeoutMeta = {
  title?: string
  url?: string
  photoTakenTime?: {
    timestamp?: string
  }
}

type MediaItem = {
  filename: string
  path: string
  year: number
  kind: MediaKind
  size: number
  takenAt: number
  date: string
  url: string | null
  title: string
  durationSeconds: number | null
}

type DaySlice = {
  date: string
  bytes: number
  count: number
}

type LibraryStats = {
  ready: boolean
  error: string | null
  photoCount: number
  videoCount: number
  photoBytes: number
  videoBytes: number
  itemCount: number
  years: number[]
  withUrl: number
  indexedAt: string | null
  durationMs: number
  topPhotoDays: DaySlice[]
  topVideoDays: DaySlice[]
}

let library: MediaItem[] = []
let indexError: string | null = null
let indexedAt: string | null = null
let durationMs = 0
let ready = false

function extensionOf(filename: string): string {
  const lower = filename.toLowerCase()
  const dot = lower.lastIndexOf(".")
  return dot >= 0 ? lower.slice(dot) : ""
}

function classify(filename: string): MediaKind | null {
  const ext = extensionOf(filename)
  if (VIDEO_EXT.has(ext)) return "video"
  if (PHOTO_EXT.has(ext)) return "photo"
  return null
}

function findSidecar(filename: string, jsons: Set<string>): string | null {
  const candidates = [
    `${filename}.supplemental-metadata.json`,
    `${filename}.supplemental-metadata(1).json`,
    `${filename}.json`,
  ]
  return candidates.find((name) => jsons.has(name)) ?? null
}

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

function toUtcDate(ms: number): string {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

function utcMs(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): number | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return Date.UTC(year, month - 1, day, hour, minute, second)
}

function parseDateFromFilename(filename: string): number | null {
  const pixel = filename.match(
    /(?:PXL|IMG|VID|MVIMG)_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/,
  )
  if (pixel) {
    const [, year, month, day, hour, minute, second] = pixel
    return utcMs(+year, +month, +day, +hour, +minute, +second)
  }

  const dashed = filename.match(
    /(?:IMG|VID|Screenshot)[-_](\d{4})(\d{2})(\d{2})[-_](\d{2})(\d{2})(\d{2})/,
  )
  if (dashed) {
    const [, year, month, day, hour, minute, second] = dashed
    return utcMs(+year, +month, +day, +hour, +minute, +second)
  }

  const dayOnly = filename.match(/(20\d{2})(\d{2})(\d{2})/)
  if (dayOnly) {
    const [, year, month, day] = dayOnly
    return utcMs(+year, +month, +day)
  }

  return null
}

function timestampToMs(timestamp: string | undefined): number | null {
  if (!timestamp) return null
  const value = Number(timestamp)
  if (!Number.isFinite(value) || value <= 0) return null
  return value < 1e12 ? value * 1000 : value
}

function resolveTakenAt(
  filename: string,
  meta: TakeoutMeta | null,
  fileStat: { birthtimeMs: number; mtimeMs: number },
): number {
  const fromMeta = timestampToMs(meta?.photoTakenTime?.timestamp)
  if (fromMeta) return fromMeta

  const fromName = parseDateFromFilename(filename)
  if (fromName) return fromName

  return fileStat.birthtimeMs || fileStat.mtimeMs
}

async function readMeta(path: string): Promise<TakeoutMeta | null> {
  try {
    return (await Bun.file(path).json()) as TakeoutMeta
  } catch {
    return null
  }
}

async function indexFolder(
  folder: string,
  year: number,
): Promise<MediaItem[]> {
  const files = await readdir(folder)
  const jsons = new Set(files.filter((name) => name.endsWith(".json")))
  const media = files.filter(
    (name) => !name.endsWith(".json") && name !== ".DS_Store",
  )

  const items = await Promise.all(
    media.map(async (filename) => {
      const kind = classify(filename)
      if (!kind) return null

      const path = join(folder, filename)
      const sidecar = findSidecar(filename, jsons)
      const [fileStat, meta, durationSeconds] = await Promise.all([
        stat(path),
        sidecar ? readMeta(join(folder, sidecar)) : Promise.resolve(null),
        kind === "video"
          ? readVideoDurationSeconds(path, extensionOf(filename))
          : Promise.resolve(null),
      ])

      if (!fileStat.isFile()) return null

      const takenAt = resolveTakenAt(filename, meta, fileStat)
      return {
        filename,
        path,
        year,
        kind,
        size: fileStat.size,
        takenAt,
        date: toUtcDate(takenAt),
        url: meta?.url ?? null,
        title: meta?.title ?? filename,
        durationSeconds,
      } satisfies MediaItem
    }),
  )

  return items.filter((item) => item !== null)
}

async function indexLibrary(): Promise<void> {
  const started = performance.now()
  ready = false
  indexError = null

  try {
    const entries = await readdir(PHOTOS_ROOT, { withFileTypes: true })
    const yearDirs = entries
      .filter((entry) => entry.isDirectory() && YEAR_FOLDER.test(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name))

    const folders = await Promise.all(
      yearDirs.map((dir) => {
        const year = Number(dir.name.replace("Photos from ", ""))
        return indexFolder(join(PHOTOS_ROOT, dir.name), year)
      }),
    )

    library = folders.flat()
    durationMs = Math.round(performance.now() - started)
    indexedAt = new Date().toISOString()
    ready = true

    const photos = library.filter((item) => item.kind === "photo").length
    const videos = library.length - photos
    console.log(
      `Indexed ${library.length} items (${photos} photos, ${videos} videos) in ${durationMs}ms`,
    )
  } catch (error) {
    indexError =
      error instanceof Error ? error.message : "Failed to index photo library"
    library = []
    durationMs = Math.round(performance.now() - started)
    indexedAt = new Date().toISOString()
    ready = true
    console.error(indexError)
  }
}

function visibleLibrary(excludeUnderSeconds: number | null): MediaItem[] {
  if (excludeUnderSeconds == null) return library
  return library.filter(
    (item) =>
      item.kind !== "video" ||
      item.durationSeconds == null ||
      item.durationSeconds >= excludeUnderSeconds,
  )
}

function topDays(
  items: MediaItem[],
  kind: MediaKind,
  limit = 10,
): DaySlice[] {
  const byDate = new Map<string, DaySlice>()

  for (const item of items) {
    if (item.kind !== kind) continue
    const current = byDate.get(item.date)
    if (current) {
      current.bytes += item.size
      current.count += 1
    } else {
      byDate.set(item.date, { date: item.date, bytes: item.size, count: 1 })
    }
  }

  return [...byDate.values()]
    .sort((a, b) => b.bytes - a.bytes || b.date.localeCompare(a.date))
    .slice(0, limit)
}

function parseExcludeUnderSeconds(url: URL): number | null {
  const raw = url.searchParams.get("excludeUnderSeconds")
  if (raw == null || raw === "") return null
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

function stats(excludeUnderSeconds: number | null = null): LibraryStats {
  const items = visibleLibrary(excludeUnderSeconds)
  let photoCount = 0
  let videoCount = 0
  let photoBytes = 0
  let videoBytes = 0
  let withUrl = 0
  const yearSet = new Set<number>()

  for (const item of items) {
    yearSet.add(item.year)
    if (item.url) withUrl += 1
    if (item.kind === "photo") {
      photoCount += 1
      photoBytes += item.size
    } else {
      videoCount += 1
      videoBytes += item.size
    }
  }

  return {
    ready,
    error: indexError,
    photoCount,
    videoCount,
    photoBytes,
    videoBytes,
    itemCount: items.length,
    years: [...yearSet].sort((a, b) => a - b),
    withUrl,
    indexedAt,
    durationMs,
    topPhotoDays: topDays(items, "photo"),
    topVideoDays: topDays(items, "video"),
  }
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  })
}

const server = Bun.serve({
  port: PORT,
  fetch(request) {
    const url = new URL(request.url)
    const { pathname } = url

    if (pathname === "/api/stats") {
      return json(stats(parseExcludeUnderSeconds(url)))
    }
    if (pathname === "/api/health") {
      return json({ ok: true, ready, itemCount: library.length })
    }

    return json({ error: "Not found" }, 404)
  },
})

console.log(`API listening on http://localhost:${server.port}`)
await indexLibrary()

import { useCallback, useEffect, useState } from "react"
import { Clapperboard, HardDrive, Image, Images } from "lucide-react"
import { DayPieChart, PHOTO_COLORS, VIDEO_COLORS } from "./DayPieChart"
import { DayView } from "./DayView"
import type { LibraryStats } from "./types"
import { formatBytes, formatCount, yearRange } from "./lib/format"

const EMPTY_STATS: LibraryStats = {
  ready: false,
  error: null,
  photoCount: 0,
  videoCount: 0,
  photoBytes: 0,
  videoBytes: 0,
  itemCount: 0,
  years: [],
  withUrl: 0,
  indexedAt: null,
  durationMs: 0,
  topPhotoDays: [],
  topVideoDays: [],
}

function App() {
  const [stats, setStats] = useState<LibraryStats>(EMPTY_STATS)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [excludeShort, setExcludeShort] = useState(false)
  const [underSeconds, setUnderSeconds] = useState<number | null>(0)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [markedIds, setMarkedIds] = useState<Set<string>>(() => new Set())
  const excludeUnderSeconds = underSeconds ?? 0

  const toggleMark = useCallback((id: string) => {
    setMarkedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const closeDayView = useCallback(() => {
    setSelectedDate(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const load = async () => {
      try {
        const params = new URLSearchParams()
        if (excludeShort && excludeUnderSeconds > 0) {
          params.set("excludeUnderSeconds", String(excludeUnderSeconds))
        }
        const query = params.toString()
        const response = await fetch(`/api/stats${query ? `?${query}` : ""}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = (await response.json()) as LibraryStats
        if (cancelled) return
        setStats(data)
        setFetchError(null)
        if (!data.ready) timer = setTimeout(load, 400)
      } catch {
        if (cancelled) return
        setFetchError("Waiting for the local API on port 3000…")
        timer = setTimeout(load, 800)
      }
    }

    void load()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [excludeShort, excludeUnderSeconds])

  const loading = !stats.ready && !stats.error
  const error = stats.error ?? fetchError
  const years = yearRange(stats.years)

  return (
    <div className="relative mx-auto w-[min(1080px,calc(100%-40px))] pt-16 pb-20 max-[720px]:w-[min(1080px,calc(100%-28px))] max-[720px]:pt-20">
      {selectedDate ? (
        <DayView
          key={selectedDate}
          date={selectedDate}
          markedIds={markedIds}
          onToggleMark={toggleMark}
          onBack={closeDayView}
        />
      ) : (
        <>
          <header className="mb-10 text-sm flex items-center justify-between">
            <div>
              <span className="text-muted">
                {loading
                  ? "Reading your Google Takeout folders…"
                  : years
                    ? `Indexed ${formatCount(stats.itemCount)} items from ${years}`
                    : "No year folders found in Pictures/Google Photos"}
              </span>
              <span className="text-accent">
                {!loading && ` · Indexed in ${(stats.durationMs / 1000).toFixed(2)}s`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted">
              <input
                id="exclude-short"
                type="checkbox"
                className="size-3.5 accent-accent"
                checked={excludeShort}
                onChange={(event) => setExcludeShort(event.target.checked)}
              />
              <label htmlFor="exclude-short" className="cursor-pointer select-none">
                Exclude videos under
              </label>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                aria-label="Exclude videos shorter than this many seconds"
                value={underSeconds ?? ""}
                onChange={(event) => {
                  const raw = event.target.value
                  if (raw === "") {
                    setUnderSeconds(null)
                    return
                  }
                  const next = Number.parseInt(raw, 10)
                  if (Number.isFinite(next) && next >= 0) setUnderSeconds(next)
                }}
                className="h-7 w-12 rounded-md border border-line bg-card px-1.5 text-center font-mono text-[13px] text-ink tabular-nums outline-none focus:border-accent [appearance:textfield]"
              />
              <span>seconds</span>
            </div>
          </header>

          {error && stats.ready ? (
            <p
              className="mb-6 rounded-xl border border-line bg-card px-3.5 py-3 text-accent"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <section
            className="grid grid-cols-4 gap-4 max-[720px]:grid-cols-1"
            aria-busy={loading}
          >
            <StatCard
              icon={Images}
              label="Photos"
              value={loading ? null : formatCount(stats.photoCount)}
            />
            <StatCard
              icon={Image}
              label="Photo size"
              value={loading ? null : formatBytes(stats.photoBytes)}
            />
            <StatCard
              icon={Clapperboard}
              label="Videos"
              value={loading ? null : formatCount(stats.videoCount)}
            />
            <StatCard
              icon={HardDrive}
              label="Video size"
              value={loading ? null : formatBytes(stats.videoBytes)}
            />
          </section>

          <section
            className="mt-4 grid grid-cols-2 gap-4 max-[720px]:grid-cols-1"
            aria-busy={loading}
          >
            <DayPieChart
              title="Heaviest photo days"
              days={stats.topPhotoDays}
              colors={PHOTO_COLORS}
              loading={loading}
              empty="No photos in the library"
              onSelectDay={setSelectedDate}
            />
            <DayPieChart
              title="Heaviest video days"
              days={stats.topVideoDays}
              colors={VIDEO_COLORS}
              loading={loading}
              empty="No videos in the library"
              onSelectDay={setSelectedDate}
            />
          </section>
        </>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Images
  label: string
  value: string | null
}) {
  return (
    <article className="rounded-[18px] border border-line bg-card px-5.5 pt-5.5 pb-5 shadow-card">
      <div className="flex items-center gap-2.5">
        <span
          className="grid size-8 place-items-center rounded-[9px] bg-accent-soft text-accent"
          aria-hidden="true"
        >
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <h2 className="m-0 text-[13px] font-semibold tracking-[0.04em] text-muted uppercase">
          {label}
        </h2>
      </div>
      {value === null ? (
        <div
          className="mt-5.5 mb-3.5 h-10 w-[46%] animate-shimmer rounded-lg bg-linear-to-r from-line via-paper to-line bg-size-[200%_100%]"
          aria-hidden="true"
        />
      ) : (
        <p className="mt-4.5 mb-2 font-mono text-[clamp(28px,4vw,40px)] font-medium leading-none tracking-[-0.04em] tabular-nums">
          {value}
        </p>
      )}
    </article>
  )
}

export default App

import { useEffect, useState } from "react"
import { Clapperboard, HardDrive, Image, Images } from "lucide-react"
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
}

function App() {
  const [stats, setStats] = useState<LibraryStats>(EMPTY_STATS)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const load = async () => {
      try {
        const response = await fetch("/api/stats")
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
  }, [])

  const loading = !stats.ready && !stats.error
  const error = stats.error ?? fetchError
  const years = yearRange(stats.years)

  return (
    <div className="page">
      <header className="header">
        <p className="eyebrow">Local library</p>
        <h1>Photos storage</h1>
        <p className="lede">
          {loading
            ? "Reading your Google Takeout folders…"
            : years
              ? `Indexed ${formatCount(stats.itemCount)} items from ${years}`
              : "No year folders found"}
        </p>
      </header>

      {error && stats.ready ? (
        <p className="banner" role="alert">
          {error}
        </p>
      ) : null}

      <section className="grid" aria-busy={loading}>
        <StatCard
          icon={Images}
          label="Photos"
          value={loading ? null : formatCount(stats.photoCount)}
          hint="Stills, screenshots, and motion clips"
        />
        <StatCard
          icon={Clapperboard}
          label="Videos"
          value={loading ? null : formatCount(stats.videoCount)}
          hint="Standalone video files"
        />
        <StatCard
          icon={Image}
          label="Photo size"
          value={loading ? null : formatBytes(stats.photoBytes)}
          hint="Google storage units"
        />
        <StatCard
          icon={HardDrive}
          label="Video size"
          value={loading ? null : formatBytes(stats.videoBytes)}
          hint="Google storage units"
        />
      </section>

      <footer className="footer">
        {stats.ready && stats.itemCount > 0 ? (
          <p>
            {stats.durationMs ? `Indexed in ${(stats.durationMs / 1000).toFixed(2)}s` : ""}
          </p>
        ) : null}
      </footer>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Images
  label: string
  value: string | null
  hint: string
}) {
  return (
    <article className="card">
      <div className="card-top">
        <span className="icon-wrap" aria-hidden="true">
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <h2>{label}</h2>
      </div>
      {value === null ? (
        <div className="skeleton" aria-hidden="true" />
      ) : (
        <p className="value">{value}</p>
      )}
      <p className="hint">{hint}</p>
    </article>
  )
}

export default App

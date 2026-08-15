import { useEffect, useState } from "react"
import { ArrowLeft, Clapperboard, Image, Trash2 } from "lucide-react"
import type { DayLibrary, DayMediaItem } from "./types"
import { formatBytes, formatCount, formatDay, formatDuration } from "./lib/format"

function mediaSrc(id: string): string {
  return `/api/media?id=${encodeURIComponent(id)}`
}

async function openItem(id: string): Promise<void> {
  const response = await fetch(`/api/open?id=${encodeURIComponent(id)}`, {
    method: "POST",
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
}

function itemCaption(item: DayMediaItem): string {
  const size = formatBytes(item.size)
  if (item.kind !== "video") return size
  if (item.durationSeconds == null) return size
  return `${size} · ${formatDuration(item.durationSeconds)}`
}

function MediaPreview({ item }: { item: DayMediaItem }) {
  const [failed, setFailed] = useState(false)
  const src = mediaSrc(item.id)

  if (failed) {
    const Icon = item.kind === "video" ? Clapperboard : Image
    return (
      <div className="grid h-full w-full place-items-center bg-paper text-muted">
        <Icon size={28} strokeWidth={1.5} />
      </div>
    )
  }

  if (item.kind === "video") {
    return (
      <video
        src={`${src}#t=0.001`}
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover"
        onError={(error) => {
          setFailed(true)
          console.error(error)
          console.error(src)
        }}
      />
    )
  }

  return (
    <img
      src={src}
      alt={item.title}
      draggable={false}
      className="h-full w-full object-cover"
      onError={(error) => {
        setFailed(true)
        console.error(error)
        console.error(src)
      }}
    />
  )
}

export function DayView({
  date,
  markedIds,
  onToggleMark,
  onBack,
}: {
  date: string
  markedIds: Set<string>
  onToggleMark: (id: string) => void
  onBack: () => void
}) {
  const [library, setLibrary] = useState<DayLibrary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBack()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onBack])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch(`/api/day?date=${encodeURIComponent(date)}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const data = (await response.json()) as DayLibrary
        if (cancelled) return
        setLibrary(data)
      } catch {
        if (cancelled) return
        setError("Could not load items for this day.")
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [date])

  const items = library?.items ?? []
  const loading = library === null && error === null
  const totalBytes = items.reduce((sum, item) => sum + item.size, 0)
  const markedCount = items.reduce(
    (count, item) => count + (markedIds.has(item.id) ? 1 : 0),
    0,
  )

  return (
    <>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="grid size-9 place-items-center rounded-[9px] border border-line bg-card text-ink shadow-card hover:border-accent hover:text-accent"
            aria-label="Back to overview"
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </button>
          <div>
            <h1 className="m-0 font-display text-[clamp(28px,4vw,40px)] font-medium leading-none tracking-[-0.04em]">
              {formatDay(date)}
            </h1>
            <p className="mt-2 mb-0 text-sm">
              {loading ? (
                <span className="text-muted">Loading items…</span>
              ) : error ? (
                <span className="text-muted">{error}</span>
              ) : (
                <>
                  <span className="text-muted">
                    {formatCount(items.length)}{" "}
                    {items.length === 1 ? "item" : "items"}
                  </span>
                  <span className="text-accent"> · {formatBytes(totalBytes)}</span>
                  {markedCount > 0 ? (
                    <span className="text-muted">
                      {` · ${formatCount(markedCount)} marked for deletion`}
                    </span>
                  ) : null}
                </>
              )}
            </p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="aspect-square animate-shimmer rounded-[18px] bg-linear-to-r from-line via-paper to-line bg-size-[200%_100%]"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-[18px] border border-line bg-card px-5.5 py-5 text-sm text-muted shadow-card">
          No photos or videos for this day.
        </p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-4 gap-4 p-0">
          {items.map((item) => {
            const marked = markedIds.has(item.id)
            return (
              <li key={item.id}>
                <article
                  className={`overflow-hidden rounded-[18px] border bg-card shadow-card ${
                    marked ? "border-accent" : "border-line"
                  }`}
                >
                  <div className="relative aspect-square bg-paper">
                    <button
                      type="button"
                      aria-label={`Open ${item.title}`}
                      onClick={() => void openItem(item.id)}
                      className={`block h-full w-full cursor-pointer border-0 bg-transparent p-0 ${
                        marked ? "opacity-45" : ""
                      }`}
                    >
                      <MediaPreview item={item} />
                    </button>
                    <button
                      type="button"
                      aria-pressed={marked}
                      aria-label={
                        marked ? "Unmark for deletion" : "Mark for deletion"
                      }
                      onClick={() => onToggleMark(item.id)}
                      className={`absolute top-2 right-2 z-10 grid size-8 place-items-center rounded-full border shadow-card ${
                        marked
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-line bg-card/90 text-ink hover:border-accent hover:text-accent"
                      }`}
                    >
                      <Trash2 size={15} strokeWidth={1.75} />
                    </button>
                  </div>
                  <p className="m-0 px-3 py-2 font-mono text-[13px] text-muted tabular-nums">
                    {itemCaption(item)}
                  </p>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

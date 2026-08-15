import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, ExternalLink, Trash2, Undo2 } from "lucide-react"
import { MediaPreview } from "./MediaPreview"
import type { DayMediaItem } from "./types"
import {
  formatBytes,
  formatCount,
  formatDay,
  formatGigabytes,
  itemCaption,
} from "./lib/format"

function photosUrls(items: DayMediaItem[]): string[] {
  return items
    .map((item) => item.url)
    .filter((url): url is string => url != null && url.length > 0)
}

function openPhotosUrl(url: string): void {
  const opened = window.open(url, "_blank")
  if (opened) opened.opener = null
}

async function openAllPhotosUrls(urls: string[]): Promise<void> {
  const response = await fetch("/api/open-urls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ urls }),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
}

function groupByDay(items: DayMediaItem[]): [string, DayMediaItem[]][] {
  const groups = new Map<string, DayMediaItem[]>()
  const ordered = [...items].sort(
    (a, b) => b.takenAt - a.takenAt || a.filename.localeCompare(b.filename),
  )
  for (const item of ordered) {
    const list = groups.get(item.date)
    if (list) list.push(item)
    else groups.set(item.date, [item])
  }
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a))
}

export function DeletionQueueButton({
  count,
  bytes,
  onClick,
}: {
  count: number
  bytes: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-2 rounded-[9px] border border-line bg-card px-3 py-1.5 text-sm text-ink shadow-card hover:border-danger"
      aria-label={`${formatCount(count)} items marked for deletion, ${formatGigabytes(bytes)}`}
    >
      <Trash2 size={16} strokeWidth={1.75} className="text-danger" />
      <span className="text-muted">
        {formatCount(count)} {count === 1 ? "item" : "items"}
        <span className="text-accent">{` (${formatGigabytes(bytes)})`}</span>
      </span>
    </button>
  )
}

export function DeletionView({
  items,
  onRemove,
  onClear,
  onBack,
}: {
  items: DayMediaItem[]
  onRemove: (id: string) => void
  onClear: () => void
  onBack: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)

  const totalBytes = useMemo(
    () => items.reduce((sum, item) => sum + item.size, 0),
    [items],
  )
  const days = useMemo(() => groupByDay(items), [items])
  const urls = useMemo(() => photosUrls(items), [items])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      if (confirming) {
        setConfirming(false)
        return
      }
      onBack()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [confirming, onBack])

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
              Deletion
            </h1>
            <p className="mt-2 mb-0 text-sm">
              <span className="text-muted">
                {formatCount(items.length)}{" "}
                {items.length === 1 ? "item" : "items"}
              </span>
              <span className="text-accent"> · {formatBytes(totalBytes)}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={urls.length === 0}
            onClick={() => {
              void openAllPhotosUrls(urls).then(
                () => setOpenError(null),
                () => setOpenError("Could not open the Google Photos links."),
              )
            }}
            className="flex items-center gap-2 rounded-[9px] border border-line bg-card px-3 py-2 text-sm text-ink shadow-card hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink"
          >
            <ExternalLink size={16} strokeWidth={1.75} />
            Open all
          </button>
          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => setConfirming(true)}
            className="flex items-center gap-2 rounded-[9px] border border-danger-soft bg-danger-soft px-3 py-2 text-sm text-danger shadow-card hover:border-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-danger-soft"
          >
            <Trash2 size={16} strokeWidth={1.75} />
            Delete all
          </button>
        </div>
      </header>

      {openError ? (
        <p
          className="mb-6 rounded-xl border border-line bg-card px-3.5 py-3 text-danger"
          role="alert"
        >
          {openError}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-[18px] border border-line bg-card px-5.5 py-5 text-sm text-muted shadow-card">
          No items marked for deletion.
        </p>
      ) : (
        <div className="grid gap-10">
          {days.map(([date, dayItems]) => (
            <section key={date}>
              <h2 className="mt-0 mb-4 font-display text-[22px] font-medium tracking-[-0.03em]">
                {formatDay(date)}
                <span className="ml-2 text-sm font-sans font-normal text-muted">
                  {formatCount(dayItems.length)}{" "}
                  {dayItems.length === 1 ? "item" : "items"}
                  <span className="text-accent">
                    {` · ${formatBytes(
                      dayItems.reduce((sum, item) => sum + item.size, 0),
                    )}`}
                  </span>
                </span>
              </h2>
              <ul className="m-0 grid list-none grid-cols-4 gap-4 p-0">
                {dayItems.map((item) => {
                  const url = item.url
                  return (
                    <li key={item.id}>
                      <article className="overflow-hidden rounded-[18px] border border-line bg-card shadow-card">
                        <div className="relative aspect-square bg-paper">
                          <button
                            type="button"
                            disabled={!url}
                            aria-label={
                              url
                                ? `Open ${item.title} in Google Photos`
                                : `${item.title} has no Google Photos link`
                            }
                            onClick={() => {
                              if (url) openPhotosUrl(url)
                            }}
                            className="block h-full w-full cursor-pointer border-0 bg-transparent p-0 disabled:cursor-default"
                          >
                            <MediaPreview item={item} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${item.title} from deletion`}
                            onClick={() => onRemove(item.id)}
                            className="absolute top-2 right-2 z-10 grid size-8 place-items-center rounded-full border border-line bg-card/90 text-ink shadow-card hover:border-accent hover:text-accent"
                          >
                            <Undo2 size={15} strokeWidth={1.75} />
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
            </section>
          ))}
        </div>
      )}

      {confirming ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4"
          onClick={() => setConfirming(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="w-full max-w-md rounded-[18px] border border-line bg-card p-6 shadow-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="delete-dialog-title"
              className="m-0 font-display text-[22px] font-medium tracking-[-0.03em]"
            >
              Delete marked items?
            </h2>
            <p className="mt-3 mb-0 text-sm text-muted">
              This removes {formatCount(items.length)}{" "}
              {items.length === 1 ? "item" : "items"} and{" "}
              {items.length === 1 ? "its" : "their"} metadata from memory and
              local storage. The files on disk are not deleted.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirming(false)}
                className="rounded-[9px] border border-line bg-card px-3.5 py-2 text-sm text-ink shadow-card hover:border-accent hover:text-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClear()
                  setConfirming(false)
                }}
                className="rounded-[9px] border border-danger-soft bg-danger-soft px-3.5 py-2 text-sm text-danger shadow-card hover:border-danger"
              >
                Delete all
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

import { useCallback, useEffect, useMemo, useState } from "react"
import type { DayMediaItem } from "./types"

const STORAGE_KEY = "photos-deletion-queue"

function isDayMediaItem(value: unknown): value is DayMediaItem {
  if (!value || typeof value !== "object") return false
  const item = value as Record<string, unknown>
  return (
    typeof item.id === "string" &&
    typeof item.filename === "string" &&
    typeof item.title === "string" &&
    (item.kind === "photo" || item.kind === "video") &&
    typeof item.size === "number" &&
    typeof item.takenAt === "number" &&
    typeof item.date === "string" &&
    (item.url === null || typeof item.url === "string") &&
    (item.durationSeconds === null || typeof item.durationSeconds === "number")
  )
}

function loadQueue(): DayMediaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isDayMediaItem)
  } catch {
    return []
  }
}

export function useDeletionQueue() {
  const [items, setItems] = useState<DayMediaItem[]>(loadQueue)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const markedIds = useMemo(
    () => new Set(items.map((item) => item.id)),
    [items],
  )
  const totalBytes = useMemo(
    () => items.reduce((sum, item) => sum + item.size, 0),
    [items],
  )

  const toggle = useCallback((item: DayMediaItem) => {
    setItems((current) => {
      if (current.some((entry) => entry.id === item.id)) {
        return current.filter((entry) => entry.id !== item.id)
      }
      return [...current, item]
    })
  }, [])

  const remove = useCallback((id: string) => {
    setItems((current) => current.filter((entry) => entry.id !== id))
  }, [])

  const clear = useCallback(() => {
    setItems([])
  }, [])

  return { items, markedIds, totalBytes, toggle, remove, clear }
}

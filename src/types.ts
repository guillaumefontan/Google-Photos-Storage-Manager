export type MediaKind = "photo" | "video"

export type DaySlice = {
  date: string
  bytes: number
  count: number
}

export type DayMediaItem = {
  id: string
  filename: string
  title: string
  kind: MediaKind
  size: number
  takenAt: number
  date: string
  url: string | null
  durationSeconds: number | null
}

export type DayLibrary = {
  date: string
  items: DayMediaItem[]
}

export type LibraryStats = {
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

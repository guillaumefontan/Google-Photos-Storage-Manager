export type MediaKind = "photo" | "video"

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
}

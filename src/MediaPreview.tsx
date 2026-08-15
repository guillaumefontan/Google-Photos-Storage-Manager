import { useState } from "react"
import { Clapperboard, Image } from "lucide-react"
import type { DayMediaItem } from "./types"

function mediaSrc(id: string): string {
  return `/api/media?id=${encodeURIComponent(id)}`
}

export function MediaPreview({ item }: { item: DayMediaItem }) {
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

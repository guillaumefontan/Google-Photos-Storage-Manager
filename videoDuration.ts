const ISO_VIDEO_EXT = new Set([".mp4", ".mov", ".m4v", ".3gp"])

function boxType(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  )
}

function readBoxSize(
  view: DataView,
  offset: number,
  end: number,
): { size: number; headerSize: number } | null {
  if (offset + 8 > end) return null
  let size = view.getUint32(offset)
  let headerSize = 8
  if (size === 1) {
    if (offset + 16 > end) return null
    const large = view.getBigUint64(offset + 8)
    if (large > BigInt(Number.MAX_SAFE_INTEGER)) return null
    size = Number(large)
    headerSize = 16
  } else if (size === 0) {
    size = end - offset
  }
  if (size < headerSize) return null
  return { size, headerSize }
}

async function readBoxHeader(
  file: ReturnType<typeof Bun.file>,
  offset: number,
  fileSize: number,
): Promise<{ size: number; type: string; headerSize: number } | null> {
  if (offset + 8 > fileSize) return null
  const buf = await file.slice(offset, Math.min(offset + 16, fileSize)).arrayBuffer()
  if (buf.byteLength < 8) return null
  const view = new DataView(buf)
  const parsed = readBoxSize(view, 0, buf.byteLength)
  if (!parsed) return null
  if (parsed.headerSize === 16 && buf.byteLength < 16) return null
  if (parsed.size === 0) return null
  return {
    size: view.getUint32(0) === 0 ? fileSize - offset : parsed.size,
    type: boxType(view, 4),
    headerSize: parsed.headerSize,
  }
}

function durationFromMvhd(
  view: DataView,
  offset: number,
  length: number,
): number | null {
  if (length < 20) return null
  const version = view.getUint8(offset)
  let timescale: number
  let duration: number
  if (version === 1) {
    if (length < 32) return null
    timescale = view.getUint32(offset + 20)
    const raw = view.getBigUint64(offset + 24)
    if (raw > BigInt(Number.MAX_SAFE_INTEGER)) return null
    duration = Number(raw)
  } else {
    timescale = view.getUint32(offset + 12)
    duration = view.getUint32(offset + 16)
    if (duration === 0xffffffff) return null
  }
  if (!timescale || duration <= 0) return null
  return duration / timescale
}

function durationFromMoov(moov: Uint8Array): number | null {
  const view = new DataView(moov.buffer, moov.byteOffset, moov.byteLength)
  let offset = 0
  while (offset + 8 <= moov.byteLength) {
    const parsed = readBoxSize(view, offset, moov.byteLength)
    if (!parsed) break
    const type = boxType(view, offset + 4)
    if (type === "mvhd") {
      return durationFromMvhd(
        view,
        offset + parsed.headerSize,
        parsed.size - parsed.headerSize,
      )
    }
    offset += parsed.size
  }
  return null
}

async function readIsoBmffDuration(path: string): Promise<number | null> {
  const file = Bun.file(path)
  const fileSize = file.size
  if (fileSize < 16) return null

  let offset = 0
  while (offset + 8 <= fileSize) {
    const header = await readBoxHeader(file, offset, fileSize)
    if (!header) break
    if (header.type === "moov") {
      const payloadSize = header.size - header.headerSize
      if (payloadSize <= 0 || payloadSize > 8 * 1024 * 1024) return null
      const moov = new Uint8Array(
        await file
          .slice(offset + header.headerSize, offset + header.size)
          .arrayBuffer(),
      )
      return durationFromMoov(moov)
    }
    if (header.size <= 0) break
    offset += header.size
  }
  return null
}

export async function readVideoDurationSeconds(
  path: string,
  ext: string,
): Promise<number | null> {
  if (!ISO_VIDEO_EXT.has(ext)) return null
  try {
    return await readIsoBmffDuration(path)
  } catch {
    return null
  }
}

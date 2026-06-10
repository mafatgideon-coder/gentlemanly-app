import sharp from "sharp"

const CANVAS = 1024
const OUTER_PAD = 32
const INNER_GAP = 12
const BG = { r: 250, g: 249, b: 247, alpha: 1 } as const

function gridDimensions(n: number): { cols: number; rows: number } {
  if (n === 1) return { cols: 1, rows: 1 }
  if (n === 2) return { cols: 2, rows: 1 }
  if (n === 3) return { cols: 3, rows: 1 }
  if (n === 4) return { cols: 2, rows: 2 }
  if (n <= 6) return { cols: 3, rows: 2 }
  return { cols: 3, rows: Math.ceil(n / 3) }
}

export async function composeGrid(imageBuffers: Buffer[]): Promise<Buffer> {
  if (imageBuffers.length === 0) throw new Error("No images to compose")

  const { cols, rows } = gridDimensions(imageBuffers.length)
  const cellW = Math.floor((CANVAS - OUTER_PAD * 2 - INNER_GAP * (cols - 1)) / cols)
  const cellH = Math.floor((CANVAS - OUTER_PAD * 2 - INNER_GAP * (rows - 1)) / rows)

  const resized = await Promise.all(
    imageBuffers.map((buf) =>
      sharp(buf)
        .resize(cellW, cellH, { fit: "contain", background: BG })
        .png()
        .toBuffer()
    )
  )

  const composites = resized.map((buf, i) => {
    const row = Math.floor(i / cols)
    const col = i % cols
    const lastRowStart = (rows - 1) * cols
    const isLastRow = i >= lastRowStart
    const lastRowCount = imageBuffers.length - lastRowStart
    const offset = isLastRow && lastRowCount < cols
      ? Math.round(((cols - lastRowCount) * (cellW + INNER_GAP)) / 2)
      : 0
    return {
      input: buf,
      left: OUTER_PAD + col * (cellW + INNER_GAP) + offset,
      top: OUTER_PAD + row * (cellH + INNER_GAP),
    }
  })

  return sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background: BG } })
    .composite(composites)
    .png()
    .toBuffer()
}

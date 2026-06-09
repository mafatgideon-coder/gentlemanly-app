import sharp from "sharp"

const CANVAS = 1024
const OUTER_PAD = 40
const INNER_GAP = 16
const BG = { r: 250, g: 249, b: 247, alpha: 1 } as const

function gridDimensions(n: number): { cols: number; rows: number } {
  if (n <= 2) return { cols: n, rows: 1 }
  if (n <= 4) return { cols: 2, rows: Math.ceil(n / 2) }
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
        .resize(cellW, cellH, { fit: "cover", position: "centre" })
        .png()
        .toBuffer()
    )
  )

  const composites = resized.map((buf, i) => ({
    input: buf,
    left: OUTER_PAD + (i % cols) * (cellW + INNER_GAP),
    top: OUTER_PAD + Math.floor(i / cols) * (cellH + INNER_GAP),
  }))

  return sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: BG },
  })
    .composite(composites)
    .png()
    .toBuffer()
}

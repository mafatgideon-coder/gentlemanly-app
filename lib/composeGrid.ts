import sharp from "sharp"

const CANVAS = 1024
const OUTER_PAD = 48
const INNER_GAP = 12
const BG = { r: 248, g: 247, b: 244, alpha: 1 } as const // warm off-white
const CELL_BG = { r: 245, g: 244, b: 241, alpha: 1 } as const

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

  // Resize each image to fit its cell, preserving aspect ratio (contain, not cover)
  const resized = await Promise.all(
    imageBuffers.map((buf) =>
      sharp(buf)
        .resize(cellW, cellH, { fit: "contain", background: CELL_BG })
        .png()
        .toBuffer()
    )
  )

  const composites = resized.map((buf, i) => {
    const row = Math.floor(i / cols)
    const col = i % cols

    // Center the last row if it's not full
    const lastRowStart = rows > 1 ? (rows - 1) * cols : 0
    const isLastRow = i >= lastRowStart
    const lastRowCount = imageBuffers.length - lastRowStart
    const lastRowOffset = isLastRow && lastRowCount < cols
      ? Math.round(((cols - lastRowCount) * (cellW + INNER_GAP)) / 2)
      : 0

    return {
      input: buf,
      left: OUTER_PAD + col * (cellW + INNER_GAP) + lastRowOffset,
      top: OUTER_PAD + row * (cellH + INNER_GAP),
    }
  })

  return sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: BG },
  })
    .composite(composites)
    .png()
    .toBuffer()
}

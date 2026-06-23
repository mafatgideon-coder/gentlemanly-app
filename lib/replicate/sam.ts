import Replicate from "replicate"
import sharp from "sharp"

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download mask ${url}: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

/**
 * Runs SAM 2 automatic mask generation on a full image.
 * Returns all individual mask buffers (grayscale: white = object, black = background).
 * Call this once per outfit, then use matchMaskToBbox for each garment.
 */
export async function generateMasks(imageUrl: string): Promise<Buffer[]> {
  const output = await replicate.run("meta/sam-2", {
    input: {
      image: imageUrl,
      points_per_side: 16,           // lower = fewer, cleaner masks for large objects
      pred_iou_thresh: 0.88,
      stability_score_thresh: 0.95,
    },
  })

  const obj = output as Record<string, unknown>
  const raw = obj.individual_masks

  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("SAM 2 returned no individual masks")
  }

  return Promise.all(raw.map(m => downloadBuffer(String(m))))
}

/**
 * Finds the SAM 2 mask that covers the center point of a given bounding box.
 * Returns the matched mask buffer, or null if no mask covers the centroid.
 *
 * @param masks   Buffers from generateMasks()
 * @param bbox    [x1, y1, x2, y2] normalised 0-1
 * @param imgW    Original image width in pixels
 * @param imgH    Original image height in pixels
 */
export async function matchMaskToBbox(
  masks: Buffer[],
  bbox: [number, number, number, number],
  imgW: number,
  imgH: number,
): Promise<Buffer | null> {
  const cx = Math.round(((bbox[0] + bbox[2]) / 2) * imgW)
  const cy = Math.round(((bbox[1] + bbox[3]) / 2) * imgH)

  // Clamp to image bounds
  const x = Math.max(0, Math.min(cx, imgW - 1))
  const y = Math.max(0, Math.min(cy, imgH - 1))

  // Check all masks in parallel — extract just the single centroid pixel
  const checks = await Promise.all(
    masks.map(async (mask, i) => {
      const { data } = await sharp(mask)
        .resize(imgW, imgH, { fit: "fill" })
        .greyscale()
        .extract({ left: x, top: y, width: 1, height: 1 })
        .raw()
        .toBuffer({ resolveWithObject: true })
      return { i, value: data[0] ?? 0 }
    })
  )

  const match = checks.find(c => c.value > 128)
  return match != null ? masks[match.i] : null
}

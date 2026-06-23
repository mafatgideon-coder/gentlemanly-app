import sharp from "sharp"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { segmentGarment } from "@/lib/replicate/sam"
import { compositeGarments } from "./composite"
import type { PipelineInput, PipelineResult } from "./types"
import type { DetectedItem } from "@/lib/types"

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function downloadBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

/**
 * Applies a grayscale SAM 2 mask to the original image, producing a
 * transparent-background PNG of the isolated garment.
 */
async function applyMask(originalBuffer: Buffer, maskUrl: string): Promise<Buffer> {
  const maskBuffer = await downloadBuffer(maskUrl)

  const { data: origData, info } = await sharp(originalBuffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const maskData = await sharp(maskBuffer)
    .resize(info.width, info.height, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer()

  return sharp(origData, { raw: { width: info.width, height: info.height, channels: 3 } })
    .joinChannel(maskData, { raw: { width: info.width, height: info.height, channels: 1 } })
    .png()
    .toBuffer()
}

/**
 * Crops the extracted garment PNG to its bounding box with a small padding margin.
 */
async function postProcess(
  garmentBuffer: Buffer,
  origW: number,
  origH: number,
  bbox: [number, number, number, number],
): Promise<Buffer> {
  const PAD = 0.03

  const x1 = Math.max(0, Math.floor((bbox[0] - PAD) * origW))
  const y1 = Math.max(0, Math.floor((bbox[1] - PAD) * origH))
  const x2 = Math.min(origW, Math.ceil((bbox[2] + PAD) * origW))
  const y2 = Math.min(origH, Math.ceil((bbox[3] + PAD) * origH))

  return sharp(garmentBuffer)
    .extract({ left: x1, top: y1, width: x2 - x1, height: y2 - y1 })
    .sharpen({ sigma: 0.8 })
    .png()
    .toBuffer()
}

async function saveWardrobeAsset(
  userId: string,
  outfitId: string,
  item: DetectedItem,
  pngBuffer: Buffer,
  supabase: ReturnType<typeof serviceClient>,
): Promise<string | null> {
  const path = `${userId}/${outfitId}/${item.subcategory ?? item.category}_${Date.now()}.png`

  const { error: uploadError } = await supabase.storage
    .from("wardrobe-assets")
    .upload(path, pngBuffer, { contentType: "image/png", upsert: true })

  if (uploadError) {
    console.error(`[v2] wardrobe-assets upload failed for "${item.name}":`, uploadError.message)
    return null
  }

  const { data: signed } = await supabase.storage
    .from("wardrobe-assets")
    .createSignedUrl(path, 60 * 60 * 24 * 365)

  const imageUrl = signed?.signedUrl ?? null

  await supabase.from("wardrobe_items").insert({
    user_id: userId,
    outfit_id: outfitId,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory,
    color: item.color,
    pattern: item.pattern,
    confidence: item.confidence,
    image_url: imageUrl,
  })

  return imageUrl
}

export async function runV2Pipeline(input: PipelineInput): Promise<PipelineResult> {
  const start = Date.now()
  const supabase = serviceClient()

  try {
    const originalBuffer = await downloadBuffer(input.photoUrl)
    const { width: origW, height: origH } = await sharp(originalBuffer).metadata()
    if (!origW || !origH) throw new Error("Could not read image dimensions")

    const itemsWithBbox = input.items.filter(item => Array.isArray(item.bbox) && item.bbox.length === 4)

    if (itemsWithBbox.length === 0) {
      return {
        flatlay_url: null,
        pipeline: "v2",
        duration_ms: Date.now() - start,
        error: "GPT-4o returned no bounding boxes — check detection prompt",
      }
    }

    // Segment all garments in parallel
    const segmentResults = await Promise.allSettled(
      itemsWithBbox.map(async item => {
        const [nx1, ny1, nx2, ny2] = item.bbox!
        const pixelBbox: [number, number, number, number] = [
          Math.round(nx1 * origW),
          Math.round(ny1 * origH),
          Math.round(nx2 * origW),
          Math.round(ny2 * origH),
        ]

        const maskUrl = await segmentGarment(input.photoUrl, pixelBbox)
        const withAlpha = await applyMask(originalBuffer, maskUrl)
        const cropped = await postProcess(withAlpha, origW, origH, item.bbox!)
        const imageUrl = await saveWardrobeAsset(input.userId, input.outfitId, item, cropped, supabase)

        return { item, buffer: cropped, imageUrl }
      })
    )

    segmentResults
      .filter(r => r.status === "rejected")
      .forEach(r => console.error("[v2] garment failed:", (r as PromiseRejectedResult).reason))

    const garmentSlots = segmentResults
      .filter((r): r is PromiseFulfilledResult<{ item: DetectedItem; buffer: Buffer; imageUrl: string | null }> =>
        r.status === "fulfilled"
      )
      .map(r => ({ category: r.value.item.category, buffer: r.value.buffer }))

    if (garmentSlots.length === 0) {
      return { flatlay_url: null, pipeline: "v2", duration_ms: Date.now() - start, error: "All segmentations failed" }
    }

    // Composite into portrait flatlay
    const flatLayBuffer = await compositeGarments(garmentSlots)

    const flatLayPath = `${input.userId}/${input.outfitId}/flatlay.png`
    const { error: uploadErr } = await supabase.storage
      .from("flatlay-images")
      .upload(flatLayPath, flatLayBuffer, { contentType: "image/png", upsert: true })

    if (uploadErr) throw new Error(`Flatlay upload failed: ${uploadErr.message}`)

    const { data: signed } = await supabase.storage
      .from("flatlay-images")
      .createSignedUrl(flatLayPath, 60 * 60 * 24 * 365)

    const flatlay_url = signed?.signedUrl ?? null

    await supabase.from("outfits").update({ flatlay_url }).eq("id", input.outfitId)

    if (input.photoStoragePath) {
      await supabase.storage.from("outfit-photos").remove([input.photoStoragePath])
    }

    return { flatlay_url, pipeline: "v2", duration_ms: Date.now() - start }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[v2] pipeline error:", message)
    return { flatlay_url: null, pipeline: "v2", duration_ms: Date.now() - start, error: message }
  }
}

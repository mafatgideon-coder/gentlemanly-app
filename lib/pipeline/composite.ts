import sharp, { type OverlayOptions } from "sharp"
import type { Category } from "@/lib/types"

const CANVAS_W = 1024
const CANVAS_H = 1536
const BG_COLOR = { r: 245, g: 242, b: 237, alpha: 1 } // warm off-white linen
const PADDING = 48  // canvas edge padding
const GAP = 24      // gap between items in the same row

// Category display order, top to bottom
const CATEGORY_ORDER: Category[] = ["outerwear", "tops", "bottoms", "footwear", "accessories"]

// Relative vertical weight per category (how much canvas height it gets)
const CATEGORY_WEIGHT: Record<Category, number> = {
  outerwear: 3.5,
  tops: 3.0,
  bottoms: 3.5,
  footwear: 2.5,
  accessories: 1.5,
}

interface GarmentSlot {
  category: Category
  buffer: Buffer
}

/**
 * Composes individual garment PNG buffers (with transparency) into a single
 * 1024×1536 portrait flatlay on an off-white linen background.
 */
export async function compositeGarments(slots: GarmentSlot[]): Promise<Buffer> {
  // Group by category
  const groups = new Map<Category, Buffer[]>()
  for (const slot of slots) {
    const existing = groups.get(slot.category) ?? []
    existing.push(slot.buffer)
    groups.set(slot.category, existing)
  }

  // Determine which categories are present, in display order
  const activeCategories = CATEGORY_ORDER.filter(c => groups.has(c))
  if (activeCategories.length === 0) throw new Error("No garments to composite")

  // Assign vertical zones
  const totalWeight = activeCategories.reduce((s, c) => s + CATEGORY_WEIGHT[c], 0)
  const availableH = CANVAS_H - PADDING * 2
  let currentY = PADDING

  const compositeInputs: OverlayOptions[] = []

  for (const category of activeCategories) {
    const items = groups.get(category)!
    const zoneH = Math.round((CATEGORY_WEIGHT[category] / totalWeight) * availableH)
    const innerW = CANVAS_W - PADDING * 2
    const slotW = Math.floor((innerW - GAP * (items.length - 1)) / items.length)

    for (let i = 0; i < items.length; i++) {
      const resized = await fitIntoSlot(items[i], slotW, zoneH - GAP)
      const meta = await sharp(resized).metadata()
      const itemW = meta.width ?? slotW
      const itemH = meta.height ?? zoneH

      // Center the item vertically within its zone
      const x = PADDING + i * (slotW + GAP) + Math.floor((slotW - itemW) / 2)
      const y = currentY + Math.floor((zoneH - itemH) / 2)

      compositeInputs.push({ input: resized, left: x, top: y })
    }

    currentY += zoneH
  }

  return sharp({
    create: { width: CANVAS_W, height: CANVAS_H, channels: 4, background: BG_COLOR },
  })
    .png()
    .composite(compositeInputs)
    .sharpen({ sigma: 0.6 })
    .toBuffer()
}

async function fitIntoSlot(buffer: Buffer, maxW: number, maxH: number): Promise<Buffer> {
  const meta = await sharp(buffer).metadata()
  const origW = meta.width ?? maxW
  const origH = meta.height ?? maxH

  const scale = Math.min(maxW / origW, maxH / origH, 1)
  const targetW = Math.round(origW * scale)
  const targetH = Math.round(origH * scale)

  return sharp(buffer)
    .resize(targetW, targetH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()
}

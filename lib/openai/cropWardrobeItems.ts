import OpenAI from "openai"
import sharp from "sharp"
import type { SupabaseClient } from "@supabase/supabase-js"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface NewWardrobeItem {
  id: string
  name: string
  category: string
}

interface BoundingBox {
  name: string
  x: number // 0–1, left edge
  y: number // 0–1, top edge
  w: number // 0–1, fraction of image width
  h: number // 0–1, fraction of image height
}

async function detectBoundingBoxes(
  flatlayBuffer: Buffer,
  items: NewWardrobeItem[]
): Promise<BoundingBox[]> {
  const base64 = flatlayBuffer.toString("base64")
  const itemList = items.map((i) => `- ${i.name} (${i.category})`).join("\n")

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${base64}`, detail: "high" },
          },
          {
            type: "text",
            text: `This is an editorial menswear flat-lay image (1024x1024 pixels). Locate each clothing item listed below within the image.

Items to locate:
${itemList}

Return ONLY a valid JSON array, no markdown, no explanation. Each element:
{
  "name": "<item name from the list>",
  "x": <left edge as fraction 0-1>,
  "y": <top edge as fraction 0-1>,
  "w": <width as fraction 0-1>,
  "h": <height as fraction 0-1>
}

Add ~8% padding around each item. Keep all values within [0, 1]. If an item is not visible, omit it.`,
          },
        ],
      },
    ],
  })

  const text = response.choices[0]?.message?.content ?? ""
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) return []

  try {
    return JSON.parse(jsonMatch[0]) as BoundingBox[]
  } catch {
    return []
  }
}

export async function cropAndStoreWardrobeImages(
  newItems: NewWardrobeItem[],
  flatlayBuffer: Buffer,
  userId: string,
  service: SupabaseClient
): Promise<void> {
  if (!newItems.length) return

  const IMAGE_SIZE = 1024

  let boxes: BoundingBox[] = []
  try {
    boxes = await detectBoundingBoxes(flatlayBuffer, newItems)
    console.log("[wardrobe-crop] detected boxes:", boxes.length)
  } catch (err) {
    console.error("[wardrobe-crop] bounding box detection failed:", err)
    return
  }

  for (const item of newItems) {
    const box = boxes.find(
      (b) => b.name.toLowerCase().includes(item.name.toLowerCase()) ||
             item.name.toLowerCase().includes(b.name.toLowerCase())
    )
    if (!box) {
      console.log("[wardrobe-crop] no box found for:", item.name)
      continue
    }

    try {
      const left = Math.max(0, Math.round(box.x * IMAGE_SIZE))
      const top = Math.max(0, Math.round(box.y * IMAGE_SIZE))
      const width = Math.min(IMAGE_SIZE - left, Math.round(box.w * IMAGE_SIZE))
      const height = Math.min(IMAGE_SIZE - top, Math.round(box.h * IMAGE_SIZE))

      if (width < 20 || height < 20) continue

      const cropped = await sharp(flatlayBuffer)
        .extract({ left, top, width, height })
        .resize(512, 512, { fit: "contain", background: { r: 250, g: 250, b: 248, alpha: 1 } })
        .png()
        .toBuffer()

      const storagePath = `${userId}/${item.id}/image.png`
      const { error: uploadErr } = await service.storage
        .from("wardrobe-images")
        .upload(storagePath, cropped, { contentType: "image/png", upsert: true })

      if (uploadErr) {
        console.error("[wardrobe-crop] upload error for", item.name, uploadErr.message)
        continue
      }

      const { data: signed } = await service.storage
        .from("wardrobe-images")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

      if (signed?.signedUrl) {
        await service
          .from("wardrobe_items")
          .update({ image_url: signed.signedUrl })
          .eq("id", item.id)
        console.log("[wardrobe-crop] stored image for:", item.name)
      }
    } catch (err) {
      console.error("[wardrobe-crop] crop error for", item.name, err)
    }
  }
}

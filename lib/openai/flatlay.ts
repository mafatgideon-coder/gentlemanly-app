import OpenAI, { toFile } from "openai"
import type { DetectedItem } from "@/lib/types"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateFlatlayFromGrid(gridBuffer: Buffer, items: DetectedItem[]): Promise<Buffer> {
  const descriptions = items.map((i) => i.description ?? i.name).join(", ")
  const imageFile = await toFile(gridBuffer, "grid.png", { type: "image/png" })

  const response = await client.images.edit({
    model: "gpt-image-1",
    image: imageFile,
    prompt: `These are individual clothing items shown separately. Recreate them as a single editorial menswear flat-lay photograph. Arrange each piece naturally and artistically on a clean off-white linen background. Items: ${descriptions}. ${FLATLAY_RULES} Style of Mr Porter or Matches Fashion product photography. Soft diffused natural lighting from above. No shadows. No human models. No text. No logos. Square composition. Quiet luxury aesthetic.`,
    n: 1,
    size: "1024x1024",
  })

  const b64 = response.data?.[0]?.b64_json
  if (!b64) throw new Error("gpt-image-1 returned no image for flat-lay")
  return Buffer.from(b64, "base64")
}

const FLATLAY_RULES = `Every item must be placed as a completely separate, physically distinct piece — do not place any item inside, on top of, or threaded through another item. Belts must always be laid flat on their own, never inside a waistband or draped on trousers. Only include the listed clothing items — no props, accessories not listed, or background objects.`

function buildPrompt(items: DetectedItem[], withPhoto: boolean): string {
  const descriptions = items.length > 0
    ? items.map((i) => i.description).join(", ")
    : "a complete menswear outfit"

  if (withPhoto) {
    return `Using this outfit photo as a visual reference, create an editorial menswear flat-lay. Arrange each clothing item neatly on a clean off-white linen background — preserving the exact colors, patterns, textures, and details visible in the photo. Items: ${descriptions}. ${FLATLAY_RULES} Style of Mr Porter or Matches Fashion product photography. Soft diffused natural lighting from above. No shadows. No human models. No text. No logos visible. Square composition. Quiet luxury aesthetic.`
  }

  return `Editorial menswear flat-lay photograph on a clean off-white linen background. Premium product photography in the style of Mr Porter or Matches Fashion. Neatly arranged clothing items laid flat: ${descriptions}. ${FLATLAY_RULES} Soft diffused natural lighting from above. No shadows. No human models. No text. No logos. Square composition. Quiet luxury aesthetic.`
}

export async function generateFlatlay(items: DetectedItem[], photoBuffer?: Buffer): Promise<Buffer> {
  let b64: string | null | undefined

  if (photoBuffer) {
    // Use the original photo as a visual reference for accuracy
    const imageFile = await toFile(photoBuffer, "outfit.jpg", { type: "image/jpeg" })
    const response = await client.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt: buildPrompt(items, true),
      n: 1,
      size: "1024x1024",
    })
    b64 = response.data?.[0]?.b64_json
  } else {
    // Fallback: text-only generation
    const response = await client.images.generate({
      model: "gpt-image-1",
      prompt: buildPrompt(items, false),
      n: 1,
      size: "1024x1024",
    })
    b64 = response.data?.[0]?.b64_json
  }

  if (!b64) throw new Error("gpt-image-1 returned no image data")
  return Buffer.from(b64, "base64")
}

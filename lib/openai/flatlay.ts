import OpenAI from "openai"
import type { DetectedItem } from "@/lib/types"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export function buildFlatlayPrompt(items: DetectedItem[]): string {
  const itemDescriptions = items.map((item) => item.description).join(", ")

  return `Editorial menswear flat-lay photograph on a clean off-white linen background. Premium product photography in the style of Mr Porter or Matches Fashion. Neatly arranged clothing items laid flat with clean spacing: ${itemDescriptions}. Soft diffused natural lighting from above. No shadows. No human models. No text. No brand logos visible. Square composition. Quiet luxury aesthetic. High-end fashion editorial photography.`
}

export async function generateFlatlay(items: DetectedItem[]): Promise<string> {
  const prompt = buildFlatlayPrompt(items)

  const response = await client.images.generate({
    model: "dall-e-2",
    prompt: prompt.slice(0, 1000), // DALL-E 2 has 1000 char limit
    n: 1,
    size: "512x512",
  })

  const imageUrl = response.data?.[0]?.url
  if (!imageUrl) throw new Error("DALL-E returned no image URL")

  return imageUrl
}

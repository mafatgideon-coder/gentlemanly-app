import OpenAI from "openai"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface WardrobeItemInput {
  id: string
  name: string
  category: string
  description?: string
  color?: string
}

export async function generateItemImage(item: WardrobeItemInput): Promise<Buffer> {
  const desc = item.description ?? `${item.color ? item.color + " " : ""}${item.name}`

  const response = await client.images.generate({
    model: "gpt-image-1",
    prompt: `Editorial menswear product photography on a clean off-white linen background. Single clothing item laid flat: ${desc}. Soft diffused natural lighting from above. No shadows. No human models. No text. No logos. Square composition. Quiet luxury aesthetic. Style of Mr Porter or Matches Fashion.`,
    n: 1,
    size: "1024x1024",
  })

  const b64 = response.data?.[0]?.b64_json
  if (!b64) throw new Error(`gpt-image-1 returned no image for: ${item.name}`)
  return Buffer.from(b64, "base64")
}

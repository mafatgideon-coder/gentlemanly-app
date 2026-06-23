import OpenAI from "openai"
import type { DetectedItem } from "@/lib/types"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_PROMPT = `You are a menswear clothing analyst. Analyze the outfit in this image and return a JSON array of detected clothing items.

Return ONLY a valid JSON array with this exact structure — no markdown, no explanation:
[
  {
    "name": "White Oxford Shirt",
    "category": "tops",
    "subcategory": "oxford_shirt",
    "color": "white",
    "description": "Crisp white oxford shirt with button-down collar"
  }
]

Categories must be exactly one of: tops | bottoms | outerwear | footwear | accessories
Subcategories for tops: t_shirt | polo | oxford_shirt | dress_shirt | sweater
Subcategories for bottoms: jeans | chinos | trousers
Subcategories for outerwear: blazer | jacket | coat
Subcategories for footwear: sneakers | loafers | boots | dress_shoes
Subcategories for accessories: belt | watch | hat

Be specific with colors (e.g., "navy blue", "off-white", "burgundy").

Rules:
- Only include clothing items and accessories that are being worn on the body (shirts, trousers, shoes, belts, watches, hats). Do not include bags, backpacks, or any carried/held items. Do not include props, furniture, food, drinks, phones, or any non-clothing objects.
- Always list a belt as its own separate item in the accessories category. Never combine a belt with pants, trousers, or any other item.`

export async function detectClothing(photoUrl: string): Promise<DetectedItem[]> {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: SYSTEM_PROMPT },
          { type: "image_url", image_url: { url: photoUrl, detail: "high" } },
        ],
      },
    ],
  })

  const content = response.choices[0]?.message?.content ?? "[]"

  try {
    const items = JSON.parse(content) as DetectedItem[]
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}

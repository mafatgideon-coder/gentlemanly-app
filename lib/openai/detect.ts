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
    "pattern": "solid",
    "description": "Crisp white oxford shirt with button-down collar",
    "confidence": 0.97,
    "bbox": [0.12, 0.05, 0.88, 0.52]
  }
]

Categories must be exactly one of: tops | bottoms | outerwear | footwear | accessories
Subcategories for tops: t_shirt | polo | oxford_shirt | dress_shirt | sweater
Subcategories for bottoms: jeans | chinos | trousers
Subcategories for outerwear: blazer | jacket | coat
Subcategories for footwear: sneakers | loafers | boots | dress_shoes
Subcategories for accessories: belt | watch | hat

Be specific with colors (e.g., "navy blue", "off-white", "burgundy").
pattern must be one of: solid | striped | plaid | checkered | floral | graphic | herringbone | houndstooth | camo | other
confidence is a float 0.0–1.0 representing how certain you are this item is present.
bbox is [x1, y1, x2, y2] as fractions of image width/height (0.0–1.0), tightly bounding the garment as it appears in the photo.

Rules:
- Only include clothing items and accessories being worn on the body (shirts, trousers, shoes, belts, watches, hats). Do not include bags, backpacks, or any carried/held items. Do not include props, furniture, food, drinks, phones, or any non-clothing objects.
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
    const raw = JSON.parse(content)
    const items = Array.isArray(raw) ? raw : []
    // Backfill defaults for fields that may be absent (V1 compatibility)
    return items.map((item: DetectedItem) => ({
      ...item,
      pattern: item.pattern ?? "solid",
      confidence: item.confidence ?? 1.0,
      bbox: item.bbox ?? null,
    }))
  } catch {
    return []
  }
}

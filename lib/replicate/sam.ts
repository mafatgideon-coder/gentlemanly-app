import Replicate from "replicate"

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN })

// SAM 2 model on Replicate — accepts image + bounding box, returns a mask PNG
// Model page: https://replicate.com/meta/sam-2
const SAM2_MODEL = "meta/sam-2"

/**
 * Segments a garment from an image using SAM 2.
 * Returns the URL of a grayscale mask PNG (white = garment, black = background).
 *
 * @param imageUrl  Publicly accessible URL of the original photo
 * @param bbox      [x1, y1, x2, y2] in pixel coordinates
 */
export async function segmentGarment(
  imageUrl: string,
  bbox: [number, number, number, number],
): Promise<string> {
  const [x1, y1, x2, y2] = bbox

  const output = await replicate.run(SAM2_MODEL, {
    input: {
      image: imageUrl,
      box: JSON.stringify([[x1, y1, x2, y2]]),
      multimask_output: false,
      return_logits: false,
    },
  })

  return resolveMaskUrl(output)
}

function resolveMaskUrl(output: unknown): string {
  if (typeof output === "string") return output
  if (Array.isArray(output) && output.length > 0) return String(output[0])
  if (output && typeof output === "object") {
    const obj = output as Record<string, unknown>
    const url = obj.mask ?? obj.masked_image ?? obj.output ?? obj.url
    if (url) return String(url)
  }
  throw new Error(`SAM 2 returned an unrecognised output format: ${JSON.stringify(output)}`)
}

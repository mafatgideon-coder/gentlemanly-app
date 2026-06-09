import OpenAI from "openai"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  const results: Record<string, unknown> = {}

  results.env = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "set (" + process.env.OPENAI_API_KEY.slice(0, 10) + "...)" : "MISSING",
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING",
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING",
  }

  // Step 2: gpt-image-1 generation (returns base64)
  let imageBuffer: Buffer | null = null
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const response = await client.images.generate({
      model: "gpt-image-1",
      prompt: "A white dress shirt laid flat on a light grey background. Editorial menswear photography.",
      n: 1,
      size: "1024x1024",
    })
    const b64 = response.data?.[0]?.b64_json
    if (!b64) throw new Error("no b64_json in response")
    imageBuffer = Buffer.from(b64, "base64")
    results.image_gen = `OK — ${imageBuffer.byteLength} bytes`
  } catch (err) {
    results.image_gen = "ERROR: " + (err instanceof Error ? err.message : String(err))
  }

  // Step 3: Upload to Supabase
  if (imageBuffer) {
    try {
      const service = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const testPath = `test/flatlay-test-${Date.now()}.png`
      const { error: uploadErr } = await service.storage
        .from("flatlay-images")
        .upload(testPath, imageBuffer, { contentType: "image/png" })

      if (uploadErr) {
        results.upload = "ERROR: " + uploadErr.message
      } else {
        results.upload = "OK"
        const { data: signed } = await service.storage
          .from("flatlay-images")
          .createSignedUrl(testPath, 3600)
        results.signedUrl = signed?.signedUrl ? "OK" : "ERROR: no signed URL"
        await service.storage.from("flatlay-images").remove([testPath])
      }
    } catch (err) {
      results.upload = "ERROR: " + (err instanceof Error ? err.message : String(err))
    }
  } else {
    results.upload = "SKIPPED (no image)"
  }

  return NextResponse.json(results)
}

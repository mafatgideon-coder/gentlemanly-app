import OpenAI from "openai"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  const results: Record<string, unknown> = {}

  // Step 1: env vars
  results.env = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "set (" + process.env.OPENAI_API_KEY.slice(0, 10) + "...)" : "MISSING",
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING",
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING",
  }

  // Step 2: DALL-E 2 generation
  let dalleUrl: string | null = null
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const response = await client.images.generate({
      model: "dall-e-2",
      prompt: "A white dress shirt laid flat on a light grey background. Editorial menswear photography.",
      n: 1,
      size: "512x512",
    })
    dalleUrl = response.data?.[0]?.url ?? null
    results.dalle = dalleUrl ? "OK — " + dalleUrl.slice(0, 60) + "..." : "no URL returned"
  } catch (err) {
    results.dalle = "ERROR: " + (err instanceof Error ? err.message : String(err))
  }

  // Step 3: Download the image
  let imageBuffer: Buffer | null = null
  if (dalleUrl) {
    try {
      const res = await fetch(dalleUrl)
      imageBuffer = Buffer.from(await res.arrayBuffer())
      results.download = `OK — ${imageBuffer.byteLength} bytes`
    } catch (err) {
      results.download = "ERROR: " + (err instanceof Error ? err.message : String(err))
    }
  } else {
    results.download = "SKIPPED (no DALL-E URL)"
  }

  // Step 4: Upload to Supabase
  let signedUrl: string | null = null
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
        signedUrl = signed?.signedUrl ?? null
        results.signedUrl = signedUrl ? "OK" : "ERROR: no signed URL"

        // Cleanup test file
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

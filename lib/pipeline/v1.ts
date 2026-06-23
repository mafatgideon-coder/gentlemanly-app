import { createClient as createServiceClient } from "@supabase/supabase-js"
import { generateFlatlay } from "@/lib/openai/flatlay"
import type { PipelineInput, PipelineResult } from "./types"

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function runV1Pipeline(input: PipelineInput): Promise<PipelineResult> {
  const start = Date.now()
  const service = serviceClient()

  try {
    // Download original photo as visual reference
    let photoBuffer: Buffer | undefined
    try {
      const res = await fetch(input.photoUrl)
      photoBuffer = Buffer.from(await res.arrayBuffer())
    } catch {
      console.log("[v1] could not download photo, using text-only fallback")
    }

    const flatlayBuffer = await generateFlatlay(input.items, photoBuffer)

    const storagePath = `${input.userId}/${input.outfitId}/flatlay.png`
    const { error: uploadErr } = await service.storage
      .from("flatlay-images")
      .upload(storagePath, flatlayBuffer, { contentType: "image/png", upsert: true })

    if (uploadErr) {
      throw new Error(`Upload failed: ${uploadErr.message}`)
    }

    const { data: signed } = await service.storage
      .from("flatlay-images")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

    const flatlay_url = signed?.signedUrl ?? null

    if (flatlay_url) {
      await service.from("outfits").update({ flatlay_url }).eq("id", input.outfitId)
    }

    // Clean up original photo from temp storage
    if (input.photoStoragePath) {
      await service.storage.from("outfit-photos").remove([input.photoStoragePath])
    }

    return { flatlay_url, pipeline: "v1", duration_ms: Date.now() - start }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error("[v1] error:", error)
    return { flatlay_url: null, pipeline: "v1", duration_ms: Date.now() - start, error }
  }
}

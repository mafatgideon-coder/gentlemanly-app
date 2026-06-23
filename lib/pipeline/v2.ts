import type { PipelineInput, PipelineResult } from "./types"

/**
 * V2 EXPERIMENTAL PIPELINE — STUB
 *
 * Current behaviour: falls back to the original photo so the journal
 * entry still has an image while the real pipeline is being designed.
 *
 * Planned pipeline (replace the stub body when ready):
 *   Photo
 *     ↓ GPT-4o Vision  — identify garments + bounding box coordinates
 *     ↓ SAM 2 (Replicate) — segment each garment
 *     ↓ rembg (Replicate) — clean background removal per garment PNG
 *     ↓ Save individual garment PNGs to Supabase storage
 *     ↓ Composite → stored as flatlay_url
 */
export async function runV2Pipeline(input: PipelineInput): Promise<PipelineResult> {
  const start = Date.now()

  console.log(`[v2] pipeline triggered for outfit ${input.outfitId} — stub active`)

  // ── STUB: use the original photo as the display image ──────────────
  // Replace everything below this comment with the real implementation.
  return {
    flatlay_url: null,   // null → app falls back to photo_url automatically
    pipeline: "v2",
    duration_ms: Date.now() - start,
    error: "v2 pipeline not yet implemented — using photo_url fallback",
  }
}

import type { DetectedItem } from "@/lib/types"

export type PipelineVersion = "v1" | "v2"

export interface PipelineInput {
  userId: string
  outfitId: string
  photoUrl: string
  photoStoragePath: string | null
  items: DetectedItem[]
}

export interface PipelineResult {
  flatlay_url: string | null
  pipeline: PipelineVersion
  duration_ms: number
  error?: string
}

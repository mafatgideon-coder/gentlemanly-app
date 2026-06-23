import { createClient as createServiceClient } from "@supabase/supabase-js"
import { runV1Pipeline } from "./v1"
import { runV2Pipeline } from "./v2"
import type { PipelineInput, PipelineResult, PipelineVersion } from "./types"

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getPipelineVersion(userId: string): Promise<PipelineVersion> {
  const service = serviceClient()
  const { data } = await service
    .from("profiles")
    .select("pipeline_version")
    .eq("id", userId)
    .single()

  const version = data?.pipeline_version
  return version === "v2" ? "v2" : "v1"
}

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const version = await getPipelineVersion(input.userId)
  console.log(`[pipeline] user ${input.userId} → ${version}`)

  if (version === "v2") return runV2Pipeline(input)
  return runV1Pipeline(input)
}

export type { PipelineVersion, PipelineInput, PipelineResult }

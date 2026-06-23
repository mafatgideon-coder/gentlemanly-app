import { createClient as createServiceClient } from "@supabase/supabase-js"
import { PipelineToggle } from "./PipelineToggle"

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export default async function AdminPage() {
  const service = serviceClient()
  const { data: users } = await service
    .from("profiles")
    .select("id, email, pipeline_version, created_at")
    .order("created_at", { ascending: true })

  const v1Count = (users ?? []).filter(u => (u.pipeline_version ?? "v1") === "v1").length
  const v2Count = (users ?? []).filter(u => u.pipeline_version === "v2").length

  return (
    <div className="min-h-screen bg-[oklch(0.94_0.006_90)] pb-28">
      <div className="px-5 pt-14 pb-6">
        <p className="text-[11px] tracking-[0.4em] uppercase text-[oklch(0.52_0.015_255)]">
          Developer
        </p>
        <h1 className="font-serif text-[2rem] leading-tight text-[oklch(0.15_0.04_255)] mt-1">
          Pipeline
        </h1>
      </div>

      {/* Summary */}
      <div className="mx-5 flex gap-3 mb-6">
        <div className="flex-1 bg-white rounded-2xl px-4 py-3">
          <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.52_0.015_255)]">V1</p>
          <p className="text-2xl font-light text-[oklch(0.15_0.04_255)] mt-1">{v1Count}</p>
          <p className="text-[11px] text-[oklch(0.55_0.010_255)]">production</p>
        </div>
        <div className="flex-1 bg-white rounded-2xl px-4 py-3">
          <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.52_0.015_255)]">V2</p>
          <p className="text-2xl font-light text-[oklch(0.22_0.07_255)] mt-1">{v2Count}</p>
          <p className="text-[11px] text-[oklch(0.55_0.010_255)]">experimental</p>
        </div>
      </div>

      {/* Users */}
      <div className="px-5">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[oklch(0.52_0.015_255)] mb-3">
          Accounts
        </p>
        <PipelineToggle initialUsers={users ?? []} />
      </div>

      {/* V2 status */}
      <div className="mx-5 mt-6 bg-white rounded-2xl px-5 py-4">
        <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.52_0.015_255)] mb-2">
          V2 pipeline status
        </p>
        <p className="text-sm text-[oklch(0.42_0.015_255)] leading-relaxed">
          Stub active — V2 accounts will use the original photo as the outfit image until the pipeline is implemented. No production data is affected.
        </p>
        <div className="mt-3 space-y-1.5">
          {[
            ["GPT-4o Vision", "identify garments + bounding boxes"],
            ["SAM 2 (Replicate)", "segment each garment"],
            ["rembg (Replicate)", "background removal per garment"],
            ["Composite", "arrange garment PNGs → flatlay_url"],
          ].map(([step, desc]) => (
            <div key={step} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-[oklch(0.89_0.005_90)] shrink-0" />
              <p className="text-[12px] text-[oklch(0.55_0.010_255)]">
                <span className="text-[oklch(0.35_0.010_255)]">{step}</span> — {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

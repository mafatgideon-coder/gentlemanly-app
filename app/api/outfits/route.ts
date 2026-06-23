import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { runPipeline } from "@/lib/pipeline"
import { NextResponse } from "next/server"
import type { DetectedItem } from "@/lib/types"

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: outfits, error } = await supabase
    .from("outfits")
    .select("id, flatlay_url, photo_url, occasion, logged_at, item_count")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ outfits })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const {
    photo_url,
    occasion,
    notes,
    items,
    photo_storage_path,
    logged_at,
  }: {
    photo_url: string
    occasion: string | null
    notes: string | null
    items: DetectedItem[]
    photo_storage_path: string | null
    logged_at?: string
  } = await request.json()

  const insertData: Record<string, unknown> = {
    user_id: user.id,
    photo_url,
    flatlay_url: null,
    occasion,
    notes,
    item_count: items.length,
    items,
  }
  if (logged_at) insertData.logged_at = logged_at

  const { data: outfit, error: outfitError } = await supabase
    .from("outfits")
    .insert(insertData)
    .select()
    .single()

  if (outfitError) return NextResponse.json({ error: outfitError.message }, { status: 500 })

  // Route to v1 or v2 based on the user's pipeline_version in profiles
  const result = await runPipeline({
    userId: user.id,
    outfitId: outfit.id,
    photoUrl: photo_url,
    photoStoragePath: photo_storage_path,
    items,
  })

  console.log(`[outfits] pipeline=${result.pipeline} duration=${result.duration_ms}ms${result.error ? ` error=${result.error}` : ""}`)

  return NextResponse.json({ outfit: { ...outfit, flatlay_url: result.flatlay_url } })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { ids }: { ids: string[] } = await request.json()
  if (!ids?.length) return NextResponse.json({ error: "ids required" }, { status: 400 })

  const service = serviceClient()
  const flatlayPaths = ids.map((id) => `${user.id}/${id}/flatlay.png`)
  await service.storage.from("flatlay-images").remove(flatlayPaths)

  const { error } = await supabase
    .from("outfits")
    .delete()
    .in("id", ids)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: ids.length })
}

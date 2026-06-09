import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { generateFlatlay } from "@/lib/openai/flatlay"
import { NextResponse } from "next/server"
import type { DetectedItem } from "@/lib/types"

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
  }: {
    photo_url: string
    occasion: string | null
    notes: string | null
    items: DetectedItem[]
    photo_storage_path: string | null
  } = await request.json()

  // Save outfit immediately
  const { data: outfit, error: outfitError } = await supabase
    .from("outfits")
    .insert({
      user_id: user.id,
      photo_url,
      flatlay_url: null,
      occasion,
      notes,
      item_count: items.length,
    })
    .select()
    .single()

  if (outfitError) {
    return NextResponse.json({ error: outfitError.message }, { status: 500 })
  }

  // Upsert wardrobe items
  const wardrobeIds: string[] = []
  for (const item of items) {
    const { data: existing } = await supabase
      .from("wardrobe_items")
      .select("id, wear_count")
      .eq("user_id", user.id)
      .eq("name", item.name)
      .eq("category", item.category)
      .maybeSingle()

    if (existing) {
      await supabase
        .from("wardrobe_items")
        .update({ wear_count: existing.wear_count + 1, last_worn: new Date().toISOString() })
        .eq("id", existing.id)
      wardrobeIds.push(existing.id)
    } else {
      const { data: newItem } = await supabase
        .from("wardrobe_items")
        .insert({
          user_id: user.id,
          name: item.name,
          category: item.category,
          subcategory: item.subcategory,
          color: item.color,
          description: item.description,
        })
        .select("id")
        .single()
      if (newItem) wardrobeIds.push(newItem.id)
    }
  }

  if (wardrobeIds.length) {
    await supabase.from("outfit_items").insert(
      wardrobeIds.map((wardrobe_item_id) => ({ outfit_id: outfit.id, wardrobe_item_id }))
    )
  }

  // Generate flatlay synchronously — client waits for this to complete
  let flatlayUrl: string | null = null
  if (items.length > 0) {
    try {
      const service = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const dalleUrl = await generateFlatlay(items)
      const imageRes = await fetch(dalleUrl)
      const imageBuffer = Buffer.from(await imageRes.arrayBuffer())

      const storagePath = `${user.id}/${outfit.id}/flatlay.png`
      await service.storage
        .from("flatlay-images")
        .upload(storagePath, imageBuffer, { contentType: "image/png", upsert: true })

      const { data: signed } = await service.storage
        .from("flatlay-images")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

      flatlayUrl = signed?.signedUrl ?? null

      if (flatlayUrl) {
        await service.from("outfits").update({ flatlay_url: flatlayUrl }).eq("id", outfit.id)
      }

      if (photo_storage_path) {
        await service.storage.from("outfit-photos").remove([photo_storage_path])
      }
    } catch (err) {
      console.error("[flatlay]", err)
      // Outfit saved even if flatlay fails
    }
  }

  return NextResponse.json({ outfit: { ...outfit, flatlay_url: flatlayUrl } })
}

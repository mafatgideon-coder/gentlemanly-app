import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { generateFlatlay } from "@/lib/openai/flatlay"
import { cropAndStoreWardrobeImages } from "@/lib/openai/cropWardrobeItems"
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
  }: {
    photo_url: string
    occasion: string | null
    notes: string | null
    items: DetectedItem[]
    photo_storage_path: string | null
  } = await request.json()

  const { data: outfit, error: outfitError } = await supabase
    .from("outfits")
    .insert({ user_id: user.id, photo_url, flatlay_url: null, occasion, notes, item_count: items.length })
    .select()
    .single()

  if (outfitError) return NextResponse.json({ error: outfitError.message }, { status: 500 })

  // Upsert wardrobe items — crop images for new items OR existing items missing an image
  const wardrobeIds: string[] = []
  const itemsNeedingImages: Array<{ id: string; name: string; category: string }> = []

  for (const item of items) {
    const { data: existing } = await supabase
      .from("wardrobe_items")
      .select("id, wear_count, image_url")
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
      if (!existing.image_url) {
        itemsNeedingImages.push({ id: existing.id, name: item.name, category: item.category })
      }
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
      if (newItem) {
        wardrobeIds.push(newItem.id)
        itemsNeedingImages.push({ id: newItem.id, name: item.name, category: item.category })
      }
    }
  }

  if (wardrobeIds.length) {
    await supabase.from("outfit_items").insert(
      wardrobeIds.map((wardrobe_item_id) => ({ outfit_id: outfit.id, wardrobe_item_id }))
    )
  }

  let flatlayUrl: string | null = null
  try {
    const service = serviceClient()
    console.log("[flatlay] generating for outfit", outfit.id, "| items:", items.length)

    // Download the original photo to use as visual reference
    let photoBuffer: Buffer | undefined
    try {
      const photoRes = await fetch(photo_url)
      photoBuffer = Buffer.from(await photoRes.arrayBuffer())
      console.log("[flatlay] photo downloaded for reference, bytes:", photoBuffer.byteLength)
    } catch {
      console.log("[flatlay] could not download photo, falling back to text-only")
    }

    const flatlayBuffer = await generateFlatlay(items, photoBuffer)
    console.log("[flatlay] image generated, bytes:", flatlayBuffer.byteLength)

    const storagePath = `${user.id}/${outfit.id}/flatlay.png`
    const { error: uploadErr } = await service.storage
      .from("flatlay-images")
      .upload(storagePath, flatlayBuffer, { contentType: "image/png", upsert: true })

    if (uploadErr) {
      console.error("[flatlay] upload error:", uploadErr.message)
    } else {
      const { data: signed } = await service.storage
        .from("flatlay-images")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

      flatlayUrl = signed?.signedUrl ?? null
      console.log("[flatlay] signed URL created:", !!flatlayUrl)

      if (flatlayUrl) {
        await service.from("outfits").update({ flatlay_url: flatlayUrl }).eq("id", outfit.id)
        console.log("[flatlay] outfit updated with flatlay_url")
      }

      // Crop individual items from flat-lay for any item missing an image
      if (itemsNeedingImages.length > 0) {
        console.log("[wardrobe-crop] cropping", itemsNeedingImages.length, "items")
        await cropAndStoreWardrobeImages(itemsNeedingImages, flatlayBuffer, user.id, service)
      }
    }

    if (photo_storage_path) {
      await service.storage.from("outfit-photos").remove([photo_storage_path])
    }
  } catch (err) {
    console.error("[flatlay] error:", err instanceof Error ? err.message : err)
  }

  return NextResponse.json({ outfit: { ...outfit, flatlay_url: flatlayUrl } })
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

import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { generateFlatlay } from "@/lib/openai/flatlay"
import { generateItemImage } from "@/lib/openai/cropWardrobeItems"
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

  // Upsert wardrobe items — track which need images
  const wardrobeIds: string[] = []
  const itemsNeedingImages: Array<{ id: string; name: string; category: string; description?: string; color?: string }> = []

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
        itemsNeedingImages.push({ id: existing.id, name: item.name, category: item.category, description: item.description, color: item.color })
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
        itemsNeedingImages.push({ id: newItem.id, name: item.name, category: item.category, description: item.description, color: item.color })
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

    // Download original photo as visual reference
    let photoBuffer: Buffer | undefined
    try {
      const photoRes = await fetch(photo_url)
      photoBuffer = Buffer.from(await photoRes.arrayBuffer())
      console.log("[img] photo downloaded, bytes:", photoBuffer.byteLength)
    } catch {
      console.log("[img] could not download photo, using text-only fallback")
    }

    // Generate flat-lay AND all item images in parallel — ~30s total regardless of item count
    const [flatlayBuffer, ...itemBuffers] = await Promise.all([
      generateFlatlay(items, photoBuffer),
      ...itemsNeedingImages.map((item) =>
        generateItemImage(item).catch((err) => {
          console.error("[img] item failed:", item.name, err instanceof Error ? err.message : err)
          return null
        })
      ),
    ])
    console.log("[img] all generations done")

    // Upload flat-lay
    const storagePath = `${user.id}/${outfit.id}/flatlay.png`
    const { error: uploadErr } = await service.storage
      .from("flatlay-images")
      .upload(storagePath, flatlayBuffer, { contentType: "image/png", upsert: true })

    if (uploadErr) {
      console.error("[img] flatlay upload error:", uploadErr.message)
    } else {
      const { data: signed } = await service.storage
        .from("flatlay-images")
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

      flatlayUrl = signed?.signedUrl ?? null
      if (flatlayUrl) {
        await service.from("outfits").update({ flatlay_url: flatlayUrl }).eq("id", outfit.id)
        console.log("[img] outfit updated with flatlay_url")
      }
    }

    // Upload wardrobe item images
    await Promise.all(
      itemsNeedingImages.map(async (item, i) => {
        const buffer = itemBuffers[i]
        if (!buffer) return
        try {
          const itemPath = `${user.id}/${item.id}/image.png`
          const { error: err } = await service.storage
            .from("wardrobe-images")
            .upload(itemPath, buffer, { contentType: "image/png", upsert: true })
          if (!err) {
            const { data: s } = await service.storage
              .from("wardrobe-images")
              .createSignedUrl(itemPath, 60 * 60 * 24 * 365)
            if (s?.signedUrl) {
              await service.from("wardrobe_items").update({ image_url: s.signedUrl }).eq("id", item.id)
              console.log("[img] wardrobe image saved:", item.name)
            }
          }
        } catch (err) {
          console.error("[img] wardrobe upload failed:", item.name, err instanceof Error ? err.message : err)
        }
      })
    )

    if (photo_storage_path) {
      await service.storage.from("outfit-photos").remove([photo_storage_path])
    }
  } catch (err) {
    console.error("[img] error:", err instanceof Error ? err.message : err)
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

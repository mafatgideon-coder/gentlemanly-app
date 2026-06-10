import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { generateItemImage } from "@/lib/openai/cropWardrobeItems"
import { composeGrid } from "@/lib/composeGrid"
import { NextResponse, after } from "next/server"
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

  // Upsert wardrobe items — track all items for the grid, flag which need new images
  const wardrobeIds: string[] = []
  type OutfitItem = { id: string; name: string; category: string; description?: string; color?: string; existingImageUrl: string | null }
  const allOutfitItems: OutfitItem[] = []

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
      allOutfitItems.push({ id: existing.id, name: item.name, category: item.category, description: item.description, color: item.color, existingImageUrl: existing.image_url })
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
        allOutfitItems.push({ id: newItem.id, name: item.name, category: item.category, description: item.description, color: item.color, existingImageUrl: null })
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

    // Download original photo for use as generation reference
    let photoBuffer: Buffer | undefined
    try {
      const photoRes = await fetch(photo_url)
      photoBuffer = Buffer.from(await photoRes.arrayBuffer())
      console.log("[img] photo downloaded, bytes:", photoBuffer.byteLength)
    } catch {
      console.log("[img] could not download photo, falling back to text-only")
    }

    // Generate or download an image buffer for every item — all in parallel
    type ItemBuffer = { id: string; buffer: Buffer; needsStorage: boolean }
    const itemBufferResults = await Promise.all(
      allOutfitItems.map(async (item): Promise<ItemBuffer | null> => {
        if (item.existingImageUrl) {
          try {
            const res = await fetch(item.existingImageUrl)
            console.log("[img] downloaded existing image for:", item.name)
            return { id: item.id, buffer: Buffer.from(await res.arrayBuffer()), needsStorage: false }
          } catch {
            console.log("[img] could not download existing image for:", item.name)
            return null
          }
        } else {
          try {
            const buffer = await generateItemImage(item, photoBuffer)
            console.log("[img] generated image for:", item.name)
            return { id: item.id, buffer, needsStorage: true }
          } catch (err) {
            console.error("[img] generation failed for", item.name, err instanceof Error ? err.message : err)
            return null
          }
        }
      })
    )
    const itemBuffers: ItemBuffer[] = itemBufferResults.filter((r): r is ItemBuffer => r !== null)

    if (itemBuffers.length > 0) {
      // Compose item images into a grid for the journal flat-lay
      const gridBuffer = await composeGrid(itemBuffers.map((i) => i.buffer))
      console.log("[img] grid composed, bytes:", gridBuffer.byteLength)

      const storagePath = `${user.id}/${outfit.id}/flatlay.png`
      const { error: uploadErr } = await service.storage
        .from("flatlay-images")
        .upload(storagePath, gridBuffer, { contentType: "image/png", upsert: true })

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

        // Save individual item images to wardrobe storage in the background
        const newItemBuffers = itemBuffers.filter((i) => i.needsStorage)
        const capturedPhotoStoragePath = photo_storage_path
        after(async () => {
          for (const { id, buffer } of newItemBuffers) {
            try {
              const itemPath = `${user.id}/${id}/image.png`
              const { error: itemUploadErr } = await service.storage
                .from("wardrobe-images")
                .upload(itemPath, buffer, { contentType: "image/png", upsert: true })
              if (!itemUploadErr) {
                const { data: itemSigned } = await service.storage
                  .from("wardrobe-images")
                  .createSignedUrl(itemPath, 60 * 60 * 24 * 365)
                if (itemSigned?.signedUrl) {
                  await service.from("wardrobe_items").update({ image_url: itemSigned.signedUrl }).eq("id", id)
                  console.log("[img] wardrobe image saved for item:", id)
                }
              }
            } catch (err) {
              console.error("[img] wardrobe save failed for item:", id, err instanceof Error ? err.message : err)
            }
          }
          if (capturedPhotoStoragePath) {
            await service.storage.from("outfit-photos").remove([capturedPhotoStoragePath])
          }
        })
      }
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

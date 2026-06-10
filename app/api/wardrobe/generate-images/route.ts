import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { generateItemImage } from "@/lib/openai/cropWardrobeItems"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { outfit_id, photo_url }: { outfit_id: string; photo_url: string } = await request.json()
  if (!outfit_id) return NextResponse.json({ error: "outfit_id required" }, { status: 400 })

  // Fetch wardrobe items linked to this outfit that are missing an image
  const { data: outfitItems } = await supabase
    .from("outfit_items")
    .select("wardrobe_item_id")
    .eq("outfit_id", outfit_id)

  if (!outfitItems?.length) return NextResponse.json({ generated: 0 })

  const ids = outfitItems.map((r) => r.wardrobe_item_id)
  const { data: wardrobeItems } = await supabase
    .from("wardrobe_items")
    .select("id, name, category, description, color, image_url")
    .in("id", ids)
    .is("image_url", null)
    .eq("user_id", user.id)

  if (!wardrobeItems?.length) return NextResponse.json({ generated: 0 })

  // Download the original photo for use as visual reference
  let photoBuffer: Buffer | undefined
  try {
    const res = await fetch(photo_url)
    photoBuffer = Buffer.from(await res.arrayBuffer())
  } catch {
    console.log("[wardrobe-gen] could not download photo, using text-only")
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Generate all item images in parallel
  let generated = 0
  await Promise.all(
    wardrobeItems.map(async (item) => {
      try {
        const buffer = await generateItemImage(item)

        const itemPath = `${user.id}/${item.id}/image.png`
        const { error: uploadErr } = await service.storage
          .from("wardrobe-images")
          .upload(itemPath, buffer, { contentType: "image/png", upsert: true })

        if (uploadErr) {
          console.error("[wardrobe-gen] upload error:", item.name, uploadErr.message)
          return
        }

        const { data: signed } = await service.storage
          .from("wardrobe-images")
          .createSignedUrl(itemPath, 60 * 60 * 24 * 365)

        if (signed?.signedUrl) {
          await service.from("wardrobe_items").update({ image_url: signed.signedUrl }).eq("id", item.id)
          console.log("[wardrobe-gen] saved image:", item.name)
          generated++
        }
      } catch (err) {
        console.error("[wardrobe-gen] failed:", item.name, err instanceof Error ? err.message : err)
      }
    })
  )

  return NextResponse.json({ generated })
}

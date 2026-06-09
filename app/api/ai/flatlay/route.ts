import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { generateFlatlay } from "@/lib/openai/flatlay"
import { NextResponse } from "next/server"
import type { DetectedItem } from "@/lib/types"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 })
  }

  const { items, outfit_id, photo_storage_path }: {
    items: DetectedItem[]
    outfit_id: string
    photo_storage_path?: string
  } = await request.json()

  if (!items?.length) {
    return NextResponse.json({ error: "items required" }, { status: 400 })
  }

  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Generate flat-lay with DALL-E 3
    const dalleUrl = await generateFlatlay(items)

    // Download the generated image
    const imageRes = await fetch(dalleUrl)
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer())

    // Upload to Supabase Storage
    const storagePath = `${user.id}/${outfit_id}/flatlay.png`
    const { error: uploadError } = await serviceClient.storage
      .from("flatlay-images")
      .upload(storagePath, imageBuffer, { contentType: "image/png", upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    // Get a long-lived signed URL
    const { data: signed } = await serviceClient.storage
      .from("flatlay-images")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

    const flatlayUrl = signed?.signedUrl
    if (!flatlayUrl) throw new Error("Failed to get signed URL")

    // Update the outfit record with the flatlay URL
    await serviceClient
      .from("outfits")
      .update({ flatlay_url: flatlayUrl })
      .eq("id", outfit_id)

    // Delete the original uploaded photo now that flatlay is stored
    if (photo_storage_path) {
      await serviceClient.storage
        .from("outfit-photos")
        .remove([photo_storage_path])
    }

    return NextResponse.json({ flatlay_url: flatlayUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[flatlay]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { generateFlatlay } from "@/lib/openai/flatlay"
import { NextResponse } from "next/server"
import type { DetectedItem } from "@/lib/types"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { items, outfit_id }: { items: DetectedItem[]; outfit_id: string } =
    await request.json()

  if (!items?.length) {
    return NextResponse.json({ error: "items required" }, { status: 400 })
  }

  // Generate flat-lay with DALL-E 3
  const dalleUrl = await generateFlatlay(items)

  // Download the generated image
  const imageRes = await fetch(dalleUrl)
  const imageBuffer = Buffer.from(await imageRes.arrayBuffer())

  // Upload to Supabase Storage using service role (bypasses user RLS for server writes)
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const storagePath = `${user.id}/${outfit_id}/flatlay.png`
  const { error: uploadError } = await serviceClient.storage
    .from("flatlay-images")
    .upload(storagePath, imageBuffer, {
      contentType: "image/png",
      upsert: true,
    })

  if (uploadError) throw new Error(uploadError.message)

  // Generate a long-lived signed URL for display
  const { data: signed } = await serviceClient.storage
    .from("flatlay-images")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365) // 1 year

  return NextResponse.json({ flatlay_url: signed?.signedUrl })
}

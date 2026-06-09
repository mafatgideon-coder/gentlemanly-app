import { createClient } from "@/lib/supabase/server"
import { detectClothing } from "@/lib/openai/detect"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { photo_url } = await request.json()
  if (!photo_url) return NextResponse.json({ error: "photo_url required" }, { status: 400 })

  // Get a signed URL so OpenAI can access the private Supabase Storage file
  const path = photo_url.split("/outfit-photos/")[1]
  const { data: signed } = await supabase.storage
    .from("outfit-photos")
    .createSignedUrl(path, 300)

  const accessUrl = signed?.signedUrl ?? photo_url

  const items = await detectClothing(accessUrl)
  return NextResponse.json({ items })
}

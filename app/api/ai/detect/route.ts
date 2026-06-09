import { createClient } from "@/lib/supabase/server"
import { detectClothing } from "@/lib/openai/detect"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { photo_url } = await request.json()
  if (!photo_url) return NextResponse.json({ error: "photo_url required" }, { status: 400 })

  const items = await detectClothing(photo_url)
  return NextResponse.json({ items })
}

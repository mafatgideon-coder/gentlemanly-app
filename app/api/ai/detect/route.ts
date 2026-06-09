import { createClient } from "@/lib/supabase/server"
import { detectClothing } from "@/lib/openai/detect"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { photo_url } = await request.json()
  if (!photo_url) return NextResponse.json({ error: "photo_url required" }, { status: 400 })

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 })
  }

  try {
    const items = await detectClothing(photo_url)
    return NextResponse.json({ items })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[detect]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

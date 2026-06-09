import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: outfit, error } = await supabase
    .from("outfits")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (error || !outfit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Fetch related wardrobe items through junction
  const { data: outfitItems } = await supabase
    .from("outfit_items")
    .select("wardrobe_item_id, wardrobe_items(*)")
    .eq("outfit_id", id)

  const items =
    outfitItems?.map((oi: { wardrobe_items: unknown }) => oi.wardrobe_items) ?? []

  return NextResponse.json({ outfit: { ...outfit, items } })
}

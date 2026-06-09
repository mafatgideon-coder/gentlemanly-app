import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { DetectedItem } from "@/lib/types"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: outfits, error } = await supabase
    .from("outfits")
    .select("id, flatlay_url, occasion, logged_at, item_count")
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
    flatlay_url,
    occasion,
    notes,
    items,
  }: {
    photo_url: string
    flatlay_url: string | null
    occasion: string | null
    notes: string | null
    items: DetectedItem[]
  } = await request.json()

  // Insert outfit record
  const { data: outfit, error: outfitError } = await supabase
    .from("outfits")
    .insert({
      user_id: user.id,
      photo_url,
      flatlay_url,
      occasion,
      notes,
      item_count: items.length,
    })
    .select()
    .single()

  if (outfitError) {
    return NextResponse.json({ error: outfitError.message }, { status: 500 })
  }

  // Upsert wardrobe items and link to outfit
  const wardrobeIds: string[] = []

  for (const item of items) {
    // Try to find existing item (by name + category for this user)
    const { data: existing } = await supabase
      .from("wardrobe_items")
      .select("id, wear_count")
      .eq("user_id", user.id)
      .eq("name", item.name)
      .eq("category", item.category)
      .maybeSingle()

    if (existing) {
      // Increment wear count
      await supabase
        .from("wardrobe_items")
        .update({
          wear_count: existing.wear_count + 1,
          last_worn: new Date().toISOString(),
        })
        .eq("id", existing.id)
      wardrobeIds.push(existing.id)
    } else {
      // Create new wardrobe item
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

      if (newItem) wardrobeIds.push(newItem.id)
    }
  }

  // Create outfit_items junction records
  if (wardrobeIds.length) {
    await supabase.from("outfit_items").insert(
      wardrobeIds.map((wardrobe_item_id) => ({
        outfit_id: outfit.id,
        wardrobe_item_id,
      }))
    )
  }

  return NextResponse.json({ outfit })
}

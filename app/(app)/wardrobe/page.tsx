import { createClient } from "@/lib/supabase/server"
import { WardrobeView } from "@/components/wardrobe/WardrobeView"
import type { WardrobeItem } from "@/lib/types"

export default async function WardrobePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from("wardrobe_items")
    .select("*")
    .eq("user_id", user!.id)
    .order("wear_count", { ascending: false })

  const items = (data ?? []) as WardrobeItem[]

  return (
    <div className="px-5 pt-14 pb-10">
      <WardrobeView items={items} />
    </div>
  )
}

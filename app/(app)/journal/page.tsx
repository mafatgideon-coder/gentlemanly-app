import { createClient } from "@/lib/supabase/server"
import { JournalList } from "@/components/journal/JournalList"
import type { Outfit } from "@/lib/types"

export default async function JournalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from("outfits")
    .select("id, photo_url, flatlay_url, occasion, item_count, is_favorite, items, logged_at")
    .eq("user_id", user!.id)
    .order("logged_at", { ascending: false })

  const outfits = (data ?? []) as Outfit[]

  return (
    <div className="px-5 pt-14">
      <JournalList outfits={outfits} />
    </div>
  )
}

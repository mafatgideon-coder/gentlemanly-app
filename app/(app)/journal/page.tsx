import { createClient } from "@/lib/supabase/server"
import { JournalList } from "@/components/journal/JournalList"
import type { Outfit } from "@/lib/types"

export default async function JournalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from("outfits")
    .select("id, photo_url, flatlay_url, occasion, item_count, logged_at")
    .eq("user_id", user!.id)
    .order("logged_at", { ascending: false })

  const outfits = (data ?? []) as Outfit[]

  return (
    <div className="px-5 pt-14">
      <div className="mb-8">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[oklch(0.52_0.012_255)]">
          Archive
        </p>
        <h1 className="text-3xl font-light tracking-tight mt-1 text-[oklch(0.18_0.008_255)]">
          Journal
        </h1>
      </div>
      <JournalList outfits={outfits} />
    </div>
  )
}

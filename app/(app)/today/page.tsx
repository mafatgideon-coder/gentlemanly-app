import { createClient } from "@/lib/supabase/server"
import { TodayEmpty } from "@/components/today/TodayEmpty"
import { TodayLogged } from "@/components/today/TodayLogged"
import { isToday } from "@/lib/utils"
import type { Outfit } from "@/lib/types"

export default async function TodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: outfits } = await supabase
    .from("outfits")
    .select("id, photo_url, flatlay_url, occasion, item_count, logged_at")
    .eq("user_id", user!.id)
    .order("logged_at", { ascending: false })
    .limit(5)

  const allOutfits = (outfits ?? []) as Outfit[]
  const todayOutfit = allOutfits.find((o) => isToday(o.logged_at)) ?? null
  const mostRecent = allOutfits.find((o) => !isToday(o.logged_at)) ?? null

  if (todayOutfit) {
    return <TodayLogged outfit={todayOutfit} />
  }

  return <TodayEmpty recentOutfit={mostRecent} />
}

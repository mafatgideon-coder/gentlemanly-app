import { createClient } from "@/lib/supabase/server"
import { TodayEmpty } from "@/components/today/TodayEmpty"
import { TodayLogged } from "@/components/today/TodayLogged"
import { isToday } from "@/lib/utils"
import type { Outfit } from "@/lib/types"

function startOfISOWeek(): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export default async function TodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const weekStart = startOfISOWeek()

  const { data: weekOutfitsRaw } = await supabase
    .from("outfits")
    .select("id, photo_url, flatlay_url, occasion, item_count, is_favorite, logged_at")
    .eq("user_id", user!.id)
    .gte("logged_at", weekStart.toISOString())
    .order("logged_at", { ascending: false })

  const weekOutfits = (weekOutfitsRaw ?? []) as Outfit[]
  const todayOutfit = weekOutfits.find((o) => isToday(o.logged_at)) ?? null

  // Same calendar date one year ago
  const now = new Date()
  const lastYearStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59, 999)

  const { data: onThisDayRaw } = await supabase
    .from("outfits")
    .select("id, photo_url, flatlay_url, occasion, notes, item_count, is_favorite, logged_at")
    .eq("user_id", user!.id)
    .gte("logged_at", lastYearStart.toISOString())
    .lte("logged_at", lastYearEnd.toISOString())
    .order("logged_at", { ascending: false })
    .limit(1)

  const onThisDay = (onThisDayRaw?.[0] ?? null) as Outfit | null

  if (todayOutfit) {
    return <TodayLogged outfit={todayOutfit} weekOutfits={weekOutfits} onThisDay={onThisDay} />
  }

  return <TodayEmpty weekOutfits={weekOutfits} onThisDay={onThisDay} />
}

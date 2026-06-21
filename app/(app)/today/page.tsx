import { createClient } from "@/lib/supabase/server"
import { HomeScreen } from "@/components/today/HomeScreen"
import { MemoryLayer } from "@/components/today/MemoryLayer"
import { isToday } from "@/lib/utils"
import { Suspense } from "react"
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

  const [{ data: weekRaw }, { data: recentRaw }] = await Promise.all([
    supabase.from("outfits")
      .select("id, photo_url, flatlay_url, occasion, item_count, is_favorite, logged_at")
      .eq("user_id", user!.id)
      .gte("logged_at", weekStart.toISOString())
      .order("logged_at", { ascending: false }),

    supabase.from("outfits")
      .select("id, photo_url, flatlay_url, occasion, item_count, is_favorite, logged_at")
      .eq("user_id", user!.id)
      .order("logged_at", { ascending: false })
      .limit(6),
  ])

  const weekOutfits = (weekRaw ?? []) as Outfit[]
  const todayOutfit = weekOutfits.find(o => isToday(o.logged_at)) ?? null
  const allRecent = (recentRaw ?? []) as Outfit[]

  // Context thumbnail for the not-logged-yet state
  const contextOutfit = todayOutfit ? null : allRecent[0] ?? null

  // De-emphasized recent list, lower on the page — excludes today
  const recentEntries = allRecent
    .filter(o => !todayOutfit || o.id !== todayOutfit.id)
    .slice(0, 3)

  // Anchor for "most recent occasion" reflection + its memory card
  const recentOccasionEntry = recentEntries[0] ?? null

  return (
    <HomeScreen
      todayOutfit={todayOutfit}
      weekOutfits={weekOutfits}
      contextOutfit={contextOutfit}
      recentEntries={recentEntries}
    >
      <Suspense fallback={null}>
        <MemoryLayer userId={user!.id} recentOccasionEntry={recentOccasionEntry} />
      </Suspense>
    </HomeScreen>
  )
}

import { createClient } from "@/lib/supabase/server"
import { HomeScreen } from "@/components/today/HomeScreen"
import { isToday } from "@/lib/utils"
import type { Outfit } from "@/lib/types"

export interface MemoryItem {
  label: string
  outfit: Outfit
}

function startOfISOWeek(): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function lastSundayRange() {
  const now = new Date()
  const daysAgo = now.getDay() === 0 ? 7 : now.getDay()
  const d = new Date(now)
  d.setDate(now.getDate() - daysAgo)
  return {
    start: new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString(),
    end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString(),
  }
}

function oneYearAgoRange() {
  const now = new Date()
  return {
    start: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString(),
    end: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString(),
  }
}

export default async function TodayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const weekStart = startOfISOWeek()
  const sunday = lastSundayRange()
  const yearAgo = oneYearAgoRange()

  const [
    { data: weekRaw },
    { data: sundayRaw },
    { data: yearAgoRaw },
    { data: churchRaw },
    { data: favoriteRaw },
    { data: recentRaw },
  ] = await Promise.all([
    supabase.from("outfits")
      .select("id, photo_url, flatlay_url, occasion, item_count, is_favorite, logged_at")
      .eq("user_id", user!.id)
      .gte("logged_at", weekStart.toISOString())
      .order("logged_at", { ascending: false }),

    supabase.from("outfits")
      .select("id, photo_url, flatlay_url, occasion, logged_at")
      .eq("user_id", user!.id)
      .gte("logged_at", sunday.start)
      .lte("logged_at", sunday.end)
      .order("logged_at", { ascending: false })
      .limit(1),

    supabase.from("outfits")
      .select("id, photo_url, flatlay_url, occasion, logged_at")
      .eq("user_id", user!.id)
      .gte("logged_at", yearAgo.start)
      .lte("logged_at", yearAgo.end)
      .order("logged_at", { ascending: false })
      .limit(1),

    supabase.from("outfits")
      .select("id, photo_url, flatlay_url, occasion, logged_at")
      .eq("user_id", user!.id)
      .eq("occasion", "Church")
      .order("logged_at", { ascending: false })
      .limit(1),

    supabase.from("outfits")
      .select("id, photo_url, flatlay_url, occasion, logged_at")
      .eq("user_id", user!.id)
      .eq("is_favorite", true)
      .order("logged_at", { ascending: false })
      .limit(1),

    supabase.from("outfits")
      .select("id, photo_url, flatlay_url, occasion, logged_at")
      .eq("user_id", user!.id)
      .order("logged_at", { ascending: false })
      .limit(5),
  ])

  const weekOutfits = (weekRaw ?? []) as Outfit[]
  const todayOutfit = weekOutfits.find(o => isToday(o.logged_at)) ?? null
  const allRecent = (recentRaw ?? []) as Outfit[]

  // Primary card background: today if logged, else most recent
  const primaryOutfit = todayOutfit ?? allRecent[0] ?? null

  // Recent entries: last 3 excluding today
  const recentEntries = allRecent
    .filter(o => !todayOutfit || o.id !== todayOutfit.id)
    .slice(0, 3)

  // Memories — deduplicated by outfit id
  const seenIds = new Set<string>()
  const memories: MemoryItem[] = [
    sundayRaw?.[0] ? { label: "Last Sunday", outfit: sundayRaw[0] as Outfit } : null,
    yearAgoRaw?.[0] ? { label: "One year ago today", outfit: yearAgoRaw[0] as Outfit } : null,
    churchRaw?.[0] ? { label: "Recent Church", outfit: churchRaw[0] as Outfit } : null,
    favoriteRaw?.[0] ? { label: "Saved outfit", outfit: favoriteRaw[0] as Outfit } : null,
  ].filter((item): item is MemoryItem => {
    if (!item) return false
    if (seenIds.has(item.outfit.id)) return false
    seenIds.add(item.outfit.id)
    return true
  })

  return (
    <HomeScreen
      todayOutfit={todayOutfit}
      weekOutfits={weekOutfits}
      primaryOutfit={primaryOutfit}
      memories={memories}
      recentEntries={recentEntries}
    />
  )
}

import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import Image from "next/image"
import { formatShortDate, relativeDay } from "@/lib/utils"
import type { Outfit } from "@/lib/types"

interface MemoryItem {
  label: string
  outfit: Outfit
}

interface Props {
  userId: string
  recentOccasionEntry: Outfit | null
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

function startOfMonthISO(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

export async function MemoryLayer({ userId, recentOccasionEntry }: Props) {
  const supabase = await createClient()

  const sunday = lastSundayRange()
  const yearAgo = oneYearAgoRange()
  const monthStart = startOfMonthISO()

  const [
    { data: sundayRaw },
    { data: yearAgoRaw },
    { data: favoriteRaw },
    { data: recentOccasionRaw },
    { data: monthRaw },
  ] = await Promise.all([
    supabase.from("outfits")
      .select("id, photo_url, flatlay_url, occasion, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", sunday.start)
      .lte("logged_at", sunday.end)
      .order("logged_at", { ascending: false })
      .limit(1),

    supabase.from("outfits")
      .select("id, photo_url, flatlay_url, occasion, logged_at")
      .eq("user_id", userId)
      .gte("logged_at", yearAgo.start)
      .lte("logged_at", yearAgo.end)
      .order("logged_at", { ascending: false })
      .limit(1),

    supabase.from("outfits")
      .select("id, photo_url, flatlay_url, occasion, logged_at")
      .eq("user_id", userId)
      .eq("is_favorite", true)
      .order("logged_at", { ascending: false })
      .limit(1),

    recentOccasionEntry?.occasion
      ? supabase.from("outfits")
          .select("id, photo_url, flatlay_url, occasion, logged_at")
          .eq("user_id", userId)
          .eq("occasion", recentOccasionEntry.occasion)
          .neq("id", recentOccasionEntry.id)
          .order("logged_at", { ascending: false })
          .limit(1)
      : Promise.resolve({ data: [] as Outfit[] }),

    supabase.from("outfits")
      .select("occasion")
      .eq("user_id", userId)
      .gte("logged_at", monthStart)
      .not("occasion", "is", null),
  ])

  // ── Memory cards ──
  const seenIds = new Set<string>()
  const memories: MemoryItem[] = [
    sundayRaw?.[0] ? { label: "Last Sunday", outfit: sundayRaw[0] as Outfit } : null,
    yearAgoRaw?.[0] ? { label: "One year ago today", outfit: yearAgoRaw[0] as Outfit } : null,
    recentOccasionRaw?.[0]
      ? { label: `Recent ${recentOccasionEntry!.occasion}`, outfit: recentOccasionRaw[0] as Outfit }
      : null,
    favoriteRaw?.[0] ? { label: "Favorite outfit", outfit: favoriteRaw[0] as Outfit } : null,
  ].filter((item): item is MemoryItem => {
    if (!item) return false
    if (seenIds.has(item.outfit.id)) return false
    seenIds.add(item.outfit.id)
    return true
  })

  // ── This month in style ──
  const monthOutfits = (monthRaw ?? []) as { occasion: string | null }[]
  const counts = new Map<string, number>()
  for (const o of monthOutfits) {
    if (o.occasion) counts.set(o.occasion, (counts.get(o.occasion) ?? 0) + 1)
  }
  let topOccasion: string | null = null
  let topCount = 0
  for (const [occ, c] of counts) {
    if (c > topCount) {
      topOccasion = occ
      topCount = c
    }
  }
  const monthReflection = topOccasion && topCount >= 2 ? `This month has leaned ${topOccasion}.` : null

  const hasReflection = !!recentOccasionEntry?.occasion || !!monthReflection

  if (memories.length === 0 && !hasReflection) return null

  return (
    <>
      {memories.length > 0 && (
        <div className="mt-8">
          <p className="px-6 text-[10px] tracking-[0.3em] uppercase text-[oklch(0.52_0.015_255)] mb-3">
            Memories
          </p>
          <div className="flex gap-3 overflow-x-auto px-6 pb-1 snap-x snap-mandatory scrollbar-none">
            {memories.map(({ label, outfit }) => {
              const img = outfit.flatlay_url ?? outfit.photo_url
              return (
                <Link
                  key={`${label}-${outfit.id}`}
                  href={`/journal/${outfit.id}`}
                  className="relative shrink-0 w-[60%] max-w-[240px] aspect-[4/5] rounded-2xl overflow-hidden snap-start bg-[oklch(0.89_0.005_90)]"
                >
                  {img && (
                    <Image
                      src={img}
                      alt={label}
                      fill
                      className="object-cover"
                      sizes="240px"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-[9px] tracking-[0.25em] uppercase text-white/55">
                      {label}
                    </p>
                    {outfit.occasion && (
                      <p className="font-serif italic text-xl text-white mt-1 leading-tight">
                        {outfit.occasion}
                      </p>
                    )}
                    <p className="text-[11px] text-white/50 mt-1">
                      {formatShortDate(outfit.logged_at)}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {hasReflection && (
        <div className="px-6 mt-8 space-y-4">
          {recentOccasionEntry?.occasion && (
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.52_0.015_255)]">
                Most recent occasion
              </p>
              <p className="font-serif italic text-lg text-[oklch(0.18_0.04_255)] mt-0.5">
                {recentOccasionEntry.occasion} — {relativeDay(recentOccasionEntry.logged_at)}
              </p>
            </div>
          )}
          {monthReflection && (
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.52_0.015_255)]">
                This month in style
              </p>
              <p className="font-serif italic text-lg text-[oklch(0.18_0.04_255)] mt-0.5">
                {monthReflection}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  )
}

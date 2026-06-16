import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import type { DetectedItem } from "@/lib/types"

interface Props {
  outfitId: string
  items: DetectedItem[]
  occasion: string | null
  userId: string
}

type HistoryOutfit = {
  id: string
  logged_at: string
  occasion: string | null
  items: DetectedItem[] | null
}

function normalize(name: string) {
  return name.toLowerCase().trim()
}

function relativeTime(dateString: string): string {
  const days = Math.floor((Date.now() - new Date(dateString).getTime()) / 86_400_000)
  if (days === 0) return "today"
  if (days === 1) return "yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 14) return "last week"
  if (days < 21) return "2 weeks ago"
  if (days < 28) return "3 weeks ago"
  const months = Math.floor(days / 30)
  if (months === 1) return "last month"
  if (months < 12) return `${months} months ago`
  return "over a year ago"
}

export async function IntelligenceLayer({ outfitId, items, occasion, userId }: Props) {
  const supabase = await createClient()

  const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000).toISOString()

  const [{ data: allRaw }, { data: occasionRaw }] = await Promise.all([
    supabase
      .from("outfits")
      .select("id, logged_at, occasion, items")
      .eq("user_id", userId)
      .neq("id", outfitId)
      .order("logged_at", { ascending: false })
      .limit(100),
    occasion
      ? supabase
          .from("outfits")
          .select("id, items")
          .eq("user_id", userId)
          .eq("occasion", occasion)
          .neq("id", outfitId)
          .order("logged_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as HistoryOutfit[] }),
  ])

  const allOutfits = (allRaw ?? []) as HistoryOutfit[]
  const occasionOutfits = (occasionRaw ?? []) as HistoryOutfit[]

  // ── Garment memory ──
  // For each item, count total appearances (incl. this outfit) + last worn in another outfit
  type GarmentInfo = { totalCount: number; lastWornAt: string | null }
  const garmentMap = new Map<string, GarmentInfo>()

  for (const item of items) {
    const key = normalize(item.name)
    let otherCount = 0
    let lastWornAt: string | null = null

    for (const o of allOutfits) {
      if (!o.items) continue
      if (o.items.some(i => normalize(i.name) === key)) {
        otherCount++
        if (!lastWornAt || o.logged_at > lastWornAt) lastWornAt = o.logged_at
      }
    }

    if (otherCount >= 2) {
      garmentMap.set(item.name, { totalCount: otherCount + 1, lastWornAt })
    }
  }

  // ── Repetition awareness ──
  // Items worn 3+ times across recent outfits (incl. this one) in the past 2 weeks
  const recentCounts = new Map<string, number>()
  for (const item of items) {
    const key = normalize(item.name)
    recentCounts.set(key, (recentCounts.get(key) ?? 0) + 1)
  }
  for (const o of allOutfits) {
    if (!o.items || o.logged_at < twoWeeksAgo) continue
    const seenInThis = new Set<string>()
    for (const item of o.items) {
      const key = normalize(item.name)
      if (!seenInThis.has(key)) {
        seenInThis.add(key)
        recentCounts.set(key, (recentCounts.get(key) ?? 0) + 1)
      }
    }
  }

  const repeatedItems = items
    .map(item => ({ name: item.name, count: recentCounts.get(normalize(item.name)) ?? 0 }))
    .filter(({ count }) => count >= 3)

  // ── Occasion intelligence ──
  // Items appearing in 60%+ of the last 5 occasion outfits, that also appear in this outfit
  const currentKeys = new Set(items.map(i => normalize(i.name)))
  const occasionSignals: string[] = []

  if (occasionOutfits.length >= 3) {
    const last5 = occasionOutfits.slice(0, 5)
    const occCounts = new Map<string, number>()

    for (const o of last5) {
      if (!o.items) continue
      const seenInThis = new Set<string>()
      for (const item of o.items) {
        const key = normalize(item.name)
        if (!seenInThis.has(key)) {
          seenInThis.add(key)
          occCounts.set(key, (occCounts.get(key) ?? 0) + 1)
        }
      }
    }

    const threshold = Math.max(3, Math.round(last5.length * 0.6))
    for (const [key, count] of occCounts) {
      if (count >= threshold && currentKeys.has(key)) {
        const displayName =
          items.find(i => normalize(i.name) === key)?.name ??
          last5.flatMap(o => o.items ?? []).find(i => normalize(i.name) === key)?.name ??
          key
        occasionSignals.push(displayName)
      }
    }
  }

  const hasGarment = garmentMap.size > 0
  const hasRepetition = repeatedItems.length > 0
  const hasOccasionSignal = occasionSignals.length > 0

  if (!occasion && !hasGarment && !hasRepetition && !hasOccasionSignal) return null

  return (
    <div className="px-5 space-y-6 pt-4 pb-2">

      {/* Recall suggestions */}
      {occasion && (
        <Link
          href={`/journal?occasion=${encodeURIComponent(occasion)}`}
          className="inline-block text-xs text-[oklch(0.42_0.015_255)] hover:text-[oklch(0.22_0.04_255)] transition-colors tracking-wide"
        >
          See all {occasion} outfits →
        </Link>
      )}

      {/* Repetition awareness */}
      {hasRepetition && (
        <div className="space-y-1.5">
          {repeatedItems.map(({ name, count }) => (
            <p key={name} className="text-[11px] text-[oklch(0.55_0.008_255)] leading-relaxed">
              You&apos;ve worn{" "}
              <span className="text-[oklch(0.38_0.008_255)]">{name}</span>{" "}
              {count} times in the past two weeks.
            </p>
          ))}
        </div>
      )}

      {/* Occasion intelligence */}
      {hasOccasionSignal && (
        <div className="space-y-1.5">
          {occasionSignals.map(name => (
            <p key={name} className="text-[11px] text-[oklch(0.55_0.008_255)] leading-relaxed">
              <span className="text-[oklch(0.38_0.008_255)]">{name}</span> often
              appears in your {occasion} outfits.
            </p>
          ))}
        </div>
      )}

      {/* Garment history */}
      {hasGarment && (
        <div>
          <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.62_0.008_255)] mb-3">
            Garment history
          </p>
          <div className="divide-y divide-[oklch(0.87_0.012_70)]">
            {items.map((item, i) => {
              const info = garmentMap.get(item.name)
              if (!info) return null
              return (
                <div key={i} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <span className="text-[10px] tracking-widest uppercase text-[oklch(0.55_0.008_255)]">
                      {item.category}
                    </span>
                    <p className="text-sm text-[oklch(0.22_0.04_255)] mt-0.5">{item.name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] text-[oklch(0.52_0.008_255)]">
                      {info.totalCount} {info.totalCount === 1 ? "entry" : "entries"}
                    </p>
                    {info.lastWornAt && (
                      <p className="text-[10px] text-[oklch(0.62_0.008_255)] mt-0.5">
                        Also worn {relativeTime(info.lastWornAt)}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

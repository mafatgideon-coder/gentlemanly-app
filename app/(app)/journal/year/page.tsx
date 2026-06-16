import { createClient } from "@/lib/supabase/server"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Outfit } from "@/lib/types"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export default async function YearReviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const year = new Date().getFullYear()
  const yearStart = new Date(year, 0, 1).toISOString()
  const yearEnd = new Date(year, 11, 31, 23, 59, 59).toISOString()

  const { data } = await supabase
    .from("outfits")
    .select("id, photo_url, flatlay_url, occasion, logged_at")
    .eq("user_id", user!.id)
    .gte("logged_at", yearStart)
    .lte("logged_at", yearEnd)
    .order("logged_at", { ascending: true })

  const outfits = (data ?? []) as Outfit[]

  // Stats
  const total = outfits.length

  const occasionCounts: Record<string, number> = {}
  const monthCounts: number[] = Array(12).fill(0)

  for (const o of outfits) {
    if (o.occasion) {
      occasionCounts[o.occasion] = (occasionCounts[o.occasion] ?? 0) + 1
    }
    monthCounts[new Date(o.logged_at).getMonth()]++
  }

  const topOccasion = Object.entries(occasionCounts).sort((a, b) => b[1] - a[1])[0]
  const topMonthIndex = monthCounts.indexOf(Math.max(...monthCounts))
  const topMonth = monthCounts[topMonthIndex] > 0 ? MONTH_NAMES[topMonthIndex] : null

  return (
    <div className="min-h-screen bg-[oklch(0.965_0.003_247)]">
      {/* Back nav */}
      <div className="px-5 pt-12 pb-2">
        <Link
          href="/journal"
          className="inline-flex items-center gap-2 text-[oklch(0.6_0.006_255)] hover:text-[oklch(0.28_0.008_255)] transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Journal
        </Link>
      </div>

      <div className="px-5 pt-4 pb-8">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[oklch(0.52_0.012_255)]">
          Reflection
        </p>
        <h1 className="text-3xl font-light tracking-tight mt-1 text-[oklch(0.18_0.008_255)]">
          {year}
        </h1>
      </div>

      {total === 0 ? (
        <div className="px-5 py-20 text-center">
          <p className="text-[oklch(0.6_0.006_255)] text-sm">No outfits logged this year yet.</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="px-5 pb-8 grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl px-4 py-5 shadow-sm">
              <p className="text-2xl font-light text-[oklch(0.18_0.008_255)]">{total}</p>
              <p className="text-[10px] tracking-[0.15em] uppercase text-[oklch(0.55_0.008_255)] mt-1">
                Outfits
              </p>
            </div>

            {topOccasion && (
              <div className="bg-white rounded-xl px-4 py-5 shadow-sm col-span-1">
                <p className="text-sm font-medium text-[oklch(0.18_0.008_255)] leading-snug">
                  {topOccasion[0]}
                </p>
                <p className="text-[10px] tracking-[0.15em] uppercase text-[oklch(0.55_0.008_255)] mt-1">
                  Top occasion
                </p>
              </div>
            )}

            {topMonth && (
              <div className="bg-white rounded-xl px-4 py-5 shadow-sm col-span-1">
                <p className="text-sm font-medium text-[oklch(0.18_0.008_255)] leading-snug">
                  {topMonth}
                </p>
                <p className="text-[10px] tracking-[0.15em] uppercase text-[oklch(0.55_0.008_255)] mt-1">
                  Most active
                </p>
              </div>
            )}
          </div>

          {/* Month bars */}
          <div className="px-5 pb-8">
            <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.55_0.008_255)] mb-4">
              By month
            </p>
            <div className="space-y-2">
              {monthCounts.map((count, i) => {
                if (i > new Date().getMonth() && year === new Date().getFullYear()) return null
                const max = Math.max(...monthCounts)
                const pct = max > 0 ? (count / max) * 100 : 0
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] text-[oklch(0.55_0.008_255)] w-7 shrink-0">
                      {MONTH_NAMES[i].slice(0, 3)}
                    </span>
                    <div className="flex-1 h-1.5 bg-[oklch(0.91_0.004_247)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[oklch(0.45_0.008_255)] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-[oklch(0.55_0.008_255)] w-4 text-right shrink-0">
                      {count || ""}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Outfit grid */}
          <div className="px-5 pb-28">
            <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.55_0.008_255)] mb-4">
              The archive
            </p>
            <div className="grid grid-cols-3 gap-1">
              {outfits.map((outfit) => {
                const image = outfit.flatlay_url ?? outfit.photo_url
                return (
                  <Link key={outfit.id} href={`/journal/${outfit.id}`}>
                    <div className="relative aspect-square bg-[oklch(0.93_0.003_247)] rounded-sm overflow-hidden">
                      {image && (
                        <Image
                          src={image}
                          alt={outfit.occasion ?? "Outfit"}
                          fill
                          className="object-cover"
                          sizes="33vw"
                        />
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

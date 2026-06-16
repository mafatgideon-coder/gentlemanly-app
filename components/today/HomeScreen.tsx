"use client"

import Link from "next/link"
import Image from "next/image"
import { Camera } from "lucide-react"
import { useLogger } from "@/lib/logger-context"
import { WeekStrip } from "./WeekStrip"
import { formatTime } from "@/lib/utils"
import type { Outfit } from "@/lib/types"
import type { MemoryItem } from "@/app/(app)/today/page"

interface HomeScreenProps {
  todayOutfit: Outfit | null
  weekOutfits: Outfit[]
  primaryOutfit: Outfit | null
  memories: MemoryItem[]
  recentEntries: Outfit[]
}

function relativeDay(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const diffDays = Math.floor(
    (today.setHours(0,0,0,0) - new Date(dateString).setHours(0,0,0,0)) / 86_400_000
  )
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return date.toLocaleDateString("en-US", { weekday: "long" })
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
}

export function HomeScreen({
  todayOutfit,
  weekOutfits,
  primaryOutfit,
  memories,
  recentEntries,
}: HomeScreenProps) {
  const { openLogger } = useLogger()
  const now = new Date()

  const dayName = now.toLocaleDateString("en-US", { weekday: "long" })
  const dateLabel = now.toLocaleDateString("en-US", { month: "long", day: "numeric" })
  const primaryImage = primaryOutfit
    ? (primaryOutfit.flatlay_url ?? primaryOutfit.photo_url)
    : null

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[oklch(0.10_0.01_255)] text-[oklch(0.93_0.003_247)]">

      {/* ── Date header ── */}
      <div className="px-6 pt-14 pb-4">
        <p className="text-[10px] tracking-[0.35em] uppercase text-[oklch(0.38_0.008_255)]">
          {dayName}
        </p>
        <h1 className="text-[2.75rem] font-light tracking-tight leading-none mt-1">
          {dateLabel}
        </h1>
      </div>

      {/* ── Week strip ── */}
      <WeekStrip weekOutfits={weekOutfits} />

      {/* ── Primary card ── */}
      <div className="px-4 mt-1 mb-7">
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[oklch(0.15_0.01_255)]">

          {/* Background image */}
          {primaryImage && (
            <Image
              src={primaryImage}
              alt="Outfit"
              fill
              className="object-cover"
              priority
            />
          )}

          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

          {todayOutfit ? (
            /* ── Logged state ── */
            <Link
              href={`/journal/${todayOutfit.id}`}
              className="absolute inset-0 flex flex-col justify-end p-5"
            >
              <div>
                {todayOutfit.occasion && (
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[oklch(0.62_0.008_255)] mb-1.5">
                    {todayOutfit.occasion}
                  </p>
                )}
                <p className="text-xl font-light text-[oklch(0.95_0.003_247)]">
                  Today&apos;s outfit
                </p>
                <p className="text-xs text-[oklch(0.52_0.008_255)] mt-1">
                  Logged at {formatTime(todayOutfit.logged_at)}
                </p>
              </div>
            </Link>
          ) : (
            /* ── Not logged state ── */
            <>
              {/* Camera button — top right */}
              <button
                onClick={openLogger}
                className="absolute top-4 right-4 w-11 h-11 rounded-full bg-[oklch(0.93_0.003_247)] flex items-center justify-center shadow-xl"
                aria-label="Log today's outfit"
              >
                <Camera size={18} className="text-[oklch(0.10_0.01_255)]" />
              </button>

              {/* Bottom CTA */}
              <button
                onClick={openLogger}
                className="absolute bottom-0 left-0 right-0 p-5 text-left"
              >
                <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.48_0.008_255)] mb-1.5">
                  {primaryOutfit
                    ? `Last logged ${relativeDay(primaryOutfit.logged_at)}`
                    : "No entries yet"}
                </p>
                <p className="text-xl font-light text-[oklch(0.95_0.003_247)]">
                  Log today&apos;s outfit
                </p>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Memories ── */}
      {memories.length > 0 && (
        <div className="px-4 mb-7">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[oklch(0.38_0.008_255)] mb-3">
            Memories
          </p>
          <div className="grid grid-cols-2 gap-2">
            {memories.map(({ label, outfit }) => {
              const img = outfit.flatlay_url ?? outfit.photo_url
              return (
                <Link key={`${label}-${outfit.id}`} href={`/journal/${outfit.id}`}>
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-[oklch(0.15_0.01_255)]">
                    {img && (
                      <Image
                        src={img}
                        alt={label}
                        fill
                        className="object-cover"
                        sizes="(max-width: 480px) 45vw, 200px"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-[10px] tracking-[0.15em] uppercase text-[oklch(0.58_0.008_255)] leading-none">
                        {label}
                      </p>
                      {outfit.occasion && (
                        <p className="text-[13px] font-light text-[oklch(0.90_0.003_247)] mt-1 leading-none">
                          {outfit.occasion}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Recent entries ── */}
      {recentEntries.length > 0 && (
        <div className="mb-28">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[oklch(0.38_0.008_255)] mb-3 px-4">
            Recent
          </p>
          <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 scrollbar-none">
            {recentEntries.map(outfit => {
              const img = outfit.flatlay_url ?? outfit.photo_url
              return (
                <Link
                  key={outfit.id}
                  href={`/journal/${outfit.id}`}
                  className="shrink-0"
                >
                  <div className="relative w-[148px] aspect-[3/4] rounded-xl overflow-hidden bg-[oklch(0.15_0.01_255)]">
                    {img && (
                      <Image
                        src={img}
                        alt={outfit.occasion ?? "Outfit"}
                        fill
                        className="object-cover"
                        sizes="148px"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-[10px] tracking-wide text-[oklch(0.55_0.008_255)] leading-none">
                        {relativeDay(outfit.logged_at)}
                      </p>
                      {outfit.occasion && (
                        <p className="text-[13px] font-light text-[oklch(0.90_0.003_247)] mt-1 leading-none">
                          {outfit.occasion}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

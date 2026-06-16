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
    <div className="h-[calc(100vh-5rem)] overflow-hidden bg-[oklch(0.94_0.006_90)] flex flex-col">

      {/* ── Date header ── */}
      <div className="px-5 pt-10 pb-2 shrink-0">
        <p className="text-[9px] tracking-[0.35em] uppercase text-[oklch(0.52_0.015_255)]">
          {dayName}
        </p>
        <h1 className="text-[2rem] font-light tracking-tight leading-none mt-0.5 text-[oklch(0.15_0.04_255)]">
          {dateLabel}
        </h1>
      </div>

      {/* ── Primary card ── */}
      <div className="px-4 pt-3 shrink-0">
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[oklch(0.22_0.07_255)]">

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

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

          {todayOutfit ? (
            /* ── Logged state ── */
            <Link
              href={`/journal/${todayOutfit.id}`}
              className="absolute inset-0 flex flex-col justify-end p-4"
            >
              <div>
                {todayOutfit.occasion && (
                  <p className="text-[9px] tracking-[0.3em] uppercase text-white/60 mb-1">
                    {todayOutfit.occasion}
                  </p>
                )}
                <p className="text-lg font-light text-white">
                  Today&apos;s outfit
                </p>
                <p className="text-[11px] text-white/50 mt-0.5">
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
                className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg"
                aria-label="Log today's outfit"
              >
                <Camera size={16} className="text-[oklch(0.22_0.07_255)]" />
              </button>

              {/* Bottom CTA */}
              <button
                onClick={openLogger}
                className="absolute bottom-0 left-0 right-0 p-4 text-left"
              >
                <p className="text-[9px] tracking-[0.25em] uppercase text-white/45 mb-1">
                  {primaryOutfit
                    ? `Last logged ${relativeDay(primaryOutfit.logged_at)}`
                    : "No entries yet"}
                </p>
                <p className="text-lg font-light text-white">
                  Log today&apos;s outfit
                </p>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Week strip (white card) ── */}
      <div className="mx-4 mt-3 bg-white rounded-2xl shrink-0">
        <WeekStrip weekOutfits={weekOutfits} />
      </div>

      {/* ── Bottom row: memories + recent ── */}
      <div className="flex gap-3 px-4 pb-3 mt-3 min-h-0 flex-1">

        {/* Memories */}
        {memories.length > 0 && (
          <div className="flex flex-col gap-2 w-[calc(50%-6px)] shrink-0 bg-white rounded-2xl p-3">
            <p className="text-[9px] tracking-[0.3em] uppercase text-[oklch(0.52_0.015_255)] shrink-0">
              Memories
            </p>
            <div className="flex flex-col gap-2 flex-1 min-h-0">
              {memories.slice(0, 2).map(({ label, outfit }) => {
                const img = outfit.flatlay_url ?? outfit.photo_url
                return (
                  <Link key={`${label}-${outfit.id}`} href={`/journal/${outfit.id}`} className="flex-1 min-h-0">
                    <div className="relative h-full rounded-xl overflow-hidden bg-[oklch(0.91_0.004_90)]">
                      {img && (
                        <Image
                          src={img}
                          alt={label}
                          fill
                          className="object-cover"
                          sizes="(max-width: 480px) 42vw, 180px"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-[9px] tracking-[0.15em] uppercase text-white/60 leading-none">
                          {label}
                        </p>
                        {outfit.occasion && (
                          <p className="text-[12px] font-light text-white mt-0.5 leading-none">
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

        {/* Recent entries */}
        {recentEntries.length > 0 && (
          <div className="flex flex-col gap-2 flex-1 min-w-0 bg-white rounded-2xl p-3">
            <p className="text-[9px] tracking-[0.3em] uppercase text-[oklch(0.52_0.015_255)] shrink-0">
              Recent
            </p>
            <div className="flex flex-col gap-2 flex-1 min-h-0">
              {recentEntries.slice(0, 2).map(outfit => {
                const img = outfit.flatlay_url ?? outfit.photo_url
                return (
                  <Link key={outfit.id} href={`/journal/${outfit.id}`} className="flex-1 min-h-0">
                    <div className="relative h-full rounded-xl overflow-hidden bg-[oklch(0.91_0.004_90)]">
                      {img && (
                        <Image
                          src={img}
                          alt={outfit.occasion ?? "Outfit"}
                          fill
                          className="object-cover"
                          sizes="(max-width: 480px) 42vw, 180px"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-[9px] tracking-wide text-white/60 leading-none">
                          {relativeDay(outfit.logged_at)}
                        </p>
                        {outfit.occasion && (
                          <p className="text-[12px] font-light text-white mt-0.5 leading-none">
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
    </div>
  )
}

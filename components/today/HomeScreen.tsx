"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { Camera } from "lucide-react"
import { useLogger } from "@/lib/logger-context"
import { WeekStrip } from "./WeekStrip"
import { formatTime, relativeDay, entryDateLabel } from "@/lib/utils"
import type { Outfit } from "@/lib/types"

interface HomeScreenProps {
  todayOutfit: Outfit | null
  weekOutfits: Outfit[]
  contextOutfit: Outfit | null
  recentEntries: Outfit[]
  children: ReactNode
}

export function HomeScreen({
  todayOutfit,
  weekOutfits,
  contextOutfit,
  recentEntries,
  children,
}: HomeScreenProps) {
  const { openLogger } = useLogger()
  const now = new Date()

  const dayName = now.toLocaleDateString("en-US", { weekday: "long" })
  const dateLabel = now.toLocaleDateString("en-US", { month: "long", day: "numeric" })

  const todayImage = todayOutfit ? (todayOutfit.flatlay_url ?? todayOutfit.photo_url) : null
  const contextImage = contextOutfit ? (contextOutfit.flatlay_url ?? contextOutfit.photo_url) : null

  return (
    <div className="min-h-screen bg-[oklch(0.94_0.006_90)] pb-28">

      {/* ── Header ── */}
      <div className="px-6 pt-14 pb-2">
        <p className="text-[11px] tracking-[0.4em] uppercase text-[oklch(0.52_0.015_255)]">
          {dayName}
        </p>
        <h1 className="font-serif text-[2.75rem] leading-[0.95] tracking-tight text-[oklch(0.15_0.04_255)] mt-1">
          {dateLabel}
        </h1>
      </div>

      {/* ── Week strip — the heartbeat ── */}
      <div className="mx-4 mt-5 bg-white rounded-2xl">
        <WeekStrip weekOutfits={weekOutfits} />
      </div>

      {/* ── Today's entry — quiet, does not dominate ── */}
      <div className="px-5 mt-6">
        {todayOutfit ? (
          <Link href={`/journal/${todayOutfit.id}`} className="block">
            <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-[oklch(0.89_0.005_90)]">
              {todayImage && (
                <Image src={todayImage} alt="Today's outfit" fill className="object-cover" priority />
              )}
            </div>
            <div className="flex items-baseline justify-between mt-2 px-0.5">
              <p className="font-serif italic text-base text-[oklch(0.18_0.04_255)]">
                {todayOutfit.occasion ?? "Today's outfit"}
              </p>
              <p className="text-[11px] text-[oklch(0.55_0.010_255)]">
                {formatTime(todayOutfit.logged_at)}
              </p>
            </div>
          </Link>
        ) : (
          <div>
            <button
              onClick={openLogger}
              className="relative w-full h-44 rounded-2xl overflow-hidden block text-left"
              aria-label="Log today's outfit"
            >
              {contextImage ? (
                <>
                  <Image src={contextImage} alt="" fill className="object-cover opacity-45" />
                  <div className="absolute inset-0 bg-black/25" />
                </>
              ) : (
                <div className="absolute inset-0 bg-white" />
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-md">
                  <Camera size={19} className="text-[oklch(0.22_0.07_255)]" />
                </div>
                <p className={`text-sm font-medium ${contextImage ? "text-white" : "text-[oklch(0.22_0.07_255)]"}`}>
                  Log today&apos;s outfit
                </p>
              </div>
            </button>
            <p className="text-[11px] text-[oklch(0.55_0.010_255)] mt-2 px-0.5">
              {contextOutfit
                ? `Last logged ${relativeDay(contextOutfit.logged_at)}${contextOutfit.occasion ? ` · ${contextOutfit.occasion}` : ""}`
                : "No entries yet"}
            </p>
          </div>
        )}
      </div>

      {/* ── Memory + reflection (streamed in) ── */}
      {children}

      {/* ── Recent entries — de-emphasized, lower ── */}
      {recentEntries.length > 0 && (
        <div className="px-5 mt-9">
          <div className="flex items-baseline justify-between mb-3">
            <p className="text-[10px] tracking-[0.3em] uppercase text-[oklch(0.52_0.015_255)]">
              Recent
            </p>
            <Link
              href="/journal"
              className="text-[11px] text-[oklch(0.55_0.010_255)] hover:text-[oklch(0.22_0.07_255)] transition-colors"
            >
              View journal →
            </Link>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[oklch(0.93_0.003_90)]">
            {recentEntries.map(outfit => {
              const img = outfit.flatlay_url ?? outfit.photo_url
              return (
                <Link
                  key={outfit.id}
                  href={`/journal/${outfit.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[oklch(0.97_0.002_90)] transition-colors"
                >
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-[oklch(0.91_0.004_90)]">
                    {img && (
                      <Image src={img} alt={outfit.occasion ?? "Outfit"} fill className="object-cover" sizes="48px" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[oklch(0.18_0.04_255)]">{entryDateLabel(outfit.logged_at)}</p>
                    {outfit.occasion && (
                      <p className="text-[12px] text-[oklch(0.55_0.010_255)] mt-0.5">{outfit.occasion}</p>
                    )}
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

import Image from "next/image"
import { formatTime } from "@/lib/utils"
import { WeekStrip } from "./WeekStrip"
import type { Outfit } from "@/lib/types"

interface TodayLoggedProps {
  outfit: Outfit
  weekOutfits: Outfit[]
}

export function TodayLogged({ outfit, weekOutfits }: TodayLoggedProps) {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[oklch(0.12_0.01_255)] text-[oklch(0.92_0.003_247)]">
      {/* Date header */}
      <div className="px-6 pt-14 pb-6">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[oklch(0.4_0.008_255)]">
          {new Date().toLocaleDateString("en-US", { weekday: "long" })}
        </p>
        <h1 className="text-4xl font-light tracking-tight mt-1">
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          })}
        </h1>
      </div>

      {/* Week strip */}
      <WeekStrip weekOutfits={weekOutfits} />

      {/* Today's flat-lay */}
      <div className="mx-4 rounded-sm overflow-hidden relative">
        <div className="relative aspect-square w-full bg-[oklch(0.18_0.01_255)]">
          {outfit.flatlay_url ? (
            <Image
              src={outfit.flatlay_url}
              alt="Today's outfit"
              fill
              className="object-cover"
            />
          ) : (
            <Image
              src={outfit.photo_url}
              alt="Today's outfit"
              fill
              className="object-cover"
            />
          )}
        </div>
      </div>

      {/* Outfit meta */}
      <div className="px-6 pt-6 space-y-1">
        {outfit.occasion && (
          <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.52_0.012_255)]">
            {outfit.occasion}
          </p>
        )}
        <div className="flex items-center gap-4 text-sm text-[oklch(0.72_0.006_255)]">
          <span>{outfit.item_count} items</span>
          <span className="text-[oklch(0.35_0.008_255)]">·</span>
          <span>Logged at {formatTime(outfit.logged_at)}</span>
        </div>
      </div>
    </div>
  )
}

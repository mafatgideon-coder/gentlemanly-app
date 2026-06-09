import Image from "next/image"
import { formatDate } from "@/lib/utils"
import type { Outfit } from "@/lib/types"

interface TodayEmptyProps {
  recentOutfit: Outfit | null
}

export function TodayEmpty({ recentOutfit }: TodayEmptyProps) {
  const today = new Date().toISOString()

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[oklch(0.12_0.01_255)] text-[oklch(0.92_0.003_247)]">
      {/* Date header */}
      <div className="px-6 pt-14 pb-8">
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

      {/* Hero card */}
      {recentOutfit ? (
        <div className="mx-4 rounded-sm overflow-hidden relative">
          <div className="relative aspect-square w-full">
            {recentOutfit.flatlay_url ? (
              <Image
                src={recentOutfit.flatlay_url}
                alt="Previous outfit"
                fill
                className="object-cover brightness-40"
              />
            ) : (
              <div className="w-full h-full bg-[oklch(0.18_0.01_255)]" />
            )}
          </div>
          {/* Overlay */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black/70 via-transparent">
            <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.52_0.012_255)] mb-1">
              {recentOutfit.occasion
                ? `Last ${recentOutfit.occasion} Outfit`
                : "Most Recent Outfit"}
            </p>
            <p className="text-lg font-light text-[oklch(0.92_0.003_247)]">
              {new Date(recentOutfit.logged_at).toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      ) : (
        <div className="mx-4 rounded-sm bg-[oklch(0.18_0.01_255)] aspect-square flex items-center justify-center">
          <p className="text-[oklch(0.4_0.008_255)] text-sm text-center px-8">
            Your wardrobe archive starts here.
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="px-6 pt-8">
        <p className="text-sm text-[oklch(0.52_0.012_255)] text-center">
          What are you wearing today?
        </p>
      </div>
    </div>
  )
}

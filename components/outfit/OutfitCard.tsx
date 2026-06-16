"use client"

import Link from "next/link"
import Image from "next/image"
import { Check, Heart } from "lucide-react"
import { formatShortDate } from "@/lib/utils"

function dayOfWeek(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", { weekday: "long" })
}
import type { Outfit } from "@/lib/types"

interface OutfitCardProps {
  outfit: Outfit
  editing?: boolean
  selected?: boolean
  onToggle?: () => void
}

export function OutfitCard({ outfit, editing, selected, onToggle }: OutfitCardProps) {
  const image = outfit.flatlay_url ?? outfit.photo_url

  const inner = (
    <>
      <div className="relative aspect-square w-full bg-[oklch(0.93_0.003_247)] rounded-sm overflow-hidden">
        {image ? (
          <Image
            src={image}
            alt={outfit.occasion ?? "Outfit"}
            fill
            className="object-cover transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[oklch(0.6_0.006_255)] text-xs">No image</span>
          </div>
        )}

        {/* Favorite indicator */}
        {!editing && outfit.is_favorite && (
          <div className="absolute top-2 right-2">
            <Heart size={12} className="fill-white text-white drop-shadow-sm" />
          </div>
        )}

        {editing && (
          <div className={`absolute inset-0 transition-colors ${selected ? "bg-black/40" : "bg-black/10"}`}>
            <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              selected ? "bg-white border-white" : "bg-black/30 border-white/70"
            }`}>
              {selected && <Check size={13} className="text-black" strokeWidth={2.5} />}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-0.5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-[oklch(0.72_0.006_255)] font-light">
            {dayOfWeek(outfit.logged_at)}
          </p>
          <p className="text-[10px] text-[oklch(0.45_0.008_255)]">{outfit.item_count} items</p>
        </div>
        <p className="text-xs text-[oklch(0.45_0.008_255)]">
          {outfit.occasion ? `${outfit.occasion} · ` : ""}{formatShortDate(outfit.logged_at)}
        </p>
      </div>
    </>
  )

  if (editing) {
    return (
      <button onClick={onToggle} className="block w-full text-left">
        {inner}
      </button>
    )
  }

  return (
    <Link href={`/journal/${outfit.id}`} className="block group">
      {inner}
    </Link>
  )
}

"use client"

import Link from "next/link"
import Image from "next/image"
import { Check } from "lucide-react"
import { entryDateLabel } from "@/lib/utils"
import type { Outfit } from "@/lib/types"

interface OutfitListItemProps {
  outfit: Outfit
  editing?: boolean
  selected?: boolean
  onToggle?: () => void
}

export function OutfitListItem({ outfit, editing, selected, onToggle }: OutfitListItemProps) {
  const image = outfit.flatlay_url ?? outfit.photo_url
  const topItem = outfit.items?.[0]?.name ?? null
  const subtitle = [
    outfit.item_count ? `${outfit.item_count} items` : null,
    topItem,
  ].filter(Boolean).join(" · ")

  const inner = (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Thumbnail */}
      <div className="relative w-[68px] h-[68px] rounded-xl overflow-hidden shrink-0 bg-[oklch(0.91_0.004_90)]">
        {image ? (
          <Image
            src={image}
            alt={outfit.occasion ?? "Outfit"}
            fill
            className="object-cover"
            sizes="68px"
          />
        ) : null}

        {editing && (
          <div className={`absolute inset-0 flex items-center justify-center transition-colors ${
            selected ? "bg-[oklch(0.22_0.07_255)]/80" : "bg-black/20"
          }`}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selected ? "bg-white border-white" : "border-white/70"
            }`}>
              {selected && <Check size={11} className="text-[oklch(0.22_0.07_255)]" strokeWidth={2.5} />}
            </div>
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[15px] font-medium text-[oklch(0.15_0.04_255)] leading-none">
            {entryDateLabel(outfit.logged_at)}
          </span>
          {outfit.occasion && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[oklch(0.91_0.004_90)] text-[oklch(0.42_0.015_255)] leading-none shrink-0">
              {outfit.occasion}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[12px] text-[oklch(0.55_0.010_255)] leading-none">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )

  if (editing) {
    return (
      <button onClick={onToggle} className="w-full text-left">
        {inner}
      </button>
    )
  }

  return (
    <Link href={`/journal/${outfit.id}`} className="block">
      {inner}
    </Link>
  )
}

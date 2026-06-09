import Link from "next/link"
import Image from "next/image"
import { formatShortDate } from "@/lib/utils"
import type { Outfit } from "@/lib/types"

export function OutfitCard({ outfit }: { outfit: Outfit }) {
  return (
    <Link href={`/journal/${outfit.id}`} className="block group">
      <div className="relative aspect-square w-full bg-[oklch(0.93_0.003_247)] rounded-sm overflow-hidden">
        {outfit.flatlay_url || outfit.photo_url ? (
          <Image
            src={outfit.flatlay_url ?? outfit.photo_url}
            alt={outfit.occasion ?? "Outfit"}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[oklch(0.6_0.006_255)] text-xs">No image</span>
          </div>
        )}
      </div>
      <div className="mt-3 space-y-0.5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-[oklch(0.28_0.008_255)] font-medium">
            {outfit.occasion ?? "Outfit"}
          </p>
          <p className="text-[10px] text-[oklch(0.6_0.006_255)]">
            {outfit.item_count} items
          </p>
        </div>
        <p className="text-xs text-[oklch(0.6_0.006_255)]">
          {formatShortDate(outfit.logged_at)}
        </p>
      </div>
    </Link>
  )
}

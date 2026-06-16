import Link from "next/link"
import Image from "next/image"
import type { Outfit } from "@/lib/types"

export function OnThisDay({ outfit }: { outfit: Outfit }) {
  const image = outfit.flatlay_url ?? outfit.photo_url
  const year = new Date(outfit.logged_at).getFullYear()

  return (
    <div className="mx-4 mt-5">
      <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.38_0.008_255)] mb-3">
        One year ago today
      </p>
      <Link href={`/journal/${outfit.id}`}>
        <div className="flex items-center gap-3 rounded-sm bg-[oklch(0.16_0.01_255)] p-3">
          <div className="relative w-14 h-14 rounded-sm overflow-hidden shrink-0 bg-[oklch(0.22_0.008_255)]">
            {image && (
              <Image
                src={image}
                alt={outfit.occasion ?? "Outfit"}
                fill
                className="object-cover"
                sizes="56px"
              />
            )}
          </div>
          <div className="min-w-0">
            {outfit.occasion && (
              <p className="text-[10px] tracking-[0.2em] uppercase text-[oklch(0.52_0.012_255)] mb-0.5">
                {outfit.occasion}
              </p>
            )}
            <p className="text-sm text-[oklch(0.72_0.006_255)] font-light">
              {new Date(outfit.logged_at).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: year !== new Date().getFullYear() - 1 ? "numeric" : undefined,
              })}
            </p>
            {outfit.notes && (
              <p className="text-xs text-[oklch(0.45_0.008_255)] mt-0.5 truncate">
                {outfit.notes}
              </p>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}

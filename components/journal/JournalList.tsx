import { groupOutfitsByTime } from "@/lib/utils"
import { OutfitCard } from "@/components/outfit/OutfitCard"
import type { Outfit } from "@/lib/types"

interface JournalListProps {
  outfits: Outfit[]
}

export function JournalList({ outfits }: JournalListProps) {
  if (outfits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-8 text-center">
        <p className="text-[oklch(0.6_0.006_255)] text-sm">
          Your style archive is empty.
        </p>
        <p className="text-[oklch(0.52_0.012_255)] text-xs mt-2">
          Log your first outfit to begin.
        </p>
      </div>
    )
  }

  const groups = groupOutfitsByTime(outfits)

  return (
    <div className="space-y-10 pb-4">
      {groups.map(({ label, outfits: groupOutfits }) => (
        <section key={label}>
          <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.52_0.012_255)] mb-4">
            {label}
          </p>
          <div className="grid grid-cols-2 gap-4">
            {groupOutfits.map((outfit) => (
              <OutfitCard key={outfit.id} outfit={outfit} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

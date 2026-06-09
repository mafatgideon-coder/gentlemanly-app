import { Badge } from "@/components/ui/badge"
import { formatShortDate } from "@/lib/utils"
import type { WardrobeItem } from "@/lib/types"

const CATEGORY_COLORS: Record<string, string> = {
  tops: "bg-[oklch(0.91_0.005_247)] text-[oklch(0.42_0.012_255)]",
  bottoms: "bg-[oklch(0.91_0.005_247)] text-[oklch(0.42_0.012_255)]",
  outerwear: "bg-[oklch(0.89_0.01_255)] text-[oklch(0.36_0.018_255)]",
  footwear: "bg-[oklch(0.91_0.005_247)] text-[oklch(0.42_0.012_255)]",
  accessories: "bg-[oklch(0.91_0.005_247)] text-[oklch(0.42_0.012_255)]",
}

export function WardrobeItemCard({ item }: { item: WardrobeItem }) {
  return (
    <div className="space-y-2">
      {/* Swatch placeholder */}
      <div className="aspect-square bg-[oklch(0.93_0.003_247)] rounded-sm flex items-end p-2">
        <Badge
          variant="secondary"
          className={`text-[9px] tracking-wider uppercase border-0 ${CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.tops}`}
        >
          {item.category}
        </Badge>
      </div>
      <div>
        <p className="text-sm text-[oklch(0.22_0.008_255)] leading-snug">{item.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] text-[oklch(0.6_0.006_255)]">
            {item.wear_count}× worn
          </p>
          {item.last_worn && (
            <>
              <span className="text-[oklch(0.75_0.004_255)]">·</span>
              <p className="text-[10px] text-[oklch(0.6_0.006_255)]">
                {formatShortDate(item.last_worn)}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

import { createClient } from "@/lib/supabase/server"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { notFound } from "next/navigation"
import type { WardrobeItem } from "@/lib/types"

const CATEGORY_LABELS: Record<string, string> = {
  tops: "Top",
  bottoms: "Bottom",
  outerwear: "Outerwear",
  footwear: "Footwear",
  accessories: "Accessory",
}

export default async function OutfitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: outfit } = await supabase
    .from("outfits")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single()

  if (!outfit) notFound()

  const { data: outfitItems } = await supabase
    .from("outfit_items")
    .select("wardrobe_items(*)")
    .eq("outfit_id", id)

  const items: WardrobeItem[] =
    outfitItems?.map((oi: { wardrobe_items: unknown }) => oi.wardrobe_items as WardrobeItem) ?? []

  return (
    <div className="min-h-screen bg-background">
      {/* Back nav */}
      <div className="px-5 pt-12 pb-4">
        <Link
          href="/journal"
          className="inline-flex items-center gap-2 text-[oklch(0.6_0.006_255)] hover:text-[oklch(0.28_0.008_255)] transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Journal
        </Link>
      </div>

      {/* Flat-lay */}
      <div className="relative aspect-square w-full bg-[oklch(0.93_0.003_247)]">
        {outfit.flatlay_url || outfit.photo_url ? (
          <Image
            src={outfit.flatlay_url ?? outfit.photo_url}
            alt={outfit.occasion ?? "Outfit"}
            fill
            className="object-cover"
            priority
          />
        ) : null}
      </div>

      {/* Detail */}
      <div className="px-5 pt-6 pb-10 space-y-6">
        {/* Date + occasion */}
        <div className="space-y-1">
          {outfit.occasion && (
            <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.52_0.012_255)]">
              {outfit.occasion}
            </p>
          )}
          <p className="text-xl font-light text-[oklch(0.18_0.008_255)]">
            {formatDate(outfit.logged_at)}
          </p>
        </div>

        {/* Notes */}
        {outfit.notes && (
          <div className="space-y-1">
            <p className="text-[10px] tracking-[0.2em] uppercase text-[oklch(0.52_0.012_255)]">
              Notes
            </p>
            <p className="text-sm text-[oklch(0.45_0.008_255)] leading-relaxed">
              {outfit.notes}
            </p>
          </div>
        )}

        {/* Items list */}
        {items.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] tracking-[0.2em] uppercase text-[oklch(0.52_0.012_255)]">
              Clothing Items
            </p>
            <div className="divide-y divide-[oklch(0.88_0.006_255)]">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-3"
                >
                  <Badge
                    variant="secondary"
                    className="text-[9px] tracking-wider uppercase shrink-0 bg-[oklch(0.91_0.005_247)] text-[oklch(0.52_0.012_255)] border-0"
                  >
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm text-[oklch(0.22_0.008_255)] truncate">
                      {item.name}
                    </p>
                    {item.color && (
                      <p className="text-xs text-[oklch(0.6_0.006_255)] capitalize">
                        {item.color}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

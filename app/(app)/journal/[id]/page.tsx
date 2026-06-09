import { createClient } from "@/lib/supabase/server"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { notFound } from "next/navigation"
import type { WardrobeItem } from "@/lib/types"

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

  const displayImage = outfit.flatlay_url ?? outfit.photo_url

  return (
    <div className="min-h-screen bg-[oklch(0.965_0.003_247)]">
      {/* Back nav */}
      <div className="px-5 pt-12 pb-2">
        <Link
          href="/journal"
          className="inline-flex items-center gap-2 text-[oklch(0.6_0.006_255)] hover:text-[oklch(0.28_0.008_255)] transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Journal
        </Link>
      </div>

      {/* Occasion label */}
      <div className="px-5 pt-4 pb-3">
        {outfit.occasion && (
          <p className="text-sm text-[oklch(0.58_0.006_255)]">{outfit.occasion}</p>
        )}
        <p className="text-xs text-[oklch(0.65_0.006_255)] mt-0.5">
          {formatDate(outfit.logged_at)}
        </p>
      </div>

      {/* Flat-lay card */}
      <div className="px-4">
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[oklch(0.935_0.005_247)] shadow-sm">
          {displayImage ? (
            <Image
              src={displayImage}
              alt={outfit.occasion ?? "Outfit"}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-[oklch(0.65_0.006_255)] text-sm">No image</p>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {outfit.notes && (
        <div className="px-5 pt-5">
          <p className="text-sm text-[oklch(0.52_0.008_255)] leading-relaxed">{outfit.notes}</p>
        </div>
      )}

      {/* WORN section */}
      {items.length > 0 && (
        <div className="pt-6 pb-24">
          <p className="px-5 text-[11px] tracking-[0.2em] uppercase text-[oklch(0.52_0.012_255)] mb-3">
            Worn
          </p>
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none">
            {items.map((item) => (
              <div key={item.id} className="shrink-0 w-28">
                {/* Item image placeholder */}
                <div className="w-28 h-28 rounded-xl bg-[oklch(0.93_0.003_247)] flex items-end p-2 overflow-hidden mb-2">
                  <span className="text-[9px] tracking-wider uppercase text-[oklch(0.55_0.006_255)]">
                    {item.category}
                  </span>
                </div>
                <p className="text-xs text-[oklch(0.28_0.008_255)] leading-snug line-clamp-2">
                  {item.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

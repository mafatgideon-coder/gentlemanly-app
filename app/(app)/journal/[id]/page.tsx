import { createClient } from "@/lib/supabase/server"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { notFound } from "next/navigation"
import { OutfitActions } from "@/components/journal/OutfitActions"
import type { Outfit } from "@/lib/types"

export default async function OutfitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from("outfits")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single()

  if (!data) notFound()

  const outfit = data as Outfit
  const displayImage = outfit.flatlay_url ?? outfit.photo_url

  return (
    <div className="min-h-screen bg-[oklch(0.965_0.003_247)]">
      {/* Top nav */}
      <div className="px-5 pt-12 pb-2 flex items-center justify-between">
        <Link
          href="/journal"
          className="inline-flex items-center gap-2 text-[oklch(0.6_0.006_255)] hover:text-[oklch(0.28_0.008_255)] transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Journal
        </Link>

        <OutfitActions
          id={outfit.id}
          isFavorite={outfit.is_favorite}
          occasion={outfit.occasion}
          notes={outfit.notes}
        />
      </div>

      {/* Date + occasion */}
      <div className="px-5 pt-4 pb-3">
        <p className="text-xs text-[oklch(0.65_0.006_255)]">
          {formatDate(outfit.logged_at)}
        </p>
        {outfit.occasion && (
          <p className="text-sm text-[oklch(0.52_0.008_255)] mt-0.5">{outfit.occasion}</p>
        )}
      </div>

      {/* Editorial image */}
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

      {/* Items worn */}
      {outfit.items && outfit.items.length > 0 ? (
        <div className="px-5 pt-6 pb-28">
          <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.62_0.008_255)] mb-3">
            What was worn
          </p>
          <div className="divide-y divide-[oklch(0.88_0.006_255)]">
            {outfit.items.map((item, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <span className="text-[10px] tracking-widest uppercase text-[oklch(0.55_0.008_255)] w-24 shrink-0">
                  {item.category}
                </span>
                <span className="text-sm text-[oklch(0.28_0.008_255)]">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="pb-28" />
      )}
    </div>
  )
}

import { createClient } from "@/lib/supabase/server"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { notFound } from "next/navigation"

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

      {/* Date + occasion */}
      <div className="px-5 pt-4 pb-3">
        <p className="text-xs text-[oklch(0.65_0.006_255)]">
          {formatDate(outfit.logged_at)}
        </p>
        {outfit.occasion && (
          <p className="text-sm text-[oklch(0.52_0.008_255)] mt-0.5">{outfit.occasion}</p>
        )}
      </div>

      {/* Flat-lay */}
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
        <div className="px-5 pt-5 pb-24">
          <p className="text-sm text-[oklch(0.52_0.008_255)] leading-relaxed">{outfit.notes}</p>
        </div>
      )}
    </div>
  )
}

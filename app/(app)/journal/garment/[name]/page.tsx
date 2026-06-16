import { createClient } from "@/lib/supabase/server"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { notFound } from "next/navigation"
import type { Outfit } from "@/lib/types"

function formatFullDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function formatLastWorn(dateString: string): string {
  const today = new Date()
  const date = new Date(dateString)
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const dateMid = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((todayMid.getTime() - dateMid.getTime()) / 86_400_000)

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  return formatFullDate(dateString)
}

function formatAppearanceDate(dateString: string): string {
  const today = new Date()
  const date = new Date(dateString)
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const dateMid = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((todayMid.getTime() - dateMid.getTime()) / 86_400_000)

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function GarmentMemoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { name: encodedName } = await params
  const { from } = await searchParams

  const garmentName = decodeURIComponent(encodedName)
  const backHref =
    from && /^\/journal\/[a-z0-9-]+$/.test(from) ? from : "/journal"

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all outfits that have items stored
  const { data } = await supabase
    .from("outfits")
    .select("id, photo_url, flatlay_url, occasion, logged_at, items")
    .eq("user_id", user!.id)
    .not("items", "is", null)
    .order("logged_at", { ascending: false })

  const allOutfits = (data ?? []) as Outfit[]

  // Filter to outfits containing this garment (case-insensitive)
  const needle = garmentName.toLowerCase().trim()
  const appearances = allOutfits.filter(o =>
    o.items?.some(item => item.name.toLowerCase().trim() === needle)
  )

  if (appearances.length === 0) notFound()

  // Hero image: most recent appearance
  const heroOutfit = appearances[0]
  const heroImage = heroOutfit.flatlay_url ?? heroOutfit.photo_url

  // Stats
  const firstSeen = appearances[appearances.length - 1].logged_at
  const lastWorn = appearances[0].logged_at
  const count = appearances.length

  // Category from any appearance
  const category = appearances
    .flatMap(o => o.items ?? [])
    .find(item => item.name.toLowerCase().trim() === needle)
    ?.category ?? ""

  return (
    <div className="min-h-screen bg-[oklch(0.94_0.006_90)]">

      {/* Back nav */}
      <div className="px-5 pt-12 pb-2">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-[oklch(0.52_0.015_255)] hover:text-[oklch(0.22_0.07_255)] transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Back
        </Link>
      </div>

      {/* Hero image */}
      <div className="px-4 pt-3">
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[oklch(0.89_0.005_90)]">
          {heroImage && (
            <Image
              src={heroImage}
              alt={garmentName}
              fill
              className="object-cover"
              priority
            />
          )}
        </div>
      </div>

      {/* Identity */}
      <div className="px-5 pt-6 pb-6">
        {category && (
          <p className="text-[10px] tracking-[0.3em] uppercase text-[oklch(0.52_0.015_255)] mb-1">
            {category}
          </p>
        )}
        <h1 className="text-2xl font-light tracking-tight text-[oklch(0.15_0.04_255)] leading-snug">
          {garmentName}
        </h1>
        <p className="text-sm text-[oklch(0.52_0.015_255)] mt-2">
          Appears in {count} {count === 1 ? "entry" : "entries"}
        </p>

        {/* First seen / Last worn */}
        <div className="mt-5 flex gap-8">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[oklch(0.62_0.008_255)]">
              First seen
            </p>
            <p className="text-sm text-[oklch(0.22_0.04_255)] mt-1">
              {formatFullDate(firstSeen)}
            </p>
          </div>
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[oklch(0.62_0.008_255)]">
              Last worn
            </p>
            <p className="text-sm text-[oklch(0.22_0.04_255)] mt-1">
              {formatLastWorn(lastWorn)}
            </p>
          </div>
        </div>
      </div>

      {/* Appearances */}
      <div className="px-5 pb-28">
        <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.52_0.015_255)] mb-3">
          Appearances
        </p>
        <div className="bg-white rounded-2xl overflow-hidden divide-y divide-[oklch(0.93_0.003_90)]">
          {appearances.map(outfit => {
            const img = outfit.flatlay_url ?? outfit.photo_url
            return (
              <Link
                key={outfit.id}
                href={`/journal/${outfit.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[oklch(0.97_0.002_90)] transition-colors"
              >
                {/* Thumbnail */}
                <div className="relative w-[60px] h-[60px] rounded-xl overflow-hidden shrink-0 bg-[oklch(0.91_0.004_90)]">
                  {img && (
                    <Image
                      src={img}
                      alt={outfit.occasion ?? "Outfit"}
                      fill
                      className="object-cover"
                      sizes="60px"
                    />
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-[oklch(0.15_0.04_255)] leading-none">
                    {formatAppearanceDate(outfit.logged_at)}
                  </p>
                  {outfit.occasion && (
                    <p className="text-[12px] text-[oklch(0.52_0.015_255)] mt-1 leading-none">
                      {outfit.occasion}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

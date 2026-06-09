import { createClient } from "@/lib/supabase/server"
import { WardrobeItemCard } from "@/components/wardrobe/WardrobeItemCard"
import type { WardrobeItem, Category } from "@/lib/types"

const CATEGORY_ORDER: Category[] = [
  "tops",
  "bottoms",
  "outerwear",
  "footwear",
  "accessories",
]

const CATEGORY_LABELS: Record<Category, string> = {
  tops: "Tops",
  bottoms: "Bottoms",
  outerwear: "Outerwear",
  footwear: "Footwear",
  accessories: "Accessories",
}

export default async function WardrobePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from("wardrobe_items")
    .select("*")
    .eq("user_id", user!.id)
    .order("wear_count", { ascending: false })

  const allItems = (data ?? []) as WardrobeItem[]

  const grouped = CATEGORY_ORDER.reduce<Record<Category, WardrobeItem[]>>(
    (acc, cat) => {
      acc[cat] = allItems.filter((item) => item.category === cat)
      return acc
    },
    {} as Record<Category, WardrobeItem[]>
  )

  const hasItems = allItems.length > 0

  return (
    <div className="px-5 pt-14 pb-10">
      <div className="mb-8">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[oklch(0.52_0.012_255)]">
          My Closet
        </p>
        <h1 className="text-3xl font-light tracking-tight mt-1 text-[oklch(0.18_0.008_255)]">
          Wardrobe
        </h1>
        {hasItems && (
          <p className="text-sm text-[oklch(0.6_0.006_255)] mt-1">
            {allItems.length} {allItems.length === 1 ? "item" : "items"}
          </p>
        )}
      </div>

      {!hasItems ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <p className="text-[oklch(0.6_0.006_255)] text-sm">
            Your wardrobe is empty.
          </p>
          <p className="text-[oklch(0.52_0.012_255)] text-xs mt-2">
            Log an outfit to automatically build your closet.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {CATEGORY_ORDER.map((cat) => {
            const items = grouped[cat]
            if (!items.length) return null
            return (
              <section key={cat}>
                <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.52_0.012_255)] mb-4">
                  {CATEGORY_LABELS[cat]}
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                  {items.map((item) => (
                    <WardrobeItemCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

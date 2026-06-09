"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { formatShortDate } from "@/lib/utils"
import type { WardrobeItem, Category } from "@/lib/types"

const CATEGORY_ORDER: Category[] = ["tops", "bottoms", "outerwear", "footwear", "accessories"]

const CATEGORY_LABELS: Record<Category, string> = {
  tops: "Tops",
  bottoms: "Bottoms",
  outerwear: "Outerwear",
  footwear: "Footwear",
  accessories: "Accessories",
}

const CATEGORY_COLORS: Record<string, string> = {
  tops: "bg-[oklch(0.91_0.005_247)] text-[oklch(0.42_0.012_255)]",
  bottoms: "bg-[oklch(0.91_0.005_247)] text-[oklch(0.42_0.012_255)]",
  outerwear: "bg-[oklch(0.89_0.01_255)] text-[oklch(0.36_0.018_255)]",
  footwear: "bg-[oklch(0.91_0.005_247)] text-[oklch(0.42_0.012_255)]",
  accessories: "bg-[oklch(0.91_0.005_247)] text-[oklch(0.42_0.012_255)]",
}

export function WardrobeView({ items: initial }: { items: WardrobeItem[] }) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitEdit() {
    setEditing(false)
    setSelected(new Set())
  }

  async function deleteSelected() {
    if (!selected.size || deleting) return
    setDeleting(true)
    const ids = Array.from(selected)
    await fetch("/api/wardrobe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
    setItems((prev) => prev.filter((i) => !selected.has(i.id)))
    exitEdit()
    setDeleting(false)
    router.refresh()
  }

  const grouped = CATEGORY_ORDER.reduce<Record<Category, WardrobeItem[]>>(
    (acc, cat) => {
      acc[cat] = items.filter((i) => i.category === cat)
      return acc
    },
    {} as Record<Category, WardrobeItem[]>
  )

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
        <p className="text-[oklch(0.6_0.006_255)] text-sm">Your wardrobe is empty.</p>
        <p className="text-[oklch(0.52_0.012_255)] text-xs mt-2">
          Log an outfit to automatically build your closet.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-[oklch(0.52_0.012_255)]">My Closet</p>
          <h1 className="text-3xl font-light tracking-tight mt-1 text-[oklch(0.18_0.008_255)]">Wardrobe</h1>
          <p className="text-sm text-[oklch(0.6_0.006_255)] mt-1">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>

        <div className="flex items-center gap-4 pt-1">
          {editing && selected.size > 0 && (
            <button
              onClick={deleteSelected}
              disabled={deleting}
              className="text-xs font-medium text-red-500 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : `Delete (${selected.size})`}
            </button>
          )}
          <button
            onClick={() => (editing ? exitEdit() : setEditing(true))}
            className="text-xs text-[oklch(0.45_0.012_255)] font-medium tracking-wide"
          >
            {editing ? "Done" : "Select"}
          </button>
        </div>
      </div>

      <div className="space-y-10">
        {CATEGORY_ORDER.map((cat) => {
          const group = grouped[cat]
          if (!group.length) return null
          return (
            <section key={cat}>
              <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.52_0.012_255)] mb-4">
                {CATEGORY_LABELS[cat]}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                {group.map((item) => (
                  <WardrobeCard
                    key={item.id}
                    item={item}
                    editing={editing}
                    selected={selected.has(item.id)}
                    onToggle={() => toggleSelect(item.id)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function WardrobeCard({
  item,
  editing,
  selected,
  onToggle,
}: {
  item: WardrobeItem
  editing: boolean
  selected: boolean
  onToggle: () => void
}) {
  const inner = (
    <div className="space-y-2">
      <div className="relative aspect-square bg-[oklch(0.93_0.003_247)] rounded-sm overflow-hidden flex items-end p-2">
        {item.image_url && (
          <Image src={item.image_url} alt={item.name} fill className="object-cover" />
        )}

        {editing && (
          <div className={`absolute inset-0 transition-colors ${selected ? "bg-black/40" : "bg-black/10"}`}>
            <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
              selected ? "bg-white border-white" : "bg-black/30 border-white/70"
            }`}>
              {selected && <Check size={13} className="text-black" strokeWidth={2.5} />}
            </div>
          </div>
        )}

        <Badge
          variant="secondary"
          className={`relative z-10 text-[9px] tracking-wider uppercase border-0 ${CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.tops}`}
        >
          {item.category}
        </Badge>
      </div>
      <div>
        <p className="text-sm text-[oklch(0.22_0.008_255)] leading-snug">{item.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] text-[oklch(0.6_0.006_255)]">{item.wear_count}× worn</p>
          {item.last_worn && (
            <>
              <span className="text-[oklch(0.75_0.004_255)]">·</span>
              <p className="text-[10px] text-[oklch(0.6_0.006_255)]">{formatShortDate(item.last_worn)}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )

  if (editing) {
    return <button onClick={onToggle} className="block w-full text-left">{inner}</button>
  }

  return <div>{inner}</div>
}

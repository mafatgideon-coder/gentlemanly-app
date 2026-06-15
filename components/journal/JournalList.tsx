"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { groupOutfitsByDay } from "@/lib/utils"
import { OutfitCard } from "@/components/outfit/OutfitCard"
import type { Outfit } from "@/lib/types"

export function JournalList({ outfits: initial }: { outfits: Outfit[] }) {
  const router = useRouter()
  const [outfits, setOutfits] = useState(initial)
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
    await fetch("/api/outfits", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
    setOutfits((prev) => prev.filter((o) => !selected.has(o.id)))
    exitEdit()
    setDeleting(false)
    router.refresh()
  }

  if (outfits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-8 text-center">
        <p className="text-[oklch(0.6_0.006_255)] text-sm">Your style archive is empty.</p>
        <p className="text-[oklch(0.52_0.012_255)] text-xs mt-2">Log your first outfit to begin.</p>
      </div>
    )
  }

  const groups = groupOutfitsByDay(outfits)

  return (
    <div>
      {/* Header + controls */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-[oklch(0.52_0.012_255)]">Archive</p>
          <h1 className="text-3xl font-light tracking-tight mt-1 text-[oklch(0.18_0.008_255)]">Journal</h1>
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

      <div className="space-y-10 pb-4">
        {groups.map(({ label, outfits: group }) => (
          <section key={label}>
            <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.52_0.012_255)] mb-4">
              {label}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {group.map((outfit) => (
                <OutfitCard
                  key={outfit.id}
                  outfit={outfit}
                  editing={editing}
                  selected={selected.has(outfit.id)}
                  onToggle={() => toggleSelect(outfit.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

"use client"

import { useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Heart, Search, X } from "lucide-react"
import { groupOutfitsByDay } from "@/lib/utils"
import { OutfitCard } from "@/components/outfit/OutfitCard"
import { CalendarView } from "@/components/journal/CalendarView"
import type { Outfit, Occasion } from "@/lib/types"

const OCCASIONS: Occasion[] = [
  "Church",
  "Recording",
  "Date Night",
  "Travel",
  "Casual",
  "Meeting",
  "Other",
]

type View = "feed" | "calendar"

export function JournalList({ outfits: initial }: { outfits: Outfit[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Source state
  const [outfits, setOutfits] = useState(initial)

  // View + filter state
  const [view, setView] = useState<View>("feed")
  const [search, setSearch] = useState("")
  const [occasionFilter, setOccasionFilter] = useState<string | null>(
    searchParams.get("occasion")
  )
  const [favoritesOnly, setFavoritesOnly] = useState(false)

  // Edit-mode state (delete)
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  function toggleSelect(id: string) {
    setSelected(prev => {
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
    setOutfits(prev => prev.filter(o => !selected.has(o.id)))
    exitEdit()
    setDeleting(false)
    router.refresh()
  }

  // Filtered outfits (memoized)
  const filtered = useMemo(() => {
    return outfits.filter(outfit => {
      if (occasionFilter && outfit.occasion !== occasionFilter) return false
      if (favoritesOnly && !outfit.is_favorite) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchesOccasion = outfit.occasion?.toLowerCase().includes(q)
        const matchesItems = outfit.items?.some(
          item =>
            item.name.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q)
        )
        if (!matchesOccasion && !matchesItems) return false
      }
      return true
    })
  }, [outfits, occasionFilter, favoritesOnly, search])

  const groups = groupOutfitsByDay(filtered)

  const hasActiveFilter = !!occasionFilter || favoritesOnly || !!search.trim()

  function clearFilters() {
    setSearch("")
    setOccasionFilter(null)
    setFavoritesOnly(false)
  }

  if (outfits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] px-8 text-center">
        <p className="text-[oklch(0.52_0.015_255)] text-sm">Your style archive is empty.</p>
        <p className="text-[oklch(0.52_0.015_255)] text-xs mt-2">Log your first outfit to begin.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-[10px] tracking-[0.3em] uppercase text-[oklch(0.52_0.015_255)]">Archive</p>
          <h1 className="text-3xl font-light tracking-tight mt-1 text-[oklch(0.22_0.07_255)]">Journal</h1>
          <Link
            href="/journal/year"
            className="text-[10px] tracking-[0.15em] uppercase text-[oklch(0.52_0.015_255)] hover:text-[oklch(0.15_0.04_255)] transition-colors mt-1 inline-block"
          >
            {new Date().getFullYear()} in review →
          </Link>
        </div>

        <div className="flex items-center gap-3 pt-1">
          {editing && selected.size > 0 && (
            <button
              onClick={deleteSelected}
              disabled={deleting}
              className="text-xs font-medium text-red-500 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : `Delete (${selected.size})`}
            </button>
          )}
          {!editing && (
            <div className="flex items-center bg-[oklch(0.90_0.008_70)] rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setView("feed")}
                className={`px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase rounded-md transition-colors ${
                  view === "feed"
                    ? "bg-white text-[oklch(0.22_0.07_255)] shadow-sm"
                    : "text-[oklch(0.52_0.015_255)]"
                }`}
              >
                Feed
              </button>
              <button
                onClick={() => setView("calendar")}
                className={`px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase rounded-md transition-colors ${
                  view === "calendar"
                    ? "bg-white text-[oklch(0.22_0.07_255)] shadow-sm"
                    : "text-[oklch(0.52_0.015_255)]"
                }`}
              >
                Calendar
              </button>
            </div>
          )}
          <button
            onClick={() => (editing ? exitEdit() : setEditing(true))}
            className="text-xs text-[oklch(0.42_0.015_255)] font-medium tracking-wide"
          >
            {editing ? "Done" : "Select"}
          </button>
        </div>
      </div>

      {/* Search */}
      {!editing && (
        <div className="relative mb-3">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.52_0.015_255)]"
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by item or occasion…"
            className="w-full h-10 bg-[oklch(0.90_0.008_70)] rounded-lg pl-9 pr-9 text-sm text-[oklch(0.15_0.04_255)] placeholder:text-[oklch(0.62_0.006_255)] outline-none focus:ring-1 focus:ring-[oklch(0.90_0.008_70)] transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[oklch(0.52_0.015_255)]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Occasion chips + Favorites */}
      {!editing && (
        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none">
          <button
            onClick={() => setFavoritesOnly(f => !f)}
            className={`flex items-center gap-1.5 shrink-0 h-8 px-3 rounded-full text-xs transition-colors ${
              favoritesOnly
                ? "bg-[oklch(0.15_0.04_255)] text-[oklch(0.90_0.008_70)]"
                : "bg-[oklch(0.90_0.008_70)] text-[oklch(0.45_0.008_255)]"
            }`}
          >
            <Heart size={11} className={favoritesOnly ? "fill-current" : ""} />
            Saved
          </button>

          {OCCASIONS.map(occ => (
            <button
              key={occ}
              onClick={() => setOccasionFilter(prev => (prev === occ ? null : occ))}
              className={`shrink-0 h-8 px-3 rounded-full text-xs transition-colors ${
                occasionFilter === occ
                  ? "bg-[oklch(0.15_0.04_255)] text-[oklch(0.90_0.008_70)]"
                  : "bg-[oklch(0.90_0.008_70)] text-[oklch(0.45_0.008_255)]"
              }`}
            >
              {occ}
            </button>
          ))}
        </div>
      )}

      {/* Active filter clear */}
      {hasActiveFilter && !editing && (
        <div className="flex items-center gap-2 mb-4">
          <p className="text-xs text-[oklch(0.52_0.015_255)]">
            {filtered.length} {filtered.length === 1 ? "outfit" : "outfits"}
          </p>
          <button
            onClick={clearFilters}
            className="text-xs text-[oklch(0.42_0.015_255)] underline underline-offset-2"
          >
            Clear
          </button>
        </div>
      )}

      {/* Calendar view */}
      {view === "calendar" && (
        <CalendarView outfits={filtered} />
      )}

      {/* Feed view */}
      {view === "feed" && (
        <>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
              <p className="text-[oklch(0.52_0.015_255)] text-sm">No outfits match.</p>
            </div>
          ) : (
            <div className="space-y-10 pb-4">
              {groups.map(({ label, outfits: group }) => (
                <section key={label}>
                  <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.52_0.015_255)] mb-4">
                    {label}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    {group.map(outfit => (
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
          )}
        </>
      )}
    </div>
  )
}

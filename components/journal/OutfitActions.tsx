"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Heart, Pencil } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import type { Occasion } from "@/lib/types"

const OCCASIONS: Occasion[] = [
  "Church",
  "Recording",
  "Date Night",
  "Travel",
  "Casual",
  "Meeting",
  "Other",
]

interface OutfitActionsProps {
  id: string
  isFavorite: boolean
  occasion: string | null
  notes: string | null
}

export function OutfitActions({ id, isFavorite, occasion, notes }: OutfitActionsProps) {
  const router = useRouter()
  const [favorite, setFavorite] = useState(isFavorite)
  const [editOpen, setEditOpen] = useState(false)
  const [editOccasion, setEditOccasion] = useState(occasion ?? "")
  const [editNotes, setEditNotes] = useState(notes ?? "")
  const [saving, setSaving] = useState(false)

  async function toggleFavorite() {
    const next = !favorite
    setFavorite(next)
    await fetch(`/api/outfits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_favorite: next }),
    })
    router.refresh()
  }

  async function saveEdit() {
    setSaving(true)
    await fetch(`/api/outfits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        occasion: editOccasion || null,
        notes: editNotes || null,
      }),
    })
    setSaving(false)
    setEditOpen(false)
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          onClick={toggleFavorite}
          className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-[oklch(0.91_0.004_90)]"
          aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            size={18}
            className={favorite ? "fill-[oklch(0.52_0.008_255)] text-[oklch(0.52_0.008_255)]" : "text-[oklch(0.62_0.006_255)]"}
          />
        </button>
        <button
          onClick={() => setEditOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-[oklch(0.91_0.004_90)]"
          aria-label="Edit outfit"
        >
          <Pencil size={16} className="text-[oklch(0.62_0.006_255)]" />
        </button>
      </div>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent
          side="bottom"
          className="bg-white border-t border-[oklch(0.89_0.005_90)] rounded-t-2xl px-5 pb-10"
        >
          <div className="flex justify-center pt-3 pb-4">
            <div className="w-10 h-1 rounded-full bg-[oklch(0.89_0.005_90)]" />
          </div>

          <SheetHeader className="mb-5">
            <SheetTitle className="text-base font-normal tracking-wide text-[oklch(0.15_0.04_255)]">
              Edit outfit
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] tracking-[0.2em] uppercase text-[oklch(0.52_0.015_255)]">
                Occasion
              </label>
              <Select value={editOccasion} onValueChange={v => setEditOccasion(v ?? "")}>
                <SelectTrigger className="bg-[oklch(0.94_0.006_90)] border-[oklch(0.89_0.005_90)] text-[oklch(0.22_0.04_255)] h-11 rounded-lg">
                  <SelectValue placeholder="Select occasion" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[oklch(0.89_0.005_90)]">
                  {OCCASIONS.map(o => (
                    <SelectItem
                      key={o}
                      value={o}
                      className="text-[oklch(0.22_0.04_255)] focus:bg-[oklch(0.94_0.006_90)] focus:text-[oklch(0.15_0.04_255)]"
                    >
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] tracking-[0.2em] uppercase text-[oklch(0.52_0.015_255)]">
                Notes
              </label>
              <Textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Add a note…"
                className="bg-[oklch(0.94_0.006_90)] border-[oklch(0.89_0.005_90)] text-[oklch(0.22_0.04_255)] placeholder:text-[oklch(0.62_0.010_255)] rounded-lg resize-none min-h-20"
              />
            </div>

            <Button
              onClick={saveEdit}
              disabled={saving}
              className="w-full h-12 bg-[oklch(0.22_0.07_255)] text-white hover:bg-[oklch(0.28_0.07_255)] font-medium tracking-wide rounded-lg disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Outfit } from "@/lib/types"

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Monday = 0, Sunday = 6
function mondayIndex(date: Date) {
  return (date.getDay() + 6) % 7
}

export function CalendarView({ outfits }: { outfits: Outfit[] }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const earliest = outfits.length > 0
    ? new Date(outfits[outfits.length - 1].logged_at)
    : today

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()
  const isEarliestMonth =
    year < earliest.getFullYear() ||
    (year === earliest.getFullYear() && month <= earliest.getMonth())

  function prevMonth() {
    if (isEarliestMonth) return
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (isCurrentMonth) return
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = mondayIndex(new Date(year, month, 1))

  const outfitsByDay = new Map<number, Outfit>()
  for (const outfit of outfits) {
    const d = new Date(outfit.logged_at)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!outfitsByDay.has(day)) outfitsByDay.set(day, outfit)
    }
  }

  const totalCells = startOffset + daysInMonth
  const rows = Math.ceil(totalCells / 7)
  const monthLabel = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={prevMonth}
          disabled={isEarliestMonth}
          className="p-1.5 text-[oklch(0.45_0.012_255)] hover:text-[oklch(0.18_0.008_255)] transition-colors disabled:opacity-20"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium text-[oklch(0.28_0.008_255)] tracking-wide">
          {monthLabel}
        </span>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="p-1.5 text-[oklch(0.45_0.012_255)] hover:text-[oklch(0.18_0.008_255)] transition-colors disabled:opacity-20"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day-of-week labels */}
      <div className="grid grid-cols-7 mb-2">
        {DAY_LABELS.map(d => (
          <div
            key={d}
            className="text-center text-[10px] tracking-widest uppercase text-[oklch(0.55_0.008_255)]"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-x-1 gap-y-3">
        {Array.from({ length: rows * 7 }, (_, i) => {
          const dayNum = i - startOffset + 1

          if (dayNum < 1 || dayNum > daysInMonth) {
            return <div key={i} />
          }

          const outfit = outfitsByDay.get(dayNum)
          const date = new Date(year, month, dayNum)
          const isToday = sameDay(date, today)
          const image = outfit?.flatlay_url ?? outfit?.photo_url

          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span
                className={`text-[10px] leading-none ${
                  isToday
                    ? "text-[oklch(0.18_0.008_255)] font-semibold"
                    : "text-[oklch(0.55_0.008_255)]"
                }`}
              >
                {dayNum}
              </span>

              {outfit ? (
                <Link href={`/journal/${outfit.id}`} className="w-full">
                  <div className="relative w-full aspect-square rounded-sm overflow-hidden bg-[oklch(0.93_0.003_247)]">
                    {image && (
                      <Image
                        src={image}
                        alt={outfit.occasion ?? "Outfit"}
                        fill
                        className="object-cover"
                        sizes="13vw"
                      />
                    )}
                  </div>
                </Link>
              ) : (
                <div
                  className={`w-full aspect-square rounded-sm ${
                    isToday
                      ? "border border-dashed border-[oklch(0.72_0.006_255)]"
                      : "bg-[oklch(0.95_0.003_247)]"
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

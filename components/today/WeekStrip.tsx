import Link from "next/link"
import Image from "next/image"
import type { Outfit } from "@/lib/types"

interface WeekStripProps {
  weekOutfits: Outfit[]
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"]

function startOfISOWeek(): Date {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function WeekStrip({ weekOutfits }: WeekStripProps) {
  const today = new Date()
  const weekStart = startOfISOWeek()

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    const outfit = weekOutfits.find((o) => isSameDay(new Date(o.logged_at), date))
    return { date, outfit, isToday: isSameDay(date, today), isFuture: date > today }
  })

  return (
    <div className="px-5 pb-6">
      <p className="text-[10px] tracking-[0.25em] uppercase text-[oklch(0.38_0.008_255)] mb-3">
        This week
      </p>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map(({ date, outfit, isToday, isFuture }, i) => {
          const image = outfit?.flatlay_url ?? outfit?.photo_url
          const slot = (
            <div className="flex flex-col items-center gap-1.5">
              <span className={`text-[10px] font-medium tracking-wide ${
                isToday
                  ? "text-[oklch(0.92_0.003_247)]"
                  : "text-[oklch(0.38_0.008_255)]"
              }`}>
                {DAY_LABELS[i]}
              </span>
              <div className={`relative w-full aspect-square rounded-sm overflow-hidden ${
                isToday && !outfit
                  ? "border border-dashed border-[oklch(0.35_0.008_255)]"
                  : ""
              } ${
                isFuture
                  ? "opacity-20"
                  : ""
              }`}>
                {image ? (
                  <Image
                    src={image}
                    alt={outfit?.occasion ?? date.toLocaleDateString("en-US", { weekday: "long" })}
                    fill
                    className="object-cover"
                    sizes="(max-width: 480px) 14vw, 60px"
                  />
                ) : (
                  <div className="w-full h-full bg-[oklch(0.17_0.008_255)] flex items-center justify-center">
                    {isToday && (
                      <div className="w-1 h-1 rounded-full bg-[oklch(0.35_0.008_255)]" />
                    )}
                  </div>
                )}
              </div>
            </div>
          )

          if (outfit) {
            return (
              <Link key={i} href={`/journal/${outfit.id}`}>
                {slot}
              </Link>
            )
          }

          return <div key={i}>{slot}</div>
        })}
      </div>
    </div>
  )
}

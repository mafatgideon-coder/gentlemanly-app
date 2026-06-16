import { WeekStrip } from "./WeekStrip"
import { OnThisDay } from "./OnThisDay"
import type { Outfit } from "@/lib/types"

interface TodayEmptyProps {
  weekOutfits: Outfit[]
  onThisDay: Outfit | null
}

export function TodayEmpty({ weekOutfits, onThisDay }: TodayEmptyProps) {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[oklch(0.12_0.01_255)] text-[oklch(0.92_0.003_247)]">
      {/* Date header */}
      <div className="px-6 pt-14 pb-6">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[oklch(0.4_0.008_255)]">
          {new Date().toLocaleDateString("en-US", { weekday: "long" })}
        </p>
        <h1 className="text-4xl font-light tracking-tight mt-1">
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          })}
        </h1>
      </div>

      {/* Week strip */}
      <WeekStrip weekOutfits={weekOutfits} />

      {/* Not-logged state */}
      <div className="mx-4 rounded-sm bg-[oklch(0.16_0.01_255)] aspect-square flex flex-col items-center justify-center gap-3">
        <p className="text-[oklch(0.38_0.008_255)] text-xs tracking-widest uppercase">
          Not logged yet
        </p>
        <p className="text-[oklch(0.28_0.008_255)] text-xs text-center px-12">
          Tap + to log today&apos;s outfit
        </p>
      </div>

      {onThisDay && <OnThisDay outfit={onThisDay} />}
    </div>
  )
}

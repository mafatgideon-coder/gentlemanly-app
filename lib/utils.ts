import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function formatShortDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function isToday(dateString: string): boolean {
  const date = new Date(dateString)
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}


function calendarKey(dateString: string): string {
  const d = new Date(dateString)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function dayLabel(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor(
    (now.setHours(0, 0, 0, 0) - date.setHours(0, 0, 0, 0)) / 86_400_000
  )

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"

  // Within the last 6 days: "Wednesday"
  if (diffDays < 7) {
    return new Date(dateString).toLocaleDateString("en-US", { weekday: "long" })
  }

  // Older: "Sunday, Jun 8" or with year if not this year
  const opts: Intl.DateTimeFormatOptions =
    new Date(dateString).getFullYear() === new Date().getFullYear()
      ? { weekday: "long", month: "short", day: "numeric" }
      : { weekday: "long", month: "short", day: "numeric", year: "numeric" }

  return new Date(dateString).toLocaleDateString("en-US", opts)
}

export function groupOutfitsByDay<T extends { logged_at: string }>(
  outfits: T[]
): { label: string; outfits: T[] }[] {
  const seen = new Map<string, { label: string; outfits: T[] }>()

  for (const outfit of outfits) {
    const key = calendarKey(outfit.logged_at)
    if (!seen.has(key)) {
      seen.set(key, { label: dayLabel(outfit.logged_at), outfits: [] })
    }
    seen.get(key)!.outfits.push(outfit)
  }

  return Array.from(seen.values())
}

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

export function isThisWeek(dateString: string): boolean {
  const date = new Date(dateString)
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  return date >= startOfWeek && !isToday(dateString)
}

export function groupOutfitsByTime<T extends { logged_at: string }>(
  outfits: T[]
): { label: string; outfits: T[] }[] {
  const today: T[] = []
  const thisWeek: T[] = []
  const byMonth: Record<string, T[]> = {}

  for (const outfit of outfits) {
    if (isToday(outfit.logged_at)) {
      today.push(outfit)
    } else if (isThisWeek(outfit.logged_at)) {
      thisWeek.push(outfit)
    } else {
      const key = new Date(outfit.logged_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
      byMonth[key] = byMonth[key] ?? []
      byMonth[key].push(outfit)
    }
  }

  const groups: { label: string; outfits: T[] }[] = []
  if (today.length) groups.push({ label: "Today", outfits: today })
  if (thisWeek.length) groups.push({ label: "This Week", outfits: thisWeek })
  for (const [month, items] of Object.entries(byMonth)) {
    groups.push({ label: month, outfits: items })
  }

  return groups
}

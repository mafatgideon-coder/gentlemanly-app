"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, Shirt } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/today", label: "Today", Icon: Home },
  { href: "/journal", label: "Journal", Icon: BookOpen },
  { href: "/wardrobe", label: "Wardrobe", Icon: Shirt },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[oklch(0.97_0.003_247)] border-t border-[oklch(0.88_0.006_255)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-4">
        {NAV_ITEMS.map(({ href, label, Icon }, idx) => {
          const isActive = pathname === href || pathname.startsWith(href + "/")
          // Gap in the middle for the camera button
          if (idx === 1) {
            return (
              <div key={href} className="flex flex-col items-center gap-1 px-8">
                <div className="w-6" />
                {/* Spacer only — camera button is positioned absolutely */}
              </div>
            )
          }
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 min-w-[56px] transition-colors",
                isActive
                  ? "text-[oklch(0.18_0.008_255)]"
                  : "text-[oklch(0.6_0.006_255)]"
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[10px] tracking-[0.12em] uppercase">
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

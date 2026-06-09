"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, Shirt, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { CameraButton } from "@/components/CameraButton"

const LEFT_TABS = [
  { href: "/today", label: "Today", Icon: Home },
  { href: "/journal", label: "Journal", Icon: BookOpen },
]

const RIGHT_TABS = [
  { href: "/wardrobe", label: "Wardrobe", Icon: Shirt },
  { href: "/settings", label: "Settings", Icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/")
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[oklch(0.975_0.003_247)] border-t border-[oklch(0.88_0.006_255)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2 relative">
        {/* Left tabs */}
        {LEFT_TABS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 flex-1 py-2 transition-colors",
              isActive(href)
                ? "text-[oklch(0.18_0.008_255)]"
                : "text-[oklch(0.62_0.006_255)]"
            )}
          >
            <Icon size={22} strokeWidth={isActive(href) ? 2.2 : 1.5} />
            <span className="text-[10px] tracking-[0.08em]">{label}</span>
          </Link>
        ))}

        {/* Camera button — elevated center */}
        <div className="flex flex-col items-center justify-center flex-1 relative">
          <div className="absolute -top-6">
            <CameraButton />
          </div>
        </div>

        {/* Right tabs */}
        {RIGHT_TABS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 flex-1 py-2 transition-colors",
              isActive(href)
                ? "text-[oklch(0.18_0.008_255)]"
                : "text-[oklch(0.62_0.006_255)]"
            )}
          >
            <Icon size={22} strokeWidth={isActive(href) ? 2.2 : 1.5} />
            <span className="text-[10px] tracking-[0.08em]">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

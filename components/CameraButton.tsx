"use client"

import { useState } from "react"
import { Camera } from "lucide-react"
import { OutfitLogger } from "@/components/outfit/OutfitLogger"

export function CameraButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-14 h-14 rounded-full bg-[oklch(0.18_0.008_255)] border border-[oklch(0.35_0.008_255)] flex items-center justify-center shadow-lg hover:bg-[oklch(0.24_0.01_255)] transition-colors"
        aria-label="Log outfit"
      >
        <Camera size={22} className="text-[oklch(0.93_0.003_247)]" />
      </button>

      {open && <OutfitLogger onClose={() => setOpen(false)} />}
    </>
  )
}

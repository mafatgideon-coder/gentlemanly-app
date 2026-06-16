"use client"

import { Camera } from "lucide-react"
import { useLogger } from "@/lib/logger-context"

export function CameraButton() {
  const { openLogger } = useLogger()

  return (
    <button
      onClick={openLogger}
      className="w-14 h-14 rounded-full bg-[oklch(0.18_0.008_255)] border border-[oklch(0.32_0.008_255)] flex items-center justify-center shadow-lg hover:bg-[oklch(0.24_0.01_255)] transition-colors"
      aria-label="Log outfit"
    >
      <Camera size={22} className="text-[oklch(0.93_0.003_247)]" />
    </button>
  )
}

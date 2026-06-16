"use client"

import { Camera } from "lucide-react"
import { useLogger } from "@/lib/logger-context"

export function CameraButton() {
  const { openLogger } = useLogger()

  return (
    <button
      onClick={openLogger}
      className="w-14 h-14 rounded-full bg-[oklch(0.22_0.07_255)] flex items-center justify-center shadow-lg hover:bg-[oklch(0.28_0.07_255)] transition-colors"
      aria-label="Log outfit"
    >
      <Camera size={22} className="text-[oklch(0.93_0.003_247)]" />
    </button>
  )
}

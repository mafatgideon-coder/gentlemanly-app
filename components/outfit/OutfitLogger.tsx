"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Camera, Loader2 } from "lucide-react"
import Image from "next/image"
import type { DetectedItem, Occasion } from "@/lib/types"

const OCCASIONS: Occasion[] = [
  "Church",
  "Recording",
  "Date Night",
  "Travel",
  "Casual",
  "Meeting",
  "Other",
]

type Step = "upload" | "processing" | "details" | "saving"

const PROGRESS_STEPS = [
  { key: "uploading", label: "Uploading photo" },
  { key: "detecting", label: "Identifying clothing" },
  { key: "generating", label: "Generating flat-lay" },
  { key: "saving", label: "Saving to journal" },
] as const

type ProgressKey = (typeof PROGRESS_STEPS)[number]["key"]

interface OutfitLoggerProps {
  onClose: () => void
}

export function OutfitLogger({ onClose }: OutfitLoggerProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>("upload")
  const [preview, setPreview] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([])
  const [occasion, setOccasion] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [statusMsg, setStatusMsg] = useState("")
  const [progressKey, setProgressKey] = useState<ProgressKey | null>(null)

  function setProgress(key: ProgressKey, msg: string) {
    setProgressKey(key)
    setStatusMsg(msg)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setStep("processing")
    setProgress("uploading", "Uploading photo…")

    // Get user ID for storage path
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Upload original photo
    const ext = file.name.split(".").pop() ?? "jpg"
    const tempId = crypto.randomUUID()
    const storagePath = `${user.id}/${tempId}/original.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("outfit-photos")
      .upload(storagePath, file, { contentType: file.type })

    if (uploadError) {
      setStep("upload")
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from("outfit-photos")
      .getPublicUrl(storagePath)

    // Use the storage path to build a reference URL for the API
    const storageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/outfit-photos/${storagePath}`
    setPhotoUrl(storageUrl)

    // AI detection
    setProgress("detecting", "Identifying clothing items…")
    const detectRes = await fetch("/api/ai/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_url: storageUrl }),
    })
    const { items } = await detectRes.json()
    setDetectedItems(items ?? [])

    setStep("details")
  }

  async function handleSubmit() {
    if (!photoUrl) return
    setStep("saving")
    setProgress("generating", "Generating your flat-lay…")

    // Create outfit ID upfront so flatlay can use it for storage path
    const outfitId = crypto.randomUUID()

    // Generate flatlay
    let flatlayUrl: string | null = null
    if (detectedItems.length > 0) {
      const flatlayRes = await fetch("/api/ai/flatlay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: detectedItems, outfit_id: outfitId }),
      })
      const data = await flatlayRes.json()
      flatlayUrl = data.flatlay_url ?? null
    }

    setProgress("saving", "Saving to your journal…")

    // Save outfit to DB
    await fetch("/api/outfits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        photo_url: photoUrl,
        flatlay_url: flatlayUrl,
        occasion: occasion || null,
        notes: notes || null,
        items: detectedItems,
      }),
    })

    onClose()
    router.refresh()
    router.push("/today")
  }

  return (
    <div className="fixed inset-0 z-50 bg-[oklch(0.12_0.01_255)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button
          onClick={onClose}
          className="text-[oklch(0.52_0.012_255)] hover:text-[oklch(0.72_0.006_255)] transition-colors"
        >
          <X size={22} />
        </button>
        <h2 className="text-sm tracking-[0.15em] uppercase text-[oklch(0.72_0.006_255)]">
          {step === "upload" && "Log Outfit"}
          {step === "processing" && "Analyzing"}
          {step === "details" && "Add Details"}
          {step === "saving" && "Saving"}
        </h2>
        <div className="w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {step === "upload" && (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-40 h-40 rounded-full border-2 border-dashed border-[oklch(0.35_0.008_255)] flex flex-col items-center justify-center gap-3 text-[oklch(0.52_0.012_255)] hover:border-[oklch(0.52_0.012_255)] hover:text-[oklch(0.72_0.006_255)] transition-colors"
            >
              <Camera size={32} />
              <span className="text-xs tracking-widest uppercase">
                Add Photo
              </span>
            </button>
            <p className="text-xs text-[oklch(0.4_0.008_255)] text-center max-w-xs">
              Take a photo or upload from your library. AI will identify your clothing pieces.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {(step === "processing" || step === "saving") && (
          <div className="flex flex-col items-center justify-center h-full gap-8">
            {preview && (
              <div className="relative w-56 h-56 rounded-sm overflow-hidden">
                <Image
                  src={preview}
                  alt="Outfit"
                  fill
                  className="object-cover opacity-30"
                />
              </div>
            )}

            {/* Step tracker */}
            <div className="w-full max-w-xs space-y-3">
              {PROGRESS_STEPS.map(({ key, label }, idx) => {
                const currentIdx = PROGRESS_STEPS.findIndex(s => s.key === progressKey)
                const isDone = idx < currentIdx
                const isActive = key === progressKey
                const isPending = idx > currentIdx

                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                      {isDone && (
                        <div className="w-2 h-2 rounded-full bg-[oklch(0.72_0.006_255)]" />
                      )}
                      {isActive && (
                        <Loader2 size={14} className="animate-spin text-[oklch(0.93_0.003_247)]" />
                      )}
                      {isPending && (
                        <div className="w-2 h-2 rounded-full bg-[oklch(0.28_0.008_255)]" />
                      )}
                    </div>
                    <p className={`text-sm transition-colors ${
                      isActive
                        ? "text-[oklch(0.93_0.003_247)]"
                        : isDone
                        ? "text-[oklch(0.52_0.012_255)]"
                        : "text-[oklch(0.35_0.008_255)]"
                    }`}>
                      {label}
                    </p>
                  </div>
                )
              })}
            </div>

            <p className="text-[10px] tracking-[0.15em] uppercase text-[oklch(0.35_0.008_255)]">
              This takes about 30–45 seconds
            </p>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-6 pt-2">
            {/* Photo preview */}
            {preview && (
              <div className="relative aspect-square w-full rounded-sm overflow-hidden">
                <Image
                  src={preview}
                  alt="Outfit"
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Detected items */}
            {detectedItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] tracking-[0.2em] uppercase text-[oklch(0.4_0.008_255)]">
                  Detected Items
                </p>
                <div className="space-y-1">
                  {detectedItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 py-2 border-b border-[oklch(0.22_0.008_255)]"
                    >
                      <span className="text-[10px] tracking-widest uppercase text-[oklch(0.4_0.008_255)] w-20 shrink-0">
                        {item.category}
                      </span>
                      <span className="text-sm text-[oklch(0.82_0.004_247)]">
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Occasion */}
            <div className="space-y-2">
              <label className="text-[10px] tracking-[0.2em] uppercase text-[oklch(0.4_0.008_255)]">
                Occasion
              </label>
              <Select value={occasion} onValueChange={(v) => setOccasion(v ?? "")}>
                <SelectTrigger className="bg-[oklch(0.18_0.01_255)] border-[oklch(0.28_0.008_255)] text-[oklch(0.72_0.006_255)] h-11 rounded-sm">
                  <SelectValue placeholder="Select occasion" />
                </SelectTrigger>
                <SelectContent className="bg-[oklch(0.18_0.01_255)] border-[oklch(0.28_0.008_255)]">
                  {OCCASIONS.map((o) => (
                    <SelectItem
                      key={o}
                      value={o}
                      className="text-[oklch(0.72_0.006_255)] focus:bg-[oklch(0.24_0.01_255)] focus:text-[oklch(0.92_0.003_247)]"
                    >
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-[10px] tracking-[0.2em] uppercase text-[oklch(0.4_0.008_255)]">
                Notes
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did this outfit feel? Where were you going?"
                className="bg-[oklch(0.18_0.01_255)] border-[oklch(0.28_0.008_255)] text-[oklch(0.72_0.006_255)] placeholder:text-[oklch(0.35_0.008_255)] rounded-sm resize-none min-h-24"
              />
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full h-12 bg-[oklch(0.93_0.003_247)] text-[oklch(0.14_0.01_255)] hover:bg-white font-medium tracking-wide rounded-sm"
            >
              Save Outfit
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

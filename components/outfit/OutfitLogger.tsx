"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { X, ImagePlus, Loader2 } from "lucide-react"
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

const PROGRESS_STEPS = [
  { key: "uploading", label: "Uploading photo" },
  { key: "detecting", label: "Identifying clothing" },
  { key: "generating", label: "Generating flat-lay" },
  { key: "saving", label: "Saving to journal" },
] as const

type ProgressKey = (typeof PROGRESS_STEPS)[number]["key"]
type Step = "idle" | "processing" | "details" | "saving"

interface OutfitLoggerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OutfitLogger({ open, onOpenChange }: OutfitLoggerProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>("idle")
  const [preview, setPreview] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoStoragePath, setPhotoStoragePath] = useState<string | null>(null)
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([])
  const [occasion, setOccasion] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [progressKey, setProgressKey] = useState<ProgressKey | null>(null)
  const [detectError, setDetectError] = useState<string | null>(null)

  function setProgress(key: ProgressKey) {
    setProgressKey(key)
  }

  function reset() {
    setStep("idle")
    setPreview(null)
    setPhotoUrl(null)
    setPhotoStoragePath(null)
    setDetectedItems([])
    setOccasion("")
    setNotes("")
    setProgressKey(null)
    setDetectError(null)
  }

  function handleClose() {
    reset()
    onOpenChange(false)
  }

  function clearPhoto() {
    setPreview(null)
    setPhotoUrl(null)
    setDetectedItems([])
    setStep("idle")
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset file input so same file can be reselected
    e.target.value = ""

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setStep("processing")
    setProgress("uploading")

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = file.name.split(".").pop() ?? "jpg"
    const tempId = crypto.randomUUID()
    const storagePath = `${user.id}/${tempId}/original.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("outfit-photos")
      .upload(storagePath, file, { contentType: file.type })

    if (uploadError) {
      clearPhoto()
      return
    }

    // Store a signed URL so the image is accessible everywhere
    const { data: signedData } = await supabase.storage
      .from("outfit-photos")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365)

    const accessibleUrl = signedData?.signedUrl
      ?? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/outfit-photos/${storagePath}`
    setPhotoUrl(accessibleUrl)
    setPhotoStoragePath(storagePath)

    setProgress("detecting")
    setDetectError(null)
    const detectRes = await fetch("/api/ai/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_url: accessibleUrl }),
    })
    const detectData = await detectRes.json()

    if (!detectRes.ok) {
      setDetectError(detectData.error ?? "Detection failed")
      setStep("details") // still let them save manually
      return
    }

    setDetectedItems(detectData.items ?? [])
    setStep("details")
  }

  async function handleSubmit() {
    if (!photoUrl) return
    setStep("saving")
    // Show "generating" step as active — server generates flatlay synchronously
    setProgress("generating")

    await fetch("/api/outfits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        photo_url: photoUrl,
        occasion: occasion || null,
        notes: notes || null,
        items: detectedItems,
        photo_storage_path: photoStoragePath,
      }),
    })

    setProgress("saving")
    handleClose()
    router.refresh()
    router.push("/today")
  }

  const isBusy = step === "processing" || step === "saving"

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <SheetContent
        side="bottom"
        className="bg-[oklch(0.14_0.01_255)] border-t border-[oklch(0.25_0.008_255)] rounded-t-2xl px-5 pb-10 max-h-[92vh] overflow-y-auto"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-4">
          <div className="w-10 h-1 rounded-full bg-[oklch(0.35_0.008_255)]" />
        </div>

        <SheetHeader className="mb-5">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-base font-normal tracking-wide text-[oklch(0.92_0.003_247)]">
              Log outfit
            </SheetTitle>
            <button
              onClick={handleClose}
              className="text-[oklch(0.52_0.012_255)] hover:text-[oklch(0.72_0.006_255)] transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </SheetHeader>

        {/* Photo area */}
        {!preview ? (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-video rounded-xl border-2 border-dashed border-[oklch(0.3_0.008_255)] flex flex-col items-center justify-center gap-3 text-[oklch(0.45_0.008_255)] hover:border-[oklch(0.52_0.012_255)] hover:text-[oklch(0.65_0.008_255)] transition-colors mb-5"
          >
            <ImagePlus size={28} />
            <span className="text-xs tracking-widest uppercase">Add Photo</span>
          </button>
        ) : (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-5">
            <Image src={preview} alt="Outfit" fill className="object-cover" />
            {!isBusy && (
              <button
                onClick={clearPhoto}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center"
              >
                <X size={14} className="text-white" />
              </button>
            )}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Processing steps */}
        {isBusy && (
          <div className="space-y-3 mb-6">
            {PROGRESS_STEPS.map(({ key, label }, idx) => {
              const currentIdx = PROGRESS_STEPS.findIndex(s => s.key === progressKey)
              const isDone = idx < currentIdx
              const isActive = key === progressKey

              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {isDone && <div className="w-2 h-2 rounded-full bg-[oklch(0.65_0.008_255)]" />}
                    {isActive && <Loader2 size={14} className="animate-spin text-[oklch(0.93_0.003_247)]" />}
                    {!isDone && !isActive && <div className="w-2 h-2 rounded-full bg-[oklch(0.28_0.008_255)]" />}
                  </div>
                  <p className={`text-sm ${
                    isActive ? "text-[oklch(0.93_0.003_247)]"
                    : isDone ? "text-[oklch(0.52_0.012_255)]"
                    : "text-[oklch(0.35_0.008_255)]"
                  }`}>
                    {label}
                  </p>
                </div>
              )
            })}
            <p className="text-[10px] tracking-widest uppercase text-[oklch(0.35_0.008_255)] pt-1">
              Takes about 20–30 seconds
            </p>
          </div>
        )}

        {/* Details form — shown after detection */}
        {step === "details" && (
          <div className="space-y-5">
            {/* Detection error */}
            {detectError && (
              <div className="rounded-lg bg-[oklch(0.22_0.04_20)] border border-[oklch(0.35_0.08_20)] px-3 py-2">
                <p className="text-xs text-[oklch(0.75_0.08_20)]">AI error: {detectError}</p>
              </div>
            )}

            {/* Detected items summary */}
            {detectedItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] tracking-[0.2em] uppercase text-[oklch(0.45_0.008_255)]">
                  Detected — {detectedItems.length} items
                </p>
                <div className="divide-y divide-[oklch(0.22_0.008_255)]">
                  {detectedItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 py-2">
                      <span className="text-[10px] tracking-widest uppercase text-[oklch(0.42_0.008_255)] w-20 shrink-0">
                        {item.category}
                      </span>
                      <span className="text-sm text-[oklch(0.80_0.004_247)]">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Occasion */}
            <div className="space-y-2">
              <label className="text-[10px] tracking-[0.2em] uppercase text-[oklch(0.45_0.008_255)]">
                Occasion
              </label>
              <Select value={occasion} onValueChange={(v) => setOccasion(v ?? "")}>
                <SelectTrigger className="bg-[oklch(0.20_0.01_255)] border-[oklch(0.28_0.008_255)] text-[oklch(0.72_0.006_255)] h-11 rounded-lg">
                  <SelectValue placeholder="Select occasion" />
                </SelectTrigger>
                <SelectContent className="bg-[oklch(0.20_0.01_255)] border-[oklch(0.28_0.008_255)]">
                  {OCCASIONS.map((o) => (
                    <SelectItem
                      key={o}
                      value={o}
                      className="text-[oklch(0.72_0.006_255)] focus:bg-[oklch(0.28_0.01_255)] focus:text-[oklch(0.92_0.003_247)]"
                    >
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-[10px] tracking-[0.2em] uppercase text-[oklch(0.45_0.008_255)]">
                Notes
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Where were you going?"
                className="bg-[oklch(0.20_0.01_255)] border-[oklch(0.28_0.008_255)] text-[oklch(0.72_0.006_255)] placeholder:text-[oklch(0.38_0.008_255)] rounded-lg resize-none min-h-20"
              />
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full h-12 bg-[oklch(0.93_0.003_247)] text-[oklch(0.14_0.01_255)] hover:bg-white font-medium tracking-wide rounded-lg"
            >
              Save Outfit
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

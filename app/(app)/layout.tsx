import { BottomNav } from "@/components/BottomNav"
import { CameraButton } from "@/components/CameraButton"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20">{children}</main>
      <BottomNav />
      <CameraButton />
    </div>
  )
}

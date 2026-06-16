import { BottomNav } from "@/components/BottomNav"
import { LoggerProvider } from "@/lib/logger-context"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <LoggerProvider>
      <div className="min-h-screen bg-background">
        <main className="pb-20">{children}</main>
        <BottomNav />
      </div>
    </LoggerProvider>
  )
}

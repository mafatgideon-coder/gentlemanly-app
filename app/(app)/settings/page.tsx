import { createClient } from "@/lib/supabase/server"
import { LogoutButton } from "@/components/LogoutButton"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="px-5 pt-14 pb-10">
      <div className="mb-10">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[oklch(0.52_0.012_255)]">
          Account
        </p>
        <h1 className="text-3xl font-light tracking-tight mt-1 text-[oklch(0.18_0.008_255)]">
          Settings
        </h1>
      </div>

      <div className="space-y-6">
        <div className="py-4 border-b border-[oklch(0.88_0.006_255)]">
          <p className="text-[10px] tracking-[0.2em] uppercase text-[oklch(0.52_0.012_255)] mb-1">
            Signed in as
          </p>
          <p className="text-sm text-[oklch(0.28_0.008_255)]">{user?.email}</p>
        </div>

        <LogoutButton />
      </div>
    </div>
  )
}

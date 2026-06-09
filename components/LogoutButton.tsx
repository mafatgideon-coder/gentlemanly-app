"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-[oklch(0.52_0.012_255)] hover:text-[oklch(0.28_0.008_255)] transition-colors"
    >
      Sign out
    </button>
  )
}

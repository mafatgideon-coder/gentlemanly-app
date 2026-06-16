"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm space-y-10">
      {/* Wordmark */}
      <div className="text-center space-y-2">
        <p className="text-[10px] tracking-[0.3em] uppercase text-[oklch(0.52_0.012_255)]">
          Est. 2026
        </p>
        <h1 className="text-3xl font-light tracking-tight text-[oklch(0.93_0.003_247)]">
          Gentlemanly
        </h1>
        <p className="text-sm text-[oklch(0.52_0.012_255)]">
          Your personal style journal
        </p>
      </div>

      {/* Auth options */}
      {sent ? (
        <div className="text-center space-y-2">
          <p className="text-[oklch(0.93_0.003_247)] text-sm">
            Check your email
          </p>
          <p className="text-[oklch(0.52_0.012_255)] text-xs">
            A login link has been sent to {email}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Button
            onClick={handleGoogle}
            className="w-full h-12 bg-[oklch(0.93_0.003_247)] text-[oklch(0.14_0.01_255)] hover:bg-white font-medium tracking-wide text-sm rounded-sm"
          >
            Continue with Google
          </Button>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-[oklch(0.25_0.008_255)]" />
            <span className="text-[10px] tracking-[0.2em] uppercase text-[oklch(0.4_0.008_255)]">
              or
            </span>
            <div className="flex-1 h-px bg-[oklch(0.25_0.008_255)]" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-12 bg-[oklch(0.18_0.01_255)] border border-[oklch(0.28_0.008_255)] rounded-sm px-4 text-sm text-[oklch(0.93_0.003_247)] placeholder:text-[oklch(0.4_0.008_255)] outline-none focus:border-[oklch(0.52_0.012_255)] transition-colors"
            />
            <Button
              type="submit"
              disabled={loading || !email}
              className="w-full h-12 bg-transparent border border-[oklch(0.4_0.008_255)] text-[oklch(0.72_0.006_255)] hover:border-[oklch(0.72_0.006_255)] hover:text-[oklch(0.93_0.003_247)] font-normal tracking-wide text-sm rounded-sm transition-colors"
            >
              {loading ? "Sending…" : "Continue with Email"}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}

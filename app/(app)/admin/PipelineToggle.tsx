"use client"

import { useState } from "react"

interface User {
  id: string
  email: string
  pipeline_version: string | null
  created_at: string
}

export function PipelineToggle({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers)
  const [loading, setLoading] = useState<string | null>(null)

  async function toggle(userId: string, current: string | null) {
    const next = current === "v2" ? "v1" : "v2"
    setLoading(userId)
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, pipeline_version: next }),
    })
    if (res.ok) {
      setUsers(prev =>
        prev.map(u => u.id === userId ? { ...u, pipeline_version: next } : u)
      )
    }
    setLoading(null)
  }

  return (
    <div className="space-y-3">
      {users.map(u => {
        const version = u.pipeline_version ?? "v1"
        const isV2 = version === "v2"
        return (
          <div
            key={u.id}
            className="flex items-center justify-between bg-white rounded-2xl px-5 py-4"
          >
            <div>
              <p className="text-sm font-medium text-[oklch(0.15_0.04_255)]">{u.email}</p>
              <p className="text-[11px] text-[oklch(0.55_0.010_255)] mt-0.5">
                {u.id.slice(0, 8)}…
              </p>
            </div>

            <button
              onClick={() => toggle(u.id, version)}
              disabled={loading === u.id}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium tracking-wide transition-colors disabled:opacity-50 ${
                isV2
                  ? "bg-[oklch(0.22_0.07_255)] text-white"
                  : "bg-[oklch(0.91_0.004_90)] text-[oklch(0.42_0.015_255)]"
              }`}
            >
              {loading === u.id ? "Saving…" : isV2 ? "V2 — experimental" : "V1 — production"}
            </button>
          </div>
        )
      })}
    </div>
  )
}

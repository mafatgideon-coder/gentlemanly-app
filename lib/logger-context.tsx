"use client"

import { createContext, useContext, useState } from "react"
import { OutfitLogger } from "@/components/outfit/OutfitLogger"

interface LoggerContextType {
  openLogger: () => void
}

const LoggerContext = createContext<LoggerContextType>({ openLogger: () => {} })

export function LoggerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <LoggerContext.Provider value={{ openLogger: () => setOpen(true) }}>
      {children}
      <OutfitLogger open={open} onOpenChange={setOpen} />
    </LoggerContext.Provider>
  )
}

export function useLogger() {
  return useContext(LoggerContext)
}

"use client"

import { useEffect, useState } from "react"
import { Button } from "./ui/button"

type HealthState = {
  status: "online" | "degraded" | "unknown"
  db: "online" | "offline" | "unknown"
  minio: "online" | "offline" | "unknown"
  redis: "online" | "offline" | "unknown"
}

const initialState: HealthState = {
  status: "unknown",
  db: "unknown",
  minio: "unknown",
  redis: "unknown",
}

// Poll every 60 s instead of 15 s to reduce server load across open tabs.
const POLL_INTERVAL_MS = 60_000

export function HealthStatus() {
  const [health, setHealth] = useState<HealthState>(initialState)

  useEffect(() => {
    let active = true
    let intervalId: ReturnType<typeof setInterval> | null = null

    const fetchHealth = async () => {
      if (document.hidden) return // skip when tab is not visible
      try {
        const response = await fetch("/api/health")
        if (!response.ok) throw new Error("Health check failed")
        const data = (await response.json()) as HealthState
        if (active) setHealth(data)
      } catch {
        if (active) setHealth(initialState)
      }
    }

    const startPolling = () => {
      void fetchHealth()
      intervalId = setInterval(() => void fetchHealth(), POLL_INTERVAL_MS)
    }

    const stopPolling = () => {
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    // Pause polling while the tab is hidden; resume when it becomes visible.
    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        startPolling()
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)
    startPolling()

    return () => {
      active = false
      stopPolling()
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [])

  const isOnline = health.status === "online"

  return (
    <Button
      variant="outline"
      className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase"
    >
      <span
        className={`h-2 w-2 rounded-full ${
          isOnline ? "bg-emerald-500" : "bg-amber-500"
        }`}
      />
      <span className="font-medium">
        {isOnline ? "All systems online" : "System check"}
      </span>
    </Button>
  )
}

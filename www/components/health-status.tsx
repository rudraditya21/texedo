"use client"

import { useEffect, useState } from "react"
import { Button } from "./ui/button"

type HealthState = {
  status: "online" | "degraded" | "unknown"
  db: "online" | "offline" | "unknown"
  minio: "online" | "offline" | "unknown"
}

const initialState: HealthState = {
  status: "unknown",
  db: "unknown",
  minio: "unknown",
}

export function HealthStatus() {
  const [health, setHealth] = useState<HealthState>(initialState)

  useEffect(() => {
    let active = true
    const fetchHealth = async () => {
      try {
        const response = await fetch("/api/health")
        if (!response.ok) throw new Error("Health check failed")
        const data = (await response.json()) as HealthState
        if (active) {
          setHealth(data)
        }
      } catch {
        if (active) {
          setHealth(initialState)
        }
      }
    }

    fetchHealth()
    const interval = window.setInterval(fetchHealth, 15000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  const isOnline = health.status === "online"

  return (
    <Button variant={"outline"} className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase">
      <span
        className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-amber-500"
          }`}
      />
      <span className="font-medium">
        {isOnline ? "All systems online" : "System check"}
      </span>
    </Button>
  )
}

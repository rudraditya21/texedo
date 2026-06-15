type Level = "info" | "warn" | "error"

interface Entry {
  level: Level
  message: string
  ts: string
  [key: string]: unknown
}

function emit(level: Level, message: string, ctx?: Record<string, unknown>) {
  const entry: Entry = { level, message, ts: new Date().toISOString(), ...ctx }

  if (process.env.NODE_ENV === "production") {
    // Structured JSON for log aggregators (Loki, Datadog, CloudWatch, etc.)
    process.stderr.write(JSON.stringify(entry) + "\n")
  } else {
    const suffix = ctx ? " " + JSON.stringify(ctx) : ""
    const out = `[${level.toUpperCase()}] ${entry.ts} ${message}${suffix}`
    if (level === "error") console.error(out)
    else console.log(out)
  }
}

export const logger = {
  info:  (msg: string, ctx?: Record<string, unknown>) => emit("info",  msg, ctx),
  warn:  (msg: string, ctx?: Record<string, unknown>) => emit("warn",  msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit("error", msg, ctx),
}

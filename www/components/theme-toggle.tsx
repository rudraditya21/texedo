"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-accent"
      aria-pressed={mounted ? isDark : undefined}
      aria-label="Toggle theme"
      suppressHydrationWarning
    >
      {!mounted ? (
        <span className="text-xs">Theme</span>
      ) : isDark ? (
        <>
          <Moon className="h-4 w-4" />
          <span className="text-xs">Dark</span>
        </>
      ) : (
        <>
          <Sun className="h-4 w-4" />
          <span className="text-xs">Light</span>
        </>
      )}
    </button>
  );
}

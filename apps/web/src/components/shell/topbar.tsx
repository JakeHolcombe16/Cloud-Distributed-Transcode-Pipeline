"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Search } from "lucide-react";
import { useEffect, useState } from "react";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title }: TopbarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch - using timeout to defer state update
  useEffect(() => {
    // This is intentional - we need to know when component has mounted
    // to avoid hydration mismatch with theme
    const timeout = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-secondary)] px-6">
      {/* Title / Breadcrumb */}
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            {title}
          </h1>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search jobs..."
            className="h-9 w-64 rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>

        {/* Environment badge */}
        <span className="rounded-md bg-[var(--status-processing-bg)] px-2 py-1 text-xs font-medium text-[var(--status-processing)]">
          local
        </span>

        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  List,
  Activity,
  Settings,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "New Job", href: "/new", icon: Plus },
  { name: "Jobs", href: "/jobs", icon: List },
  { name: "Observability", href: "/observability", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-[var(--border-default)] bg-[var(--bg-secondary)]">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-[var(--border-default)] px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
            <Activity className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            Transcode
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--border-default)] p-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}

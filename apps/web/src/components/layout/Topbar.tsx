"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Bell, Moon, Sun, LogOut, ChevronDown, Plus, UserCircle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCurrentProject } from "@/store/projectSlice";
import { fetchNotifications } from "@/store/notificationSlice";
import { logout } from "@/store/authSlice";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { MobileNav } from "./MobileNav";
import { NotificationDropdown } from "./NotificationDropdown";

export function Topbar() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const user = useAppSelector((s) => s.auth.user);
  const projects = useAppSelector((s) => s.projects.items);
  const currentProjectId = useAppSelector((s) => s.projects.currentProjectId);
  const unreadCount = useAppSelector((s) => s.notifications.unreadCount);

  useEffect(() => {
    setMounted(true);
    dispatch(fetchNotifications());
  }, [dispatch]);

  function handleLogout() {
    dispatch(logout());
    router.push("/login");
  }

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-border bg-surface/80 px-3 backdrop-blur-sm sm:px-4">
      <div className="flex items-center gap-2">
        <MobileNav />

        <div className="relative">
          <select
            value={currentProjectId || ""}
            onChange={(e) => dispatch(setCurrentProject(e.target.value))}
            className="h-9 max-w-[160px] rounded-md border border-border bg-surface-raised px-3 pr-8 text-sm text-foreground appearance-none sm:max-w-none"
          >
            {projects.length === 0 && <option value="">No projects yet</option>}
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        </div>

        {user?.role === "ADMIN" && (
          <Link
            href="/projects"
            className="hidden h-9 items-center gap-1.5 rounded-md border border-dashed border-border px-3 text-sm text-muted hover:border-accent/50 hover:text-accent sm:flex"
          >
            <Plus className="h-3.5 w-3.5" /> New project
          </Link>
        )}
      </div>

      <div className="flex items-center gap-1">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-surface-raised hover:text-foreground"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}

        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-surface-raised hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-critical px-1 text-[10px] font-medium text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <NotificationDropdown onClose={() => setNotifOpen(false)} />
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 items-center gap-2 rounded-md px-2 text-sm text-foreground hover:bg-surface-raised"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-xs font-medium text-accent">
              {user?.name?.[0] ?? "?"}
            </span>
            <span className="hidden sm:inline">{user?.name}</span>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-11 z-20 w-48 rounded-md border border-border bg-surface-raised py-1 shadow-lg">
                <div className="border-b border-border px-3 py-2">
                  <p className="text-xs font-medium text-foreground">{user?.role.replace(/_/g, " ")}</p>
                  <p className="truncate text-xs text-muted">{user?.email}</p>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface"
                >
                  <UserCircle className="h-3.5 w-3.5" /> My profile
                </Link>
                <button
                  onClick={handleLogout}
                  className={cn("flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-surface")}
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchUnreadCounts } from "@/store/chatSlice";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  GitPullRequestArrow,
  Package,
  ShieldCheck,
  Ruler,
  ClipboardList,
  HardHat,
  MessageSquareWarning,
  History,
  FolderKanban,
  Users,
  MessageCircle,
  Home,
  LayoutGrid,
  Rss,
  ShieldQuestion,
} from "lucide-react";

const PROJECT_NAV_ITEMS = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/changes", label: "Changes", icon: GitPullRequestArrow },
  { href: "/materials", label: "Materials", icon: Package },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/drawings", label: "Drawings", icon: Ruler },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/site", label: "Site Observations", icon: HardHat },
  { href: "/feedback", label: "Feedback", icon: MessageSquareWarning },
  { href: "/chat", label: "Chat", icon: MessageCircle, showUnread: true },
  { href: "/activity", label: "Activity", icon: History },
  { href: "/members", label: "Team", icon: Users },
];

export function SidebarContent() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);
  const currentProjectId = useAppSelector((s) => s.projects.currentProjectId);
  const project = useAppSelector((s) => s.projects.items.find((p) => p._id === currentProjectId));
  const unreadByProject = useAppSelector((s) => s.chat.unreadByProject);

  useEffect(() => {
    dispatch(fetchUnreadCounts());
  }, [dispatch]);

  const base = currentProjectId ? `/projects/${currentProjectId}` : null;
  const chatUnread = currentProjectId ? unreadByProject[currentProjectId] : undefined;

  return (
    <>
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent/60">
          <div className="h-2 w-2 rounded-sm bg-accent-foreground" />
        </div>
        <span className="font-semibold tracking-tight text-foreground">ImpactFlow</span>
      </div>

      <nav className="space-y-0.5 p-2">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/dashboard" ? "bg-accent/15 text-accent" : "text-foreground hover:bg-surface-raised"
          )}
        >
          <Home className="h-4 w-4 shrink-0" />
          Home
        </Link>
        <Link
          href="/projects"
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/projects"
              ? "bg-accent/15 text-accent"
              : "text-foreground hover:bg-surface-raised"
          )}
        >
          <FolderKanban className="h-4 w-4 shrink-0" />
          All Projects
        </Link>
        <Link
          href="/feed"
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/feed" ? "bg-accent/15 text-accent" : "text-foreground hover:bg-surface-raised"
          )}
        >
          <Rss className="h-4 w-4 shrink-0" />
          Feed
        </Link>
        <Link
          href="/support"
          className={cn(
            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/support" ? "bg-accent/15 text-accent" : "text-foreground hover:bg-surface-raised"
          )}
        >
          <ShieldQuestion className="h-4 w-4 shrink-0" />
          {currentUser?.role === "ADMIN" ? "Certification Inbox" : "Get Verified"}
        </Link>
        {currentUser?.role === "ADMIN" && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/admin" ? "bg-accent/15 text-accent" : "text-foreground hover:bg-surface-raised"
            )}
          >
            <LayoutGrid className="h-4 w-4 shrink-0" />
            Admin Console
          </Link>
        )}
      </nav>

      {project && (
        <>
          <div className="mx-2 border-t border-border" />
          <div className="px-4 py-3">
            <p className="truncate text-sm font-medium text-foreground">{project.name}</p>
            <p className="truncate text-xs text-muted">{project.projectCode}</p>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
            {PROJECT_NAV_ITEMS.map((item) => {
              const href = `${base}${item.href}`;
              const isActive = pathname === href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent/15 text-accent"
                      : "text-muted hover:bg-surface-raised hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.showUnread && !!chatUnread && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-status-critical px-1 text-[10px] font-medium text-white">
                      {chatUnread > 9 ? "9+" : chatUnread}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </>
      )}
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <SidebarContent />
    </aside>
  );
}

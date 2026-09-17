"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { markNotificationRead, markAllNotificationsRead } from "@/store/notificationSlice";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { X, BellOff } from "lucide-react";
import type { Notification } from "@/types";

export function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const { items, unreadCount } = useAppSelector((s) => s.notifications);
  const [selected, setSelected] = useState<Notification | null>(null);

  function openNotification(n: Notification) {
    if (!n.read) dispatch(markNotificationRead(n._id));
    setSelected(n);
  }

  return (
    <>
      <div className="absolute right-0 top-11 z-20 w-80 rounded-md border border-border bg-surface-raised shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-medium text-foreground">Notifications</p>
          {unreadCount > 0 && (
            <button
              onClick={() => dispatch(markAllNotificationsRead())}
              className="text-xs text-accent hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <BellOff className="h-5 w-5 text-muted" />
              <p className="text-xs text-muted">No notifications yet</p>
            </div>
          ) : (
            items.slice(0, 8).map((n) => (
              <button
                key={n._id}
                onClick={() => openNotification(n)}
                className={cn(
                  "flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-surface",
                  !n.read && "bg-accent/5"
                )}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <p className={cn("truncate text-xs", n.read ? "text-muted" : "font-medium text-foreground")}>
                    {n.title}
                  </p>
                  {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                </div>
                <p className="line-clamp-1 text-[11px] text-muted">{n.message}</p>
              </button>
            ))
          )}
        </div>

        <Link
          href="/notifications"
          onClick={onClose}
          className="block border-t border-border px-3 py-2 text-center text-xs text-accent hover:underline"
        >
          View all notifications
        </Link>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div
            className="w-full max-w-sm rounded-lg border border-border bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-medium text-foreground">{selected.title}</h3>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-muted">{selected.message}</p>
            <p className="mt-4 text-xs text-muted">{formatDate(selected.createdAt)}</p>
          </div>
        </div>
      )}
    </>
  );
}

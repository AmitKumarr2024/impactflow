"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "@/store/notificationSlice";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState, LoadingState } from "@/components/ui/primitives";
import { cn, formatDate } from "@/lib/utils";
import { X } from "lucide-react";
import type { Notification } from "@/types";

export default function NotificationsPage() {
  const dispatch = useAppDispatch();
  const { items, unreadCount, status } = useAppSelector((s) => s.notifications);
  const [selected, setSelected] = useState<Notification | null>(null);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  function openNotification(n: Notification) {
    if (!n.read) dispatch(markNotificationRead(n._id));
    setSelected(n);
  }

  if (status === "loading" && items.length === 0) return <LoadingState />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={() => dispatch(markAllNotificationsRead())}>
            Mark all read
          </Button>
        )}
      </div>

      <Card>
        {items.length === 0 ? (
          <EmptyState title="No notifications" description="You'll see real-time updates here as things change." />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {items.map((n) => (
              <button
                key={n._id}
                onClick={() => openNotification(n)}
                className={cn(
                  "-mx-5 flex flex-col items-start gap-1 px-5 py-3 text-left hover:bg-surface-raised",
                  !n.read && "bg-accent/5"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <p className={cn("text-sm", n.read ? "text-muted" : "font-medium text-foreground")}>{n.title}</p>
                  {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                </div>
                <p className="line-clamp-1 text-xs text-muted">{n.message}</p>
                <p className="text-[11px] text-muted/70">{formatDate(n.createdAt)}</p>
              </button>
            ))}
          </div>
        )}
      </Card>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div
            className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-medium text-foreground">{selected.title}</h3>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-muted">{selected.message}</p>
            <p className="mt-4 text-xs text-muted">{formatDate(selected.createdAt)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

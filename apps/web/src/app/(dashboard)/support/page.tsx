"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMyThread, fetchInbox, fetchThread, sendSupportMessage } from "@/store/supportSlice";
import { Button } from "@/components/ui/Button";
import { Card, Input, EmptyState, LoadingState } from "@/components/ui/primitives";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { ApiError } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { Send, ShieldQuestion } from "lucide-react";

export default function SupportPage() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);
  const isAdmin = currentUser?.role === "ADMIN";
  const { messages, threads, activeThreadUserId } = useAppSelector((s) => s.support);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAdmin) dispatch(fetchInbox());
    else dispatch(fetchMyThread());
  }, [isAdmin, dispatch]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    try {
      await dispatch(
        sendSupportMessage(isAdmin && activeThreadUserId ? { body, userId: activeThreadUserId } : { body })
      ).unwrap();
      setBody("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  if (isAdmin) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-3 text-sm font-medium text-foreground">Certification inbox</h2>
          {threads.length === 0 ? (
            <EmptyState title="No messages yet" description="New users asking to be verified will appear here." />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {threads.map((t) => (
                <button
                  key={t.userId}
                  onClick={() => dispatch(fetchThread(t.userId))}
                  className={cn(
                    "-mx-5 flex flex-col gap-1 px-5 py-3 text-left hover:bg-surface-raised",
                    activeThreadUserId === t.userId && "bg-accent/10"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{t.user.name}</p>
                    {t.unreadCount > 0 && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-status-critical px-1 text-[10px] text-white">
                        {t.unreadCount}
                      </span>
                    )}
                  </div>
                  <VerificationBadge status={t.user.verificationStatus as any} />
                  <p className="truncate text-xs text-muted">{t.lastMessage}</p>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="flex flex-col lg:col-span-2">
          {!activeThreadUserId ? (
            <EmptyState title="Select a conversation" description="Pick a thread from the inbox to reply." />
          ) : (
            <>
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto" style={{ maxHeight: 480 }}>
                {messages.map((m) => (
                  <div key={m._id} className={cn("max-w-[75%] rounded-lg px-3 py-2", m.senderIsAdmin ? "self-end bg-accent/15" : "self-start bg-surface-raised")}>
                    <p className="text-sm text-foreground">{m.body}</p>
                    <p className="mt-1 text-[10px] text-muted">{formatDate(m.createdAt)}</p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={handleSend} className="mt-3 flex gap-2 border-t border-border pt-3">
                <Input placeholder="Reply..." value={body} onChange={(e) => setBody(e.target.value)} />
                <Button type="submit" loading={sending} disabled={!body.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <ShieldQuestion className="h-6 w-6 text-accent" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">Get Verified</h1>
          <p className="mt-1 text-sm text-muted">Chat directly with an admin to get your role certified.</p>
        </div>
      </div>

      {currentUser && currentUser.role !== "CLIENT" && currentUser.role !== "ADMIN" && (
        <VerificationBadge status={currentUser.verificationStatus} className="self-start" />
      )}

      <Card className="flex flex-col">
        <div className="flex flex-1 flex-col gap-3 overflow-y-auto" style={{ maxHeight: 480, minHeight: 240 }}>
          {messages.length === 0 ? (
            <EmptyState title="Say hello" description="Message an admin to start the verification process." />
          ) : (
            messages.map((m) => (
              <div key={m._id} className={cn("max-w-[75%] rounded-lg px-3 py-2", m.senderIsAdmin ? "self-start bg-surface-raised" : "self-end bg-accent/15")}>
                <p className="text-sm text-foreground">{m.body}</p>
                <p className="mt-1 text-[10px] text-muted">{formatDate(m.createdAt)}</p>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={handleSend} className="mt-3 flex gap-2 border-t border-border pt-3">
          <Input placeholder="Message an admin..." value={body} onChange={(e) => setBody(e.target.value)} />
          <Button type="submit" loading={sending} disabled={!body.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}

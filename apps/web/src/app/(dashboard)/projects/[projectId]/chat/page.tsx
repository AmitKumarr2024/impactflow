"use client";

import { use, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMessages, sendMessage, markThreadRead } from "@/store/chatSlice";
import { fetchMembers } from "@/store/memberSlice";
import { Card, EmptyState, LoadingState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api";
import { Send } from "lucide-react";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return "Today";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ChatPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);
  const messages = useAppSelector((s) => s.chat.byProject[projectId]);
  const status = useAppSelector((s) => s.chat.status);
  const members = useAppSelector((s) => s.members.byProject[projectId]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchMessages(projectId));
    dispatch(markThreadRead(projectId));
    dispatch(fetchMembers(projectId));
  }, [projectId, dispatch]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      await dispatch(sendMessage({ projectId, body })).unwrap();
      setDraft("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Project Chat</h1>
          <p className="mt-1 text-sm text-muted">
            {members ? `${members.length} member${members.length === 1 ? "" : "s"} in this project` : "One shared thread for everyone on this project."}
          </p>
        </div>
      </div>

      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {status === "loading" && !messages ? (
            <LoadingState />
          ) : !messages || messages.length === 0 ? (
            <EmptyState title="No messages yet" description="Say hello to the team." />
          ) : (
            <div className="flex flex-col gap-1">
              {messages.map((m, i) => {
                const isMine = m.senderId?._id === currentUser?._id;
                const prev = messages[i - 1];
                const showDayLabel = !prev || formatDayLabel(prev.createdAt) !== formatDayLabel(m.createdAt);
                const showSenderInfo = !isMine && (!prev || prev.senderId?._id !== m.senderId?._id || showDayLabel);
                return (
                  <div key={m._id}>
                    {showDayLabel && (
                      <div className="my-3 flex items-center justify-center">
                        <span className="rounded-full bg-surface-raised px-2.5 py-0.5 text-[11px] text-muted">
                          {formatDayLabel(m.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className={`flex gap-2 py-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
                      {!isMine && (
                        <div className="relative mt-1 h-7 w-7 shrink-0 overflow-hidden rounded-full bg-surface-raised">
                          {showSenderInfo && m.senderId?.avatar && (
                            <Image src={m.senderId.avatar} alt={m.senderId.name} fill sizes="28px" className="object-cover" />
                          )}
                        </div>
                      )}
                      <div className={`flex max-w-[75%] flex-col ${isMine ? "items-end" : "items-start"}`}>
                        {showSenderInfo && (
                          <span className="mb-0.5 px-1 text-[11px] font-medium text-muted">
                            {m.senderId?.name} · {m.senderId?.role?.replace(/_/g, " ")}
                          </span>
                        )}
                        <div
                          className={`rounded-2xl px-3.5 py-2 text-sm ${
                            isMine
                              ? "rounded-br-sm bg-accent text-accent-foreground"
                              : "rounded-bl-sm bg-surface-raised text-foreground"
                          }`}
                        >
                          {m.body}
                        </div>
                        <span className="mt-0.5 px-1 text-[10px] text-muted">{formatTime(m.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message the project team..."
            className="h-10 flex-1 rounded-full border border-border bg-surface-raised px-4 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
          />
          <Button type="submit" size="md" loading={sending} disabled={!draft.trim()} className="rounded-full !px-3">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}

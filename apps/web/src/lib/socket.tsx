"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { api } from "@/lib/api";
import { receiveChangeCreated, receiveImpactUpdated } from "@/store/changeSlice";
import { receiveMaterialUnavailable } from "@/store/materialSlice";
import { receiveNotification } from "@/store/notificationSlice";
import { receiveMessage } from "@/store/chatSlice";
import { receiveSupportMessage } from "@/store/supportSlice";
import { receivePost, receiveLikeUpdate, receiveCommentUpdate } from "@/store/feedSlice";
import { fetchCurrentUser } from "@/store/authSlice";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

const SocketContext = createContext<Socket | null>(null);
export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const currentProjectId = useAppSelector((s) => s.projects.currentProjectId);
  const [socket, setSocket] = useState<Socket | null>(null);
  const joinedProjectRef = useRef<string | null>(null);

  // Connect once a user is authenticated. REST is always the source of
  // truth -- this socket only tells us "something changed, go refetch or
  // apply this update," never originates state on its own.
  useEffect(() => {
    if (!user) {
      socket?.disconnect();
      setSocket(null);
      return;
    }
    const token = api.getToken();
    if (!token) return;

    const s = io(SOCKET_URL, { auth: { token } });

    s.on("change.created", (change) => dispatch(receiveChangeCreated(change)));
    s.on("change.impact.updated", (analysis) => dispatch(receiveImpactUpdated(analysis)));
    s.on("material.unavailable", (material) => {
      dispatch(receiveMaterialUnavailable(material));
      toast.warning(`${material.name} marked unavailable`, { description: material.unavailableReason });
    });
    s.on("approval.approved", () => toast.success("An approval was cleared"));
    s.on("approval.rejected", () => toast.error("An approval was rejected"));
    s.on("drawing.revision.created", (d) => toast.info(`New drawing revision: ${d.name} Rev ${d.revision}`));
    s.on("site.observation.created", (obs) => toast.info(`Site observation: ${obs.title}`));
    s.on("feedback.created", (fb) => toast.info(`Installer feedback: ${fb.title}`));
    s.on("decision.created", (d) => toast.info(`New decision: ${d.title}`));
    s.on("notification.created", (n) => {
      dispatch(receiveNotification(n));
      toast(n.title, { description: n.message });
    });
    s.on("chat.message.created", (message) => {
      dispatch(receiveMessage(message));
      // Don't toast your own message back at yourself.
      if (message.senderId?._id !== user._id) {
        toast.message(message.senderId?.name || "New message", { description: message.body });
      }
    });
    s.on("support.message.created", (message) => {
      dispatch(receiveSupportMessage(message));
      if (message.senderId !== user._id) {
        toast.message(message.senderIsAdmin ? "Admin" : "New verification message", { description: message.body });
      }
    });
    s.on("verification.decided", (payload: { status: string }) => {
      // Refresh the current user so their badge/permissions update live the
      // moment an admin verifies or declines their role -- no page reload needed.
      dispatch(fetchCurrentUser());
      toast[payload.status === "VERIFIED" ? "success" : "error"](
        payload.status === "VERIFIED" ? "You're verified!" : "Verification declined"
      );
    });
    s.on("post.created", (post) => dispatch(receivePost(post)));
    s.on("post.liked", (payload) => dispatch(receiveLikeUpdate(payload)));
    s.on("post.commented", (payload) => dispatch(receiveCommentUpdate(payload)));

    setSocket(s);
    return () => {
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  // Join/leave the project room whenever the selected project changes.
  useEffect(() => {
    if (!socket || !currentProjectId) return;
    if (joinedProjectRef.current === currentProjectId) return;
    if (joinedProjectRef.current) socket.emit("project:leave", joinedProjectRef.current);
    socket.emit("project:join", currentProjectId);
    joinedProjectRef.current = currentProjectId;
  }, [socket, currentProjectId]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

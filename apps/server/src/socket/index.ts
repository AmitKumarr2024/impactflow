import type { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { verifyToken } from "../utils/jwt";
import { ProjectMember } from "../models/ProjectMember";

let io: Server | null = null;

export function getIO(): Server | null {
  return io;
}

interface AuthedSocket extends Socket {
  userId?: string;
  role?: string;
}

/**
 * REST remains the source of truth for all writes. Socket.IO exists purely
 * to push already-persisted changes to connected clients in real time
 * (spec section 23). Every socket authenticates with the same JWT used for
 * REST, and only joins rooms it is actually a member of -- we never
 * broadcast project data to sockets that haven't proven membership.
 */
export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_ORIGIN || "*", credentials: true },
  });

  io.use((socket: AuthedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error("Missing auth token"));
      const payload = verifyToken(token);
      socket.userId = payload.userId;
      socket.role = payload.role;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    // Personal room: direct notifications for this user only.
    socket.join(`user:${socket.userId}`);

    // Every authenticated user joins this room -- the company feed has no
    // project scope (it's explicitly company-wide, like an internal
    // LinkedIn), so a new post/like/comment broadcasts here rather than to
    // any particular project room.
    socket.join("company");

    // Every admin joins this global room on connect, regardless of which
    // project (if any) they have open -- the certification inbox and other
    // admin-wide broadcasts (e.g. a new support thread) rely on this and
    // would otherwise silently never reach a connected admin.
    if (socket.role === "ADMIN") {
      socket.join("role:admin");
    }

    // A client asks to join a project room; we verify membership server-side
    // before letting them in, rather than trusting whatever projectId they send.
    socket.on("project:join", async (projectId: string) => {
      if (!socket.userId) return;

      // Admins see and act on every project, so they can join any project
      // room without needing an explicit ProjectMember record for it --
      // same exception as checkProjectMembership on the REST side.
      if (socket.role === "ADMIN") {
        socket.join(`project:${projectId}`);
        socket.join(`project:${projectId}:admin`);
        return;
      }

      const membership = await ProjectMember.findOne({ projectId, userId: socket.userId }).lean();
      if (!membership) return; // silently ignore -- no error detail leaked to unrelated users
      socket.join(`project:${projectId}`);
      socket.join(`project:${projectId}:${membership.role.toLowerCase()}`);
    });

    socket.on("project:leave", (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });
  });

  return io;
}

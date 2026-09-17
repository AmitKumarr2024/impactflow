import type { Response, NextFunction } from "express";
import { z } from "zod";
import { SupportMessage } from "../models/SupportMessage";
import { AppError } from "../utils/AppError";
import { getIO } from "../socket";
import type { AuthedRequest } from "../middleware/auth";

// Non-admins only ever see their own thread; admins can view any thread by
// passing ?userId=. Never let a non-admin pass a different userId and read
// someone else's conversation with the admin team.
function resolveThreadUserId(req: AuthedRequest): string {
  if (req.user!.role === "ADMIN" && req.query.userId) {
    return req.query.userId as string;
  }
  return req.user!.userId;
}

export async function listMessages(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const threadUserId = resolveThreadUserId(req);
    const messages = await SupportMessage.find({ userId: threadUserId }).sort({ createdAt: 1 });
    res.json({ messages });
  } catch (err) {
    next(err);
  }
}

const sendSchema = z.object({
  body: z.string().min(1).max(4000),
  userId: z.string().optional(), // required when the sender is an admin replying to a specific thread
});

export async function sendMessage(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { body, userId } = sendSchema.parse(req.body);
    const isAdmin = req.user!.role === "ADMIN";

    if (isAdmin && !userId) {
      throw AppError.validation("userId is required when an admin sends a support message");
    }
    const threadUserId = isAdmin ? userId! : req.user!.userId;

    const message = await SupportMessage.create({
      userId: threadUserId,
      senderId: req.user!.userId,
      senderIsAdmin: isAdmin,
      body,
    });

    // Deliver to the thread owner's personal room, and to every connected
    // admin (via the role room every admin socket joins on connect), so an
    // admin browsing the verification queue sees new messages live without
    // needing to already have that specific thread open.
    getIO()?.to(`user:${threadUserId}`).emit("support.message.created", message);
    getIO()?.to("role:admin").emit("support.message.created", message);

    res.status(201).json({ message });
  } catch (err) {
    next(err);
  }
}

// Every open thread, one row per user, with their most recent message and
// an unread count -- the admin's inbox view.
export async function listThreads(_req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const threads = await SupportMessage.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$userId",
          lastMessage: { $first: "$body" },
          lastMessageAt: { $first: "$createdAt" },
          lastSenderIsAdmin: { $first: "$senderIsAdmin" },
          unreadCount: {
            $sum: { $cond: [{ $and: [{ $eq: ["$read", false] }, { $eq: ["$senderIsAdmin", false] }] }, 1, 0] },
          },
        },
      },
      { $sort: { lastMessageAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          userId: "$_id",
          "user.name": 1,
          "user.email": 1,
          "user.role": 1,
          "user.avatar": 1,
          "user.verificationStatus": 1,
          lastMessage: 1,
          lastMessageAt: 1,
          lastSenderIsAdmin: 1,
          unreadCount: 1,
        },
      },
    ]);

    res.json({ threads });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const threadUserId = resolveThreadUserId(req);
    // Admins mark the user's messages read (they've now seen them); a user
    // marks the admin's replies read -- never mark your own messages.
    const isAdmin = req.user!.role === "ADMIN";
    await SupportMessage.updateMany(
      { userId: threadUserId, senderIsAdmin: !isAdmin, read: false },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

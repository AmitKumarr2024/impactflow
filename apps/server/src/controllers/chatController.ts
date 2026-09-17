import type { Response, NextFunction } from "express";
import { z } from "zod";
import { Message } from "../models/Message";
import { ProjectMember } from "../models/ProjectMember";
import { getIO } from "../socket";
import type { AuthedRequest } from "../middleware/auth";

const PAGE_SIZE = 50;

// Paginated, oldest-last (chronological) so the client can just append to
// the bottom of the thread. `before` is a message id cursor for scrolling
// up to load older history.
export async function listMessages(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const filter: Record<string, unknown> = { projectId: req.params.projectId };
    if (req.query.before) {
      const cursor = await Message.findById(req.query.before).select("createdAt").lean();
      if (cursor) filter.createdAt = { $lt: cursor.createdAt };
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE)
      .populate("senderId", "name avatar role")
      .lean();

    res.json({ messages: messages.reverse() });
  } catch (err) {
    next(err);
  }
}

const sendMessageSchema = z.object({
  body: z.string().min(1).max(4000),
});

// REST persists the message first -- Socket.IO only broadcasts that it
// happened, exactly like every other write in this app. A client that's
// offline when a message is sent will still see it on next fetch.
export async function sendMessage(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { body } = sendMessageSchema.parse(req.body);
    const message = await Message.create({
      projectId: req.params.projectId,
      senderId: req.user!.userId,
      body,
      readBy: [req.user!.userId],
    });

    const populated = await message.populate("senderId", "name avatar role");

    getIO()?.to(`project:${req.params.projectId}`).emit("chat.message.created", populated);

    res.status(201).json({ message: populated });
  } catch (err) {
    next(err);
  }
}

// Marks every message in the project up to now as read by this user, so the
// unread badge clears without a round trip per message.
export async function markThreadRead(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await Message.updateMany(
      { projectId: req.params.projectId, readBy: { $ne: req.user!.userId } },
      { $addToSet: { readBy: req.user!.userId } }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// Unread counts per project the caller belongs to, for a sidebar/nav badge
// without fetching every project's full thread.
export async function unreadCounts(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const memberships = await ProjectMember.find({ userId: req.user!.userId }).select("projectId").lean();
    const projectIds = memberships.map((m) => m.projectId);

    const counts = await Message.aggregate([
      { $match: { projectId: { $in: projectIds }, readBy: { $ne: req.user!.userId } } },
      { $group: { _id: "$projectId", count: { $sum: 1 } } },
    ]);

    const result: Record<string, number> = {};
    for (const c of counts) result[c._id.toString()] = c.count;

    res.json({ unreadByProject: result });
  } catch (err) {
    next(err);
  }
}

import type { Response, NextFunction } from "express";
import { Notification } from "../models/Notification";
import type { AuthedRequest } from "../middleware/auth";

export async function listNotifications(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const notifications = await Notification.find({ userId: req.user!.userId }).sort({ createdAt: -1 }).limit(100);
    const unreadCount = await Notification.countDocuments({ userId: req.user!.userId, read: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user!.userId }, { read: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    await Notification.updateMany({ userId: req.user!.userId, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

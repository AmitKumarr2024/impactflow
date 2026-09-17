import { Types } from "mongoose";
import { Notification } from "../../models/Notification";
import { Activity } from "../../models/Activity";
import { getIO } from "../../socket";
import { SOCKET_EVENTS, type Role } from "@impactflow/shared";

interface NotifyInput {
  userId: Types.ObjectId | string;
  projectId?: Types.ObjectId | string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: Types.ObjectId | string;
}

// REST remains the source of truth (the Notification document is written to
// Mongo first). Socket.IO only broadcasts so connected clients update immediately.
export async function notifyUser(input: NotifyInput) {
  const notification = await Notification.create(input);
  getIO()?.to(`user:${input.userId}`).emit(SOCKET_EVENTS.NOTIFICATION_CREATED, notification);
  return notification;
}

export async function notifyMany(userIds: (Types.ObjectId | string)[], rest: Omit<NotifyInput, "userId">) {
  return Promise.all(userIds.map((userId) => notifyUser({ ...rest, userId })));
}

interface ActivityInput {
  projectId: Types.ObjectId | string;
  actor: Types.ObjectId | string;
  actorRole: Role;
  action: string;
  entityType: string;
  entityId: Types.ObjectId | string;
  summary: string;
}

export async function recordActivity(input: ActivityInput) {
  const activity = await Activity.create(input);
  getIO()?.to(`project:${input.projectId}`).emit("activity.created", activity);
  return activity;
}

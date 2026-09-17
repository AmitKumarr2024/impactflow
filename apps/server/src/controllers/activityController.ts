import type { Response, NextFunction } from "express";
import { Activity } from "../models/Activity";
import type { AuthedRequest } from "../middleware/auth";

export async function listActivity(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const activity = await Activity.find({ projectId: req.params.projectId }).sort({ createdAt: -1 }).limit(200);
    res.json({ activity });
  } catch (err) {
    next(err);
  }
}

import type { Response, NextFunction } from "express";
import { ChangeRequest } from "../models/ChangeRequest";
import { Decision } from "../models/Decision";
import { Material } from "../models/Material";
import { Drawing } from "../models/Drawing";
import { Task } from "../models/Task";
import { SiteObservation } from "../models/SiteObservation";
import { Feedback } from "../models/Feedback";
import type { AuthedRequest } from "../middleware/auth";

// Deliberately simple, indexed/filtered search rather than full-text search
// engine -- sufficient for MVP per spec section 35.
export async function searchProject(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const q = String(req.query.q || "").trim();
    const projectId = req.params.projectId;
    if (!q) return res.json({ results: {} });

    const regex = new RegExp(q, "i");

    const [changes, decisions, materials, drawings, tasks, observations, feedback] = await Promise.all([
      ChangeRequest.find({ projectId, $or: [{ title: regex }, { description: regex }] }).limit(10),
      Decision.find({ projectId, title: regex }).limit(10),
      Material.find({ projectId, name: regex }).limit(10),
      Drawing.find({ projectId, name: regex }).limit(10),
      Task.find({ projectId, title: regex }).limit(10),
      SiteObservation.find({ projectId, title: regex }).limit(10),
      Feedback.find({ projectId, title: regex }).limit(10),
    ]);

    res.json({ results: { changes, decisions, materials, drawings, tasks, observations, feedback } });
  } catch (err) {
    next(err);
  }
}

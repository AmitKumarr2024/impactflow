import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/authRoutes";
import projectRoutes from "./routes/projectRoutes";
import changeRoutes from "./routes/changeRoutes";
import materialRoutes from "./routes/materialRoutes";
import materialSubstitutionRoutes from "./routes/materialSubstitutionRoutes";
import approvalRoutes from "./routes/approvalRoutes";
import drawingRoutes from "./routes/drawingRoutes";
import siteRoutes from "./routes/siteRoutes";
import feedbackRoutes from "./routes/feedbackRoutes";
import decisionRoutes from "./routes/decisionRoutes";
import taskRoutes from "./routes/taskRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import mediaRoutes from "./routes/mediaRoutes";
import adminRoutes from "./routes/adminRoutes";
import supportRoutes from "./routes/supportRoutes";
import feedRoutes from "./routes/feedRoutes";

import { notFoundHandler, errorHandler } from "./middleware/error";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "*", credentials: true }));
app.use(express.json({ limit: "5mb" }));

// General API throttle -- generous enough for normal use, but stops naive
// scripted abuse. Auth gets a tighter limit since credential-stuffing/brute
// force is the realistic threat there, not a burst of legitimate traffic.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "TOO_MANY_REQUESTS", message: "Too many auth attempts. Try again later." } },
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api", apiLimiter);

// Routes -> Controllers -> Services -> Models. Business logic never lives here.
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/changes", changeRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/material-substitutions", materialSubstitutionRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/drawings", drawingRoutes);
app.use("/api/site-observations", siteRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/decisions", decisionRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/feed", feedRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

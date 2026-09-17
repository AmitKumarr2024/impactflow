import type { Response, NextFunction } from "express";
import { z } from "zod";
import { registerUser, loginUser } from "../services/authService";
import { User } from "../models/User";
import { ROLES, GENDERS } from "@impactflow/shared";
import type { AuthedRequest } from "../middleware/auth";

// ADMIN is deliberately excluded from self-registration -- per product
// decision, admin access is granted only by directly editing the database,
// never chosen by a person signing themselves up.
const REGISTRABLE_ROLES = ROLES.filter((r) => r !== "ADMIN") as [string, ...string[]];

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(REGISTRABLE_ROLES),
  gender: z.enum(GENDERS).optional(),
  company: z.string().optional(),
});

export async function register(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = registerSchema.parse(req.body);
    const { user, token } = await registerUser(body as any);
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const { user, token } = await loginUser(email, password);
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
}

export async function me(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const user = await User.findById(req.user!.userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  avatar: z.string().optional(),
  company: z.string().optional(),
});

// Deliberately narrow: a person can update their own display details, but
// never their own role or email through this endpoint -- role changes stay
// an admin/database-only action, and email changes would need re-verification
// this endpoint doesn't handle.
export async function updateProfile(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = updateProfileSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.user!.userId, body, { new: true });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

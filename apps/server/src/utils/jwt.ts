import jwt from "jsonwebtoken";
import type { Role } from "@impactflow/shared";

export interface JwtPayload {
  userId: string;
  role: Role;
}

export function signToken(payload: JwtPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return jwt.sign(payload, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN as any) || "7d",
  });
}

export function verifyToken(token: string): JwtPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return jwt.verify(token, secret) as JwtPayload;
}

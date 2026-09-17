import { Schema, model, Types } from "mongoose";
import { ROLES, GENDERS, type Role, type Gender } from "@impactflow/shared";

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  gender: Gender;
  avatar?: string;
  address?: string;
  company?: string;
  // Anyone can claim a professional role (Contractor, Supplier, etc.) at
  // registration -- that claim isn't trusted anywhere in the product until
  // an admin verifies it. ADMIN accounts are never self-registered (see
  // authService), so they're created VERIFIED directly.
  verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    gender: { type: String, enum: GENDERS, default: "OTHER" },
    avatar: { type: String },
    address: { type: String },
    company: { type: String },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

// Never serialize the password hash, even if a query forgets to .select("-passwordHash").
userSchema.set("toJSON", {
  transform: (_doc, ret: any) => {
    delete ret.passwordHash;
    return ret;
  },
});

export const User = model<IUser>("User", userSchema);

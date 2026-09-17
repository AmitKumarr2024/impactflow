import bcrypt from "bcrypt";
import { User } from "../models/User";
import { signToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { defaultAvatarUrl } from "../utils/defaultAvatar";
import type { Role, Gender } from "@impactflow/shared";

const SALT_ROUNDS = 10;

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
  gender?: Gender;
  company?: string;
}) {
  const existing = await User.findOne({ email: input.email.toLowerCase() }).lean();
  if (existing) throw new AppError("An account with this email already exists", 409, "CONFLICT");

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const gender = input.gender || "OTHER";
  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    role: input.role,
    gender,
    avatar: defaultAvatarUrl(input.email.toLowerCase(), gender, input.role),
    company: input.company,
  });

  const token = signToken({ userId: user._id.toString(), role: user.role });
  return { user, token };
}

export async function loginUser(email: string, password: string) {
  // passwordHash has `select: false` on the schema, so it must be explicitly requested here.
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user) throw AppError.unauthorized("Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw AppError.unauthorized("Invalid email or password");

  const token = signToken({ userId: user._id.toString(), role: user.role });
  return { user, token };
}

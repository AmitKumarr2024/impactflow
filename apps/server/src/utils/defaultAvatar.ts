import { createHash } from "crypto";
import type { Gender, Role } from "@impactflow/shared";

// Maps (role, gender) to a static portrait already placed in
// apps/web/public/ -- these are root-relative Next.js public URLs, e.g.
// "/male architect.png". Filenames intentionally match exactly what's
// expected in the public folder, spaces included; Next.js serves files with
// spaces in their names fine, and the frontend must not re-encode them
// (browsers handle the raw space in a src path correctly).
//
// ADMIN and gender OTHER have no matching static asset -- those fall back
// to a generated placeholder (DiceBear) rather than guessing a portrait
// that doesn't represent what was selected.
const ROLE_FILENAME_FRAGMENT: Partial<Record<Role, string>> = {
  ARCHITECT: "architect",
  CONTRACTOR: "construction contractor",
  SUPPLIER: "construction-material supplier",
  FABRICATOR: "fabricator",
  INSTALLER: "installer",
  INTERIOR_DESIGNER: "interior designer",
};

function staticAvatarPath(role: Role, gender: Gender): string | null {
  if (role === "CONSULTANT") {
    if (gender === "FEMALE") return "/mature female consultant.png";
    if (gender === "MALE") return "/mature male consultant.png";
    return null; // no "mature other consultant" asset
  }
  if (role === "CLIENT") {
    if (gender === "FEMALE") return "/professional female client.png";
    if (gender === "MALE") return "/professional male client.png";
    return null; // no "professional other client" asset
  }
  const fragment = ROLE_FILENAME_FRAGMENT[role];
  if (!fragment) return null; // e.g. ADMIN -- no portrait set for this role
  if (gender === "FEMALE") return `/female ${fragment}.png`;
  if (gender === "MALE") return `/male ${fragment}.png`;
  return null; // OTHER has no matching asset for role-based portraits
}

// Fallback only: used when no static portrait exists for this role/gender
// combination. A real, publicly-hosted avatar-rendering service, not
// fabricated data -- no image is stored by us until this or a real upload
// replaces it.
function fallbackAvatarUrl(seed: string, gender: Gender): string {
  const TOP_OPTIONS: Record<Gender, string[]> = {
    FEMALE: ["longHairStraight", "longHairCurly", "longHairBun", "longHairBob"],
    MALE: ["shortHairShortFlat", "shortHairShortWaved", "shortHairFrizzle", "shortHairTheCaesar"],
    OTHER: ["hat", "hijab", "turban", "shortHairDreads01"],
  };
  const options = TOP_OPTIONS[gender] || TOP_OPTIONS.OTHER;
  const hash = createHash("md5").update(seed).digest("hex");
  const top = options[parseInt(hash.slice(0, 8), 16) % options.length];
  const params = new URLSearchParams({ seed, top });
  return `https://api.dicebear.com/9.x/avataaars/svg?${params.toString()}`;
}

export function defaultAvatarUrl(seed: string, gender: Gender = "OTHER", role: Role = "CLIENT"): string {
  return staticAvatarPath(role, gender) || fallbackAvatarUrl(seed, gender);
}

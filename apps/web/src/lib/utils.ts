import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatCurrency(amount: number) {
  const sign = amount > 0 ? "+" : amount < 0 ? "" : "";
  return `${sign}₹${Math.abs(amount).toLocaleString("en-IN")}`;
}

export function formatDays(days: number) {
  if (days === 0) return "no change";
  const sign = days > 0 ? "+" : "";
  return `${sign}${days} day${Math.abs(days) === 1 ? "" : "s"}`;
}

/** True when a populated relation field came back as a full document rather
 * than a raw ObjectId string (see PopulatedMaterialRef etc. in types/index.ts). */
export function isPopulated<T>(ref: string | T): ref is T {
  return typeof ref === "object" && ref !== null;
}

import { BadgeCheck, Clock, BadgeX } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerificationBadge({
  status,
  className,
}: {
  status: "PENDING" | "VERIFIED" | "REJECTED";
  className?: string;
}) {
  if (status === "VERIFIED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-status-approved/15 px-2 py-0.5 text-[11px] font-medium text-status-approved",
          className
        )}
        title="This role has been verified by an admin"
      >
        <BadgeCheck className="h-3 w-3" /> Verified
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-status-critical/15 px-2 py-0.5 text-[11px] font-medium text-status-critical",
          className
        )}
        title="Verification was declined -- message an admin"
      >
        <BadgeX className="h-3 w-3" /> Not verified
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-status-pending/15 px-2 py-0.5 text-[11px] font-medium text-status-pending",
        className
      )}
      title="Waiting for an admin to verify this role"
    >
      <Clock className="h-3 w-3" /> Pending verification
    </span>
  );
}

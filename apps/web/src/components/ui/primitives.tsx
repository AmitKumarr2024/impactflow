import { cn } from "@/lib/utils";
import { Loader2, Inbox } from "lucide-react";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border border-border bg-surface p-5 shadow-sm transition-colors", className)}>
      {children}
    </div>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-accent",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-foreground", className)}>{children}</label>;
}

const STATUS_STYLES: Record<string, string> = {
  CRITICAL: "bg-status-critical/15 text-status-critical",
  HIGH: "bg-status-high/15 text-status-high",
  MEDIUM: "bg-status-medium/15 text-status-medium",
  LOW: "bg-status-low/15 text-status-low",
  APPROVED: "bg-status-approved/15 text-status-approved",
  RESOLVED: "bg-status-approved/15 text-status-approved",
  BLOCKED: "bg-status-blocked/15 text-status-blocked",
  REJECTED: "bg-status-blocked/15 text-status-blocked",
  PENDING: "bg-status-pending/15 text-status-pending",
  SUBMITTED: "bg-status-pending/15 text-status-pending",
  DRAFT: "bg-status-pending/15 text-status-pending",
  ACTIVE: "bg-status-approved/15 text-status-approved",
  COMPLETED: "bg-status-approved/15 text-status-approved",
  IMPACT_REVIEW: "bg-status-high/15 text-status-high",
  NOT_STARTED: "bg-status-pending/15 text-status-pending",
  IN_PROGRESS: "bg-status-medium/15 text-status-medium",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || "bg-status-pending/15 text-status-pending";
  return (
    <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-xs font-medium", style)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <Inbox className="h-8 w-8 text-muted" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-xs text-sm text-muted">{description}</p>}
    </div>
  );
}

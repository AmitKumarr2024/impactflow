"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAdminOverview, fetchUsersByRole, fetchPendingVerifications, decideVerification } from "@/store/adminSlice";
import { setCurrentProject } from "@/store/projectSlice";
import { addMember } from "@/store/memberSlice";
import { Button } from "@/components/ui/Button";
import { Card, StatusBadge, LoadingState, EmptyState, Select } from "@/components/ui/primitives";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { ApiError } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { ROLES, type Role } from "@/types";
import {
  GitPullRequestArrow,
  ShieldCheck,
  Users,
  History,
  ArrowUpRight,
  ClipboardList,
  FolderKanban,
  Mail,
} from "lucide-react";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  CLIENT: "Client",
  ARCHITECT: "Architect",
  INTERIOR_DESIGNER: "Interior Designer",
  CONSULTANT: "Consultant",
  CONTRACTOR: "Contractor",
  SUPPLIER: "Supplier",
  FABRICATOR: "Fabricator",
  INSTALLER: "Installer",
};

const ASSIGNABLE_ROLES = ROLES.filter((r) => r !== "ADMIN");

export default function AdminConsolePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const { overview, overviewStatus, directory, directoryStatus, pendingVerifications } = useAppSelector((s) => s.admin);
  const projects = useAppSelector((s) => s.projects.items);

  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [assigningEmail, setAssigningEmail] = useState<string | null>(null);
  const [assignProjectId, setAssignProjectId] = useState<Record<string, string>>({});
  const [decidingId, setDecidingId] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    dispatch(fetchAdminOverview());
    dispatch(fetchPendingVerifications());
  }, [user, dispatch, router]);

  if (!user || user.role !== "ADMIN") return null;

  const totalActiveChanges = overview.reduce((s, o) => s + o.activeChanges, 0);
  const totalPendingApprovals = overview.reduce((s, o) => s + o.pendingApprovals, 0);

  function handleRoleClick(role: Role) {
    setActiveRole(role);
    dispatch(fetchUsersByRole(role));
  }

  async function handleAssign(email: string) {
    const projectId = assignProjectId[email];
    if (!projectId) {
      toast.error("Pick a project first");
      return;
    }
    setAssigningEmail(email);
    try {
      await dispatch(addMember({ projectId, email, role: activeRole! })).unwrap();
      toast.success(`${email} assigned as ${ROLE_LABELS[activeRole!]}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not assign");
    } finally {
      setAssigningEmail(null);
    }
  }

  async function handleDecideVerification(userId: string, status: "VERIFIED" | "REJECTED") {
    setDecidingId(userId);
    try {
      await dispatch(decideVerification({ userId, status })).unwrap();
      toast.success(status === "VERIFIED" ? "User verified" : "Verification declined");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not decide");
    } finally {
      setDecidingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Admin Console</h1>
        <p className="mt-1 text-sm text-muted">Every project across the company, and what&apos;s happening on each.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs text-muted">Projects</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{overview.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Active changes</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{totalActiveChanges}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Pending approvals</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{totalPendingApprovals}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted">Total members</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            {overview.reduce((s, o) => s + o.memberCount, 0)}
          </p>
        </Card>
      </div>

      {pendingVerifications.length > 0 && (
        <Card className="border-status-high/30">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Pending Verifications</h2>
            <span className="rounded-full bg-status-high/15 px-2 py-0.5 text-xs font-medium text-status-high">
              {pendingVerifications.length} waiting
            </span>
          </div>
          <div className="flex flex-col divide-y divide-border">
            {pendingVerifications.map((u) => (
              <div key={u._id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {u.name} <span className="font-normal text-muted">claims to be</span> {ROLE_LABELS[u.role]}
                  </p>
                  <p className="text-xs text-muted">
                    {u.email}
                    {u.company ? ` · ${u.company}` : ""} · registered {formatDate(u.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={decidingId === u._id}
                    onClick={() => handleDecideVerification(u._id, "REJECTED")}
                  >
                    Decline
                  </Button>
                  <Button size="sm" loading={decidingId === u._id} onClick={() => handleDecideVerification(u._id, "VERIFIED")}>
                    Verify
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-medium text-foreground">Projects</h2>
        {overviewStatus === "loading" && overview.length === 0 ? (
          <LoadingState />
        ) : overview.length === 0 ? (
          <EmptyState title="No projects yet" description="Create the first company project to see it here." />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {overview.map((o) => (
              <Link
                key={o.project._id}
                href={`/projects/${o.project._id}`}
                onClick={() => dispatch(setCurrentProject(o.project._id))}
                className="group -mx-5 flex flex-col gap-3 px-5 py-4 hover:bg-surface-raised sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{o.project.name}</p>
                    <StatusBadge status={o.project.status} />
                  </div>
                  <p className="text-xs text-muted">{o.project.projectCode}</p>
                  {o.lastActivity && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                      <History className="h-3 w-3 shrink-0" />
                      {o.lastActivity.summary} · {formatDate(o.lastActivity.createdAt)}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="flex items-center gap-1.5 text-sm text-muted">
                    <GitPullRequestArrow className="h-3.5 w-3.5" /> {o.activeChanges}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-muted">
                    <ShieldCheck className="h-3.5 w-3.5" /> {o.pendingApprovals}
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-muted">
                    <Users className="h-3.5 w-3.5" /> {o.memberCount}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-medium text-foreground">People directory</h2>
        <p className="mt-1 mb-3 text-xs text-muted">
          Pick a role to see everyone with it across the company, and assign them to a project.
        </p>
        <div className="flex flex-wrap gap-2">
          {ASSIGNABLE_ROLES.map((r) => (
            <button
              key={r}
              onClick={() => handleRoleClick(r)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                activeRole === r
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-muted hover:border-accent/40 hover:text-foreground"
              )}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>

        {activeRole && (
          <div className="mt-4 border-t border-border pt-4">
            {directoryStatus === "loading" ? (
              <LoadingState />
            ) : directory.length === 0 ? (
              <EmptyState
                title={`No ${ROLE_LABELS[activeRole]} accounts yet`}
                description="Ask them to register with this role, then they'll show up here."
              />
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {directory.map((entry) => (
                  <div key={entry.user._id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-medium text-accent">
                        {entry.user.name?.[0] ?? "?"}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{entry.user.name}</p>
                          <VerificationBadge status={entry.user.verificationStatus} />
                        </div>
                        <p className="flex items-center gap-1 text-xs text-muted">
                          <Mail className="h-3 w-3" /> {entry.user.email}
                          {entry.user.company ? ` · ${entry.user.company}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <FolderKanban className="h-3.5 w-3.5" /> {entry.projectCount} project
                        {entry.projectCount === 1 ? "" : "s"}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <ClipboardList className="h-3.5 w-3.5" /> {entry.openTaskCount} open task
                        {entry.openTaskCount === 1 ? "" : "s"}
                      </span>
                      <Select
                        className="h-8 w-40 text-xs"
                        value={assignProjectId[entry.user.email] || ""}
                        onChange={(e) =>
                          setAssignProjectId((prev) => ({ ...prev, [entry.user.email]: e.target.value }))
                        }
                      >
                        <option value="">Assign to...</option>
                        {projects.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name}
                          </option>
                        ))}
                      </Select>
                      <Button
                        size="sm"
                        loading={assigningEmail === entry.user.email}
                        onClick={() => handleAssign(entry.user.email)}
                      >
                        Assign
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

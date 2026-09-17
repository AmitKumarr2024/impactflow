"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import {
  useAppDispatch,
  useAppSelector,
} from "@/store/hooks";

import {
  fetchProject,
  setCurrentProject,
} from "@/store/projectSlice";

import { fetchChanges } from "@/store/changeSlice";
import { fetchApprovals } from "@/store/approvalSlice";
import { fetchMaterials } from "@/store/materialSlice";
import { fetchSiteObservations } from "@/store/siteSlice";
import { fetchMembers } from "@/store/memberSlice";
import { fetchActivity } from "@/store/activitySlice";

import {
  Card,
  StatusBadge,
  LoadingState,
  EmptyState,
} from "@/components/ui/primitives";

import { Button } from "@/components/ui/Button";

import { formatDate } from "@/lib/utils";

import { api, ApiError } from "@/lib/api";

import {
  ArrowRight,
  ArrowUpRight,
  GitPullRequestArrow,
  ShieldCheck,
  Package,
  HardHat,
  Users,
  MapPin,
  Calendar,
  History,
  UserPlus,
  ChevronDown,
  Loader2,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ProjectStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "ARCHIVED";

const PROJECT_STATUSES: ProjectStatus[] = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
];

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);

  const dispatch = useAppDispatch();

  /* ------------------------------------------------------------------------ */
  /* Redux                                                                     */
  /* ------------------------------------------------------------------------ */

  const project = useAppSelector((state) =>
    state.projects.items.find(
      (item) => item._id === projectId,
    ),
  );

  const changes =
    useAppSelector(
      (state) =>
        state.changes.byProject[projectId],
    ) || [];

  const approvals =
    useAppSelector(
      (state) =>
        state.approvals.byProject[projectId],
    ) || [];

  const materials =
    useAppSelector(
      (state) =>
        state.materials.byProject[projectId],
    ) || [];

  const observations =
    useAppSelector(
      (state) =>
        state.site.byProject[projectId],
    ) || [];

  const members =
    useAppSelector(
      (state) =>
        state.members.byProject[projectId],
    ) || [];

  const activity =
    useAppSelector(
      (state) =>
        state.activity.byProject[projectId],
    ) || [];

  const user = useAppSelector(
    (state) => state.auth.user,
  );

  /* ------------------------------------------------------------------------ */
  /* Local state                                                               */
  /* ------------------------------------------------------------------------ */

  const [updatingStatus, setUpdatingStatus] =
    useState(false);

  const [statusMenuOpen, setStatusMenuOpen] =
    useState(false);

  /* ------------------------------------------------------------------------ */
  /* Fetch project ecosystem                                                   */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    dispatch(
      setCurrentProject(projectId),
    );

    dispatch(
      fetchProject(projectId),
    );

    dispatch(
      fetchChanges(projectId),
    );

    dispatch(
      fetchApprovals(projectId),
    );

    dispatch(
      fetchMaterials(projectId),
    );

    dispatch(
      fetchSiteObservations(projectId),
    );

    dispatch(
      fetchMembers(projectId),
    );

    dispatch(
      fetchActivity(projectId),
    );
  }, [projectId, dispatch]);

  /* ------------------------------------------------------------------------ */
  /* Update Project Status                                                     */
  /* ------------------------------------------------------------------------ */

  async function handleStatusChange(
    status: ProjectStatus,
  ) {
    if (!project) return;

    if (status === project.status) {
      setStatusMenuOpen(false);
      return;
    }

    setUpdatingStatus(true);
    setStatusMenuOpen(false);

    try {
      await api.patch(
        `/api/projects/${projectId}`,
        {
          status,
        },
      );

      /**
       * Refresh the project from backend.
       *
       * This keeps Redux as the source of truth instead
       * of manually modifying the project object.
       */
      await dispatch(
        fetchProject(projectId),
      ).unwrap();

      toast.success(
        `Project status changed to ${formatStatus(status)}`,
      );
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not update project status",
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Loading                                                                    */
  /* ------------------------------------------------------------------------ */

  if (!project) {
    return (
      <LoadingState
        label="Loading project..."
      />
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Computed metrics                                                          */
  /* ------------------------------------------------------------------------ */

  const activeChanges =
    changes.filter(
      (change) =>
        ![
          "APPROVED",
          "REJECTED",
          "SUPERSEDED",
          "IMPLEMENTED",
        ].includes(change.status),
    );

  const highImpactChanges =
    changes.filter(
      (change) =>
        change.status ===
        "IMPACT_REVIEW" ||
        change.status ===
        "PENDING_APPROVAL",
    );

  const pendingApprovals =
    approvals.filter(
      (approval) =>
        approval.status ===
        "PENDING",
    );

  const blockedTaskCount =
    pendingApprovals.reduce(
      (sum, approval) =>
        sum +
        (approval.blockedTaskIds
          ?.length || 0),
      0,
    );

  const unavailableMaterials =
    materials.filter(
      (material) =>
        !material.available,
    );

  const openObservations =
    observations.filter(
      (observation) =>
        observation.status ===
        "OPEN" ||
        observation.status ===
        "UNDER_REVIEW",
    );

  const latestChange =
    changes[0];

  /**
   * Real project progress.
   *
   * Decided changes:
   * APPROVED + IMPLEMENTED
   */
  const decidedChanges =
    changes.filter(
      (change) =>
        change.status ===
        "APPROVED" ||
        change.status ===
        "IMPLEMENTED",
    ).length;

  const progressPct =
    changes.length > 0
      ? Math.round(
        (decidedChanges /
          changes.length) *
        100,
      )
      : 0;

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------------------------ */}
      {/* Hero Header                                                        */}
      {/* ------------------------------------------------------------------ */}

      <div className="overflow-hidden rounded-xl border border-border bg-gradient-to-br from-accent/20 via-surface to-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Project identity */}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {project.name}
              </h1>

              {/* -------------------------------------------------------- */}
              {/* Project Status Control                                  */}
              {/* -------------------------------------------------------- */}

              {user?.role === "ADMIN" ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setStatusMenuOpen(
                        (value) =>
                          !value,
                      )
                    }
                    disabled={
                      updatingStatus
                    }
                    className="inline-flex items-center gap-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-haspopup="listbox"
                    aria-expanded={
                      statusMenuOpen
                    }
                  >
                    {updatingStatus ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-raised px-2.5 py-1 text-xs font-medium text-muted">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Updating...
                      </span>
                    ) : (
                      <>
                        <StatusBadge
                          status={
                            project.status
                          }
                        />

                        <ChevronDown className="h-3.5 w-3.5 text-muted" />
                      </>
                    )}
                  </button>

                  {statusMenuOpen && (
                    <div
                      className="absolute left-0 top-full z-50 mt-2 min-w-[170px] overflow-hidden rounded-lg border border-border bg-surface-raised p-1 shadow-xl"
                      role="listbox"
                    >
                      {PROJECT_STATUSES.map(
                        (status) => {
                          const selected =
                            status ===
                            project.status;

                          return (
                            <button
                              key={status}
                              type="button"
                              role="option"
                              aria-selected={
                                selected
                              }
                              onClick={() =>
                                handleStatusChange(
                                  status,
                                )
                              }
                              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors ${selected
                                  ? "bg-accent/10 text-accent"
                                  : "text-foreground hover:bg-surface"
                                }`}
                            >
                              <span>
                                {formatStatus(
                                  status,
                                )}
                              </span>

                              {selected && (
                                <span className="text-accent">
                                  ✓
                                </span>
                              )}
                            </button>
                          );
                        },
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <StatusBadge
                  status={
                    project.status
                  }
                />
              )}
            </div>

            <p className="mt-1 text-sm text-muted">
              {project.projectCode}
            </p>

            {project.description && (
              <p className="mt-3 max-w-xl text-sm text-muted">
                {project.description}
              </p>
            )}
          </div>

          {/* Project metadata */}
          <div className="flex flex-col items-end gap-1 text-right text-sm text-muted">
            {project.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />

                {project.location}
              </span>
            )}

            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />

              {formatDate(
                project.startDate,
              )}

              <span>→</span>

              {formatDate(
                project.expectedEndDate,
              )}
            </span>
          </div>
        </div>

        {/* Project progress */}
        {changes.length > 0 && (
          <div className="mt-5 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{
                  width: `${progressPct}%`,
                }}
              />
            </div>

            <span className="shrink-0 text-xs font-medium text-muted">
              {progressPct}% of
              changes decided
            </span>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* KPI Row                                                            */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          icon={GitPullRequestArrow}
          label="Active changes"
          value={
            activeChanges.length
          }
          accent={
            highImpactChanges.length >
            0
          }
        />

        <KpiCard
          icon={ShieldCheck}
          label="Pending approvals"
          value={
            pendingApprovals.length
          }
          sublabel={
            blockedTaskCount > 0
              ? `blocking ${blockedTaskCount}`
              : undefined
          }
          accent={
            pendingApprovals.length >
            0
          }
        />

        <KpiCard
          icon={Package}
          label="Material issues"
          value={
            unavailableMaterials.length
          }
          accent={
            unavailableMaterials.length >
            0
          }
        />

        <KpiCard
          icon={HardHat}
          label="Open observations"
          value={
            openObservations.length
          }
        />

        <KpiCard
          icon={Users}
          label="Team members"
          value={
            members.length
          }
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main Content                                                       */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Latest Change */}
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">
              Latest change
            </h2>

            <Link
              href={`/projects/${projectId}/changes`}
              className="flex items-center gap-1 text-sm text-accent hover:underline"
            >
              View all

              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {!latestChange ? (
            <EmptyState
              title="No changes yet"
              description="Create a change request to see the Impact Engine in action."
            />
          ) : (
            <Link
              href={`/projects/${projectId}/changes/${latestChange._id}`}
              className="group block"
            >
              <div className="rounded-lg border border-border p-4 transition-colors group-hover:border-accent/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {latestChange.title}
                    </p>

                    <p className="mt-0.5 text-xs text-muted">
                      {latestChange.category.replace(
                        /_/g,
                        " ",
                      )}{" "}
                      · requested{" "}
                      {formatDate(
                        latestChange.requestedAt,
                      )}
                    </p>
                  </div>

                  <StatusBadge
                    status={
                      latestChange.status
                    }
                  />
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-muted">
                  {
                    latestChange.description
                  }
                </p>

                <div className="mt-3 flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                  View impact analysis

                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </div>
            </Link>
          )}
        </Card>

        {/* Activity */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">
              Recent activity
            </h2>

            <Link
              href={`/projects/${projectId}/activity`}
              className="flex items-center gap-1 text-sm text-accent hover:underline"
            >
              View all

              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {activity.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <div className="flex flex-col gap-3">
              {activity
                .slice(0, 5)
                .map((item) => (
                  <div
                    key={item._id}
                    className="flex gap-2.5"
                  >
                    <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />

                    <div>
                      <p className="text-xs text-foreground">
                        {item.summary}
                      </p>

                      <p className="text-[11px] text-muted">
                        {formatDate(
                          item.createdAt,
                        )}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Members                                                            */}
      {/* ------------------------------------------------------------------ */}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">
            Project members
          </h2>

          <Link
            href={`/projects/${projectId}/members`}
          >
            <Button
              variant="secondary"
              size="sm"
            >
              <UserPlus className="h-3.5 w-3.5" />

              Invite
            </Button>
          </Link>
        </div>

        {members.length === 0 ? (
          <EmptyState title="No members yet" />
        ) : (
          <div className="flex flex-wrap gap-3">
            {members.map((member) => (
              <div
                key={member._id}
                className="flex items-center gap-2 rounded-full border border-border bg-surface-raised py-1 pl-1 pr-3"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-xs font-medium text-accent">
                  {member.user?.name?.[0] ??
                    "?"}
                </span>

                <span className="text-xs text-foreground">
                  {member.user?.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatStatus(
  status: ProjectStatus,
) {
  switch (status) {
    case "PLANNING":
      return "Planning";

    case "ACTIVE":
      return "Active";

    case "ON_HOLD":
      return "On Hold";

    case "COMPLETED":
      return "Completed";

    case "ARCHIVED":
      return "Archived";

    default:
      return status;
  }
}

/* -------------------------------------------------------------------------- */
/* KPI Card                                                                   */
/* -------------------------------------------------------------------------- */

function KpiCard({
  icon: Icon,
  label,
  value,
  sublabel,
  accent,
}: {
  icon: React.ComponentType<{
    className?: string;
  }>;
  label: string;
  value: number;
  sublabel?: string;
  accent?: boolean;
}) {
  return (
    <Card
      className={
        accent
          ? "border-status-high/30"
          : undefined
      }
    >
      <Icon
        className={
          accent
            ? "h-4 w-4 text-status-high"
            : "h-4 w-4 text-muted"
        }
      />

      <p className="mt-2 text-2xl font-semibold text-foreground">
        {value}
      </p>

      <p className="text-xs text-muted">
        {label}
      </p>

      {sublabel && (
        <p className="mt-0.5 text-[11px] text-status-high">
          {sublabel}
        </p>
      )}
    </Card>
  );
}
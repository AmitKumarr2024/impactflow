"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchChanges } from "@/store/changeSlice";
import { fetchApprovals } from "@/store/approvalSlice";
import { fetchMaterials } from "@/store/materialSlice";
import { Card, EmptyState, StatusBadge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { AlertTriangle, ArrowRight, Package, ShieldAlert } from "lucide-react";

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const currentProjectId = useAppSelector((s) => s.projects.currentProjectId);
  const projects = useAppSelector((s) => s.projects.items);
  const changes = useAppSelector((s) => (currentProjectId ? s.changes.byProject[currentProjectId] : undefined)) || [];
  const approvals = useAppSelector((s) => (currentProjectId ? s.approvals.byProject[currentProjectId] : undefined)) || [];
  const materials = useAppSelector((s) => (currentProjectId ? s.materials.byProject[currentProjectId] : undefined)) || [];

  useEffect(() => {
    if (!currentProjectId) return;
    dispatch(fetchChanges(currentProjectId));
    dispatch(fetchApprovals(currentProjectId));
    dispatch(fetchMaterials(currentProjectId));
  }, [currentProjectId, dispatch]);

  if (projects.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No projects yet"
          description="Create your first project to start tracking changes and their impact."
        />
        <div className="mt-4 flex justify-center">
          <Link href="/projects">
            <Button>Create a project</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const highImpactChanges = changes.filter((c) => c.status === "IMPACT_REVIEW" || c.status === "PENDING_APPROVAL");
  const pendingApprovals = approvals.filter((a) => a.status === "PENDING");
  const unavailableMaterials = materials.filter((m) => !m.available);
  const blockedTaskCount = pendingApprovals.reduce((sum, a) => sum + (a.blockedTaskIds?.length || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted">Here&apos;s what needs your attention right now.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-2 text-muted">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Changes needing review</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{highImpactChanges.length}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-muted">
            <ShieldAlert className="h-4 w-4" />
            <span className="text-sm">Pending approvals</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{pendingApprovals.length}</p>
          {blockedTaskCount > 0 && (
            <p className="mt-1 text-xs text-status-high">blocking {blockedTaskCount} task(s)</p>
          )}
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-muted">
            <Package className="h-4 w-4" />
            <span className="text-sm">Unavailable materials</span>
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{unavailableMaterials.length}</p>
        </Card>
      </div>

      {currentProjectId && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Recent changes</h2>
            <Link
              href={`/projects/${currentProjectId}/changes`}
              className="flex items-center gap-1 text-sm text-accent hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {changes.length === 0 ? (
            <EmptyState title="No changes yet" description="Create a change request to see the Impact Engine in action." />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {changes.slice(0, 5).map((c) => (
                <Link
                  key={c._id}
                  href={`/projects/${currentProjectId}/changes/${c._id}`}
                  className="flex items-center justify-between py-3 hover:bg-surface-raised -mx-5 px-5"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.title}</p>
                    <p className="text-xs text-muted">{c.category.replace(/_/g, " ")}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

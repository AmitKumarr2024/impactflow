"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchChange, fetchImpact, analyzeChange, approveChange, rejectChange, updateChangeLinks } from "@/store/changeSlice";
import { fetchMaterials } from "@/store/materialSlice";
import { fetchDrawings } from "@/store/drawingSlice";
import { fetchTasks } from "@/store/taskSlice";
import { Button } from "@/components/ui/Button";
import { Card, StatusBadge, LoadingState, EmptyState, Label } from "@/components/ui/primitives";
import { ImpactNetworkGraph } from "@/components/impact/ImpactNetworkGraph";
import { EntityMultiSelect } from "@/components/ui/EntityMultiSelect";
import { ApiError } from "@/lib/api";
import { formatCurrency, formatDate, formatDays, isPopulated } from "@/lib/utils";
import {
  Sparkles,
  Check,
  X,
  Users,
  Package,
  Ruler,
  ClipboardList,
  ShieldCheck,
  IndianRupee,
  CalendarClock,
  ArrowLeft,
  Pencil,
  ExternalLink,
} from "lucide-react";

const IMPACT_COLORS: Record<string, string> = {
  CRITICAL: "text-status-critical",
  HIGH: "text-status-high",
  MEDIUM: "text-status-medium",
  LOW: "text-status-low",
};

export default function ChangeDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; changeId: string }>;
}) {
  const { projectId, changeId } = use(params);
  const dispatch = useAppDispatch();
  const change = useAppSelector((s) => s.changes.current);
  const impact = useAppSelector((s) => s.changes.currentImpact);
  const analyzing = useAppSelector((s) => s.changes.analyzing);
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null);
  const [editingLinks, setEditingLinks] = useState(false);
  const [savingLinks, setSavingLinks] = useState(false);
  const [draftMaterials, setDraftMaterials] = useState<string[]>([]);
  const [draftDrawings, setDraftDrawings] = useState<string[]>([]);
  const [draftTasks, setDraftTasks] = useState<string[]>([]);

  const materials = useAppSelector((s) => s.materials.byProject[projectId]) || [];
  const drawings = useAppSelector((s) => s.drawings.byProject[projectId]) || [];
  const tasks = useAppSelector((s) => s.tasks.byProject[projectId]) || [];

  useEffect(() => {
    dispatch(fetchChange(changeId));
    dispatch(fetchImpact(changeId));
  }, [changeId, dispatch]);

  useEffect(() => {
    if (!editingLinks) return;
    dispatch(fetchMaterials(projectId));
    dispatch(fetchDrawings(projectId));
    dispatch(fetchTasks(projectId));
  }, [editingLinks, projectId, dispatch]);

  function idOf(ref: string | { _id: string }) {
    return isPopulated(ref) ? ref._id : ref;
  }

  function startEditingLinks() {
    if (!change) return;
    setDraftMaterials(change.affectedMaterials.map(idOf));
    setDraftDrawings(change.affectedDrawings.map(idOf));
    setDraftTasks(change.affectedTasks.map(idOf));
    setEditingLinks(true);
  }

  async function handleSaveLinks() {
    setSavingLinks(true);
    try {
      await dispatch(
        updateChangeLinks({
          id: changeId,
          affectedMaterials: draftMaterials,
          affectedDrawings: draftDrawings,
          affectedTasks: draftTasks,
        })
      ).unwrap();
      toast.success("Affected items updated -- re-run Analyze Impact to refresh the summary");
      setEditingLinks(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update links");
    } finally {
      setSavingLinks(false);
    }
  }

  async function handleAnalyze() {
    try {
      await dispatch(analyzeChange(changeId)).unwrap();
      toast.success("Impact analysis complete");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Analysis failed");
    }
  }

  async function handleApprove() {
    setActionLoading("approve");
    try {
      await dispatch(approveChange(changeId)).unwrap();
      toast.success("Change approved");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not approve");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject() {
    setActionLoading("reject");
    try {
      await dispatch(rejectChange(changeId)).unwrap();
      toast.success("Change rejected");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not reject");
    } finally {
      setActionLoading(null);
    }
  }

  if (!change || change._id !== changeId) return <LoadingState label="Loading change..." />;

  const canDecide = change.status !== "APPROVED" && change.status !== "REJECTED";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/projects/${projectId}/changes`}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to changes
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">{change.title}</h1>
            <StatusBadge status={change.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {change.category.replace(/_/g, " ")} · {change.priority} priority · requested{" "}
            {formatDate(change.requestedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleAnalyze} loading={analyzing}>
            <Sparkles className="h-4 w-4" /> Analyze Impact
          </Button>
          {canDecide && (
            <>
              <Button variant="danger" onClick={handleReject} loading={actionLoading === "reject"}>
                <X className="h-4 w-4" /> Reject
              </Button>
              <Button onClick={handleApprove} loading={actionLoading === "approve"}>
                <Check className="h-4 w-4" /> Approve
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Change summary */}
      <Card>
        <h2 className="mb-2 text-sm font-medium text-foreground">Change Summary</h2>
        <p className="text-sm text-muted">{change.description}</p>
        {change.reason && (
          <p className="mt-2 text-sm text-muted">
            <span className="font-medium text-foreground">Reason: </span>
            {change.reason}
          </p>
        )}
      </Card>

      {/* Affected Items -- explicit links driving the Impact Engine, not just shared projectId */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-foreground">Affected Items</h2>
            <p className="mt-0.5 text-xs text-muted">
              Link the materials, drawings, and tasks affected by this change to calculate its impact.
            </p>
          </div>
          {!editingLinks && (
            <Button variant="secondary" size="sm" onClick={startEditingLinks}>
              <Pencil className="h-3.5 w-3.5" /> Edit links
            </Button>
          )}
        </div>

        {editingLinks ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Materials</Label>
                <EntityMultiSelect
                  options={materials.map((m) => ({ _id: m._id, label: m.name, sublabel: m.category }))}
                  selectedIds={draftMaterials}
                  onChange={setDraftMaterials}
                  placeholder="Search materials..."
                  emptyLabel="No materials in this project yet"
                />
              </div>
              <div>
                <Label className="text-xs">Drawings</Label>
                <EntityMultiSelect
                  options={drawings.map((d) => ({ _id: d._id, label: d.name, sublabel: `Rev ${d.revision}` }))}
                  selectedIds={draftDrawings}
                  onChange={setDraftDrawings}
                  placeholder="Search drawings..."
                  emptyLabel="No drawings in this project yet"
                />
              </div>
              <div>
                <Label className="text-xs">Tasks</Label>
                <EntityMultiSelect
                  options={tasks.map((t) => ({ _id: t._id, label: t.title, sublabel: t.type }))}
                  selectedIds={draftTasks}
                  onChange={setDraftTasks}
                  placeholder="Search tasks..."
                  emptyLabel="No tasks in this project yet"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveLinks} loading={savingLinks}>
                Save links
              </Button>
              <Button variant="secondary" onClick={() => setEditingLinks(false)} disabled={savingLinks}>
                Cancel
              </Button>
            </div>
          </div>
        ) : change.affectedMaterials.length === 0 && change.affectedDrawings.length === 0 && change.affectedTasks.length === 0 ? (
          <EmptyState
            title="No items linked to this change yet"
            description="Click Edit links to connect the materials, drawings, and tasks this change actually affects."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <AffectedGroup
              title="Materials"
              icon={Package}
              items={change.affectedMaterials}
              getLabel={(m) => (isPopulated(m) ? m.name : m)}
              getHref={() => `/projects/${projectId}/materials`}
            />
            <AffectedGroup
              title="Drawings"
              icon={Ruler}
              items={change.affectedDrawings}
              getLabel={(d) => (isPopulated(d) ? `${d.name} (Rev ${d.revision})` : d)}
              getHref={() => `/projects/${projectId}/drawings`}
            />
            <AffectedGroup
              title="Tasks"
              icon={ClipboardList}
              items={change.affectedTasks}
              getLabel={(t) => (isPopulated(t) ? t.title : t)}
              getHref={() => `/projects/${projectId}/tasks`}
            />
          </div>
        )}
      </Card>

      {/* Impact summary -- the centerpiece */}
      <Card className={impact ? "border-accent/30" : undefined}>
        <h2 className="mb-4 text-sm font-medium text-foreground">Impact Summary</h2>
        {!impact ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-muted">
              No impact analysis yet. Run the Impact Engine to see what this change affects.
            </p>
            <Button onClick={handleAnalyze} loading={analyzing}>
              <Sparkles className="h-4 w-4" /> Analyze Impact
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-baseline gap-3">
              <span className={`text-3xl font-semibold ${IMPACT_COLORS[impact.impactLevel]}`}>
                {impact.impactLevel}
              </span>
              <span className="text-xs text-muted">
                estimated impact · generated {formatDate(impact.generatedAt)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <ImpactMetric icon={Users} label="Stakeholders" value={impact.affectedStakeholders.length} />
              <ImpactMetric icon={Package} label="Materials" value={impact.affectedMaterials.length} />
              <ImpactMetric icon={Ruler} label="Drawings" value={impact.affectedDrawings.length} />
              <ImpactMetric icon={ClipboardList} label="Tasks" value={impact.affectedTasks.length} />
              <ImpactMetric icon={ShieldCheck} label="Approvals" value={impact.affectedApprovals.length} />
              <ImpactMetric
                icon={IndianRupee}
                label="Cost"
                value={formatCurrency(impact.estimatedCostDelta)}
                muted={impact.estimatedCostDelta === 0}
              />
            </div>

            {impact.estimatedScheduleDeltaDays !== 0 && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <CalendarClock className="h-4 w-4" />
                Estimated schedule impact: {formatDays(impact.estimatedScheduleDeltaDays)}
              </div>
            )}

            {impact.reasons.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Why</p>
                <ul className="flex flex-col gap-1.5">
                  {impact.reasons.map((r, i) => (
                    <li key={i} className="text-sm text-muted before:mr-2 before:content-['•']">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs italic text-muted">
              This is an estimated impact based on current project data, not a guaranteed outcome.
            </p>
          </div>
        )}
      </Card>

      {impact && (
        <Card>
          <h2 className="mb-1 text-sm font-medium text-foreground">Impact Network</h2>
          <p className="mb-2 text-xs text-muted">
            What this change touches, sized by the Impact Engine&apos;s real counts.
          </p>
          <ImpactNetworkGraph impact={impact} />
        </Card>
      )}
    </div>
  );
}

function ImpactMetric({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-raised p-3">
      <Icon className="h-4 w-4 text-muted" />
      <p className={`mt-2 text-lg font-semibold ${muted ? "text-muted" : "text-foreground"}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function AffectedGroup<T>({
  title,
  icon: Icon,
  items,
  getLabel,
  getHref,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: T[];
  getLabel: (item: T) => string;
  getHref: (item: T) => string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
        <Icon className="h-3.5 w-3.5" /> {title} ({items.length})
      </p>
      <ul className="flex flex-col gap-1">
        {items.map((item, i) => (
          <li key={i}>
            <Link
              href={getHref(item)}
              className="flex items-center gap-1 text-sm text-foreground hover:text-accent"
            >
              {getLabel(item)}
              <ExternalLink className="h-3 w-3 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

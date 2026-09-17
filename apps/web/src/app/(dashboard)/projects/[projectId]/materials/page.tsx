"use client";

import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchMaterials,
  createMaterial,
  markMaterialUnavailable,
  fetchSubstitutions,
  proposeSubstitution,
  voteOnSubstitution,
  commentOnSubstitution,
  decideSubstitution,
} from "@/store/materialSlice";
import { Button } from "@/components/ui/Button";
import { Card, Input, Label, EmptyState, LoadingState } from "@/components/ui/primitives";
import { ApiError } from "@/lib/api";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Material, MaterialAlternative } from "@/types";
import { AlertTriangle, CheckCircle2, Plus, ThumbsUp, ThumbsDown, MessageCircle, Check, X } from "lucide-react";

const CAN_DECIDE_ROLES = ["ADMIN", "CLIENT", "ARCHITECT", "CONSULTANT"];

export default function MaterialsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const dispatch = useAppDispatch();
  const materials = useAppSelector((s) => s.materials.byProject[projectId]);
  const status = useAppSelector((s) => s.materials.status);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", price: "", leadTimeDays: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchMaterials(projectId));
  }, [projectId, dispatch]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await dispatch(
        createMaterial({
          projectId,
          name: form.name,
          category: form.category || undefined,
          price: Number(form.price),
          leadTimeDays: Number(form.leadTimeDays),
        })
      ).unwrap();
      toast.success("Material added -- suppliers can now propose estimates for it");
      setShowForm(false);
      setForm({ name: "", category: "", price: "", leadTimeDays: "" });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add material");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading" && !materials) return <LoadingState />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Materials</h1>
          <p className="mt-1 text-sm text-muted">
            Request a material, let suppliers estimate it, and let the team vote before it&apos;s finalized.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> New material
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
              <Label>Reference price (₹)</Label>
              <Input
                required
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
            <div>
              <Label>Lead time (days)</Label>
              <Input
                required
                type="number"
                value={form.leadTimeDays}
                onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" loading={submitting}>
                Add material
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!materials || materials.length === 0 ? (
        <Card>
          <EmptyState
            title="No materials yet"
            description='Add a material above -- suppliers on the project can then propose estimates for it under "Propose alternative".'
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {materials.map((m) => (
            <MaterialCard
              key={m._id}
              material={m}
              expanded={expandedId === m._id}
              onToggle={() => setExpandedId(expandedId === m._id ? null : m._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MaterialCard({
  material,
  expanded,
  onToggle,
}: {
  material: Material;
  expanded: boolean;
  onToggle: () => void;
}) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);
  const alternatives = useAppSelector((s) => s.materials.substitutionsByMaterial[material._id]) || [];
  const [reason, setReason] = useState("");
  const [altName, setAltName] = useState("");
  const [altPrice, setAltPrice] = useState("");
  const [altLeadTime, setAltLeadTime] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (expanded) dispatch(fetchSubstitutions(material._id));
  }, [expanded, material._id, dispatch]);

  async function handleMarkUnavailable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await dispatch(markMaterialUnavailable({ id: material._id, reason })).unwrap();
      toast.success(`${material.name} marked unavailable`);
      setReason("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handlePropose(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await dispatch(
        proposeSubstitution({
          materialId: material._id,
          name: altName,
          price: Number(altPrice),
          leadTimeDays: Number(altLeadTime),
        })
      ).unwrap();
      toast.success(`${altName} proposed -- the team can vote on it now`);
      setAltName("");
      setAltPrice("");
      setAltLeadTime("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className={cn(!material.available && "border-status-high/40")}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-foreground">{material.name}</p>
          {material.category && <p className="text-xs text-muted">{material.category}</p>}
        </div>
        {material.available ? (
          <CheckCircle2 className="h-4 w-4 text-status-approved" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-status-high" />
        )}
      </div>

      <div className="mt-3 flex gap-4 text-sm text-muted">
        <span>₹{material.price.toLocaleString("en-IN")}</span>
        <span>{material.leadTimeDays} day lead time</span>
      </div>

      {!material.available && material.unavailableReason && (
        <p className="mt-2 text-xs text-status-high">{material.unavailableReason}</p>
      )}

      <button onClick={onToggle} className="mt-3 text-xs text-accent hover:underline">
        {expanded ? "Hide" : "View estimates & actions"}
      </button>

      {expanded && (
        <div className="mt-3 flex flex-col gap-4 border-t border-border pt-3">
          {alternatives.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Proposed estimates</p>
              {alternatives.map((alt) => (
                <AlternativeCard key={alt._id} alternative={alt} materialId={material._id} currentUserId={currentUser?._id} />
              ))}
            </div>
          )}

          {material.available && (
            <form onSubmit={handleMarkUnavailable} className="flex flex-col gap-2">
              <Label className="text-xs">Mark unavailable</Label>
              <Input
                required
                placeholder="Reason (e.g. quarry delay)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <Button type="submit" variant="secondary" size="sm" loading={busy}>
                Mark unavailable
              </Button>
            </form>
          )}
          <form onSubmit={handlePropose} className="flex flex-col gap-2">
            <Label className="text-xs">Propose an estimate (suppliers, or anyone with a quote)</Label>
            <Input required placeholder="Alternative name" value={altName} onChange={(e) => setAltName(e.target.value)} />
            <div className="flex gap-2">
              <Input
                required
                type="number"
                placeholder="Price"
                value={altPrice}
                onChange={(e) => setAltPrice(e.target.value)}
              />
              <Input
                required
                type="number"
                placeholder="Lead time (days)"
                value={altLeadTime}
                onChange={(e) => setAltLeadTime(e.target.value)}
              />
            </div>
            <Button type="submit" size="sm" loading={busy}>
              Propose estimate
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}

function AlternativeCard({
  alternative,
  materialId,
  currentUserId,
}: {
  alternative: MaterialAlternative;
  materialId: string;
  currentUserId?: string;
}) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);

  const upvotes = alternative.votes.filter((v) => v.vote === "UP").length;
  const downvotes = alternative.votes.filter((v) => v.vote === "DOWN").length;
  const myVote = alternative.votes.find((v) => v.userId === currentUserId)?.vote;
  const canDecide = currentUser && CAN_DECIDE_ROLES.includes(currentUser.role);

  async function handleVote(vote: "UP" | "DOWN") {
    setBusy(true);
    try {
      await dispatch(voteOnSubstitution({ id: alternative._id, materialId, vote })).unwrap();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Vote failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setBusy(true);
    try {
      await dispatch(commentOnSubstitution({ id: alternative._id, materialId, text: commentText })).unwrap();
      setCommentText("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Comment failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDecide(decision: "APPROVED" | "REJECTED") {
    setBusy(true);
    try {
      await dispatch(decideSubstitution({ id: alternative._id, materialId, status: decision })).unwrap();
      toast.success(decision === "APPROVED" ? `${alternative.name} finalized` : `${alternative.name} rejected`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not decide");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{alternative.name}</p>
          <p className="text-xs text-muted">
            ₹{alternative.price.toLocaleString("en-IN")} ({formatCurrency(alternative.priceDelta)}) ·{" "}
            {alternative.leadTimeDays}d lead time
          </p>
        </div>
        <span
          className={cn(
            "rounded px-2 py-0.5 text-[10px] font-medium",
            alternative.status === "APPROVED" && "bg-status-approved/15 text-status-approved",
            alternative.status === "REJECTED" && "bg-status-blocked/15 text-status-blocked",
            alternative.status === "PROPOSED" && "bg-status-pending/15 text-status-pending"
          )}
        >
          {alternative.status}
        </span>
      </div>

      {alternative.notes && <p className="mt-1 text-xs text-muted">{alternative.notes}</p>}

      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={() => handleVote("UP")}
          disabled={busy}
          className={cn(
            "flex items-center gap-1 text-xs",
            myVote === "UP" ? "text-status-approved" : "text-muted hover:text-foreground"
          )}
        >
          <ThumbsUp className="h-3.5 w-3.5" /> {upvotes}
        </button>
        <button
          onClick={() => handleVote("DOWN")}
          disabled={busy}
          className={cn(
            "flex items-center gap-1 text-xs",
            myVote === "DOWN" ? "text-status-critical" : "text-muted hover:text-foreground"
          )}
        >
          <ThumbsDown className="h-3.5 w-3.5" /> {downvotes}
        </button>
        <span className="flex items-center gap-1 text-xs text-muted">
          <MessageCircle className="h-3.5 w-3.5" /> {alternative.comments.length}
        </span>

        {canDecide && alternative.status === "PROPOSED" && (
          <div className="ml-auto flex gap-1.5">
            <button
              onClick={() => handleDecide("APPROVED")}
              disabled={busy}
              className="flex items-center gap-1 rounded bg-status-approved/15 px-2 py-1 text-[11px] font-medium text-status-approved hover:brightness-110"
            >
              <Check className="h-3 w-3" /> Finalize
            </button>
            <button
              onClick={() => handleDecide("REJECTED")}
              disabled={busy}
              className="flex items-center gap-1 rounded bg-status-critical/15 px-2 py-1 text-[11px] font-medium text-status-critical hover:brightness-110"
            >
              <X className="h-3 w-3" /> Reject
            </button>
          </div>
        )}
      </div>

      {alternative.comments.length > 0 && (
        <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2">
          {alternative.comments.map((c, i) => (
            <p key={i} className="text-xs text-muted">
              <span className="text-foreground">{c.userId === currentUserId ? "You" : "Team member"}:</span>{" "}
              {c.text} <span className="text-[10px]">· {formatDate(c.createdAt)}</span>
            </p>
          ))}
        </div>
      )}

      <form onSubmit={handleComment} className="mt-2 flex gap-2">
        <Input
          placeholder="Add a comment..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="h-8 text-xs"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={busy}>
          Post
        </Button>
      </form>
    </div>
  );
}

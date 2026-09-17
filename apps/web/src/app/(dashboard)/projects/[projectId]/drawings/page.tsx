"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchDrawings, createDrawing } from "@/store/drawingSlice";
import { Button } from "@/components/ui/Button";
import { Card, Input, Label, Select, EmptyState, StatusBadge, LoadingState } from "@/components/ui/primitives";
import { FileUpload } from "@/components/ui/FileUpload";
import { ApiError } from "@/lib/api";
import type { MediaAsset } from "@/lib/upload";
import { Plus, Ruler, ExternalLink } from "lucide-react";

export default function DrawingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const dispatch = useAppDispatch();
  const drawings = useAppSelector((s) => s.drawings.byProject[projectId]);
  const status = useAppSelector((s) => s.drawings.status);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", supersedesDrawingId: "" });
  const [uploadedAsset, setUploadedAsset] = useState<MediaAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchDrawings(projectId));
  }, [projectId, dispatch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uploadedAsset) {
      toast.error("Upload a drawing file first");
      return;
    }
    setSubmitting(true);
    try {
      await dispatch(
        createDrawing({
          projectId,
          name: form.name,
          category: form.category || undefined,
          fileUrl: uploadedAsset.url,
          cloudinaryPublicId: uploadedAsset.publicId,
          supersedesDrawingId: form.supersedesDrawingId || undefined,
        })
      ).unwrap();
      toast.success("Drawing revision created");
      setShowForm(false);
      setForm({ name: "", category: "", supersedesDrawingId: "" });
      setUploadedAsset(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create drawing");
    } finally {
      setSubmitting(false);
    }
  }

  const currentDrawings = (drawings || []).filter((d) => d.status !== "SUPERSEDED");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Drawings</h1>
          <p className="mt-1 text-sm text-muted">Keep the design connected to what&apos;s actually current.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> New revision
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Drawing file</Label>
              <FileUpload
                projectId={projectId}
                entityType="Drawing"
                onUploaded={setUploadedAsset}
                label="Upload drawing from your device"
              />
            </div>
            <div>
              <Label>Supersedes (optional)</Label>
              <Select
                value={form.supersedesDrawingId}
                onChange={(e) => setForm({ ...form, supersedesDrawingId: e.target.value })}
              >
                <option value="">None</option>
                {currentDrawings.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} Rev {d.revision}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" loading={submitting} className="self-start">
              Create revision
            </Button>
          </form>
        </Card>
      )}

      <Card>
        {status === "loading" && !drawings ? (
          <LoadingState />
        ) : !drawings || drawings.length === 0 ? (
          <EmptyState title="No drawings yet" description="Upload the first drawing revision above." />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {drawings.map((d) => {
              const isImage = /\.(jpg|jpeg|png|webp)$/i.test(d.fileUrl || "");
              return (
                <div key={d._id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {d.fileUrl && isImage ? (
                      <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="relative h-12 w-12 shrink-0 overflow-hidden rounded border border-border">
                        <Image src={d.fileUrl} alt={d.name} fill sizes="48px" className="object-cover" />
                      </a>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-border bg-surface-raised">
                        <Ruler className="h-4 w-4 text-muted" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{d.name}</p>
                      <p className="text-xs text-muted">
                        Rev {d.revision}
                        {d.category ? ` · ${d.category}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {d.fileUrl && (
                      <a
                        href={d.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <StatusBadge status={d.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

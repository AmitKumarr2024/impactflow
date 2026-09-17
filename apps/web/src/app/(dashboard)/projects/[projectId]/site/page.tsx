"use client";

import { use, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSiteObservations, createSiteObservation } from "@/store/siteSlice";
import { Button } from "@/components/ui/Button";
import { Card, Input, Textarea, Label, EmptyState, StatusBadge, LoadingState } from "@/components/ui/primitives";
import { FileUpload } from "@/components/ui/FileUpload";
import { ApiError } from "@/lib/api";
import type { MediaAsset } from "@/lib/upload";
import { Plus, HardHat, X } from "lucide-react";

export default function SiteObservationsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const dispatch = useAppDispatch();
  const observations = useAppSelector((s) => s.site.byProject[projectId]);
  const status = useAppSelector((s) => s.site.status);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", expectedValue: "", actualValue: "", unit: "mm" });
  const [photos, setPhotos] = useState<MediaAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchSiteObservations(projectId));
  }, [projectId, dispatch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await dispatch(
        createSiteObservation({ projectId, ...form, photos: photos.map((p) => p.url) })
      ).unwrap();
      toast.success("Site observation submitted");
      setShowForm(false);
      setForm({ title: "", description: "", expectedValue: "", actualValue: "", unit: "mm" });
      setPhotos([]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not submit observation");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Site Observations</h1>
          <p className="mt-1 text-sm text-muted">Report a deviation between drawing and site reality.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> Report observation
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label>Title</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Expected</Label>
                <Input value={form.expectedValue} onChange={(e) => setForm({ ...form, expectedValue: e.target.value })} />
              </div>
              <div>
                <Label>Actual</Label>
                <Input value={form.actualValue} onChange={(e) => setForm({ ...form, actualValue: e.target.value })} />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Photo evidence</Label>
              <FileUpload
                projectId={projectId}
                entityType="SiteObservation"
                onUploaded={(asset) => setPhotos((p) => [...p, asset])}
                label="Upload a photo from your device"
              />
              {photos.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {photos.map((p) => (
                    <div key={p._id} className="group relative h-20 w-20 overflow-hidden rounded-md border border-border">
                      {p.resourceType === "image" ? (
                        <Image src={p.url} alt={p.fileName} fill sizes="80px" className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-surface-raised text-[10px] text-muted">
                          {p.format?.toUpperCase()}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => prev.filter((x) => x._id !== p._id))}
                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" loading={submitting} className="self-start">
              Submit
            </Button>
          </form>
        </Card>
      )}

      <Card>
        {status === "loading" && !observations ? (
          <LoadingState />
        ) : !observations || observations.length === 0 ? (
          <EmptyState title="No observations yet" description="Site deviations reported by the field team will show up here." />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {observations.map((o) => (
              <div key={o._id} className="flex items-start justify-between gap-4 py-3">
                <div className="flex items-start gap-3">
                  <HardHat className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{o.title}</p>
                    {o.expectedValue && o.actualValue && (
                      <p className="text-xs text-muted">
                        Expected {o.expectedValue}{o.unit} · Actual {o.actualValue}{o.unit}
                      </p>
                    )}
                    {o.photos && o.photos.length > 0 && (
                      <div className="mt-2 flex gap-1.5">
                        {o.photos.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative h-14 w-14 overflow-hidden rounded border border-border">
                            <Image src={url} alt={`${o.title} photo ${i + 1}`} fill sizes="56px" className="object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <StatusBadge status={o.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

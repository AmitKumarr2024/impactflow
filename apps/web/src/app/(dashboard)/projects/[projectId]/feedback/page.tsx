"use client";

import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchFeedback, createFeedback } from "@/store/feedbackSlice";
import { Button } from "@/components/ui/Button";
import { Card, Input, Textarea, Label, EmptyState, StatusBadge, LoadingState } from "@/components/ui/primitives";
import { ApiError } from "@/lib/api";
import { Plus, MessageSquareWarning } from "lucide-react";

export default function FeedbackPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const dispatch = useAppDispatch();
  const feedback = useAppSelector((s) => s.feedback.byProject[projectId]);
  const status = useAppSelector((s) => s.feedback.status);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchFeedback(projectId));
  }, [projectId, dispatch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await dispatch(createFeedback({ projectId, ...form })).unwrap();
      toast.success("Feedback sent to the design team");
      setShowForm(false);
      setForm({ title: "", description: "" });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not submit feedback");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Feedback</h1>
          <p className="mt-1 text-sm text-muted">Capture last-mile knowledge and send it back upstream.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> New feedback
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
              <Textarea
                required
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <Button type="submit" loading={submitting} className="self-start">
              Submit feedback
            </Button>
          </form>
        </Card>
      )}

      <Card>
        {status === "loading" && !feedback ? (
          <LoadingState />
        ) : !feedback || feedback.length === 0 ? (
          <EmptyState title="No feedback yet" description="Feedback from the field will appear here." />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {feedback.map((f) => (
              <div key={f._id} className="flex items-start justify-between py-3">
                <div className="flex items-start gap-3">
                  <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.title}</p>
                    <p className="text-xs text-muted">{f.description}</p>
                  </div>
                </div>
                <StatusBadge status={f.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

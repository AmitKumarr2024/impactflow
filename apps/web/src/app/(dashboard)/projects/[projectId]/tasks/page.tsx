"use client";

import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchTasks, updateTaskStatus, createTask } from "@/store/taskSlice";
import { Button } from "@/components/ui/Button";
import { Card, Input, Label, Select, StatusBadge, EmptyState, LoadingState } from "@/components/ui/primitives";
import { ApiError } from "@/lib/api";
import type { Task } from "@/types";
import { ClipboardList, Plus } from "lucide-react";

const NEXT_STATUSES: Task["status"][] = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"];
const TASK_TYPES = ["PROCUREMENT", "INSTALLATION", "FABRICATION", "EXECUTION", "OTHER"] as const;

export default function TasksPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const dispatch = useAppDispatch();
  const tasks = useAppSelector((s) => s.tasks.byProject[projectId]);
  const status = useAppSelector((s) => s.tasks.status);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", type: "OTHER" as (typeof TASK_TYPES)[number] });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchTasks(projectId));
  }, [projectId, dispatch]);

  async function handleChange(id: string, next: Task["status"]) {
    setBusyId(id);
    try {
      await dispatch(updateTaskStatus({ id, status: next })).unwrap();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update task");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await dispatch(createTask({ projectId, title: form.title, type: form.type })).unwrap();
      toast.success("Task created");
      setShowForm(false);
      setForm({ title: "", type: "OTHER" });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not create task");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Tasks</h1>
          <p className="mt-1 text-sm text-muted">Execution work, in support of the changes driving it.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" /> New task
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label>Title</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="sm:w-48">
              <Label>Type</Label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}>
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" loading={submitting}>
              Create
            </Button>
          </form>
        </Card>
      )}

      <Card>
        {status === "loading" && !tasks ? (
          <LoadingState />
        ) : !tasks || tasks.length === 0 ? (
          <EmptyState title="No tasks yet" description="Create a task above to start tracking execution work." />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {tasks.map((t) => (
              <div key={t._id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <ClipboardList className="h-4 w-4 text-muted" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.title}</p>
                    {t.type && <p className="text-xs text-muted">{t.type}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={t.status} />
                  {t.status === "BLOCKED" ? (
                    <span className="text-xs text-muted">waiting on approval</span>
                  ) : (
                    <Select
                      className="h-8 w-36 text-xs"
                      value={t.status}
                      disabled={busyId === t._id}
                      onChange={(e) => handleChange(t._id, e.target.value as Task["status"])}
                    >
                      {NEXT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </Select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

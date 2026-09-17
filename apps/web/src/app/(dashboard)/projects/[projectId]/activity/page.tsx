"use client";

import { use, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchActivity } from "@/store/activitySlice";
import { Card, EmptyState, LoadingState } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";
import { History } from "lucide-react";

export default function ActivityPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const dispatch = useAppDispatch();
  const activity = useAppSelector((s) => s.activity.byProject[projectId]);
  const status = useAppSelector((s) => s.activity.status);

  useEffect(() => {
    dispatch(fetchActivity(projectId));
  }, [projectId, dispatch]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Activity</h1>
        <p className="mt-1 text-sm text-muted">The full traceable history of this project.</p>
      </div>

      <Card>
        {status === "loading" && !activity ? (
          <LoadingState />
        ) : !activity || activity.length === 0 ? (
          <EmptyState title="No activity yet" />
        ) : (
          <div className="flex flex-col gap-4">
            {activity.map((a) => (
              <div key={a._id} className="flex gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-raised">
                  <History className="h-3 w-3 text-muted" />
                </div>
                <div>
                  <p className="text-sm text-foreground">{a.summary}</p>
                  <p className="text-xs text-muted">
                    {a.actorRole.replace(/_/g, " ")} · {formatDate(a.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

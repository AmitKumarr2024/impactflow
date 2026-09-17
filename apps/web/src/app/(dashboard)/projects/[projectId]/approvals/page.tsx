"use client";

import {
  use,
  useEffect,
  useState,
} from "react";

import { toast } from "sonner";

import {
  useAppDispatch,
  useAppSelector,
} from "@/store/hooks";

import {
  fetchApprovals,
  approveApproval,
  rejectApproval,
} from "@/store/approvalSlice";

import { Button } from "@/components/ui/Button";

import {
  Card,
  StatusBadge,
  EmptyState,
  LoadingState,
} from "@/components/ui/primitives";

import { ApiError } from "@/lib/api";

import {
  Check,
  X,
  GitBranch,
  User,
  Lock,
} from "lucide-react";

type ApprovalUser = {
  _id: string;
  name: string;
  email?: string;
  role?: string;
  avatar?: string;
};

type RaisedBy = ApprovalUser | null;

type ChangeRequestInfo = {
  _id: string;
  title?: string;
  description?: string;
  requestedBy?: RaisedBy;
  status?: string;
  category?: string;
  priority?: string;
};

type ApprovalWithDetails = {
  _id: string;
  projectId: string;
  title: string;

  requiredFrom?: ApprovalUser | null;

  status:
  | "PENDING"
  | "APPROVED"
  | "BLOCKED"
  | "UNBLOCKED"
  | "REJECTED";

  blockedTaskIds?: string[];

  blockedTasks?: Array<{
    _id: string;
    title: string;
    status: string;
  }>;

  changeRequestId?:
  | string
  | ChangeRequestInfo
  | null;

  decidedBy?: ApprovalUser | null;
  decidedAt?: string;

  createdAt?: string;
  updatedAt?: string;

  /**
   * Returned by the backend.
   *
   * true only when the currently authenticated
   * user is the designated approver.
   */
  canDecide?: boolean;
};

function formatRole(role?: string) {
  if (!role) return "";

  return role
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

function getRaisedBy(
  approval: ApprovalWithDetails
): ApprovalUser | null {
  if (
    approval.changeRequestId &&
    typeof approval.changeRequestId ===
    "object"
  ) {
    return (
      approval.changeRequestId
        .requestedBy ?? null
    );
  }

  return null;
}

function getChangeTitle(
  approval: ApprovalWithDetails
): string | null {
  if (
    approval.changeRequestId &&
    typeof approval.changeRequestId ===
    "object"
  ) {
    return (
      approval.changeRequestId.title ??
      null
    );
  }

  return null;
}

export default function ApprovalsPage({
  params,
}: {
  params: Promise<{
    projectId: string;
  }>;
}) {
  const { projectId } = use(params);

  const dispatch = useAppDispatch();

  const approvals = useAppSelector(
    (state) =>
      state.approvals.byProject[
      projectId
      ]
  );

  const status = useAppSelector(
    (state) =>
      state.approvals.status
  );

  const [busyId, setBusyId] =
    useState<string | null>(null);

  useEffect(() => {
    dispatch(
      fetchApprovals(projectId)
    );
  }, [projectId, dispatch]);

  async function handleDecide(
    id: string,
    decision:
      | "approve"
      | "reject"
  ) {
    setBusyId(id);

    try {
      if (decision === "approve") {
        await dispatch(
          approveApproval(id)
        ).unwrap();

        toast.success(
          "Approval cleared"
        );
      } else {
        await dispatch(
          rejectApproval(id)
        ).unwrap();

        toast.success(
          "Approval rejected"
        );
      }

      /*
       * Refresh the approval list after
       * the decision so blocked task states,
       * approval status and dependencies
       * remain in sync.
       */
      await dispatch(
        fetchApprovals(projectId)
      ).unwrap();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Failed to process approval"
      );
    } finally {
      setBusyId(null);
    }
  }

  if (
    status === "loading" &&
    !approvals
  ) {
    return <LoadingState />;
  }

  const approvalList =
    (approvals ??
      []) as ApprovalWithDetails[];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Approval Dependency Map
        </h1>

        <p className="mt-1 text-sm text-muted">
          See exactly what is blocked by one
          pending decision.
        </p>
      </div>

      {/* Empty state */}
      {approvalList.length === 0 ? (
        <Card>
          <EmptyState
            title="No approvals yet"
            description="Approvals created by analyzed change requests will appear here."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {approvalList.map(
            (approval) => {
              const blockedTaskCount =
                approval.blockedTaskIds
                  ?.length ?? 0;

              const pendingBlockedTasks =
                (
                  approval.blockedTasks ??
                  []
                ).filter(
                  (task) =>
                    task.status ===
                    "BLOCKED"
                );

              const raisedBy =
                getRaisedBy(
                  approval
                );

              const changeTitle =
                getChangeTitle(
                  approval
                );

              return (
                <Card
                  key={
                    approval._id
                  }
                >
                  {/* Approval header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-muted" />

                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {
                            approval.title
                          }
                        </p>

                        {changeTitle &&
                          changeTitle !==
                          approval.title && (
                            <p className="mt-1 truncate text-xs text-muted">
                              Change:{" "}
                              {
                                changeTitle
                              }
                            </p>
                          )}

                        <p className="mt-0.5 text-xs text-muted">
                          {blockedTaskCount >
                            0
                            ? `Blocking ${blockedTaskCount} activit${blockedTaskCount ===
                              1
                              ? "y"
                              : "ies"
                            }`
                            : "Not blocking anything"}
                        </p>
                      </div>
                    </div>

                    <StatusBadge
                      status={
                        approval.status
                      }
                    />
                  </div>

                  {/* Raised by */}
                  {raisedBy && (
                    <div className="mt-4 ml-7 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <User className="h-3.5 w-3.5 shrink-0" />

                      <span>
                        Raised by:{" "}
                        <span className="font-medium text-foreground">
                          {
                            raisedBy.name
                          }
                        </span>
                      </span>

                      {raisedBy.role && (
                        <span>
                          (
                          {formatRole(
                            raisedBy.role
                          )}
                          )
                        </span>
                      )}
                    </div>
                  )}

                  {/* Required approver */}
                  {approval.requiredFrom && (
                    <div className="mt-2 ml-7 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <Lock className="h-3.5 w-3.5 shrink-0" />

                      <span>
                        Approval required
                        from:{" "}
                        <span className="font-medium text-foreground">
                          {
                            approval
                              .requiredFrom
                              .name
                          }
                        </span>
                      </span>

                      {approval
                        .requiredFrom
                        .role && (
                          <span>
                            (
                            {formatRole(
                              approval
                                .requiredFrom
                                .role
                            )}
                            )
                          </span>
                        )}
                    </div>
                  )}

                  {/* Designated approver indicator */}
                  {approval.status ===
                    "PENDING" &&
                    approval.canDecide ===
                    true && (
                      <div className="mt-3 ml-7 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-foreground">
                        <span className="font-medium">
                          Action required:
                        </span>{" "}
                        You are the designated
                        approver for this change.
                      </div>
                    )}

                  {/* Waiting for designated approver */}
                  {approval.status ===
                    "PENDING" &&
                    approval.canDecide ===
                    false && (
                      <div className="mt-3 ml-7 flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted">
                        <Lock className="h-3.5 w-3.5 shrink-0" />

                        <span>
                          Waiting for the
                          designated approver
                          to decide.
                        </span>
                      </div>
                    )}

                  {/* Blocked tasks */}
                  {approval.blockedTasks &&
                    approval.blockedTasks
                      .length > 0 && (
                      <div className="mt-3 ml-7 flex flex-col gap-1.5 border-l border-border pl-4">
                        {approval.blockedTasks.map(
                          (task) => (
                            <div
                              key={
                                task._id
                              }
                              className="flex items-center justify-between gap-3"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                {task.status ===
                                  "BLOCKED" && (
                                    <Lock className="h-3.5 w-3.5 shrink-0 text-status-high" />
                                  )}

                                <span className="truncate text-sm text-muted">
                                  {
                                    task.title
                                  }
                                </span>
                              </div>

                              <StatusBadge
                                status={
                                  task.status
                                }
                              />
                            </div>
                          )
                        )}
                      </div>
                    )}

                  {/* Action buttons */}
                  {approval.status ===
                    "PENDING" &&
                    approval.canDecide ===
                    true && (
                      <div className="mt-4 ml-7 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleDecide(
                              approval._id,
                              "approve"
                            )
                          }
                          loading={
                            busyId ===
                            approval._id
                          }
                        >
                          <Check className="h-3.5 w-3.5" />

                          Approve
                        </Button>

                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() =>
                            handleDecide(
                              approval._id,
                              "reject"
                            )
                          }
                          loading={
                            busyId ===
                            approval._id
                          }
                        >
                          <X className="h-3.5 w-3.5" />

                          Reject
                        </Button>
                      </div>
                    )}

                  {/* Dependency explanation */}
                  {pendingBlockedTasks.length >
                    0 &&
                    approval.status ===
                    "PENDING" && (
                      <p className="mt-3 ml-7 text-xs text-status-high">
                        {
                          pendingBlockedTasks.length
                        }{" "}
                        task(s) will unblock once
                        this approval clears,
                        unless another approval
                        also blocks them.
                      </p>
                    )}

                  {/* Approved message */}
                  {approval.status ===
                    "APPROVED" && (
                      <p className="mt-3 ml-7 text-xs text-status-success">
                        This approval has been
                        cleared. Dependent tasks
                        can proceed when no other
                        approval blocks them.
                      </p>
                    )}

                  {/* Rejected message */}
                  {approval.status ===
                    "REJECTED" && (
                      <p className="mt-3 ml-7 text-xs text-status-high">
                        This approval was rejected
                        and the associated change
                        was rejected.
                      </p>
                    )}
                </Card>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
"use client";

import {
  use,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import { toast } from "sonner";

import {
  useAppDispatch,
  useAppSelector,
} from "@/store/hooks";

import {
  fetchChanges,
  createChange,
} from "@/store/changeSlice";

import { fetchMaterials } from "@/store/materialSlice";
import { fetchDrawings } from "@/store/drawingSlice";
import { fetchTasks } from "@/store/taskSlice";
import { fetchMembers } from "@/store/memberSlice";

import { Button } from "@/components/ui/Button";

import {
  Card,
  Input,
  Textarea,
  Label,
  Select,
  EmptyState,
  StatusBadge,
  LoadingState,
} from "@/components/ui/primitives";

import { EntityMultiSelect } from "@/components/ui/EntityMultiSelect";

import { ApiError } from "@/lib/api";

import { CHANGE_CATEGORIES } from "@/types";

import { Plus } from "lucide-react";

export default function ChangesPage({
  params,
}: {
  params: Promise<{
    projectId: string;
  }>;
}) {
  const { projectId } =
    use(params);

  const dispatch =
    useAppDispatch();

  /* ---------------------------------------------------------------------- */
  /* Redux                                                                   */
  /* ---------------------------------------------------------------------- */

  const changes =
    useAppSelector(
      (state) =>
        state.changes.byProject[
        projectId
        ],
    );

  const status =
    useAppSelector(
      (state) =>
        state.changes.status,
    );

  const materials =
    useAppSelector(
      (state) =>
        state.materials.byProject[
        projectId
        ],
    ) || [];

  const drawings =
    useAppSelector(
      (state) =>
        state.drawings.byProject[
        projectId
        ],
    ) || [];

  const tasks =
    useAppSelector(
      (state) =>
        state.tasks.byProject[
        projectId
        ],
    ) || [];

  const members =
    useAppSelector(
      (state) =>
        state.members.byProject[
        projectId
        ],
    ) || [];

  /* ---------------------------------------------------------------------- */
  /* Local state                                                             */
  /* ---------------------------------------------------------------------- */

  const [showForm, setShowForm] =
    useState(false);

  const [form, setForm] =
    useState({
      title: "",

      description: "",

      category:
        "DESIGN" as (typeof CHANGE_CATEGORIES)[number],

      reason: "",

      approvalRequiredFrom:
        "",
    });

  const [
    selectedMaterials,
    setSelectedMaterials,
  ] = useState<string[]>([]);

  const [
    selectedDrawings,
    setSelectedDrawings,
  ] = useState<string[]>([]);

  const [
    selectedTasks,
    setSelectedTasks,
  ] = useState<string[]>([]);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  /* ---------------------------------------------------------------------- */
  /* Fetch changes                                                           */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    dispatch(
      fetchChanges(projectId),
    );
  }, [
    projectId,
    dispatch,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Fetch form dependencies                                                 */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!showForm) {
      return;
    }

    dispatch(
      fetchMaterials(
        projectId,
      ),
    );

    dispatch(
      fetchDrawings(
        projectId,
      ),
    );

    dispatch(
      fetchTasks(projectId),
    );

    dispatch(
      fetchMembers(
        projectId,
      ),
    );
  }, [
    showForm,
    projectId,
    dispatch,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Create Change                                                           */
  /* ---------------------------------------------------------------------- */

  async function handleSubmit(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    /* -------------------------------------------------------------------- */
    /* Approver validation                                                  */
    /* -------------------------------------------------------------------- */

    if (
      !form.approvalRequiredFrom
    ) {
      toast.error(
        "Select who must approve this change",
      );

      return;
    }

    setSubmitting(true);

    try {
      await dispatch(
        createChange({
          projectId,

          title:
            form.title,

          description:
            form.description,

          category:
            form.category,

          reason:
            form.reason,

          approvalRequiredFrom:
            form.approvalRequiredFrom,

          affectedMaterials:
            selectedMaterials,

          affectedDrawings:
            selectedDrawings,

          affectedTasks:
            selectedTasks,
        }),
      ).unwrap();

      toast.success(
        "Change request submitted",
      );

      setShowForm(false);

      setForm({
        title: "",

        description: "",

        category: "DESIGN",

        reason: "",

        approvalRequiredFrom:
          "",
      });

      setSelectedMaterials(
        [],
      );

      setSelectedDrawings(
        [],
      );

      setSelectedTasks([]);

      await dispatch(
        fetchChanges(
          projectId,
        ),
      ).unwrap();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Could not create change",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Deduplicate Changes                                                     */
  /* ---------------------------------------------------------------------- */

  const uniqueChanges =
    changes
      ? Array.from(
        new Map(
          changes.map(
            (change) => [
              change._id,
              change,
            ],
          ),
        ).values(),
      )
      : [];

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Change Requests
          </h1>

          <p className="mt-1 text-sm text-muted">
            Every change starts
            here, before it becomes
            a problem.
          </p>
        </div>

        <Button
          onClick={() =>
            setShowForm(
              (value) =>
                !value,
            )
          }
        >
          <Plus className="h-4 w-4" />

          New change
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Create Change Form                                                 */}
      {/* ------------------------------------------------------------------ */}

      {showForm && (
        <Card>
          <form
            onSubmit={
              handleSubmit
            }
            className="flex flex-col gap-4"
          >
            {/* ------------------------------------------------------------ */}
            {/* Title                                                        */}
            {/* ------------------------------------------------------------ */}

            <div>
              <Label>
                Title
              </Label>

              <Input
                required
                value={
                  form.title
                }
                onChange={(e) =>
                  setForm({
                    ...form,

                    title:
                      e.target
                        .value,
                  })
                }
              />
            </div>

            {/* ------------------------------------------------------------ */}
            {/* Description                                                  */}
            {/* ------------------------------------------------------------ */}

            <div>
              <Label>
                Description
              </Label>

              <Textarea
                required
                rows={3}
                value={
                  form.description
                }
                onChange={(e) =>
                  setForm({
                    ...form,

                    description:
                      e.target
                        .value,
                  })
                }
              />
            </div>

            {/* ------------------------------------------------------------ */}
            {/* Category + Reason                                            */}
            {/* ------------------------------------------------------------ */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>
                  Category
                </Label>

                <Select
                  value={
                    form.category
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,

                      category:
                        e.target
                          .value as typeof form.category,
                    })
                  }
                >
                  {CHANGE_CATEGORIES.map(
                    (category) => (
                      <option
                        key={
                          category
                        }
                        value={
                          category
                        }
                      >
                        {category.replace(
                          /_/g,
                          " ",
                        )}
                      </option>
                    ),
                  )}
                </Select>
              </div>

              <div>
                <Label>
                  Reason (optional)
                </Label>

                <Input
                  value={
                    form.reason
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,

                      reason:
                        e.target
                          .value,
                    })
                  }
                />
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* Designated Approver                                           */}
            {/* ------------------------------------------------------------ */}

            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
              <Label>
                Approval required
                from
              </Label>

              <p className="mb-3 mt-1 text-xs text-muted">
                Select the exact
                project member who
                must approve or
                reject this change.
              </p>

              <Select
                required
                value={
                  form.approvalRequiredFrom
                }
                onChange={(e) =>
                  setForm({
                    ...form,

                    approvalRequiredFrom:
                      e.target.value,
                  })
                }
              >
                <option value="">
                  Select approver
                </option>

                {members.map(
                  (member) => {
                    const user =
                      member.user;

                    if (!user) {
                      return null;
                    }

                    return (
                      <option
                        key={
                          member._id
                        }
                        value={
                          user._id
                        }
                      >
                        {user.name} —{" "}
                        {formatRole(
                          user.role,
                        )}
                      </option>
                    );
                  },
                )}
              </Select>

              {members.length ===
                0 && (
                  <p className="mt-2 text-xs text-status-high">
                    No project members
                    are available.
                    Add a project member
                    before submitting a
                    change.
                  </p>
                )}

              {form.approvalRequiredFrom && (
                <div className="mt-3 rounded-md border border-border bg-surface-raised px-3 py-2">
                  <p className="text-xs text-muted">
                    This person will be
                    the designated
                    approver.
                  </p>

                  <p className="mt-0.5 text-sm font-medium text-foreground">
                    {
                      members.find(
                        (member) =>
                          member.user?._id ===
                          form.approvalRequiredFrom,
                      )?.user
                        ?.name
                    }
                  </p>
                </div>
              )}
            </div>

            {/* ------------------------------------------------------------ */}
            {/* Affected Entities                                            */}
            {/* ------------------------------------------------------------ */}

            <div className="border-t border-border pt-4">
              <p className="mb-1 text-sm font-medium text-foreground">
                What does this
                change affect?
              </p>

              <p className="mb-3 text-xs text-muted">
                Link the materials,
                drawings, and tasks
                affected by this change
                to calculate its
                impact.
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* ------------------------------------------------------ */}
                {/* Materials                                               */}
                {/* ------------------------------------------------------ */}

                <div>
                  <Label className="text-xs">
                    Materials
                  </Label>

                  <EntityMultiSelect
                    options={materials.map(
                      (material) => ({
                        _id:
                          material._id,

                        label:
                          material.name,

                        sublabel:
                          material.category,
                      }),
                    )}
                    selectedIds={
                      selectedMaterials
                    }
                    onChange={
                      setSelectedMaterials
                    }
                    placeholder="Search materials..."
                    emptyLabel="No materials in this project yet"
                  />
                </div>

                {/* ------------------------------------------------------ */}
                {/* Drawings                                                */}
                {/* ------------------------------------------------------ */}

                <div>
                  <Label className="text-xs">
                    Drawings
                  </Label>

                  <EntityMultiSelect
                    options={drawings.map(
                      (drawing) => ({
                        _id:
                          drawing._id,

                        label:
                          drawing.name,

                        sublabel:
                          `Rev ${drawing.revision}`,
                      }),
                    )}
                    selectedIds={
                      selectedDrawings
                    }
                    onChange={
                      setSelectedDrawings
                    }
                    placeholder="Search drawings..."
                    emptyLabel="No drawings in this project yet"
                  />
                </div>

                {/* ------------------------------------------------------ */}
                {/* Tasks                                                   */}
                {/* ------------------------------------------------------ */}

                <div>
                  <Label className="text-xs">
                    Tasks
                  </Label>

                  <EntityMultiSelect
                    options={tasks.map(
                      (task) => ({
                        _id:
                          task._id,

                        label:
                          task.title,

                        sublabel:
                          task.type,
                      }),
                    )}
                    selectedIds={
                      selectedTasks
                    }
                    onChange={
                      setSelectedTasks
                    }
                    placeholder="Search tasks..."
                    emptyLabel="No tasks in this project yet"
                  />
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* Submit                                                       */}
            {/* ------------------------------------------------------------ */}

            <Button
              type="submit"
              loading={
                submitting
              }
              className="self-start"
              disabled={
                members.length ===
                0
              }
            >
              Submit change
            </Button>
          </form>
        </Card>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Changes List                                                       */}
      {/* ------------------------------------------------------------------ */}

      <Card>
        {status ===
          "loading" &&
          !changes ? (
          <LoadingState />
        ) : uniqueChanges.length ===
          0 ? (
          <EmptyState
            title="No changes yet"
            description="Submit your first change request above."
          />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {uniqueChanges.map(
              (change) => (
                <Link
                  key={
                    change._id
                  }
                  href={`/projects/${projectId}/changes/${change._id}`}
                  className="-mx-5 flex items-center justify-between px-5 py-3 hover:bg-surface-raised"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {
                        change.title
                      }
                    </p>

                    <p className="text-xs text-muted">
                      {change.category.replace(
                        /_/g,
                        " ",
                      )}{" "}
                      ·{" "}
                      {
                        change.priority
                      }
                    </p>
                  </div>

                  <StatusBadge
                    status={
                      change.status
                    }
                  />
                </Link>
              ),
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatRole(
  role: string,
) {
  return role
    .replace(
      /_/g,
      " ",
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}
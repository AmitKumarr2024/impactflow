"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import {
  Plus,
  MapPin,
  ArrowUpRight,
  CalendarDays,
} from "lucide-react";

import {
  useAppDispatch,
  useAppSelector,
} from "@/store/hooks";

import {
  fetchProjects,
  createProject,
  setCurrentProject,
} from "@/store/projectSlice";

import { Button } from "@/components/ui/Button";

import {
  Card,
  Input,
  Label,
  EmptyState,
  StatusBadge,
} from "@/components/ui/primitives";

import { ApiError } from "@/lib/api";

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ProjectsPage() {
  const dispatch = useAppDispatch();

  /* ------------------------------------------------------------------------ */
  /* Redux                                                                     */
  /* ------------------------------------------------------------------------ */

  const user = useAppSelector(
    (state) => state.auth.user,
  );

  const projects = useAppSelector(
    (state) => state.projects.items,
  );

  /* ------------------------------------------------------------------------ */
  /* Local state                                                               */
  /* ------------------------------------------------------------------------ */

  const [showForm, setShowForm] =
    useState(false);

  const [form, setForm] = useState({
    name: "",
    projectCode: "",
    clientEmail: "",
    location: "",
    startDate: "",
    expectedEndDate: "",
    description: "",
  });

  const [loading, setLoading] =
    useState(false);

  /* ------------------------------------------------------------------------ */
  /* Fetch projects                                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  /* ------------------------------------------------------------------------ */
  /* Create project                                                           */
  /* ------------------------------------------------------------------------ */

  async function handleCreate(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    /**
     * Frontend date validation.
     *
     * Backend validates this too.
     */
    if (
      form.startDate &&
      form.expectedEndDate &&
      new Date(
        form.expectedEndDate,
      ).getTime() <
      new Date(
        form.startDate,
      ).getTime()
    ) {
      toast.error(
        "Expected end date cannot be before the start date",
      );

      return;
    }

    setLoading(true);

    try {
      await dispatch(
        createProject(form),
      ).unwrap();

      toast.success(
        "Project created",
      );

      setShowForm(false);

      setForm({
        name: "",
        projectCode: "",
        clientEmail: "",
        location: "",
        startDate: "",
        expectedEndDate: "",
        description: "",
      });

      /**
       * Refresh project list so the newly
       * created project appears immediately.
       */
      await dispatch(
        fetchProjects(),
      ).unwrap();
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Could not create project",
      );
    } finally {
      setLoading(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Projects
          </h1>

          <p className="mt-1 text-sm text-muted">
            One shared ecosystem per
            project -- every role sees
            it from their own angle.
          </p>
        </div>

        {/* Only admin can create projects */}
        {user?.role === "ADMIN" && (
          <Button
            onClick={() =>
              setShowForm(
                (value) => !value,
              )
            }
          >
            <Plus className="h-4 w-4" />

            New project
          </Button>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Create Project Form                                                */}
      {/* ------------------------------------------------------------------ */}

      {showForm &&
        user?.role === "ADMIN" && (
          <Card className="border-accent/30">
            <h2 className="mb-4 text-sm font-medium text-foreground">
              Create a project
            </h2>

            <form
              onSubmit={
                handleCreate
              }
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {/* ---------------------------------------------------------- */}
              {/* Project Name                                               */}
              {/* ---------------------------------------------------------- */}

              <div>
                <Label>
                  Project name
                </Label>

                <Input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event
                        .target.value,
                    })
                  }
                  placeholder="Skyline Villa"
                />
              </div>

              {/* ---------------------------------------------------------- */}
              {/* Project Code                                               */}
              {/* ---------------------------------------------------------- */}

              <div>
                <Label>
                  Project code
                </Label>

                <Input
                  required
                  value={
                    form.projectCode
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      projectCode:
                        event.target
                          .value,
                    })
                  }
                  placeholder="SV-2026-001"
                />
              </div>

              {/* ---------------------------------------------------------- */}
              {/* Client Email                                               */}
              {/* ---------------------------------------------------------- */}

              <div>
                <Label>
                  Client&apos;s email
                </Label>

                <Input
                  type="email"
                  required
                  value={
                    form.clientEmail
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      clientEmail:
                        event.target
                          .value,
                    })
                  }
                  placeholder="client@company.com"
                />

                <p className="mt-1 text-xs text-muted">
                  The client needs an
                  existing ImpactFlow
                  account.
                </p>
              </div>

              {/* ---------------------------------------------------------- */}
              {/* Location                                                    */}
              {/* ---------------------------------------------------------- */}

              <div>
                <Label>
                  Location
                </Label>

                <Input
                  value={
                    form.location
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      location:
                        event.target
                          .value,
                    })
                  }
                  placeholder="Gurugram, Haryana"
                />
              </div>

              {/* ---------------------------------------------------------- */}
              {/* Start Date                                                  */}
              {/* ---------------------------------------------------------- */}

              <div>
                <Label>
                  Start date
                </Label>

                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />

                  <Input
                    type="date"
                    value={
                      form.startDate
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        startDate:
                          event.target
                            .value,
                      })
                    }
                    className="pl-10"
                  />
                </div>
              </div>

              {/* ---------------------------------------------------------- */}
              {/* Expected End Date                                          */}
              {/* ---------------------------------------------------------- */}

              <div>
                <Label>
                  Expected end date
                </Label>

                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />

                  <Input
                    type="date"
                    value={
                      form.expectedEndDate
                    }
                    min={
                      form.startDate ||
                      undefined
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        expectedEndDate:
                          event.target
                            .value,
                      })
                    }
                    className="pl-10"
                  />
                </div>

                <p className="mt-1 text-xs text-muted">
                  Must be on or after
                  the start date.
                </p>
              </div>

              {/* ---------------------------------------------------------- */}
              {/* Description                                                 */}
              {/* ---------------------------------------------------------- */}

              <div className="sm:col-span-2">
                <Label>
                  Description
                </Label>

                <Input
                  value={
                    form.description
                  }
                  onChange={(event) =>
                    setForm({
                      ...form,
                      description:
                        event.target
                          .value,
                    })
                  }
                  placeholder="Luxury residential villa project"
                />
              </div>

              {/* ---------------------------------------------------------- */}
              {/* Actions                                                     */}
              {/* ---------------------------------------------------------- */}

              <div className="flex gap-2 sm:col-span-2">
                <Button
                  type="submit"
                  loading={loading}
                >
                  Create project
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setShowForm(false)
                  }
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

      {/* ------------------------------------------------------------------ */}
      {/* Empty State                                                        */}
      {/* ------------------------------------------------------------------ */}

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            title="No projects yet"
            description={
              user?.role ===
                "CLIENT" ||
                user?.role ===
                "ARCHITECT"
                ? "Create your first project to start tracking changes and their impact."
                : "Ask your architect or project lead to add you to a project."
            }
          />
        </Card>
      ) : (
        /* -------------------------------------------------------------- */
        /* Project Cards                                                   */
        /* -------------------------------------------------------------- */

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(
            (project) => (
              <Link
                key={project._id}
                href={`/projects/${project._id}`}
                onClick={() =>
                  dispatch(
                    setCurrentProject(
                      project._id,
                    ),
                  )
                }
              >
                <Card className="group h-full transition-all hover:border-accent/50 hover:shadow-lg hover:shadow-accent/5">
                  {/* ---------------------------------------------------- */}
                  {/* Project Title + Status                               */}
                  {/* ---------------------------------------------------- */}

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {project.name}
                      </p>

                      <p className="text-xs text-muted">
                        {
                          project.projectCode
                        }
                      </p>
                    </div>

                    <StatusBadge
                      status={
                        project.status
                      }
                    />
                  </div>

                  {/* ---------------------------------------------------- */}
                  {/* Location                                              */}
                  {/* ---------------------------------------------------- */}

                  {project.location && (
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-muted">
                      <MapPin className="h-3.5 w-3.5" />

                      {
                        project.location
                      }
                    </p>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* Project Dates                                         */}
                  {/* ---------------------------------------------------- */}

                  {(project.startDate ||
                    project.expectedEndDate) && (
                      <div className="mt-3 flex flex-col gap-1 text-xs text-muted">
                        {project.startDate && (
                          <p className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />

                            Start:{" "}
                            {new Date(
                              project.startDate,
                            ).toLocaleDateString(
                              "en-IN",
                            )}
                          </p>
                        )}

                        {project.expectedEndDate && (
                          <p className="flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />

                            Expected end:{" "}
                            {new Date(
                              project.expectedEndDate,
                            ).toLocaleDateString(
                              "en-IN",
                            )}
                          </p>
                        )}
                      </div>
                    )}

                  {/* ---------------------------------------------------- */}
                  {/* Open Project                                          */}
                  {/* ---------------------------------------------------- */}

                  <div className="mt-4 flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition-opacity group-hover:opacity-100">
                    Open project

                    <ArrowUpRight className="h-3 w-3" />
                  </div>
                </Card>
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}
"use client";

import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMembers, addMember } from "@/store/memberSlice";
import { Button } from "@/components/ui/Button";
import { Card, Input, Label, Select, EmptyState, LoadingState } from "@/components/ui/primitives";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { ApiError } from "@/lib/api";
import { ROLES, type Role } from "@/types";
import { UserPlus, Mail } from "lucide-react";

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  CLIENT: "Client",
  ARCHITECT: "Architect",
  INTERIOR_DESIGNER: "Interior Designer",
  CONSULTANT: "Consultant",
  CONTRACTOR: "Contractor",
  SUPPLIER: "Supplier",
  FABRICATOR: "Fabricator",
  INSTALLER: "Installer",
};

export default function MembersPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);
  const members = useAppSelector((s) => s.members.byProject[projectId]);
  const status = useAppSelector((s) => s.members.status);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("CONSULTANT");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    dispatch(fetchMembers(projectId));
  }, [projectId, dispatch]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      await dispatch(addMember({ projectId, email, role })).unwrap();
      toast.success(`${email} added to the project`);
      setEmail("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not add member");
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Team</h1>
        <p className="mt-1 text-sm text-muted">
          Everyone here sees this project and can act on it through their own role&apos;s view.
        </p>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-medium text-foreground">Add someone to this project</h2>
        {currentUser?.role !== "ADMIN" ? (
          <p className="text-sm text-muted">Only an admin can add people to this project.</p>
        ) : (
          <>
            <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="sm:w-48">
                <Label>Role on this project</Label>
                <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  {ROLES.filter((r) => r !== "ADMIN").map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" loading={inviting}>
                <UserPlus className="h-4 w-4" /> Add
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted">
              They need an existing ImpactFlow account with this email. If they don&apos;t have one yet, ask them to{" "}
              register first.
            </p>
          </>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-medium text-foreground">Project members</h2>
        {status === "loading" && !members ? (
          <LoadingState />
        ) : !members || members.length === 0 ? (
          <EmptyState title="No members yet" />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {members.map((m) => (
              <div key={m._id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-sm font-medium text-accent">
                    {m.user?.name?.[0] ?? "?"}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.user?.name ?? "Unknown user"}</p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <Mail className="h-3 w-3" /> {m.user?.email}
                    </p>
                    {m.user && m.user.role !== "CLIENT" && m.user.role !== "ADMIN" && (
                      <VerificationBadge status={m.user.verificationStatus} className="mt-1" />
                    )}
                  </div>
                </div>
                <span className="rounded bg-surface-raised px-2 py-1 text-xs font-medium text-muted">
                  {ROLE_LABELS[m.role]}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

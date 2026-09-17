"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAppDispatch } from "@/store/hooks";
import { registerUser } from "@/store/authSlice";
import { Button } from "@/components/ui/Button";
import { Input, Label, Card, Select } from "@/components/ui/primitives";
import { ApiError } from "@/lib/api";
import { REGISTRABLE_ROLES, GENDERS, type Role, type Gender } from "@/types";

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

const GENDER_LABELS: Record<Gender, string> = { MALE: "Male", FEMALE: "Female", OTHER: "Other / Prefer not to say" };

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "ARCHITECT" as Role,
    gender: "OTHER" as Gender,
    company: "",
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await dispatch(registerUser(form)).unwrap();
      // Every role except Client needs an admin to certify it before it's
      // trusted anywhere in the product -- send them straight to that chat
      // instead of leaving them to stumble on it later.
      router.push(form.role === "CLIENT" ? "/dashboard" : "/support");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create your account</h1>
          <p className="mt-1 text-sm text-muted">Join a project ecosystem, not another task board.</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label>Full name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role</Label>
                <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                  {REGISTRABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {GENDER_LABELS[g]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <p className="-mt-2 text-xs text-muted">
              Used only to pick a default profile picture -- you can upload your own anytime.
            </p>
            <div>
              <Label>Company (optional)</Label>
              <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
            <Button type="submit" loading={loading} className="mt-2 w-full">
              Create account
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

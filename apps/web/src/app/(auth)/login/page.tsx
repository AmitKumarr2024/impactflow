"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAppDispatch } from "@/store/hooks";
import { loginUser } from "@/store/authSlice";
import { fetchProjects } from "@/store/projectSlice";
import { Button } from "@/components/ui/Button";
import { Input, Label, Card } from "@/components/ui/primitives";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await dispatch(loginUser({ email, password })).unwrap();
      await dispatch(fetchProjects());
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">ImpactFlow</h1>
          <p className="mt-1 text-sm text-muted">See the impact before it becomes a problem.</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="architect@impactflow.demo"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" loading={loading} className="mt-2 w-full">
              Sign in
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-muted">
          New here?{" "}
          <Link href="/register" className="text-accent hover:underline">
            Create an account
          </Link>
        </p>
        <p className="mt-6 text-center text-xs text-muted">
          Demo: any of the seeded <code className="font-mono">@impactflow.demo</code> accounts, password{" "}
          <code className="font-mono">Demo@1234</code>
        </p>
      </div>
    </div>
  );
}

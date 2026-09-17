"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import {
  GitPullRequestArrow,
  Package,
  ShieldCheck,
  HardHat,
  ArrowRight,
  Users,
  Ruler,
} from "lucide-react";

const CAPABILITIES = [
  {
    icon: GitPullRequestArrow,
    title: "Change Impact Engine",
    description: "Before you approve a change, know exactly what it will affect.",
  },
  {
    icon: Ruler,
    title: "Site Reality vs. Design",
    description: "Keep the design connected to what's actually happening on site.",
  },
  {
    icon: Package,
    title: "Material Substitution Intelligence",
    description: "When a material changes, automatically see the ripple effect.",
  },
  {
    icon: ShieldCheck,
    title: "Approval Dependency Map",
    description: "See exactly what is blocked by one pending decision.",
  },
  {
    icon: HardHat,
    title: "Installer Feedback Loop",
    description: "Capture last-mile installation knowledge and send it back upstream.",
  },
  {
    icon: Users,
    title: "One shared ecosystem",
    description: "Architects, clients, suppliers, and installers -- one project, every angle.",
  },
];

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (api.getToken()) {
      router.replace("/dashboard");
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent/60">
            <div className="h-2 w-2 rounded-sm bg-accent-foreground" />
          </div>
          <span className="font-semibold tracking-tight text-foreground">ImpactFlow</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Create account</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          See the impact <span className="text-accent">before</span> it becomes a problem.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted sm:text-lg">
          Connect every project decision to the people, materials, drawings, and site work it
          affects -- from design decision to site execution.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register">
            <Button size="lg">
              Get started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">
              Sign in
            </Button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c) => (
            <div key={c.title} className="rounded-lg border border-border bg-surface p-5">
              <c.icon className="h-5 w-5 text-accent" />
              <h3 className="mt-3 text-sm font-medium text-foreground">{c.title}</h3>
              <p className="mt-1 text-sm text-muted">{c.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted">
        ImpactFlow -- decision and impact intelligence for project execution.
      </footer>
    </div>
  );
}

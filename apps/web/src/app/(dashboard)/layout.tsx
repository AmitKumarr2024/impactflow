"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthBootstrap } from "@/lib/useAuthBootstrap";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProjects } from "@/store/projectSlice";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { LoadingState } from "@/components/ui/primitives";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { checked } = useAuthBootstrap();
  const user = useAppSelector((s) => s.auth.user);

  useEffect(() => {
    if (checked && !user) router.replace("/login");
  }, [checked, user, router]);

  useEffect(() => {
    if (user) dispatch(fetchProjects());
  }, [user, dispatch]);

  if (!checked || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingState label="Loading ImpactFlow..." />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

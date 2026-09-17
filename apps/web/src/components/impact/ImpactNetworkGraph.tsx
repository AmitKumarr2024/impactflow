"use client";

import { Package, Ruler, ClipboardList, ShieldCheck, Users, GitPullRequestArrow } from "lucide-react";
import type { ImpactAnalysis } from "@/types";

interface NodeSpec {
  key: string;
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  angleDeg: number;
}

const RADIUS = 130;
const CENTER = 170;

/**
 * A real visualization of the actual Impact Analysis counts -- not a
 * fabricated relationship diagram. Each satellite node's count comes
 * straight from the deterministic Impact Engine's output. Nodes with zero
 * count are shown dimmed/dashed rather than hidden, so "nothing affected
 * here" stays visible and honest.
 */
export function ImpactNetworkGraph({ impact }: { impact: ImpactAnalysis }) {
  const nodes: NodeSpec[] = [
    { key: "stakeholders", label: "Stakeholders", count: impact.affectedStakeholders.length, icon: Users, angleDeg: -90 },
    { key: "materials", label: "Materials", count: impact.affectedMaterials.length, icon: Package, angleDeg: -18 },
    { key: "drawings", label: "Drawings", count: impact.affectedDrawings.length, icon: Ruler, angleDeg: 54 },
    { key: "tasks", label: "Tasks", count: impact.affectedTasks.length, icon: ClipboardList, angleDeg: 126 },
    { key: "approvals", label: "Approvals", count: impact.affectedApprovals.length, icon: ShieldCheck, angleDeg: 198 },
  ];

  function positionFor(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: CENTER + RADIUS * Math.cos(rad), y: CENTER + RADIUS * Math.sin(rad) };
  }

  return (
    <div className="flex justify-center overflow-x-auto py-2">
      <svg viewBox="0 0 340 340" className="h-[340px] w-[340px] shrink-0">
        {nodes.map((n) => {
          const p = positionFor(n.angleDeg);
          const active = n.count > 0;
          return (
            <line
              key={`line-${n.key}`}
              x1={CENTER}
              y1={CENTER}
              x2={p.x}
              y2={p.y}
              stroke={active ? "var(--color-accent)" : "var(--color-border)"}
              strokeWidth={active ? 1.5 : 1}
              strokeDasharray={active ? undefined : "4 4"}
              opacity={active ? 0.6 : 0.4}
            />
          );
        })}

        <foreignObject x={CENTER - 45} y={CENTER - 45} width={90} height={90}>
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-full border-2 border-accent bg-accent/10 text-center">
            <GitPullRequestArrow className="h-4 w-4 text-accent" />
            <span className="text-[10px] font-medium leading-tight text-accent">Change</span>
          </div>
        </foreignObject>

        {nodes.map((n) => {
          const p = positionFor(n.angleDeg);
          const active = n.count > 0;
          const Icon = n.icon;
          return (
            <foreignObject key={n.key} x={p.x - 40} y={p.y - 32} width={80} height={64}>
              <div className="flex h-full w-full flex-col items-center justify-center gap-0.5">
                <div
                  className={
                    active
                      ? "flex h-9 w-9 items-center justify-center rounded-full border border-accent/50 bg-surface text-accent"
                      : "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-muted opacity-50"
                  }
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className={active ? "text-[11px] font-semibold text-foreground" : "text-[11px] text-muted"}>
                  {n.count}
                </span>
                <span className="text-[9px] text-muted">{n.label}</span>
              </div>
            </foreignObject>
          );
        })}
      </svg>
    </div>
  );
}

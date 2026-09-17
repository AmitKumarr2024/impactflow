import { Types } from "mongoose";
import { ChangeRequest } from "../../models/ChangeRequest";
import { Material } from "../../models/Material";
import { Drawing } from "../../models/Drawing";
import { Task } from "../../models/Task";
import { Approval } from "../../models/Approval";
import { Decision } from "../../models/Decision";
import { ImpactAnalysis } from "../../models/ImpactAnalysis";
import { ProjectMember } from "../../models/ProjectMember";
import { AppError } from "../../utils/AppError";
import type { ImpactLevel } from "@impactflow/shared";

/**
 * impactEngineService
 * --------------------
 * This is the product's central brain (spec sections 14 & 37).
 * It is 100% rule-based and deterministic: given a change request, it walks
 * the explicit relationships already stored on Material/Drawing/Task/Approval
 * documents (linkedDrawingIds, linkedTaskIds, blockedTaskIds, etc.) and
 * assembles the set of everything that change touches.
 *
 * No AI, no guessing. If a relationship isn't in the data, the engine won't
 * report it. Estimates (cost/schedule) are clearly derived math, never invented.
 */

interface ImpactResult {
  impactLevel: ImpactLevel;
  affectedStakeholders: Types.ObjectId[];
  affectedMaterials: Types.ObjectId[];
  affectedDrawings: Types.ObjectId[];
  affectedTasks: Types.ObjectId[];
  affectedApprovals: Types.ObjectId[];
  affectedDecisions: Types.ObjectId[];
  estimatedCostDelta: number;
  estimatedScheduleDeltaDays: number;
  reasons: string[];
}

export async function findAffectedMaterials(changeRequestId: string) {
  const change = await ChangeRequest.findById(changeRequestId).lean();
  if (!change) throw AppError.notFound("Change request not found");
  // RULE 1: the material(s) explicitly named on the change request are affected.
  return Material.find({ _id: { $in: change.affectedMaterials } }).lean();
}

export async function findAffectedDrawings(materialIds: Types.ObjectId[], explicitDrawingIds: Types.ObjectId[]) {
  const materials = await Material.find({ _id: { $in: materialIds } }).lean();
  const fromMaterials = materials.flatMap((m) => m.linkedDrawingIds || []);
  // RULE 2: material -> linked drawings.
  const all = [...fromMaterials, ...explicitDrawingIds];
  return Drawing.find({ _id: { $in: all } }).lean();
}

export async function findAffectedTasks(materialIds: Types.ObjectId[], explicitTaskIds: Types.ObjectId[]) {
  const materials = await Material.find({ _id: { $in: materialIds } }).lean();
  const fromMaterials = materials.flatMap((m) => m.linkedTaskIds || []);
  // RULE 3 & 4: material -> procurement/installation tasks.
  const all = [...fromMaterials, ...explicitTaskIds];
  return Task.find({ _id: { $in: all } }).lean();
}

export async function findAffectedApprovals(changeRequestId: string) {
  // RULE 6: a change tied to a client-approval-requiring category surfaces
  // its dependency approvals; RULE 7: pending approvals show what they block.
  return Approval.find({ changeRequestId }).lean();
}

export async function findAffectedDecisions(changeRequestId: string) {
  return Decision.find({ relatedChangeRequest: changeRequestId }).lean();
}

export async function findAffectedStakeholders(
  projectId: Types.ObjectId,
  tasks: Awaited<ReturnType<typeof findAffectedTasks>>,
  materials: Awaited<ReturnType<typeof findAffectedMaterials>>,
  approvals: Awaited<ReturnType<typeof findAffectedApprovals>>
) {
  // RULE 5: supplier on affected materials; assigned contractor/installer on
  // affected tasks; anyone an approval is required from; plus all project members
  // with a role stake (architect/consultant always see high-impact changes).
  const ids = new Set<string>();

  materials.forEach((m) => m.supplierId && ids.add(m.supplierId.toString()));
  tasks.forEach((t) => t.assignedTo && ids.add(t.assignedTo.toString()));
  approvals.forEach((a) => a.requiredFrom && ids.add(a.requiredFrom.toString()));

  const members = await ProjectMember.find({
    projectId,
    role: { $in: ["ARCHITECT", "CONSULTANT"] },
  }).lean();
  members.forEach((m) => ids.add(m.userId.toString()));

  return Array.from(ids).map((id) => new Types.ObjectId(id));
}

export function calculateImpactLevel(input: {
  materialsCount: number;
  drawingsCount: number;
  tasksCount: number;
  approvalsCount: number;
  costDelta: number;
  scheduleDeltaDays: number;
}): ImpactLevel {
  // Deterministic scoring: each affected entity and each unit of estimated
  // cost/schedule disruption adds points. Thresholds are intentionally simple
  // and documented so the result is auditable, not a black box.
  let score = 0;
  score += input.materialsCount * 2;
  score += input.drawingsCount * 2;
  score += input.tasksCount * 1;
  score += input.approvalsCount * 3;
  score += Math.abs(input.costDelta) > 50000 ? 4 : Math.abs(input.costDelta) > 10000 ? 2 : 0;
  score += Math.abs(input.scheduleDeltaDays) > 10 ? 4 : Math.abs(input.scheduleDeltaDays) > 3 ? 2 : 0;

  if (score >= 14) return "CRITICAL";
  if (score >= 8) return "HIGH";
  if (score >= 3) return "MEDIUM";
  return "LOW";
}

export function calculateEstimatedCostDelta(materials: Awaited<ReturnType<typeof findAffectedMaterials>>) {
  // For MVP: sum of price on affected materials that are currently unavailable
  // is not counted (no committed alternative yet); real delta is computed when
  // a MaterialAlternative is selected (see materialSubstitutionService).
  return 0;
}

export function calculateEstimatedScheduleDelta(_materials: unknown) {
  return 0;
}

export function generateImpactSummary(result: ImpactResult): string[] {
  const reasons: string[] = [];
  if (result.affectedMaterials.length) {
    reasons.push(`${result.affectedMaterials.length} material(s) directly affected by this change.`);
  }
  if (result.affectedDrawings.length) {
    reasons.push(`${result.affectedDrawings.length} drawing(s) reference the affected material(s).`);
  }
  if (result.affectedTasks.length) {
    reasons.push(`${result.affectedTasks.length} task(s) depend on the affected material(s) or drawing(s).`);
  }
  if (result.affectedApprovals.length) {
    reasons.push(`${result.affectedApprovals.length} approval(s) are tied to this change.`);
  }
  if (result.affectedStakeholders.length) {
    reasons.push(`${result.affectedStakeholders.length} stakeholder(s) have a role in the affected items.`);
  }
  return reasons;
}

/**
 * analyzeChange
 * Orchestrates all rules above, persists an ImpactAnalysis document, and
 * returns it. This is the single entry point controllers should call.
 */
export async function analyzeChange(changeRequestId: string) {
  const change = await ChangeRequest.findById(changeRequestId);
  if (!change) throw AppError.notFound("Change request not found");

  const materials = await findAffectedMaterials(changeRequestId);
  const materialIds = materials.map((m) => m._id);

  const drawings = await findAffectedDrawings(materialIds, change.affectedDrawings);
  const tasks = await findAffectedTasks(materialIds, change.affectedTasks);
  const approvals = await findAffectedApprovals(changeRequestId);
  const decisions = await findAffectedDecisions(changeRequestId);
  const stakeholders = await findAffectedStakeholders(change.projectId, tasks, materials, approvals);

  const costDelta = calculateEstimatedCostDelta(materials);
  const scheduleDeltaDays = calculateEstimatedScheduleDelta(materials);

  const impactLevel = calculateImpactLevel({
    materialsCount: materials.length,
    drawingsCount: drawings.length,
    tasksCount: tasks.length,
    approvalsCount: approvals.length,
    costDelta,
    scheduleDeltaDays,
  });

  const result: ImpactResult = {
    impactLevel,
    affectedStakeholders: stakeholders,
    affectedMaterials: materialIds,
    affectedDrawings: drawings.map((d) => d._id),
    affectedTasks: tasks.map((t) => t._id),
    affectedApprovals: approvals.map((a) => a._id),
    affectedDecisions: decisions.map((d) => d._id),
    estimatedCostDelta: costDelta,
    estimatedScheduleDeltaDays: scheduleDeltaDays,
    reasons: [],
  };
  result.reasons = generateImpactSummary(result);

  const analysis = await ImpactAnalysis.create({
    changeRequestId,
    ...result,
    generatedAt: new Date(),
  });

  change.status = "IMPACT_REVIEW";
  await change.save();

  return analysis;
}

/**
 * recalculateForSubstitution
 * RULE 8 & 9: called after a supplier proposes a MaterialAlternative with a
 * concrete price/lead-time delta. Re-runs the same relationship rules but now
 * with a real cost/schedule delta, which can shift the impact level upward.
 */
export async function recalculateForSubstitution(
  changeRequestId: string,
  priceDelta: number,
  leadTimeDeltaDays: number
) {
  const change = await ChangeRequest.findById(changeRequestId);
  if (!change) throw AppError.notFound("Change request not found");

  const materials = await findAffectedMaterials(changeRequestId);
  const materialIds = materials.map((m) => m._id);
  const drawings = await findAffectedDrawings(materialIds, change.affectedDrawings);
  const tasks = await findAffectedTasks(materialIds, change.affectedTasks);
  const approvals = await findAffectedApprovals(changeRequestId);
  const decisions = await findAffectedDecisions(changeRequestId);
  const stakeholders = await findAffectedStakeholders(change.projectId, tasks, materials, approvals);

  const impactLevel = calculateImpactLevel({
    materialsCount: materials.length,
    drawingsCount: drawings.length,
    tasksCount: tasks.length,
    approvalsCount: approvals.length,
    costDelta: priceDelta,
    scheduleDeltaDays: -leadTimeDeltaDays,
  });

  const result: ImpactResult = {
    impactLevel,
    affectedStakeholders: stakeholders,
    affectedMaterials: materialIds,
    affectedDrawings: drawings.map((d) => d._id),
    affectedTasks: tasks.map((t) => t._id),
    affectedApprovals: approvals.map((a) => a._id),
    affectedDecisions: decisions.map((d) => d._id),
    estimatedCostDelta: priceDelta,
    estimatedScheduleDeltaDays: -leadTimeDeltaDays,
    reasons: [],
  };
  result.reasons = [
    ...generateImpactSummary(result),
    `Proposed alternative changes cost by ${priceDelta >= 0 ? "+" : ""}${priceDelta} and lead time by ${
      leadTimeDeltaDays >= 0 ? "-" : "+"
    }${Math.abs(leadTimeDeltaDays)} day(s).`,
  ];

  return ImpactAnalysis.create({ changeRequestId, ...result, generatedAt: new Date() });
}

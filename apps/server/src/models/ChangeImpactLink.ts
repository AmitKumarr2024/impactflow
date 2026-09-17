import { Schema, model, Types } from "mongoose";

export const IMPACT_LINK_ENTITY_TYPES = [
  "Material",
  "Drawing",
  "Task",
  "Approval",
  "Stakeholder",
  "SiteObservation",
  "Feedback",
] as const;
export type ImpactLinkEntityType = (typeof IMPACT_LINK_ENTITY_TYPES)[number];

export interface IChangeImpactLink {
  _id: Types.ObjectId;
  changeId: Types.ObjectId;
  entityType: ImpactLinkEntityType;
  // Polymorphic on purpose -- entityType tells the reader (and the
  // controller, at write time) which collection entityId actually points
  // into. "Stakeholder" links point at a User, everything else at its
  // matching model (Material, Drawing, Task, Approval, SiteObservation,
  // Feedback).
  entityId: Types.ObjectId;
  reason?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const changeImpactLinkSchema = new Schema<IChangeImpactLink>(
  {
    changeId: { type: Schema.Types.ObjectId, ref: "ChangeRequest", required: true, index: true },
    entityType: { type: String, enum: IMPACT_LINK_ENTITY_TYPES, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, maxlength: 500 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

changeImpactLinkSchema.index({ entityType: 1, entityId: 1 });
// The same entity can't be linked to the same change twice -- re-linking is
// a no-op, not a duplicate row (enforced here, not just in the controller,
// so it holds even under concurrent requests).
changeImpactLinkSchema.index({ changeId: 1, entityType: 1, entityId: 1 }, { unique: true });

export const ChangeImpactLink = model<IChangeImpactLink>("ChangeImpactLink", changeImpactLinkSchema);

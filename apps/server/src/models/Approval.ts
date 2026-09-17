import { Schema, model, Types } from "mongoose";

import { APPROVAL_STATUSES, type ApprovalStatus } from "@impactflow/shared";

export interface IApproval {
  _id: Types.ObjectId;

  projectId: Types.ObjectId;

  title: string;

  changeRequestId?: Types.ObjectId;

  /**
   * Exact USER who must approve/reject this approval.
   *
   * This is NOT a role.
   *
   * Example:
   * requiredFrom = Rahul Sharma's User._id
   */
  requiredFrom: Types.ObjectId;

  status: ApprovalStatus;

  blockedTaskIds: Types.ObjectId[];

  decidedBy?: Types.ObjectId;

  decidedAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}

const approvalSchema = new Schema<IApproval>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    changeRequestId: {
      type: Schema.Types.ObjectId,
      ref: "ChangeRequest",
      index: true,
    },

    /**
     * Exact designated approver.
     */
    requiredFrom: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: "PENDING",
      index: true,
    },

    blockedTaskIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ],

    decidedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    decidedAt: {
      type: Date,
    },
  },

  {
    timestamps: true,
  },
);

export const Approval = model<IApproval>("Approval", approvalSchema);

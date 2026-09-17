import { Schema, model, Types } from "mongoose";

import {
  CHANGE_CATEGORIES,
  CHANGE_STATUSES,
  type ChangeCategory,
  type ChangeStatus,
} from "@impactflow/shared";

export interface IChangeRequest {
  _id: Types.ObjectId;

  projectId: Types.ObjectId;

  title: string;

  description: string;

  category: ChangeCategory;

  /**
   * User who raised/submitted the change.
   */
  requestedBy: Types.ObjectId;

  /**
   * Exact user who is responsible for approving/rejecting
   * this change.
   *
   * This is intentionally a USER ID rather than only a role.
   *
   * Example:
   * requestedBy = Amit Kumar
   * approvalRequiredFrom = Rahul Sharma
   */
  approvalRequiredFrom: Types.ObjectId;

  status: ChangeStatus;

  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";

  reason?: string;

  attachments: string[];

  affectedMaterials: Types.ObjectId[];

  affectedDrawings: Types.ObjectId[];

  affectedTasks: Types.ObjectId[];

  requestedAt: Date;

  reviewedAt?: Date;

  approvedAt?: Date;

  rejectedAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}

const changeRequestSchema = new Schema<IChangeRequest>(
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

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: CHANGE_CATEGORIES,
      required: true,
    },

    /**
     * Person who created/requested the change.
     */
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /**
     * Exact person responsible for approving/rejecting
     * this change.
     */
    approvalRequiredFrom: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: CHANGE_STATUSES,
      default: "DRAFT",
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "URGENT"],
      default: "MEDIUM",
    },

    reason: {
      type: String,
      trim: true,
    },

    attachments: {
      type: [String],
      default: [],
    },

    /**
     * The item(s) the requester explicitly points at
     * when filing the change.
     *
     * The Impact Engine expands outward from these
     * through relationship rules.
     */
    affectedMaterials: [
      {
        type: Schema.Types.ObjectId,
        ref: "Material",
      },
    ],

    affectedDrawings: [
      {
        type: Schema.Types.ObjectId,
        ref: "Drawing",
      },
    ],

    affectedTasks: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ],

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    reviewedAt: {
      type: Date,
    },

    approvedAt: {
      type: Date,
    },

    rejectedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

export const ChangeRequest = model<IChangeRequest>(
  "ChangeRequest",
  changeRequestSchema,
);

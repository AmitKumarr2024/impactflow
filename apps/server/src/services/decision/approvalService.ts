import { Types } from "mongoose";
import { Approval } from "../../models/Approval";
import { Task } from "../../models/Task";

/**
 * A task can be blocked by more than one approval at once (spec section 17).
 * Call this after an approval's status flips away from PENDING/BLOCKED to
 * re-check each task it was blocking: only unblock a task once NO other
 * still-pending approval also blocks it.
 */
export async function unblockTasksIfClear(
  approvalId: Types.ObjectId | string,
  blockedTaskIds: (Types.ObjectId | string)[]
) {
  for (const taskId of blockedTaskIds) {
    const stillBlocking = await Approval.exists({
      _id: { $ne: approvalId },
      blockedTaskIds: taskId,
      status: { $in: ["PENDING", "BLOCKED"] },
    });
    if (!stillBlocking) {
      await Task.updateOne({ _id: taskId, status: "BLOCKED" }, { status: "NOT_STARTED" });
    }
  }
}

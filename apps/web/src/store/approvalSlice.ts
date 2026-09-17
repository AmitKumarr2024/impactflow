import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";

import { api } from "@/lib/api";

import type { Approval } from "@/types";

/* -------------------------------------------------------------------------- */
/* State                                                                      */
/* -------------------------------------------------------------------------- */

interface ApprovalState {
  byProject: Record<string, Approval[]>;

  status: "idle" | "loading" | "error";
}

const initialState: ApprovalState = {
  byProject: {},

  status: "idle",
};

/* -------------------------------------------------------------------------- */
/* API Response Types                                                         */
/* -------------------------------------------------------------------------- */

interface FetchApprovalsResponse {
  approvals: Approval[];
}

interface ApprovalActionResponse {
  approval: Approval;

  change?: unknown;
}

interface FetchApprovalsResult {
  projectId: string;

  approvals: Approval[];
}

interface ApprovalActionResult {
  approval: Approval;

  change?: unknown;
}

/* -------------------------------------------------------------------------- */
/* Fetch Approvals                                                            */
/* -------------------------------------------------------------------------- */

export const fetchApprovals = createAsyncThunk<FetchApprovalsResult, string>(
  "approvals/fetchAll",

  async (projectId) => {
    const res = await api.get<FetchApprovalsResponse>(
      `/api/projects/${projectId}/approvals`,
    );

    return {
      projectId,

      approvals: res.approvals,
    };
  },
);

/* -------------------------------------------------------------------------- */
/* Approve Approval                                                           */
/* -------------------------------------------------------------------------- */

export const approveApproval = createAsyncThunk<ApprovalActionResult, string>(
  "approvals/approve",

  async (id) => {
    const res = await api.post<ApprovalActionResponse>(
      `/api/approvals/${id}/approve`,
    );

    return {
      approval: res.approval,

      change: res.change,
    };
  },
);

/* -------------------------------------------------------------------------- */
/* Reject Approval                                                            */
/* -------------------------------------------------------------------------- */

export const rejectApproval = createAsyncThunk<ApprovalActionResult, string>(
  "approvals/reject",

  async (id) => {
    const res = await api.post<ApprovalActionResponse>(
      `/api/approvals/${id}/reject`,
    );

    return {
      approval: res.approval,

      change: res.change,
    };
  },
);

/* -------------------------------------------------------------------------- */
/* Slice                                                                      */
/* -------------------------------------------------------------------------- */

const approvalSlice = createSlice({
  name: "approvals",

  initialState,

  reducers: {},

  extraReducers: (builder) => {
    /* ------------------------------------------------------------------ */
    /* Fetch                                                               */
    /* ------------------------------------------------------------------ */

    builder.addCase(
      fetchApprovals.pending,

      (state) => {
        state.status = "loading";
      },
    );

    builder.addCase(
      fetchApprovals.fulfilled,

      (state, action: PayloadAction<FetchApprovalsResult>) => {
        state.status = "idle";

        const { projectId, approvals } = action.payload;

        /*
         * Defensive deduplication.
         */
        state.byProject[projectId] = Array.from(
          new Map(
            approvals.map((approval) => [approval._id, approval]),
          ).values(),
        );
      },
    );

    builder.addCase(
      fetchApprovals.rejected,

      (state) => {
        state.status = "error";
      },
    );

    /* ------------------------------------------------------------------ */
    /* Approve                                                             */
    /* ------------------------------------------------------------------ */

    builder.addCase(
      approveApproval.fulfilled,

      (state, action: PayloadAction<ApprovalActionResult>) => {
        state.status = "idle";

        const approval = action.payload.approval;

        const projectId = approval.projectId;

        const list = state.byProject[projectId];

        if (!list) {
          return;
        }

        const index = list.findIndex((item) => item._id === approval._id);

        if (index >= 0) {
          list[index] = {
            ...list[index],

            ...approval,
          };
        }
      },
    );

    /* ------------------------------------------------------------------ */
    /* Reject                                                              */
    /* ------------------------------------------------------------------ */

    builder.addCase(
      rejectApproval.fulfilled,

      (state, action: PayloadAction<ApprovalActionResult>) => {
        state.status = "idle";

        const approval = action.payload.approval;

        const projectId = approval.projectId;

        const list = state.byProject[projectId];

        if (!list) {
          return;
        }

        const index = list.findIndex((item) => item._id === approval._id);

        if (index >= 0) {
          list[index] = {
            ...list[index],

            ...approval,
          };
        }
      },
    );
  },
});

export default approvalSlice.reducer;

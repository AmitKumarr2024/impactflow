import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

import { api } from "@/lib/api";

import type { ChangeRequest, ImpactAnalysis, ChangeCategory } from "@/types";

interface ChangeState {
  byProject: Record<string, ChangeRequest[]>;

  current: ChangeRequest | null;

  currentImpact: ImpactAnalysis | null;

  analyzing: boolean;

  status: "idle" | "loading" | "error";
}

const initialState: ChangeState = {
  byProject: {},

  current: null,

  currentImpact: null,

  analyzing: false,

  status: "idle",
};

/* -------------------------------------------------------------------------- */
/* Fetch Changes                                                              */
/* -------------------------------------------------------------------------- */

export const fetchChanges = createAsyncThunk(
  "changes/fetchAll",

  async (projectId: string) => {
    const res = await api.get<{
      changes: ChangeRequest[];
    }>(`/api/projects/${projectId}/changes`);

    return {
      projectId,
      changes: res.changes,
    };
  },
);

/* -------------------------------------------------------------------------- */
/* Fetch Single Change                                                        */
/* -------------------------------------------------------------------------- */

export const fetchChange = createAsyncThunk(
  "changes/fetchOne",

  async (id: string) => {
    const res = await api.get<{
      change: ChangeRequest;
    }>(`/api/changes/${id}`);

    return res.change;
  },
);

/* -------------------------------------------------------------------------- */
/* Fetch Impact                                                               */
/* -------------------------------------------------------------------------- */

export const fetchImpact = createAsyncThunk(
  "changes/fetchImpact",

  async (id: string, { rejectWithValue }) => {
    try {
      const res = await api.get<{
        analysis: ImpactAnalysis;
      }>(`/api/changes/${id}/impact`);

      return res.analysis;
    } catch {
      // No analysis run yet.
      return rejectWithValue(null);
    }
  },
);

/* -------------------------------------------------------------------------- */
/* Create Change                                                              */
/* -------------------------------------------------------------------------- */

export const createChange = createAsyncThunk(
  "changes/create",

  async (input: {
    projectId: string;

    title: string;

    description: string;

    category: ChangeCategory;

    priority?: string;

    reason?: string;

    /**
     * Exact project member who must
     * approve this change.
     */
    approvalRequiredFrom: string;

    affectedMaterials?: string[];

    affectedDrawings?: string[];

    affectedTasks?: string[];

    attachments?: string[];
  }) => {
    const { projectId, ...body } = input;

    const res = await api.post<{
      change: ChangeRequest;
    }>(`/api/projects/${projectId}/changes`, body);

    return res.change;
  },
);

/* -------------------------------------------------------------------------- */
/* Update Change Links                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Link/unlink affected materials,
 * drawings, and tasks on an EXISTING change.
 *
 * Sends the full replacement array for
 * whichever field is provided.
 */
export const updateChangeLinks = createAsyncThunk(
  "changes/updateLinks",

  async (input: {
    id: string;

    affectedMaterials?: string[];

    affectedDrawings?: string[];

    affectedTasks?: string[];
  }) => {
    const { id, ...body } = input;

    const res = await api.patch<{
      change: ChangeRequest;
    }>(`/api/changes/${id}`, body);

    return res.change;
  },
);

/* -------------------------------------------------------------------------- */
/* Analyze Change                                                             */
/* -------------------------------------------------------------------------- */

export const analyzeChange = createAsyncThunk(
  "changes/analyze",

  async (id: string) => {
    const res = await api.post<{
      analysis: ImpactAnalysis;
    }>(`/api/changes/${id}/analyze`);

    return res.analysis;
  },
);

/* -------------------------------------------------------------------------- */
/* Approve Change                                                             */
/* -------------------------------------------------------------------------- */

export const approveChange = createAsyncThunk(
  "changes/approve",

  async (id: string) => {
    const res = await api.post<{
      change: ChangeRequest;
    }>(`/api/changes/${id}/approve`);

    return res.change;
  },
);

/* -------------------------------------------------------------------------- */
/* Reject Change                                                              */
/* -------------------------------------------------------------------------- */

export const rejectChange = createAsyncThunk(
  "changes/reject",

  async (id: string) => {
    const res = await api.post<{
      change: ChangeRequest;
    }>(`/api/changes/${id}/reject`);

    return res.change;
  },
);

/* -------------------------------------------------------------------------- */
/* Slice                                                                      */
/* -------------------------------------------------------------------------- */

const changeSlice = createSlice({
  name: "changes",

  initialState,

  reducers: {
    /* -------------------------------------------------------------------- */
    /* Receive Change Created                                              */
    /* -------------------------------------------------------------------- */

    receiveChangeCreated(
      state,

      action: PayloadAction<ChangeRequest>,
    ) {
      const list = state.byProject[action.payload.projectId];

      if (list && !list.find((change) => change._id === action.payload._id)) {
        list.unshift(action.payload);
      }
    },

    /* -------------------------------------------------------------------- */
    /* Receive Impact Updated                                               */
    /* -------------------------------------------------------------------- */

    receiveImpactUpdated(
      state,

      action: PayloadAction<ImpactAnalysis>,
    ) {
      if (state.current?._id === action.payload.changeRequestId) {
        state.currentImpact = action.payload;
      }
    },

    /* -------------------------------------------------------------------- */
    /* Clear Current                                                        */
    /* -------------------------------------------------------------------- */

    clearCurrent(state) {
      state.current = null;

      state.currentImpact = null;
    },
  },

  /* ---------------------------------------------------------------------- */
  /* Extra Reducers                                                         */
  /* ---------------------------------------------------------------------- */

  extraReducers: (builder) => {
    builder

      /* ------------------------------------------------------------------ */
      /* Fetch Changes                                                      */
      /* ------------------------------------------------------------------ */

      .addCase(
        fetchChanges.pending,

        (state) => {
          state.status = "loading";
        },
      )

      .addCase(
        fetchChanges.fulfilled,

        (state, action) => {
          state.status = "idle";

          state.byProject[action.payload.projectId] = action.payload.changes;
        },
      )

      .addCase(
        fetchChanges.rejected,

        (state) => {
          state.status = "error";
        },
      )

      /* ------------------------------------------------------------------ */
      /* Fetch Change                                                       */
      /* ------------------------------------------------------------------ */

      .addCase(
        fetchChange.fulfilled,

        (state, action) => {
          state.current = action.payload;
        },
      )

      /* ------------------------------------------------------------------ */
      /* Update Links                                                       */
      /* ------------------------------------------------------------------ */

      .addCase(
        updateChangeLinks.fulfilled,

        (state, action) => {
          state.current = action.payload;
        },
      )

      /* ------------------------------------------------------------------ */
      /* Fetch Impact                                                       */
      /* ------------------------------------------------------------------ */

      .addCase(
        fetchImpact.fulfilled,

        (state, action) => {
          state.currentImpact = action.payload;
        },
      )

      .addCase(
        fetchImpact.rejected,

        (state) => {
          state.currentImpact = null;
        },
      )

      /* ------------------------------------------------------------------ */
      /* Create Change                                                      */
      /* ------------------------------------------------------------------ */

      .addCase(
        createChange.fulfilled,

        (state, action) => {
          const list = state.byProject[action.payload.projectId] || [];

          /*
           * Defensive deduplication.
           */
          const filtered = list.filter(
            (change) => change._id !== action.payload._id,
          );

          state.byProject[action.payload.projectId] = [
            action.payload,
            ...filtered,
          ];
        },
      )

      /* ------------------------------------------------------------------ */
      /* Analyze                                                            */
      /* ------------------------------------------------------------------ */

      .addCase(
        analyzeChange.pending,

        (state) => {
          state.analyzing = true;
        },
      )

      .addCase(
        analyzeChange.fulfilled,

        (state, action) => {
          state.analyzing = false;

          state.currentImpact = action.payload;
        },
      )

      .addCase(
        analyzeChange.rejected,

        (state) => {
          state.analyzing = false;
        },
      )

      /* ------------------------------------------------------------------ */
      /* Approve                                                            */
      /* ------------------------------------------------------------------ */

      .addCase(
        approveChange.fulfilled,

        (state, action) => {
          state.current = action.payload;

          const projectId = action.payload.projectId;

          const list = state.byProject[projectId];

          if (list) {
            const index = list.findIndex(
              (change) => change._id === action.payload._id,
            );

            if (index !== -1) {
              list[index] = action.payload;
            }
          }
        },
      )

      /* ------------------------------------------------------------------ */
      /* Reject                                                             */
      /* ------------------------------------------------------------------ */

      .addCase(
        rejectChange.fulfilled,

        (state, action) => {
          state.current = action.payload;

          const projectId = action.payload.projectId;

          const list = state.byProject[projectId];

          if (list) {
            const index = list.findIndex(
              (change) => change._id === action.payload._id,
            );

            if (index !== -1) {
              list[index] = action.payload;
            }
          }
        },
      );
  },
});

export const { receiveChangeCreated, receiveImpactUpdated, clearCurrent } =
  changeSlice.actions;

export default changeSlice.reducer;

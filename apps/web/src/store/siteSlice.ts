import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { SiteObservation } from "@/types";

interface SiteState {
  byProject: Record<string, SiteObservation[]>;
  status: "idle" | "loading" | "error";
}

const initialState: SiteState = { byProject: {}, status: "idle" };

export const fetchSiteObservations = createAsyncThunk("site/fetchAll", async (projectId: string) => {
  const res = await api.get<{ observations: SiteObservation[] }>(`/api/projects/${projectId}/site-observations`);
  return { projectId, observations: res.observations };
});

export const createSiteObservation = createAsyncThunk(
  "site/create",
  async (input: {
    projectId: string;
    title: string;
    description?: string;
    expectedValue?: string;
    actualValue?: string;
    unit?: string;
    severity?: string;
    photos?: string[];
  }) => {
    const { projectId, ...body } = input;
    const res = await api.post<{ observation: SiteObservation }>(`/api/projects/${projectId}/site-observations`, body);
    return res.observation;
  }
);

export const updateSiteObservationStatus = createAsyncThunk(
  "site/updateStatus",
  async (input: { id: string; status: SiteObservation["status"] }) => {
    const res = await api.patch<{ observation: SiteObservation }>(`/api/site-observations/${input.id}`, {
      status: input.status,
    });
    return res.observation;
  }
);

const siteSlice = createSlice({
  name: "site",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSiteObservations.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchSiteObservations.fulfilled, (state, action) => {
        state.status = "idle";
        state.byProject[action.payload.projectId] = action.payload.observations;
      })
      .addCase(fetchSiteObservations.rejected, (state) => {
        state.status = "error";
      })
      .addCase(createSiteObservation.fulfilled, (state, action) => {
        const list = state.byProject[action.payload.projectId] || [];
        state.byProject[action.payload.projectId] = [action.payload, ...list];
      })
      .addCase(updateSiteObservationStatus.fulfilled, (state, action) => {
        const list = state.byProject[action.payload.projectId];
        if (list) {
          const idx = list.findIndex((o) => o._id === action.payload._id);
          if (idx >= 0) list[idx] = action.payload;
        }
      });
  },
});

export default siteSlice.reducer;

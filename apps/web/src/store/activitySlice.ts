import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { ActivityRecord } from "@/types";

interface ActivityState {
  byProject: Record<string, ActivityRecord[]>;
  status: "idle" | "loading" | "error";
}

const initialState: ActivityState = { byProject: {}, status: "idle" };

export const fetchActivity = createAsyncThunk("activity/fetchAll", async (projectId: string) => {
  const res = await api.get<{ activity: ActivityRecord[] }>(`/api/projects/${projectId}/activity`);
  return { projectId, activity: res.activity };
});

const activitySlice = createSlice({
  name: "activity",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchActivity.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchActivity.fulfilled, (state, action) => {
        state.status = "idle";
        state.byProject[action.payload.projectId] = action.payload.activity;
      })
      .addCase(fetchActivity.rejected, (state) => {
        state.status = "error";
      });
  },
});

export default activitySlice.reducer;

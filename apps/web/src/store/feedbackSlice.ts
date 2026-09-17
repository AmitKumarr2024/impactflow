import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { Feedback } from "@/types";

interface FeedbackState {
  byProject: Record<string, Feedback[]>;
  status: "idle" | "loading" | "error";
}

const initialState: FeedbackState = { byProject: {}, status: "idle" };

export const fetchFeedback = createAsyncThunk("feedback/fetchAll", async (projectId: string) => {
  const res = await api.get<{ feedback: Feedback[] }>(`/api/projects/${projectId}/feedback`);
  return { projectId, feedback: res.feedback };
});

export const createFeedback = createAsyncThunk(
  "feedback/create",
  async (input: { projectId: string; title: string; description: string; severity?: string }) => {
    const { projectId, ...body } = input;
    const res = await api.post<{ feedback: Feedback }>(`/api/projects/${projectId}/feedback`, body);
    return res.feedback;
  }
);

export const updateFeedbackStatus = createAsyncThunk(
  "feedback/updateStatus",
  async (input: { id: string; status: Feedback["status"] }) => {
    const res = await api.patch<{ feedback: Feedback }>(`/api/feedback/${input.id}`, { status: input.status });
    return res.feedback;
  }
);

const feedbackSlice = createSlice({
  name: "feedback",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeedback.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchFeedback.fulfilled, (state, action) => {
        state.status = "idle";
        state.byProject[action.payload.projectId] = action.payload.feedback;
      })
      .addCase(fetchFeedback.rejected, (state) => {
        state.status = "error";
      })
      .addCase(createFeedback.fulfilled, (state, action) => {
        const list = state.byProject[action.payload.projectId] || [];
        state.byProject[action.payload.projectId] = [action.payload, ...list];
      })
      .addCase(updateFeedbackStatus.fulfilled, (state, action) => {
        const list = state.byProject[action.payload.projectId];
        if (list) {
          const idx = list.findIndex((f) => f._id === action.payload._id);
          if (idx >= 0) list[idx] = action.payload;
        }
      });
  },
});

export default feedbackSlice.reducer;

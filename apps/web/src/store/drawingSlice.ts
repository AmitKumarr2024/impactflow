import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { Drawing } from "@/types";

interface DrawingState {
  byProject: Record<string, Drawing[]>;
  status: "idle" | "loading" | "error";
}

const initialState: DrawingState = { byProject: {}, status: "idle" };

export const fetchDrawings = createAsyncThunk("drawings/fetchAll", async (projectId: string) => {
  const res = await api.get<{ drawings: Drawing[] }>(`/api/projects/${projectId}/drawings`);
  return { projectId, drawings: res.drawings };
});

export const createDrawing = createAsyncThunk(
  "drawings/create",
  async (input: {
    projectId: string;
    name: string;
    category?: string;
    fileUrl?: string;
    cloudinaryPublicId?: string;
    supersedesDrawingId?: string;
  }) => {
    const { projectId, ...body } = input;
    const res = await api.post<{ drawing: Drawing }>(`/api/projects/${projectId}/drawings`, body);
    return res.drawing;
  }
);

const drawingSlice = createSlice({
  name: "drawings",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDrawings.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchDrawings.fulfilled, (state, action) => {
        state.status = "idle";
        state.byProject[action.payload.projectId] = action.payload.drawings;
      })
      .addCase(fetchDrawings.rejected, (state) => {
        state.status = "error";
      })
      .addCase(createDrawing.fulfilled, (state, action) => {
        const list = state.byProject[action.payload.projectId] || [];
        state.byProject[action.payload.projectId] = [action.payload, ...list];
      });
  },
});

export default drawingSlice.reducer;

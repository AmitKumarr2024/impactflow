import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { User, Role } from "@/types";

export interface ProjectMember {
  _id: string;
  projectId: string;
  userId: string;
  role: Role;
  joinedAt: string;
  user: User | null;
}

interface MemberState {
  byProject: Record<string, ProjectMember[]>;
  status: "idle" | "loading" | "error";
}

const initialState: MemberState = { byProject: {}, status: "idle" };

export const fetchMembers = createAsyncThunk("members/fetchAll", async (projectId: string) => {
  const res = await api.get<{ members: ProjectMember[] }>(`/api/projects/${projectId}/members`);
  return { projectId, members: res.members };
});

export const addMember = createAsyncThunk(
  "members/add",
  async (input: { projectId: string; email: string; role?: Role }) => {
    const { projectId, ...body } = input;
    const res = await api.post<{ member: ProjectMember }>(`/api/projects/${projectId}/members`, body);
    return { projectId, member: res.member };
  }
);

const memberSlice = createSlice({
  name: "members",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMembers.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMembers.fulfilled, (state, action) => {
        state.status = "idle";
        state.byProject[action.payload.projectId] = action.payload.members;
      })
      .addCase(fetchMembers.rejected, (state) => {
        state.status = "error";
      })
      .addCase(addMember.fulfilled, (state, action) => {
        const list = state.byProject[action.payload.projectId] || [];
        state.byProject[action.payload.projectId] = [...list, action.payload.member];
      });
  },
});

export default memberSlice.reducer;

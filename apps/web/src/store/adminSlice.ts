import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { Project, ActivityRecord, User, Role } from "@/types";

export interface AdminOverviewEntry {
  project: Project;
  activeChanges: number;
  pendingApprovals: number;
  memberCount: number;
  lastActivity: Pick<ActivityRecord, "summary" | "createdAt"> | null;
}

export interface DirectoryEntry {
  user: User;
  projectCount: number;
  openTaskCount: number;
}

export interface PendingVerificationUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
  company?: string;
  gender: string;
  createdAt: string;
}

interface AdminState {
  overview: AdminOverviewEntry[];
  overviewStatus: "idle" | "loading" | "error";
  directory: DirectoryEntry[];
  directoryStatus: "idle" | "loading" | "error";
  pendingVerifications: PendingVerificationUser[];
  verificationsStatus: "idle" | "loading" | "error";
}

const initialState: AdminState = {
  overview: [],
  overviewStatus: "idle",
  directory: [],
  directoryStatus: "idle",
  pendingVerifications: [],
  verificationsStatus: "idle",
};

export const fetchAdminOverview = createAsyncThunk("admin/fetchOverview", async () => {
  const res = await api.get<{ overview: AdminOverviewEntry[] }>("/api/admin/overview");
  return res.overview;
});

export const fetchUsersByRole = createAsyncThunk("admin/fetchUsersByRole", async (role: Role) => {
  const res = await api.get<{ users: DirectoryEntry[] }>(`/api/admin/users?role=${role}`);
  return res.users;
});

export const fetchPendingVerifications = createAsyncThunk("admin/fetchPendingVerifications", async () => {
  const res = await api.get<{ users: PendingVerificationUser[] }>("/api/admin/verifications");
  return res.users;
});

export const decideVerification = createAsyncThunk(
  "admin/decideVerification",
  async (input: { userId: string; status: "VERIFIED" | "REJECTED" }) => {
    await api.post(`/api/admin/verifications/${input.userId}`, { status: input.status });
    return input.userId;
  }
);

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    clearDirectory(state) {
      state.directory = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminOverview.pending, (state) => {
        state.overviewStatus = "loading";
      })
      .addCase(fetchAdminOverview.fulfilled, (state, action) => {
        state.overviewStatus = "idle";
        state.overview = action.payload;
      })
      .addCase(fetchAdminOverview.rejected, (state) => {
        state.overviewStatus = "error";
      })
      .addCase(fetchUsersByRole.pending, (state) => {
        state.directoryStatus = "loading";
      })
      .addCase(fetchUsersByRole.fulfilled, (state, action) => {
        state.directoryStatus = "idle";
        state.directory = action.payload;
      })
      .addCase(fetchUsersByRole.rejected, (state) => {
        state.directoryStatus = "error";
      })
      .addCase(fetchPendingVerifications.pending, (state) => {
        state.verificationsStatus = "loading";
      })
      .addCase(fetchPendingVerifications.fulfilled, (state, action) => {
        state.verificationsStatus = "idle";
        state.pendingVerifications = action.payload;
      })
      .addCase(fetchPendingVerifications.rejected, (state) => {
        state.verificationsStatus = "error";
      })
      .addCase(decideVerification.fulfilled, (state, action) => {
        state.pendingVerifications = state.pendingVerifications.filter((u) => u._id !== action.payload);
      });
  },
});

export const { clearDirectory } = adminSlice.actions;
export default adminSlice.reducer;

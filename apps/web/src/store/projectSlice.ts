import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";

import { api } from "@/lib/api";

import type { Project } from "@/types";

interface ProjectState {
  items: Project[];
  currentProjectId: string | null;
  status: "idle" | "loading" | "error";
}

const initialState: ProjectState = {
  items: [],
  currentProjectId: null,
  status: "idle",
};

export const fetchProjects = createAsyncThunk("projects/fetchAll", async () => {
  const res = await api.get<{ projects: Project[] }>("/api/projects");

  return res.projects;
});

export const fetchProject = createAsyncThunk(
  "projects/fetchOne",
  async (id: string) => {
    const res = await api.get<{ project: Project }>(`/api/projects/${id}`);

    return res.project;
  },
);

export const createProject = createAsyncThunk(
  "projects/create",
  async (input: {
    name: string;
    projectCode: string;
    description?: string;
    clientEmail: string;
    location?: string;
    startDate?: string;
    expectedEndDate?: string;
  }) => {
    const res = await api.post<{ project: Project }>("/api/projects", input);

    return res.project;
  },
);

const projectSlice = createSlice({
  name: "projects",

  initialState,

  reducers: {
    setCurrentProject(state, action: PayloadAction<string>) {
      state.currentProjectId = action.payload;

      if (typeof window !== "undefined") {
        localStorage.setItem("impactflow_current_project", action.payload);
      }
    },

    restoreCurrentProject(state) {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("impactflow_current_project");

        if (saved) {
          state.currentProjectId = saved;
        }
      }
    },
  },

  extraReducers: (builder) => {
    builder

      .addCase(fetchProjects.pending, (state) => {
        state.status = "loading";
      })

      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.status = "idle";
        state.items = action.payload;

        if (!state.currentProjectId && action.payload.length > 0) {
          state.currentProjectId = action.payload[0]._id;
        }
      })

      .addCase(fetchProjects.rejected, (state) => {
        state.status = "error";
      })

      .addCase(fetchProject.fulfilled, (state, action) => {
        const idx = state.items.findIndex(
          (project) => project._id === action.payload._id,
        );

        if (idx >= 0) {
          state.items[idx] = action.payload;
        } else {
          state.items.push(action.payload);
        }
      })

      .addCase(createProject.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.currentProjectId = action.payload._id;
      });
  },
});

export const { setCurrentProject, restoreCurrentProject } =
  projectSlice.actions;

export default projectSlice.reducer;

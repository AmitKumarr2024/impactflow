import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { Task } from "@/types";

interface TaskState {
  byProject: Record<string, Task[]>;
  status: "idle" | "loading" | "error";
}

const initialState: TaskState = { byProject: {}, status: "idle" };

export const fetchTasks = createAsyncThunk("tasks/fetchAll", async (projectId: string) => {
  const res = await api.get<{ tasks: Task[] }>(`/api/projects/${projectId}/tasks`);
  return { projectId, tasks: res.tasks };
});

export const createTask = createAsyncThunk(
  "tasks/create",
  async (input: { projectId: string; title: string; type?: string; assignedTo?: string; dueDate?: string }) => {
    const { projectId, ...body } = input;
    const res = await api.post<{ task: Task }>(`/api/projects/${projectId}/tasks`, body);
    return res.task;
  }
);

export const updateTaskStatus = createAsyncThunk(
  "tasks/updateStatus",
  async (input: { id: string; status: Task["status"] }) => {
    const res = await api.patch<{ task: Task }>(`/api/tasks/${input.id}/status`, { status: input.status });
    return res.task;
  }
);

const taskSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.status = "idle";
        state.byProject[action.payload.projectId] = action.payload.tasks;
      })
      .addCase(fetchTasks.rejected, (state) => {
        state.status = "error";
      })
      .addCase(updateTaskStatus.fulfilled, (state, action) => {
        const list = state.byProject[action.payload.projectId];
        if (list) {
          const idx = list.findIndex((t) => t._id === action.payload._id);
          if (idx >= 0) list[idx] = action.payload;
        }
      })
      .addCase(createTask.fulfilled, (state, action) => {
        const list = state.byProject[action.payload.projectId] || [];
        state.byProject[action.payload.projectId] = [action.payload, ...list];
      });
  },
});

export default taskSlice.reducer;

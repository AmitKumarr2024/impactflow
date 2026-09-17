import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { User } from "@/types";

export interface ChatMessage {
  _id: string;
  projectId: string;
  senderId: Pick<User, "_id" | "name" | "avatar" | "role">;
  body: string;
  readBy: string[];
  createdAt: string;
}

interface ChatState {
  byProject: Record<string, ChatMessage[]>;
  unreadByProject: Record<string, number>;
  status: "idle" | "loading" | "error";
}

const initialState: ChatState = { byProject: {}, unreadByProject: {}, status: "idle" };

export const fetchMessages = createAsyncThunk("chat/fetchMessages", async (projectId: string) => {
  const res = await api.get<{ messages: ChatMessage[] }>(`/api/projects/${projectId}/chat/messages`);
  return { projectId, messages: res.messages };
});

export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async (input: { projectId: string; body: string }) => {
    const res = await api.post<{ message: ChatMessage }>(`/api/projects/${input.projectId}/chat/messages`, {
      body: input.body,
    });
    return res.message;
  }
);

export const markThreadRead = createAsyncThunk("chat/markRead", async (projectId: string) => {
  await api.post(`/api/projects/${projectId}/chat/read`);
  return projectId;
});

export const fetchUnreadCounts = createAsyncThunk("chat/fetchUnreadCounts", async () => {
  const res = await api.get<{ unreadByProject: Record<string, number> }>("/api/projects/chat/unread-counts");
  return res.unreadByProject;
});

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    receiveMessage(state, action: PayloadAction<ChatMessage>) {
      const list = state.byProject[action.payload.projectId];
      if (list) {
        if (!list.find((m) => m._id === action.payload._id)) list.push(action.payload);
      } else {
        state.byProject[action.payload.projectId] = [action.payload];
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.status = "idle";
        state.byProject[action.payload.projectId] = action.payload.messages;
      })
      .addCase(fetchMessages.rejected, (state) => {
        state.status = "error";
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const list = state.byProject[action.payload.projectId];
        if (list) {
          if (!list.find((m) => m._id === action.payload._id)) list.push(action.payload);
        } else {
          state.byProject[action.payload.projectId] = [action.payload];
        }
      })
      .addCase(markThreadRead.fulfilled, (state, action) => {
        delete state.unreadByProject[action.payload];
      })
      .addCase(fetchUnreadCounts.fulfilled, (state, action) => {
        state.unreadByProject = action.payload;
      });
  },
});

export const { receiveMessage } = chatSlice.actions;
export default chatSlice.reducer;

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/lib/api";

export interface SupportMessage {
  _id: string;
  userId: string;
  senderId: string;
  senderIsAdmin: boolean;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface SupportThread {
  userId: string;
  user: { _id: string; name: string; email: string; role: string; avatar?: string; verificationStatus: string };
  lastMessage: string;
  lastMessageAt: string;
  lastSenderIsAdmin: boolean;
  unreadCount: number;
}

interface SupportState {
  messages: SupportMessage[];
  threads: SupportThread[];
  status: "idle" | "loading" | "error";
  activeThreadUserId: string | null;
}

const initialState: SupportState = {
  messages: [],
  threads: [],
  status: "idle",
  activeThreadUserId: null,
};

// For a regular user, this is always their own thread. For an admin
// browsing the inbox, pass the other person's userId to open that thread.
export const fetchMyThread = createAsyncThunk("support/fetchMine", async () => {
  const res = await api.get<{ messages: SupportMessage[] }>("/api/support/messages");
  return res.messages;
});

export const fetchThread = createAsyncThunk("support/fetchThread", async (userId: string) => {
  const res = await api.get<{ messages: SupportMessage[] }>(`/api/support/messages?userId=${userId}`);
  return { userId, messages: res.messages };
});

export const fetchInbox = createAsyncThunk("support/fetchInbox", async () => {
  const res = await api.get<{ threads: SupportThread[] }>("/api/support/threads");
  return res.threads;
});

export const sendSupportMessage = createAsyncThunk(
  "support/send",
  async (input: { body: string; userId?: string }) => {
    const res = await api.post<{ message: SupportMessage }>("/api/support/messages", input);
    return res.message;
  }
);

const supportSlice = createSlice({
  name: "support",
  initialState,
  reducers: {
    receiveSupportMessage(state, action: PayloadAction<SupportMessage>) {
      if (state.activeThreadUserId === action.payload.userId) {
        if (!state.messages.find((m) => m._id === action.payload._id)) {
          state.messages.push(action.payload);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyThread.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchMyThread.fulfilled, (state, action) => {
        state.status = "idle";
        state.messages = action.payload;
      })
      .addCase(fetchThread.fulfilled, (state, action) => {
        state.status = "idle";
        state.activeThreadUserId = action.payload.userId;
        state.messages = action.payload.messages;
      })
      .addCase(fetchInbox.fulfilled, (state, action) => {
        state.threads = action.payload;
      })
      .addCase(sendSupportMessage.fulfilled, (state, action) => {
        state.messages.push(action.payload);
      });
  },
});

export const { receiveSupportMessage } = supportSlice.actions;
export default supportSlice.reducer;

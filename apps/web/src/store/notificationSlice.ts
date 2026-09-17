import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { Notification } from "@/types";

interface NotificationState {
  items: Notification[];
  unreadCount: number;
  status: "idle" | "loading" | "error";
}

const initialState: NotificationState = { items: [], unreadCount: 0, status: "idle" };

export const fetchNotifications = createAsyncThunk("notifications/fetchAll", async () => {
  const res = await api.get<{ notifications: Notification[]; unreadCount: number }>("/api/notifications");
  return res;
});

export const markNotificationRead = createAsyncThunk("notifications/markRead", async (id: string) => {
  await api.patch(`/api/notifications/${id}/read`);
  return id;
});

export const markAllNotificationsRead = createAsyncThunk("notifications/markAllRead", async () => {
  await api.patch("/api/notifications/read-all");
});

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    receiveNotification(state, action: PayloadAction<Notification>) {
      state.items.unshift(action.payload);
      state.unreadCount += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = "idle";
        state.items = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(fetchNotifications.rejected, (state) => {
        state.status = "error";
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const item = state.items.find((n) => n._id === action.payload);
        if (item && !item.read) {
          item.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items.forEach((n) => (n.read = true));
        state.unreadCount = 0;
      });
  },
});

export const { receiveNotification } = notificationSlice.actions;
export default notificationSlice.reducer;

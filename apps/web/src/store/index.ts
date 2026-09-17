import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import projectReducer from "./projectSlice";
import changeReducer from "./changeSlice";
import materialReducer from "./materialSlice";
import approvalReducer from "./approvalSlice";
import notificationReducer from "./notificationSlice";
import drawingReducer from "./drawingSlice";
import taskReducer from "./taskSlice";
import siteReducer from "./siteSlice";
import feedbackReducer from "./feedbackSlice";
import activityReducer from "./activitySlice";
import memberReducer from "./memberSlice";
import chatReducer from "./chatSlice";
import adminReducer from "./adminSlice";
import feedReducer from "./feedSlice";
import supportReducer from "./supportSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    projects: projectReducer,
    changes: changeReducer,
    materials: materialReducer,
    approvals: approvalReducer,
    notifications: notificationReducer,
    drawings: drawingReducer,
    tasks: taskReducer,
    site: siteReducer,
    feedback: feedbackReducer,
    activity: activityReducer,
    members: memberReducer,
    chat: chatReducer,
    admin: adminReducer,
    feed: feedReducer,
    support: supportReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

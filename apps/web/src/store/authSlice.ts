import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { User, Role, Gender } from "@/types";

interface AuthState {
  user: User | null;
  status: "idle" | "loading" | "authenticated" | "error";
  error: string | null;
}

const initialState: AuthState = { user: null, status: "idle", error: null };

export const loginUser = createAsyncThunk(
  "auth/login",
  async (input: { email: string; password: string }) => {
    const res = await api.post<{ user: User; token: string }>("/api/auth/login", input);
    api.setToken(res.token);
    return res.user;
  }
);

export const registerUser = createAsyncThunk(
  "auth/register",
  async (input: {
    name: string;
    email: string;
    password: string;
    role: Role;
    gender?: Gender;
    company?: string;
  }) => {
    const res = await api.post<{ user: User; token: string }>("/api/auth/register", input);
    api.setToken(res.token);
    return res.user;
  }
);

export const fetchCurrentUser = createAsyncThunk("auth/me", async () => {
  const res = await api.get<{ user: User }>("/api/auth/me");
  return res.user;
});

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (input: { name?: string; address?: string; avatar?: string; company?: string }) => {
    const res = await api.patch<{ user: User }>("/api/auth/me", input);
    return res.user;
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      api.setToken(null);
      state.user = null;
      state.status = "idle";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.user = action.payload;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message || "Login failed";
      })
      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.user = action.payload;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "error";
        state.error = action.error.message || "Registration failed";
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.user = action.payload;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.status = "idle";
        state.user = null;
        api.setToken(null);
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;

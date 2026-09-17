import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { api } from "@/lib/api";
import type { User } from "@/types";

export interface PostComment {
  userId: User | string;
  text: string;
  createdAt: string;
}

export interface Post {
  _id: string;
  authorId: User | string;
  content: string;
  imageUrl?: string;
  likes: string[];
  comments: PostComment[];
  createdAt: string;
}

interface FeedState {
  posts: Post[];
  status: "idle" | "loading" | "error";
}

const initialState: FeedState = { posts: [], status: "idle" };

export const fetchFeed = createAsyncThunk("feed/fetchAll", async () => {
  const res = await api.get<{ posts: Post[] }>("/api/feed");
  return res.posts;
});

export const createPost = createAsyncThunk(
  "feed/create",
  async (input: { content: string; imageUrl?: string }) => {
    const res = await api.post<{ post: Post }>("/api/feed", input);
    return res.post;
  }
);

export const deletePost = createAsyncThunk("feed/delete", async (id: string) => {
  await api.delete<{ success: boolean }>(`/api/feed/${id}`);
  return id;
});

export const toggleLike = createAsyncThunk("feed/like", async (id: string) => {
  const res = await api.post<{ likes: string[]; liked: boolean }>(`/api/feed/${id}/like`);
  return { id, likes: res.likes };
});

export const addComment = createAsyncThunk(
  "feed/comment",
  async (input: { id: string; text: string }) => {
    const res = await api.post<{ comments: PostComment[] }>(`/api/feed/${input.id}/comments`, {
      text: input.text,
    });
    return { id: input.id, comments: res.comments };
  }
);

const feedSlice = createSlice({
  name: "feed",
  initialState,
  reducers: {
    receivePost(state, action: PayloadAction<Post>) {
      if (!state.posts.find((p) => p._id === action.payload._id)) {
        state.posts.unshift(action.payload);
      }
    },
    receiveLikeUpdate(state, action: PayloadAction<{ postId: string; likes: string[] }>) {
      const post = state.posts.find((p) => p._id === action.payload.postId);
      if (post) post.likes = action.payload.likes;
    },
    receiveCommentUpdate(state, action: PayloadAction<{ postId: string; comments: PostComment[] }>) {
      const post = state.posts.find((p) => p._id === action.payload.postId);
      if (post) post.comments = action.payload.comments;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeed.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchFeed.fulfilled, (state, action) => {
        state.status = "idle";
        state.posts = action.payload;
      })
      .addCase(fetchFeed.rejected, (state) => {
        state.status = "error";
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.posts.unshift(action.payload);
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        state.posts = state.posts.filter((p) => p._id !== action.payload);
      })
      .addCase(toggleLike.fulfilled, (state, action) => {
        const post = state.posts.find((p) => p._id === action.payload.id);
        if (post) post.likes = action.payload.likes;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        const post = state.posts.find((p) => p._id === action.payload.id);
        if (post) post.comments = action.payload.comments;
      });
  },
});

export const { receivePost, receiveLikeUpdate, receiveCommentUpdate } = feedSlice.actions;
export default feedSlice.reducer;

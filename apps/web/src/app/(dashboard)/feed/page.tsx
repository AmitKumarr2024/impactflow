"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchFeed, createPost, deletePost, toggleLike, addComment, type Post } from "@/store/feedSlice";
import { Button } from "@/components/ui/Button";
import { Card, Textarea, EmptyState, LoadingState, Input } from "@/components/ui/primitives";
import { VerificationBadge } from "@/components/ui/VerificationBadge";
import { FileUpload } from "@/components/ui/FileUpload";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { MediaAsset } from "@/lib/upload";
import type { User } from "@/types";
import { Heart, MessageCircle, Trash2, Send } from "lucide-react";
import Image from "next/image";

function isUser(x: User | string): x is User {
  return typeof x === "object";
}

export default function FeedPage() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);
  const { posts, status } = useAppSelector((s) => s.feed);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<MediaAsset | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    dispatch(fetchFeed());
  }, [dispatch]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setPosting(true);
    try {
      await dispatch(createPost({ content, imageUrl: image?.url })).unwrap();
      setContent("");
      setImage(null);
      setShowUpload(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not post");
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Company Feed</h1>
        <p className="mt-1 text-sm text-muted">Updates, wins, and news from across every project.</p>
      </div>

      <Card>
        <form onSubmit={handlePost} className="flex flex-col gap-3">
          <div className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/15 text-sm font-medium text-accent">
              {currentUser?.avatar ? (
                <Image src={currentUser.avatar} alt={currentUser.name} width={36} height={36} className="h-full w-full object-cover" />
              ) : (
                currentUser?.name?.[0] ?? "?"
              )}
            </span>
            <Textarea
              placeholder="Share an update with the company..."
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1"
            />
          </div>
          {showUpload ? (
            <FileUpload
              entityType="Post"
              onUploaded={setImage}
              label="Attach an image"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="self-start text-xs text-accent hover:underline"
            >
              + Attach an image
            </button>
          )}
          <Button type="submit" loading={posting} disabled={!content.trim()} className="self-end">
            <Send className="h-4 w-4" /> Post
          </Button>
        </form>
      </Card>

      {status === "loading" && posts.length === 0 ? (
        <LoadingState />
      ) : posts.length === 0 ? (
        <Card>
          <EmptyState title="No posts yet" description="Be the first to share something with the company." />
        </Card>
      ) : (
        posts.map((post) => <PostCard key={post._id} post={post} currentUserId={currentUser?._id} />)
      )}
    </div>
  );
}

function PostCard({ post, currentUserId }: { post: Post; currentUserId?: string }) {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [busy, setBusy] = useState(false);

  const author = isUser(post.authorId) ? post.authorId : null;
  const liked = currentUserId ? post.likes.includes(currentUserId) : false;
  const canDelete = author?._id === currentUserId || currentUser?.role === "ADMIN";

  async function handleLike() {
    setBusy(true);
    try {
      await dispatch(toggleLike(post._id)).unwrap();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setBusy(true);
    try {
      await dispatch(addComment({ id: post._id, text: commentText })).unwrap();
      setCommentText("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    try {
      await dispatch(deletePost(post._id)).unwrap();
      toast.success("Post removed");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not delete");
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/15 text-sm font-medium text-accent">
            {author?.avatar ? (
              <Image src={author.avatar} alt={author.name} width={36} height={36} className="h-full w-full object-cover" />
            ) : (
              author?.name?.[0] ?? "?"
            )}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{author?.name ?? "Unknown"}</p>
              {author && author.role !== "CLIENT" && author.role !== "ADMIN" && (
                <VerificationBadge status={author.verificationStatus} />
              )}
            </div>
            <p className="text-xs text-muted">
              {author?.role?.replace(/_/g, " ")} · {formatDate(post.createdAt)}
            </p>
          </div>
        </div>
        {canDelete && (
          <button onClick={handleDelete} className="text-muted hover:text-status-critical" aria-label="Delete post">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{post.content}</p>

      {post.imageUrl && (
        <div className="relative mt-3 h-64 w-full overflow-hidden rounded-md border border-border">
          <Image src={post.imageUrl} alt="" fill className="object-cover" sizes="600px" />
        </div>
      )}

      <div className="mt-3 flex items-center gap-4 border-t border-border pt-3">
        <button
          onClick={handleLike}
          disabled={busy}
          className={`flex items-center gap-1.5 text-sm ${liked ? "text-status-critical" : "text-muted hover:text-foreground"}`}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-status-critical" : ""}`} /> {post.likes.length}
        </button>
        <button
          onClick={() => setShowComments((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <MessageCircle className="h-4 w-4" /> {post.comments.length}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          {post.comments.map((c, i) => {
            const commenter = isUser(c.userId) ? c.userId : null;
            return (
              <div key={i} className="flex gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-medium text-accent">
                  {commenter?.name?.[0] ?? "?"}
                </span>
                <div className="rounded-md bg-surface-raised px-3 py-1.5">
                  <p className="text-xs font-medium text-foreground">{commenter?.name ?? "Unknown"}</p>
                  <p className="text-xs text-muted">{c.text}</p>
                </div>
              </div>
            );
          })}
          <form onSubmit={handleComment} className="mt-1 flex gap-2">
            <Input
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="h-8 text-xs"
            />
            <Button type="submit" size="sm" variant="secondary" disabled={busy}>
              Post
            </Button>
          </form>
        </div>
      )}
    </Card>
  );
}

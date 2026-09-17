import type { Response, NextFunction } from "express";
import { z } from "zod";
import { Post } from "../models/Post";
import { AppError } from "../utils/AppError";
import { getIO } from "../socket";
import type { AuthedRequest } from "../middleware/auth";

// Company-wide, not project-scoped -- any authenticated account can read and
// post here, same as a LinkedIn-style internal feed. Author info is
// populated so the frontend never has to do a second lookup per post.
export async function listPosts(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const cursor = req.query.before as string | undefined;
    const filter = cursor ? { createdAt: { $lt: new Date(cursor) } } : {};
    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("authorId", "name avatar role verificationStatus company")
      .populate("comments.userId", "name avatar role")
      .lean();
    res.json({ posts });
  } catch (err) {
    next(err);
  }
}

const createPostSchema = z.object({
  content: z.string().min(1).max(3000),
  imageUrl: z.string().optional(),
});

export async function createPost(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const body = createPostSchema.parse(req.body);
    const post = await Post.create({ ...body, authorId: req.user!.userId });
    const populated = await Post.findById(post._id).populate("authorId", "name avatar role verificationStatus company");
    getIO()?.to("company").emit("post.created", populated);
    res.status(201).json({ post: populated });
  } catch (err) {
    next(err);
  }
}

export async function deletePost(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) throw AppError.notFound("Post not found");

    // Only the author or an admin can remove a post -- ordinary moderation
    // boundary, not a project-membership question since this feed has no project.
    if (post.authorId.toString() !== req.user!.userId && req.user!.role !== "ADMIN") {
      throw AppError.forbidden("You can only delete your own posts");
    }

    await post.deleteOne();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// Toggling: liking again un-likes. One entry per user in the likes array.
export async function toggleLike(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) throw AppError.notFound("Post not found");

    const userId = req.user!.userId;
    const alreadyLiked = post.likes.some((id) => id.toString() === userId);
    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId) as any;
    } else {
      post.likes.push(userId as any);
    }
    await post.save();
    getIO()?.to("company").emit("post.liked", { postId: post._id, likes: post.likes });
    res.json({ likes: post.likes, liked: !alreadyLiked });
  } catch (err) {
    next(err);
  }
}

const commentSchema = z.object({
  text: z.string().min(1).max(1000),
});

export async function addComment(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const { text } = commentSchema.parse(req.body);
    const post = await Post.findById(req.params.id);
    if (!post) throw AppError.notFound("Post not found");

    post.comments.push({ userId: req.user!.userId as any, text, createdAt: new Date() });
    await post.save();

    const populated = await Post.findById(post._id).populate("comments.userId", "name avatar role");
    getIO()?.to("company").emit("post.commented", { postId: post._id, comments: populated!.comments });
    res.status(201).json({ comments: populated!.comments });
  } catch (err) {
    next(err);
  }
}

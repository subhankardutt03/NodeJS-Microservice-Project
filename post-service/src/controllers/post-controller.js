const Post = require("../models/Post");
const invalidatePostCache = require("../utils/invalidateKey");
const logger = require("../utils/logger");
const { publishEvent } = require("../utils/rabbitMq");
const { validateCreatePost } = require("../utils/validation");
const axios = require("axios");

const createPost = async (req, res) => {
  logger.info("Call create post method");
  try {
    // Validate schema
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn("Validattion Error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { content, mediaIds } = req.body;

    const createdPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });

    await createdPost.save();

    await publishEvent("post.create", {
      postId: createdPost._id.toString(),
      userId: createdPost.user.toString(),
      content: createdPost.content,
      createdAt: createdPost.createdAt,
    });

    await invalidatePostCache(req, createdPost._id.toString());
    logger.info("Post created successfully!", createdPost);
    return res.status(201).json({
      success: true,
      message: "Post created successfully",
    });
  } catch (error) {
    logger.error("Error creating new post", error);
    return res.status(500).json({
      success: false,
      message: "Error on creating post",
    });
  }
};

const getAllPost = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const cacheKey = `posts:${page}:${limit}`;
    const cachedPosts = await req.redisClient.get(cacheKey);
    if (cachedPosts) {
      return res.json(JSON.parse(cachedPosts));
    }
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalNoOfPosts = await Post.countDocuments();
    const result = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalNoOfPosts / limit),
      totalPosts: totalNoOfPosts,
    };

    /// Save post into cache
    // 300 means 5 min
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));
    return res.json(result);
  } catch (error) {
    logger.error("Error fetching all post", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching all post",
    });
  }
};

const getPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const cacheKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey);
    if (cachedPost) {
      // logger.info("Data fetching from redis cache");
      return res.json(JSON.parse(cachedPost));
    }
    // logger.info("Data not fetching from redis cache");
    const singlePostById = await Post.findById(postId);
    if (!singlePostById) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }
    // Save to redis
    await req.redisClient.setex(cacheKey, 3600, JSON.stringify(singlePostById));
    return res.json(singlePostById);
  } catch (error) {
    logger.error("Error fetching post", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching post by ID",
    });
  }
};

const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findByIdAndDelete({
      _id: postId,
      user: req.user.userId,
    });
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }
    /// publish post delete method
    await publishEvent("post.deleted", {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    });

    await invalidatePostCache(req, post._id.toString());

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully!",
    });
  } catch (error) {
    logger.error("Error deleting post", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting post",
    });
  }
};

module.exports = { createPost, getAllPost, getPost, deletePost };

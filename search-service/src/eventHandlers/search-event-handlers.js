const Search = require("../models/Search");
const logger = require("../utils/logger");

async function handlePostCreated(event) {
  try {
    const newSearchPost = new Search({
      postId: event.postId,
      userId: event.userId,
      content: event.content,
      createdAt: event.createdAt,
    });
    await newSearchPost.save();
    logger.info(
      `Search post created ${event.postId}, ${newSearchPost._id.toString()}`,
    );
  } catch (error) {
    logger.error("Event handler post creation event", error);
  }
}

async function handlePostDeleted(event) {
  try {
    const { postId } = event;
    const searchPostDeleted = await Search.findOneAndDelete({ postId: postId });
    logger.info(
      `Search post deleted ${postId}, ${searchPostDeleted._id.toString()}`,
    );
  } catch (error) {
    logger.error("Event handler post creation event", error);
  }
}

module.exports = { handlePostCreated, handlePostDeleted };

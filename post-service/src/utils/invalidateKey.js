const invalidatePostCache = async (req, input) => {
  const cachedKey = `post${input}`;
  if (cachedKey) {
    await req.redisClient.del(cachedKey);
  }
  const keys = await req.redisClient.keys("posts:*");
  if (keys && keys.length > 0) {
    await req.redisClient.del(keys);
  }
};

module.exports = invalidatePostCache;

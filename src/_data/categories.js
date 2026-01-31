module.exports = function (data) {
  const collections = data.collections || {};

  return Object.keys(collections).filter(name =>
    name !== "all" &&
    name !== "posts"
  );
};
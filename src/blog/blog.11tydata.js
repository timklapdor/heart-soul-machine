const obsidian = require("../_data/processObsidianTags.js");

module.exports = {
  ...obsidian,
  eleventyComputed: {
    ...obsidian.eleventyComputed,

    // Every blog post needs a date in its front matter. Without one, Eleventy
    // falls back to the file's date – which on GitHub Actions is the day of
    // the build. The post's URL then changes every day, and the cross-poster
    // treats each new URL as a new post (this happened to "Learning in 3D").
    // This stops the build with a clear message instead.
    dateCheck: (data) => {
      const input = data.page?.inputPath || "";
      if (input.endsWith("_template.md") || !input.endsWith(".md")) return null;
      if (!data.date) {
        throw new Error(
          `Blog post "${data.title || input}" (${input}) has no date. ` +
          `Add one to its front matter, e.g. "date: 2026-10-05", so its URL stays the same.`
        );
      }
      return null;
    },
  },
};

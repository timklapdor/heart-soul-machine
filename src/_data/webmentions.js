const EleventyFetch = require("@11ty/eleventy-fetch");

module.exports = async function () {
  const token = process.env.WEBMENTION_IO_TOKEN;
  if (!token) {
    console.warn("No WEBMENTION_IO_TOKEN found, skipping webmentions fetch");
    return { mentions: [] };
  }

  const url = `https://webmention.io/api/mentions.jf2?token=${token}&per-page=1000`;
  try {
    const webmentions = await EleventyFetch(url, {
      duration: "1h",
      type: "json",
    });
    return { mentions: webmentions.children };
  } catch (e) {
    console.error("Error fetching webmentions", e);
    return { mentions: [] };
  }
};
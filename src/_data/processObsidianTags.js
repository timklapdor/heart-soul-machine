module.exports = {
  eleventyComputed: {
    categories: (data) => {
      const stripWikiLink = (s) => String(s).replace(/^\[\[(.+)\]\]$/, '$1').trim();
      // "[[Blog]]" and "[[Notes]]" are Obsidian housekeeping: keep them in
      // the Markdown files, but don't show them as categories on the site.
      const hidden = ["Blog", "Notes"];
      const existing = (data.categories || [])
        .map(stripWikiLink)
        .filter((c) => c && !hidden.includes(c));
      const extracted = new Set(existing);

      for (const tag of data.tags || []) {
        const parts = tag.split("/");
        if (parts.length > 1) {
          parts.slice(0, -1).forEach(p => extracted.add(p));
        }
      }

      return [...extracted];
    },
    tags: (data) => {
      return (data.tags || []).map(tag => tag.split("/").pop());
    }
  }
};
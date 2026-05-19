module.exports = {
  eleventyComputed: {
    categories: (data) => {
      const stripWikiLink = (s) => s.replace(/^\[\[(.+)\]\]$/, '$1');
      const existing = (data.categories || []).map(stripWikiLink);
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
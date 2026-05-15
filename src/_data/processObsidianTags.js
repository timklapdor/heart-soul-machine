module.exports = {
  eleventyComputed: {
    categories: (data) => {
      const existing = data.categories || [];
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
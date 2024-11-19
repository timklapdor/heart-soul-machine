const eleventySass = require("@11tyrocks/eleventy-plugin-sass-lightningcss");
const { DateTime } = require("luxon");
const timeToRead = require('eleventy-plugin-time-to-read');
const markdownIt = require("markdown-it");
const markdownItAttrs = require('markdown-it-attrs');
const markdownItFootnote = require("markdown-it-footnote");
const markdownLinks = require("markdown-it-link-attributes");
const embedYouTube = require("eleventy-plugin-youtube-embed");
const markdownItBracketed = require('markdown-it-bracketed-spans');


const fs = require("fs");
const Image = require("@11ty/eleventy-img");
const path = require('path');
const pluginRss = require("@11ty/eleventy-plugin-rss");
const yaml = require("js-yaml");


module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(eleventySass);
  eleventyConfig.addPlugin(timeToRead);
  eleventyConfig.addPlugin(pluginRss);
  eleventyConfig.addPlugin(embedYouTube);
  eleventyConfig.addPlugin(
    require('@photogabble/eleventy-plugin-interlinker'),
    {
      defaultLayout: 'layouts/embed.liquid'
    }
  );
  eleventyConfig.addDataExtension("yaml", contents => yaml.load(contents));
  eleventyConfig.addPassthroughCopy("./src/images");
  eleventyConfig.addPassthroughCopy("./src/assets");

  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);


  eleventyConfig.addFilter("postDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj).toLocaleString(DateTime.DATE_MED);
  });
  eleventyConfig.addFilter("monthDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj).toFormat('LLL yyyy');
  });

  eleventyConfig.addFilter("yearMonth", (dateObj) => {
    return DateTime.fromISO(dateObj).toFormat('yyyy LLL');
  });

  eleventyConfig.addFilter("dayMonthDate", (dateObj) => {
    return DateTime.fromJSDate(dateObj).toFormat('LLL dd');
  });

  eleventyConfig.addFilter("monthDay", (dateObj) => {
    return DateTime.fromJSDate(dateObj).toFormat('LL dd');
  });

  	// Filters
	eleventyConfig.addFilter("readableDate", (dateObj, format, zone) => {
		// Formatting tokens for Luxon: https://moment.github.io/luxon/#/formatting?id=table-of-tokens
		return DateTime.fromJSDate(dateObj, { zone: zone || "utc" }).toFormat(format || "dd LLLL yyyy");
	});

	eleventyConfig.addFilter('htmlDateString', (dateObj) => {
		// dateObj input: https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
		return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat('yyyy-LL-dd');
	});

	// Return all the tags used in a collection
	eleventyConfig.addFilter("getAllTags", collection => {
		let tagSet = new Set();
		for(let item of collection) {
			(item.data.tags || []).forEach(tag => tagSet.add(tag));
		}
		return Array.from(tagSet);
	});

	eleventyConfig.addFilter("filterTagList", function filterTagList(tags) {
		return (tags || []).filter(tag => ["all", "nav", "post", "posts"].indexOf(tag) === -1);
	});

  const markdownLibrary = markdownIt({
    html: true,
    breaks: true,
    linkify: true
    })
    .use(markdownItAttrs, {
      // optional, these are default options
      leftDelimiter: '{',
      rightDelimiter: '}',
      allowedAttributes: []  // empty array = all attributes are allowed
    })
    .use(markdownLinks, {
        pattern: /^https?:/,
        attrs: {
          target: "_blank",
          rel: "noopener noreferrer"
        }
      })
      .use(require('markdown-it-footnote'))
      .use(markdownItBracketed);
        
  eleventyConfig.setLibrary("md", markdownLibrary);

  eleventyConfig.addFilter("markdown", (content) => {
    return markdownLibrary.render(content);
  });
  


  // Blog archive - https://github.com/11ty/eleventy/issues/1284
  eleventyConfig.addCollection("postsByYear", (collection) => {
    const posts = collection.getFilteredByTag('posts').reverse();
    const years = posts.map(post => post.date.getFullYear());
    const uniqueYears = [...new Set(years)];
  
    const postsByYear = uniqueYears.reduce((prev, year) => {
      const filteredPosts = posts.filter(post => post.date.getFullYear() === year);
  
      return [
        ...prev,
        [year, filteredPosts]
      ]
    }, []);
  
    return postsByYear;
  });

  // Filter for Social Images
  eleventyConfig.addFilter('splitlines', function(input) {
    const parts = input.split(' ');
    const lines = parts.reduce(function(prev, current) {

    if (!prev.length) {
        return [current];
    }
    
    let lastOne = prev[prev.length - 1];

    if (lastOne.length + current.length > 22) {
        return [...prev, current];
    }

    prev[prev.length - 1] = lastOne + ' ' + current;

    return prev;
    }, []);

    return lines;
});

eleventyConfig.on('afterBuild', () => {
  const socialPreviewImagesDir = "docs/assets/social-previews/";
  fs.readdir(socialPreviewImagesDir, function (err, files) {
      if (files.length > 0) {
          files.forEach(function (filename) {
              if (filename.endsWith(".svg")) {

                  let imageUrl = socialPreviewImagesDir + filename;
                  Image(imageUrl, {
                      formats: ["jpeg"],
                      outputDir: "./" + socialPreviewImagesDir,
                      filenameFormat: function (id, src, width, format, options) {

                          let outputFilename = filename.substring(0, (filename.length-4));
                      
                          return `${outputFilename}.${format}`;

                      }
                  });

              }
          })
      }
  })
});

  

  return {
    dir: {
      input: "src",
      output: "docs",
    },
  };
};
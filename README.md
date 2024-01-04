# Heart Soul Machine. 
Creating a Domain of Ones Own (DoOO) using 11ty. 

Incorporated in the site:

- [eleventy-plugin-time-to-read](https://www.npmjs.com/package/eleventy-plugin-time-to-read#speed) - Adds the handy reading time estimate.
- [eleventy-plugin-rss](https://www.11ty.dev/docs/plugins/rss/) - Added the default RSS plugin. I've previously made my own, but XML sucks, and this was a 5-minute job. 
- [SVG Factory](https://codepen.io/kevinweber/pen/dXWoRw) - borrowed this from Kevin Weber a while ago and I use it and SCSS to create all the icons you see around the site. 
- [Eleventy.js Interlink Plugin](https://www.npmjs.com/package/@photogabble/eleventy-plugin-interlinker) - I'm an [Obsidian user too](https://photogabble.co.uk/projects/eleventyjs-interlink-plugin/) and was keen to incorporate one of the best features of Obsidian - Wiki Links! Now I can use this in the site build without having to worry too much about 11ty's weird internal linking. 
- [Social Previews](https://bnijenhuis.nl/notes/automatically-generate-open-graph-images-in-eleventy/) - I adopted the Social Previews outlined by Bernard Nijenhuis. This created an SVG for each post, and then saves a JPG version of it and adds it to the ```HEAD``` of each page as an Open Graph element. 
- [Flexoki](https://stephango.com/flexoki) - I've been really enjoying Steph Ango's work and stumbled across their Flexoki colour palette. It actually matched pretty closely with what I already had in mind with my initial sketches for this site. So I adopted Flexoki into my CSS and have been using HTML Variables throughout my CSS. 
- [Timeline](https://chriscoyier.net/timeline/) - I didn't scope this in the inital build but after I stumbled across Chris Coyiers site I wanted to include something similar. 
- [Evergreen Notes]() - Another Steph Ango feature which really resonated. I plan on going through my back catalogue of posts and adding them to the site - but I'm keen to extract the little pearls of wisdom along the way. 
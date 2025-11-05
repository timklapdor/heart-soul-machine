---
title: Reclaim Open - This One Goes to 11(ty)
aliases:
category:
  - "[[Blog]]"
status:
date: 2025-11-06
categories:
  - Conferences
  - Reclaim
  - Technology
updatedDate:
updateDescription:
tags:
  - presentation
location:
coverImage:
summary: "A blog of the presentation given at the #ReclaimOpen25 conference."
commentId:
---
Feel free to read the post below - which was my rough script for the presentation. If you'd prefer to watch... there's a recording up on [YouTube](https://www.youtube.com/watch?v=Q9AtVi2h5UE)!

---

It's a real honour to be able to speak here today. I am a little daunted by my spot in the program, and my presentation will certainly have a different focus, but I think it will share some common themes. 

What I wanted to share today were some thoughts on the technology that's available to empower us to reclaim open —  to knock down the walls that are trying to enclose us and make space for ourselves, our passions and what we care about.

To do that, I decided to share two of my passions - making websites and heavy metal. 

Today's presentation will focus on a specific technology, 11ty, and we'll examine it through the lens of the greatest living rock band... Spinal Tap. 

I apologise that the presentation is going to extensively reference the movie and the music throughout...  but it should make enough sense for everyone to follow! But as a bit of homework if you haven't seen it before or watched it long ago – go and watch the movie. 

### The Back Catalogue

OK — so let's kick off by jumping back in time and looking at how we went about making websites in the past.  

Back in the Web v1 world, you had to code your own HTML. This was and is pretty challenging for anyone and it had the drawback of having your content being embedded within the structure of your site. 

![HTML pulled from Bava Tuesdays]({{'/images/html.png' | url }})

A HTML page looked like this and consisted of tags for various page elements and formatting, with your content text interspersed throughout. Your navigation was smooshed into the code, and it was all handmade and bespoke; there wasn't a lot of automation. 

What it had going for it was that it was *fast* and it was *simple*. And this was necessary because this was pre-broadband, and servers were more like hard drives connected to the internet, allowing you to browse through the folders they contained.  

Web v2 then came along and abstracted the content into a database, and your website structure and navigation into templates. This meant you could update the structure and look of your site relatively quickly and without affecting your content, and vice versa. You could update the content without potentially breaking the rest of your site, or forgetting to update something on a page. 

This evolution required two critical things: a **server** and a **database**. The server was necessary to take content out of the database and push it into the template, and it would do this every time a user requested a page. These two elements also require constant monitoring, upkeep, updates and maintenance to function properly. While they created efficiencies, they also introduced two things that could fail, fall over or be attacked and hacked.

So then we came to Web v3... well not really - that was some crypto fever dream... but in this same time frame stepped up the development of what is known as a static site generator. 

A static site generator is the best of web 1 and 2 – a tool that allows you to separate content from template files,  and that outputs plain HTML, CSS, and JavaScript files that can be served directly without a database or server-side processing. Your content exists as files, rather than a database, and writing in a format like Markdown means that you can write more naturally and not have to think about tags and code. To create your site, you run a command to build the site (locally or on a server), and the generator builds your sites, puts your content into the templates, updates the navigation and creates a folder for you to host wherever you want - on Reclaim, Github Pages, Netlify or any number of other web services.  

11ty is an example of this new generation of Static Site Generators.

### Death of the Drummers

One of the features of Spinal Taps career was that they had a series of unfortunate deaths occur to their drummer. And for anyone who's been making websites for a while will relate to the fact that websites can "die" for a variety of reasons. 

#### "Spontaneous combustion on stage"

Web 1 HTML sites worked, but maintaining that code and content was a nightmare. As humans, we don't naturally write in HTML, and the effect of not closing a tag, or creating a new page and forgetting to update the navigation across Every. Single. Page. In your site — could easily set your site and your will to live on fire. 

#### "He choked on someone else's vomit"

Web 2's reliance on a database and a server required vigilance. These extra elements meant that we are often reliant on the work of others. Adding in themes and plugins to your WordPress site, for example, also creates vulnerabilities - a plugin stops being maintained, and now your site won't load. Your switch themes and now your navigation is gone. Web 2 created a whole series of dependencies that you and your site become reliant on working, and if something breaks, it can be incredibly hard 

#### "He died in a bizarre gardening accident"

Now it's important to note that the web is a finicky and problematic medium at the best of times. Major technologies come and go, major services go down. Switching to a Static Site won't solve these things, but it will give you a more robust and controllable site to work with, plus ultimate portability. With a folder full of files rather than a database, you still have access to your precious content, and you can move it somewhere else, creating and recreating things anew. 

# Hello Cleveland!

Now, when it comes to Static Site Generators, there are a variety of options out there. Just like Spinal Tap on their way to the stage, it can be easy to get lost on your way to the stage. 

![Clip of the band Spinal Tap being lost backstage]({{'/images/cleveland-sml.gif' | url }})

They tend to be based on of different programming languages, purposes or intentions. I'm not going to get into the weeds with what each does, but rather I want to outline why I think 11ty takes the right approach. 

#### Unopinionated
First of all - it's unopinionated. That means that you can set up your site the way you want to. You can choose from a range of languages to use, you can choose how you want to set up your folders, you can set up your templates how you like. 

Most SSGs aren't like this - they are built to work in specific ways, usually the way that their creators like to work. If you mess around with their structure, the whole thing breaks - and can leave you trapped inside a pod onstage. 

#### Amplify your skills
11ty empowers you to build on skills you already have. If you're not that familiar with HTML and CSS – use a starterpack. If you're familiar with a CSS framework like Tailwind, cool, you can use that too. It's even possible to setup 11ty with a CMS so you don't have to look or type any code whatsoever. 

Additionally, 11ty supports a wide range of plugins and customisations that can be integrated into your site. If you have specific needs but not the skills to do it yourself, it's possible to make what you want because 11ty is so customisable. 

#### Tiny Bread
What is the most powerful part of 11ty is your ability to tailor it to your needs.  It's easy to over-engineer a simple blog that gets updated once a week. Simple blogs that don't need enterprise complexity. For example, most Content Management Systems will come with a full Javascript library your user have to download that may not get used. 

11ty only comes with what you add - if you don't add Javascript - there isn't any. This makes it possible to make your site the perfect size for the job - scale things up or down as needed. That also means that load times are faster, the site runs quicker and your audience gets what it wants faster – The Full Sandwich. 

### A Collection of Guitars

Nigel has huge collection of guitars - from those with sustain that allows you to grab a snack, to those that cannot be played, or even looked at. You can also use 11ty to create any kind of website, from a simple one-pager through to a fully fledged blog. 

You can make them for different purposes. 

#### A Recipe Book
This [Recipe Book](https://timklapdor.github.io/recipe-book/) site is something I created to gather and share recipes I’ve found and tweaked, and it came about because the app I was using was dead, and I wanted to be able to easily share recipes. Each recipe is just a  Markdown file and an associated image. The markdown file is just plain text, so it’s readable and editable in a variety of applications, and I can take that folder with me anywhere. But 11ty transforms them into a site. The home page has  filters so you can quickly find a recipe, and I’ve also added search so I can type in an ingredient and find the related recipes quickly. And because I can control how things are displayed, I can set up the view so that you can see the ingredients AND directions on one page!

#### A Resume
This simple one pager sits on my [timklapdor.com](https://timklapdor.com/) domain as a 24/7 accessible profile. Rather than trust LinkedIn, I wanted to have control over my profile and what is or is not there in the public. Again, most of the content is just a series of Markdown and simple data files that come together in a simple design. 

#### A Blog
I have been keen to wrestle back control over my blog and so a summer project was to rebuild my personal blog in eleventy. 

#### Personal Projects
In my role as a Manager of Educational Design at the University of Adelaide, one of the key areas I’ve been working on is the concept of Learning [Types](https://learning-types.com/) and [Patterns](https://learning-patterns.com/), and embedding them into course development practices. This kind of work is something I wanted to share more broadly and so I built this site. In 11ty each pattern is a markdown file, and the site pulls them all together. 

This is the second version of the site, and I reworked it because the new `<popover>` tag made it possible for this to be a one page little app, with filtering, each pattern opening up in its own little box, and I added a light and dark mode via the css
#### The Kitchen Sink
One of the beauties of 11ty is you can combine content and data from around the web. I love the work of individuals like Robb Knight who has used 11ty to [gobble up everything he does online](https://rknight.me/blog/using-eleventy-to-gobble-up-everything-i-do-online/). Robb is using his site to ingest data from around the web and has got his site publishing to Mastodon and an RSS feed. This is certainly a more advanced use case, but it shows the ultimate utility of 11ty. 

# Takeaways

#### It’s such a fine line between stupid,  and uh...clever
So much of the web tends to get over-engineer when a 'simple' site is all that's required. 11ty provides a middle ground for a lot of what we do within the open web. Rather than needing to jump into Wordpress everytime, 11ty provides a not only a fast way to get started, but make the Clever choice and create exactly what you need. 

#### Stonehenge

![Clip from This is Spinal Tap showing a tiny stonehenge model descending from above and being danced around by little people.]({{'/images/stonehenge-sml.gif' | url }})

We tend to think of the web as monoliths that will stand the test of time. The reality is that most of what we build is under threat of being crushed by a dwarf. A WordPress site probably won't last more than a year or two without an update before it's completely broken or hacked, and so many sites seem incapable of standing the test of time. And while 11ty changes and evolves and may one day disappear,, the site you created, those static HTML – they just keep on working. 

Keeping your content in markdown files also means that your project can be reused, repurposed and reinvented. Not only is your project portable, but the effort you've put in and the labour involved. 

#### Community-supported

![Nigel falling backwards and needing a roadie to lift him back up to keep playing. ]({{'/images/support-sml.gif' | url }})

Behind 11ty is a broad community of developers that openly contributes to the development of 11ty, but also to empower users around the world. I would say I am "self-taught" when it comes to 11ty, but that is an illusion. I was taught by 11ty's open community – people sharing resources, experiences, how-tos, tips and tricks. 

In a world where we want to reclaim open, this ethos community is exactly what is needed. A welcoming and diverse community willing to share and contribute to each other's success. 

#### Be Lukewarm Water

> **Derek Smalls**: We’re very lucky in the band in that we have two visionaries, David and Nigel, they’re like poets, like Shelley and Byron. They’re two distinct types of visionaries; it’s like fire and ice, basically. I feel my role in the band is to be somewhere in the middle of that, kind of like lukewarm water.

Those static HTML pages aren't the flashiest or bleeding edge technology – but they work. They're fast, secure, easy to maintain and cheap to run. In a world that loves to think in extremes, sometimes somewhere in the lukewarm middle is the right place to be. 

### How to get started with 11ty
To finish up I thought I'd share some starting points on where and how to get started with 11ty. 
#### 11ty Videos
11ty isn't a fancy app, its a few commands in the terminal - which can seem a bit intimidating – but the reality is that you can learn the basics in a couple of minutes. Added to that - you're opening up the terminal and typing into the command line - which is as cool 
- [Build an 11ty site in 3 minutes](nhttps://www.youtube.com/watch?v=BKdQEXqfFA0)
- [6 Minutes to Build a Blog from Scratch with Eleventy](https://www.youtube.com/watch?v=kzf9A9tkkl4) 

#### 11ty Starter Projects
A range of [starter projects](https://www.11ty.dev/docs/starter/) are available on the official 11ty website, these can be a great way to get started - especially if you don't want to start from scratch. 
#### 11ty Rocks
One of the most influential on my uptake and setup of 11ty sites has been [11ty Rocks](https://11ty.rocks) by Stephanie Eckles. Stephanie has some great tutorials, tips and starter packs to get you setup and underway. 

#### 11ty Bundle
Collecting posts and resources about 11ty from right across the community is [11ty Bundle](https://11tybundle.dev) - go here to find the latest posts and tips from across the community. 

And if you've got any questions - feel free to drop into my dms!
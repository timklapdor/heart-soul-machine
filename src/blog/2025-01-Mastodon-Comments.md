---
title: Mastodon Comments
date: 2025-01-12
categories:
  - Technology
  - Social Media
updatedDate: 
updateDescription: 
tags: 
location: 
coverImage: 
summary: Looking to add comments to a static site? Maybe try Mastodon.
---
Around this time last year, I started working on this blog. It was a project I really got my teeth into, and I had a few must-haves. The biggest was that I wanted it to be a static site - just files on a server - with no backend, database, admin, or maintenance required. I also wanted to have the whole thing run on files - markdown in particular - so whatever I wrote was easy to reuse and repurpose but stored and accessed without needing a website or technology to run. 

I set up the site using  Eleventy (11ty) to do all this. I’d been a Jekyll user before and had encountered a few limitations that 11ty didn’t have. Being built in JavaScript rather than Ruby meant there was a larger community of developers engaged and a lot more portability of code. 

One of the missing features of a static site is the lack of Web 2.0 features that enable user-generated content, such as comments. So essentially, the site has been operating as an OG weblog - and I liked that. Just me and some words

Then along comes agent provocateur Jim Groom: 

<iframe src="https://social.ds106.us/@jimgroom/113746590194162654/embed" width="400" allowfullscreen="allowfullscreen" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"></iframe>

To be honest over the last year I have looked at a few options to add comments but I didn’t find many that didn’t leverage specific publishing systems (Netlify, GitHub) or weren’t a paid for service. Given this site currently costs me the fee for the domain and that’s it - paying for a service is not a cost I will bear. Also, IM not doing this site for clicks or user engagement, the only metric I’m worried about is my output and post count.  and while the site currently sits on GitHub Pages given the current rate of enshitification I didn’t want to move away from having the freedom to FTP the site anywhere and point the domain at somewhere new. 

So at Jim’s behest, and using it as motivation I resumed my search, but this time I went to the search bar with a specific question – can you use Mastodon for comments? 

I started here because I could see that Mastodon and ActivityPub could be an awesome way of combining blogs and interactions into the future. And while my simple 11ty blog wasn’t going to be able to run as an ActivityPub server - it had a lot of what’s needed to connect into that eco system. 

And what I found was, [Yes! Yes you can use Mastodon for comments](https://fietkau.blog/2023/another_blog_resurrection_fediverse_new_comment_system). A number of posts discussed how they’d gone about it, [were sharing their code](https://cassidyjames.com/blog/fediverse-blog-comments-mastodon/) - so I thought how hard could it be? 

Well surprisingly simple! In about an hour I’d managed to copy the code, integrate, test and style it - and as a version 1.0 I’m very happy. 
### How does it work?

On my end I copied the code that Casey wrote - his c[omments template](https://github.com/cassidyjames/cassidyjames.github.io/blob/main/_includes/comments.html) (which includes the js file) and the associated css files for the [comments](https://github.com/cassidyjames/cassidyjames.github.io/blob/main/_sass/_comments.scss) and [avatars](https://github.com/cassidyjames/cassidyjames.github.io/blob/main/_sass/_avatars.scss). 

From there I made a couple of tweaks to the variables used - and added those to my template metadata.

```commentUsername``` = your Mastodon name (the first @)
```commentHost``` = your Mastodon host (the second @)
```commentId``` = the Mastodon post ID that refers to the blog post

I tweaked the setup for 11ty - so I've put the [comments template](https://github.com/timklapdor/heart-soul-machine/blob/main/src/_includes/partials/comments.njk) as a Partial that I can include in my template and I have the template pull in the comments section only if there is an Mastodon post ID is linked. This was to give me an opt in to comments - some posts I might not want them at all. 

I’ve already set up [EchoFeed](https://echofeed.app/) which automatically posts to Mastodon via the sites RSS. So once I've got that post - I can add the idea back into the post and republish. So rather than automatic there is a manual step - but it also gives me the power to opt in and out. Choices are a good thing. 

If there is a comment ID attached to the post then the template will pick that  up and add the comment template - which all works client side via the Mastodon API:

{% raw %}
```	
{%- if commentId | length -%}
  {% include "partials/comments.njk" %} 
{% endif %}
```
{% endraw %}

And from my end that's it. I found [Fabrizio Musacchio's post](https://www.fabriziomusacchio.com/blog/2023-07-31-mastodon_blog_comment_system/) which added some other features - an API token so you can get more than 60 replies etc. But I also noted that he's not using his own Mastodon comments on the site... not sure why. I'll keep looking at this and see if any other features might be useful to add and poke around old posts and see which ones to add comments to. 
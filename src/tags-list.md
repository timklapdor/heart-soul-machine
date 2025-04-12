---
pagination:
  data: collections
  size: 1
  alias: tag
  filter:
    - all
    - post
    - posts
    - tagList
  addAllPagesToCollections: true
layout: partials/page.njk
# eleventyComputed:
#   title: Tagged “{{ tag }}”
# permalink: /tags/{{ tag | slugify }}/
permalink: false

---

{% set postslist = collections[ tag ] %}
{% include "partials/postslist.njk" %}

<!-- <p>See <a href="/tags/">all tags</a>.</p> -->
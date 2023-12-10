---
layout: partials/page.njk
title: Tags
date: 2023-12-09 
---
{% set tagUrl %}/tags/{{ tag | slugify }}/{% endset %}
<ul>
{% for tag in collections.all | getAllTags | filterTagList %}
	<li><a href="{{ tagUrl }}" class="post-tag">{{ tag | lower  }}</a></li>
{% endfor %}
</ul>
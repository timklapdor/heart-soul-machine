---
layout: partials/page.njk
title: Timeline
updatedDate: 
updateDescription: 
tags:
location: 
cover-image: 
summary: 'This is a bit of a timeline of my life, some of th key events and markers along the way - personally and professionally.'
collection: timeline
---



<div class="timeline">
    <ul>
        {% for event in timeline  %}<li>
        <div class="eventtype {{'work' if event.eventtype =='Work'}}{{'life' if event.eventtype =='Life'}}{{'school' if event.eventtype =='School'}}{{'project' if event.eventtype =='Project'}}">  </div>
        <div class="date">{{ event.date | yearMonth }}</div>
        <div class="description">{{ event.description |  markdown | safe  }}</div>
        <div class="location">{{ event.location }}</div></li>{% endfor %}
    </ul>
</div>

... And there's more to come!
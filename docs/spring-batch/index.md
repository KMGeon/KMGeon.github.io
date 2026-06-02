---
layout: default
title: Spring Batch
nav_order: 3
has_children: true
permalink: /docs/spring-batch
---

# Spring Batch

Spring Batch 관련 글 모음입니다.
{: .fs-6 .fw-300 }

---

{% assign spring_batch_posts = site.pages | where: "parent", "Spring Batch" | sort: "date" | reverse %}
{% for post in spring_batch_posts %}
{% if post.title != "Spring Batch" %}
<div class="post-item">
<span class="post-date">{{ post.date | date: "%Y.%m.%d" }}</span>
<a href="{{ post.url | relative_url }}" class="post-title">{{ post.title }}</a>
</div>
{% endif %}
{% endfor %}

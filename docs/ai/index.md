---
layout: default
title: AI
nav_order: 5
has_children: true
permalink: /docs/ai/
---

# AI

AI 관련 문서들입니다.
{: .fs-6 .fw-300 }

---

{% assign ai_posts = site.pages | where: "parent", "AI" | sort: "date" | reverse %}
{% for post in ai_posts %}
{% if post.title != "AI" %}
<div class="post-item">
<span class="post-date">{{ post.date | date: "%Y.%m.%d" }}</span>
<a href="{{ post.url | relative_url }}" class="post-title">{{ post.title }}</a>
</div>
{% endif %}
{% endfor %}

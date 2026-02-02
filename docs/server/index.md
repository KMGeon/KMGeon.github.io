---
layout: default
title: Server
nav_order: 3
has_children: true
permalink: /docs/server/
---

# Server

서버 개발 관련 문서들입니다.
{: .fs-6 .fw-300 }

---

{% assign server_posts = site.pages | where: "parent", "Server" | sort: "date" | reverse %}
{% for post in server_posts %}
{% if post.title != "Server" %}
<div class="post-item">
<span class="post-date">{{ post.date | date: "%Y.%m.%d" }}</span>
<a href="{{ post.url | relative_url }}" class="post-title">{{ post.title }}</a>
</div>
{% endif %}
{% endfor %}

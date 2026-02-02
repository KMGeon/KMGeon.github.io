---
layout: default
title: Infra
nav_order: 4
has_children: true
permalink: /docs/infra/
---

# Infra

인프라 관련 문서들입니다.
{: .fs-6 .fw-300 }

---

{% assign infra_posts = site.pages | where: "parent", "Infra" | sort: "date" | reverse %}
{% for post in infra_posts %}
{% if post.title != "Infra" %}
<div class="post-item">
<span class="post-date">{{ post.date | date: "%Y.%m.%d" }}</span>
<a href="{{ post.url | relative_url }}" class="post-title">{{ post.title }}</a>
</div>
{% endif %}
{% endfor %}

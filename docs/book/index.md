---
layout: default
title: Book
nav_order: 6
has_children: true
permalink: /docs/book/
---

# Book

책 리뷰 및 정리입니다.
{: .fs-6 .fw-300 }

---

{% assign book_posts = site.pages | where: "parent", "Book" | sort: "date" | reverse %}
{% for post in book_posts %}
{% if post.title != "Book" %}
<div class="post-item">
<span class="post-date">{{ post.date | date: "%Y.%m.%d" }}</span>
<a href="{{ post.url | relative_url }}" class="post-title">{{ post.title }}</a>
</div>
{% endif %}
{% endfor %}

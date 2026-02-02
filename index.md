---
layout: default
title: About Me
nav_order: 1
description: "Geon.archive - Server Development Blog"
permalink: /
---

<div class="hero-section">
  <div class="hero-greeting">Hi, I'm</div>
  <h1 class="hero-name">Mugeon Kim</h1>
  <p class="hero-role">Backend Developer</p>
  <p class="hero-description">
    실무에서 겪은 문제와 해결 과정, 그리고 그 속에서 얻은 인사이트를 기록하고 공유합니다.<br>
    기록을 통해 지식을 체계화하고, 나중에 다시 참고할 수 있는 자료로 남기고자 합니다.
  </p>
</div>

<div class="terminal-window">
  <div class="terminal-header">
    <div class="terminal-buttons">
      <span class="terminal-btn red"></span>
      <span class="terminal-btn yellow"></span>
      <span class="terminal-btn green"></span>
    </div>
    <div class="terminal-title-bar">mugeon@blog ~ recent_posts</div>
  </div>
  <div class="terminal-body">
<pre class="terminal-content"><span class="terminal-prompt">mugeon@blog</span> <span class="terminal-command">% ls -la recent_posts/</span>
<span class="terminal-output">total {{ site.pages | where_exp: "page", "page.date" | size }}</span>
{% assign all_posts = site.pages | where_exp: "page", "page.date" | sort: "date" | reverse %}{% for post in all_posts limit: 15 %}
<span class="terminal-line"><span class="terminal-date">{{ post.date | date: "%Y.%m.%d" }}</span>  <span class="terminal-category">[{{ post.parent }}]</span>  <a href="{{ post.url | relative_url }}" class="terminal-title">{{ post.title }}</a></span>{% endfor %}

<span class="terminal-prompt">mugeon@blog</span> <span class="terminal-cursor">_</span></pre>
  </div>
</div>

<div class="stats-section">
  <div class="stat-item">
    <span class="stat-number">{{ all_posts | size }}</span>
    <span class="stat-label">Total Posts</span>
  </div>
  <div class="stat-item">
    <span class="stat-number">{% assign categories = all_posts | map: "parent" | uniq | size %}{{ categories }}</span>
    <span class="stat-label">Categories</span>
  </div>
  <div class="stat-item">
    <span class="stat-number" id="busuanzi_value_site_uv">-</span>
    <span class="stat-label">Total Visitors</span>
  </div>
  <div class="stat-item">
    <span class="stat-number" id="busuanzi_value_site_pv">-</span>
    <span class="stat-label">Page Views</span>
  </div>
</div>

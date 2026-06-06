(function () {
  'use strict';

  var body = document.body;
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebar-overlay');
  var btnOpen = document.getElementById('btn-open-sidebar');
  var btnTheme = document.getElementById('btn-theme-toggle');

  function openSidebar() {
    body.classList.add('sidebar-open');
  }
  function closeSidebar() {
    body.classList.remove('sidebar-open');
  }
  function toggleSidebar() {
    body.classList.toggle('sidebar-open');
  }

  if (btnOpen) btnOpen.addEventListener('click', toggleSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSidebar();
  });

  // Close the slide-in sidebar after navigating on small screens
  if (sidebar) {
    sidebar.addEventListener('click', function (e) {
      if (e.target.closest('a') && window.innerWidth < 1024) closeSidebar();
    });
  }

  // --- Dark mode toggle ---
  function syncThemeIcon() {
    if (!btnTheme) return;
    var dark = document.documentElement.classList.contains('dark-mode');
    btnTheme.innerHTML = dark
      ? '<i class="fa-solid fa-sun"></i>'
      : '<i class="fa-solid fa-moon"></i>';
  }
  syncThemeIcon();

  if (btnTheme) {
    btnTheme.addEventListener('click', function () {
      var root = document.documentElement;
      root.classList.toggle('dark-mode');
      try {
        localStorage.setItem('theme', root.classList.contains('dark-mode') ? 'dark' : 'light');
      } catch (e) {}
      syncThemeIcon();
    });
  }

  // --- Table of contents (post pages) ---
  var toc = document.getElementById('post-toc');
  var tocNav = document.getElementById('post-toc-nav');
  var content = document.querySelector('.post-content');

  if (toc && tocNav && content) {
    var headings = content.querySelectorAll('h2, h3');
    var items = [];
    headings.forEach(function (h) {
      if (!h.id) {
        h.id = (h.textContent || '').trim().toLowerCase()
          .replace(/[^\w가-힣\s-]/g, '').replace(/\s+/g, '-');
      }
      if (!h.id) return;
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      a.className = 'toc-link toc-' + h.tagName.toLowerCase();
      a.dataset.target = h.id;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var el = document.getElementById(h.id);
        if (el) {
          var y = el.getBoundingClientRect().top + window.pageYOffset - 76;
          window.scrollTo({ top: y, behavior: 'smooth' });
          history.replaceState(null, '', '#' + h.id);
        }
      });
      tocNav.appendChild(a);
      items.push({ id: h.id, el: h, link: a });
    });

    if (items.length >= 2) {
      toc.hidden = false;

      var ticking = false;
      function highlight() {
        ticking = false;
        var pos = window.pageYOffset + 120;
        var current = items[0];
        for (var i = 0; i < items.length; i++) {
          if (items[i].el.offsetTop <= pos) current = items[i];
        }
        items.forEach(function (it) {
          it.link.classList.toggle('is-active', it === current);
        });
      }
      window.addEventListener('scroll', function () {
        if (!ticking) { window.requestAnimationFrame(highlight); ticking = true; }
      }, { passive: true });
      highlight();
    }
  }
})();

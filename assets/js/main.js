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

  // --- Auto-hide header on small screens (more room for reading) ---
  var lastY = window.pageYOffset;
  var headerTicking = false;
  function updateHeader() {
    headerTicking = false;
    var y = window.pageYOffset;
    var hide = window.innerWidth < 1024 && !body.classList.contains('sidebar-open');
    if (!hide || y < 80) {
      body.classList.remove('header-hidden');
    } else if (y > lastY + 6) {
      body.classList.add('header-hidden');
    } else if (y < lastY - 6) {
      body.classList.remove('header-hidden');
    } else {
      return;
    }
    lastY = y;
  }
  window.addEventListener('scroll', function () {
    if (!headerTicking) { window.requestAnimationFrame(updateHeader); headerTicking = true; }
  }, { passive: true });

  // --- Dark mode toggle ---
  var root = document.documentElement;
  var themeMeta = document.querySelectorAll('meta[name="theme-color"]');

  function applyTheme(dark) {
    root.classList.toggle('dark-mode', dark);
    if (btnTheme) {
      btnTheme.innerHTML = dark
        ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
      btnTheme.setAttribute('aria-label', dark ? '라이트 모드로 전환' : '다크 모드로 전환');
      btnTheme.setAttribute('aria-pressed', dark ? 'true' : 'false');
    }
    // Keep the browser chrome (address bar) in step with the chosen theme
    themeMeta.forEach(function (m) { m.setAttribute('content', dark ? '#0d1117' : '#ffffff'); });
    document.dispatchEvent(new CustomEvent('themechange', { detail: { dark: dark } }));
  }
  applyTheme(root.classList.contains('dark-mode'));

  if (btnTheme) {
    btnTheme.addEventListener('click', function () {
      var dark = !root.classList.contains('dark-mode');
      try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
      applyTheme(dark);
    });
  }

  // Follow the OS setting live until the reader picks a theme explicitly
  var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
  if (mq) {
    var onSystemChange = function (e) {
      var saved = null;
      try { saved = localStorage.getItem('theme'); } catch (err) {}
      if (!saved) applyTheme(e.matches);
    };
    if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange);
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
          var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
          history.replaceState(null, '', '#' + h.id);
        }
      });
      tocNav.appendChild(a);
      items.push({ id: h.id, el: h, link: a });
    });

    if (items.length >= 2) {
      toc.hidden = false;

      // Narrow screens show the TOC inline and collapsed; the toggle is inert on the wide rail
      var tocToggle = document.getElementById('post-toc-toggle');
      function setTocOpen(open) {
        toc.classList.toggle('is-open', open);
        if (tocToggle) tocToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      }
      if (tocToggle) {
        tocToggle.addEventListener('click', function () {
          setTocOpen(!toc.classList.contains('is-open'));
        });
      }
      tocNav.addEventListener('click', function (e) {
        if (e.target.closest('a') && window.innerWidth < 1700) setTocOpen(false);
      });

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

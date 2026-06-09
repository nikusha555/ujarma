/**
 * public/js/main.js — Ujarma Village Website
 * ============================================
 * Client-side interactivity:
 *  - Navbar scroll shadow
 *  - Smooth scroll on anchor links
 *  - Gallery lightbox (basic)
 *  - Contact form feedback
 *  - Admin sidebar mobile toggle
 */

(function () {
  'use strict';

  /* ──────────────────────────────────────────
     Navbar: add shadow when page is scrolled
  ────────────────────────────────────────── */
  const navbar = document.getElementById('siteNavbar');

  if (navbar) {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // run once on load
  }


  /* ──────────────────────────────────────────
     Navbar: mark active link based on current path
  ────────────────────────────────────────── */
  const currentPath = window.location.pathname;
  document.querySelectorAll('.site-navbar .nav-link').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href) return;
    // Exact match for home, prefix match for other sections
    const isActive =
      href === '/' ? currentPath === '/' : currentPath.startsWith(href);
    if (isActive) link.classList.add('active');
  });


  /* ──────────────────────────────────────────
     Scroll indicator (hero page)
  ────────────────────────────────────────── */
  const scrollBtn = document.getElementById('heroScroll');
  if (scrollBtn) {
    scrollBtn.addEventListener('click', () => {
      const target = document.getElementById('mainContent');
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  }


  /* ──────────────────────────────────────────
     Gallery: simple overlay lightbox
  ────────────────────────────────────────── */
  const galleryItems = document.querySelectorAll('.gallery-item[data-src]');

  if (galleryItems.length > 0) {
    // Create lightbox elements
    const overlay = document.createElement('div');
    overlay.className = 'gallery-lightbox-overlay';
    overlay.style.cssText = [
      'display:none', 'position:fixed', 'inset:0', 'z-index:9999',
      'background:rgba(6,13,26,0.94)', 'align-items:center',
      'justify-content:center', 'cursor:zoom-out',
    ].join(';');

    const img = document.createElement('img');
    img.style.cssText = 'max-width:90vw;max-height:88vh;object-fit:contain;border-radius:4px;';

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = [
      'position:absolute', 'top:1.25rem', 'right:1.5rem',
      'background:none', 'border:none', 'color:#fff', 'font-size:2rem',
      'cursor:pointer', 'line-height:1', 'opacity:0.7',
    ].join(';');

    overlay.appendChild(img);
    overlay.appendChild(closeBtn);
    document.body.appendChild(overlay);

    const openLightbox = (src) => {
      img.src = src;
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    };
    const closeLightbox = () => {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
      img.src = '';
    };

    galleryItems.forEach((item) => {
      item.addEventListener('click', () => openLightbox(item.dataset.src));
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target === closeBtn) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLightbox();
    });
  }


  /* ──────────────────────────────────────────
     Admin sidebar: mobile toggle
  ────────────────────────────────────────── */
  const sidebarToggle = document.getElementById('adminSidebarToggle');
  const adminSidebar  = document.getElementById('adminSidebar');

  if (sidebarToggle && adminSidebar) {
    sidebarToggle.addEventListener('click', () => {
      adminSidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (
        window.innerWidth < 992 &&
        !adminSidebar.contains(e.target) &&
        !sidebarToggle.contains(e.target)
      ) {
        adminSidebar.classList.remove('open');
      }
    });
  }


  /* ──────────────────────────────────────────
     Dismiss flash messages
  ────────────────────────────────────────── */
  document.querySelectorAll('[data-dismiss-alert]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.alert-custom')?.remove();
    });
  });

})();

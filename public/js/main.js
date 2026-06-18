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
     Lucide Icons: inject all SVGs
     Must run before any DOM inspection so
     icons are rendered before the rest of
     the JS reads element dimensions.
  ────────────────────────────────────────── */
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

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
     - Slide-in drawer on <992 px
     - Backdrop overlay + body scroll lock
     - Close via: button re-click, backdrop,
       Escape key, nav-link tap, resize
  ────────────────────────────────────────── */
  const sidebarToggle   = document.getElementById('adminSidebarToggle');
  const adminSidebar    = document.getElementById('adminSidebar');
  const sidebarBackdrop = document.getElementById('adminSidebarBackdrop');

  function openAdminSidebar() {
    adminSidebar.classList.add('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.add('open');
    document.body.classList.add('admin-sidebar-open');
    if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'true');
  }

  function closeAdminSidebar() {
    adminSidebar.classList.remove('open');
    if (sidebarBackdrop) sidebarBackdrop.classList.remove('open');
    document.body.classList.remove('admin-sidebar-open');
    if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'false');
  }

  if (sidebarToggle && adminSidebar) {
    // Toggle on hamburger click
    sidebarToggle.addEventListener('click', () => {
      if (adminSidebar.classList.contains('open')) {
        closeAdminSidebar();
      } else {
        openAdminSidebar();
      }
    });

    // Close via backdrop click
    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', closeAdminSidebar);
    }

    // Close via Escape key (return focus to toggle)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && adminSidebar.classList.contains('open')) {
        closeAdminSidebar();
        sidebarToggle.focus();
      }
    });

    // Close when a nav link is tapped on mobile (page navigates anyway,
    // but this prevents a visual flash of the open drawer)
    adminSidebar.querySelectorAll('.admin-nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        if (window.innerWidth < 992) closeAdminSidebar();
      });
    });

    // Auto-close if viewport is resized to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 992) closeAdminSidebar();
    }, { passive: true });
  }


  /* ──────────────────────────────────────────
     Dismiss flash messages
  ────────────────────────────────────────── */
  document.querySelectorAll('[data-dismiss-alert]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.alert-custom')?.remove();
    });
  });


  /* ──────────────────────────────────────────
     Heritage Strip: scroll-reveal fade-in
     Uses IntersectionObserver with staggered
     delay controlled by CSS transition-delay.
  ────────────────────────────────────────── */
  const heritageCards = document.querySelectorAll('.heritage-card');

  if (heritageCards.length > 0 && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    heritageCards.forEach((card) => revealObserver.observe(card));
  } else {
    // Fallback for browsers without IntersectionObserver
    heritageCards.forEach((card) => card.classList.add('is-visible'));
  }

})();

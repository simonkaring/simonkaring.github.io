import '@fontsource-variable/geist/wght.css';
import '@fontsource-variable/geist-mono/wght.css';
import './styles.css';

const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Theme ------------------------------------------------------------------
const themeButton = document.querySelector('.theme-toggle');
const currentTheme = () => root.dataset.theme || 'dark';
function syncTheme() {
  const theme = currentTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  themeButton.querySelector('[data-theme-label]').textContent = next === 'light' ? 'Light' : 'Dark';
  themeButton.setAttribute('aria-label', `Switch to ${next} theme`);
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#0c0d0f' : '#ebe9e3';
  window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
}
if (themeButton) {
  themeButton.hidden = false;
  syncTheme();
  themeButton.addEventListener('click', () => {
    root.dataset.theme = currentTheme() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('sk-theme', root.dataset.theme); } catch (_) { /* storage may be unavailable */ }
    syncTheme();
  });
}

// Scroll reveals -----------------------------------------------------------
document.querySelectorAll('.lifecycle li').forEach((item, i) => item.style.setProperty('--i', i));
const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach(element => observer.observe(element));
} else {
  reveals.forEach(element => element.classList.add('is-visible'));
}

// Work index: each row is a cluster in the network. ---------------------------
const focusProject = index => window.dispatchEvent(new CustomEvent('projectfocus', { detail: index }));
document.querySelectorAll('.work-row').forEach(row => {
  const index = Number(row.dataset.cluster);
  row.addEventListener('pointerenter', () => focusProject(index));
  row.addEventListener('focus', () => focusProject(index));
  row.addEventListener('pointerleave', () => focusProject(null));
  row.addEventListener('blur', () => focusProject(null));
  // Shared-element transition: the clicked name becomes the case study title.
  row.addEventListener('click', () => { row.querySelector('.work-name').style.viewTransitionName = 'case-title'; });
});
// Restored from the back/forward cache: clear the shared name so it stays unique.
addEventListener('pageshow', () => document.querySelectorAll('.work-name').forEach(name => { name.style.viewTransitionName = ''; }));

// Signature network: progressive enhancement over the real <h1>. --------------
const canvas = document.querySelector('[data-network]');
if (canvas) {
  const start = async () => {
    try {
      const { initNetwork } = await import('./network.js');
      await initNetwork({ canvas, name: document.querySelector('[data-name]'), reducedMotion });
    } catch (error) {
      root.dataset.rendering = 'static';
      if (import.meta.env.DEV) console.warn(error);
    }
  };
  if (navigator.connection?.saveData) root.dataset.rendering = 'static';
  else if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 600 });
  else setTimeout(start, 60);
}

// Config page: quick-copy commands and active navigation tracking ------------
document.querySelectorAll('.copy-btn').forEach(button => {
  button.addEventListener('click', async () => {
    const wrap = button.closest('.code-wrap');
    const code = wrap?.querySelector('pre code')?.textContent || '';
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      const originalText = button.textContent;
      button.textContent = 'Copied';
      button.classList.add('is-copied');
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('is-copied');
      }, 1800);
    } catch (_) {
      /* clipboard write may fail in restricted permissions */
    }
  });
});

const configSections = Array.from(document.querySelectorAll('.config-section'));
const configNavLinks = Array.from(document.querySelectorAll('.config-nav a'));

if (configSections.length && configNavLinks.length) {
  const getSectionTop = section => {
    let top = 0;
    let el = section;
    while (el) {
      top += el.offsetTop;
      el = el.offsetParent;
    }
    return top;
  };

  const getScrollMarginTop = section => parseFloat(getComputedStyle(section).scrollMarginTop) || 116;

  let currentActiveId = null;
  const setActive = id => {
    if (currentActiveId === id) return;
    currentActiveId = id;
    configNavLinks.forEach(link => {
      const isTarget = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-active', isTarget);
      if (isTarget) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  let pendingTargetId = null;
  let pendingTimeout = null;

  const clearPending = () => {
    pendingTargetId = null;
    if (pendingTimeout) {
      clearTimeout(pendingTimeout);
      pendingTimeout = null;
    }
  };

  ['wheel', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, clearPending, { passive: true });
  });
  window.addEventListener(
    'keydown',
    e => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', ' ', 'Home', 'End'].includes(e.key)) {
        clearPending();
      }
    },
    { passive: true }
  );

  if ('onscrollend' in window) {
    window.addEventListener('scrollend', () => {
      clearPending();
      updateActive();
    });
  }

  configNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      const hash = link.getAttribute('href');
      if (!hash || !hash.startsWith('#')) return;
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.classList.add('is-visible');
        pendingTargetId = target.id;
        setActive(target.id);
        if (pendingTimeout) clearTimeout(pendingTimeout);
        pendingTimeout = setTimeout(() => {
          pendingTargetId = null;
          updateActive();
        }, 1500);
      }
    });
  });

  const handleHash = () => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#')) {
      const target = document.getElementById(hash.slice(1));
      if (target && target.classList.contains('config-section')) {
        target.classList.add('is-visible');
        setActive(target.id);
      }
    }
  };

  const updateActive = () => {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const atBottom = maxScroll - scrollY <= 2;

    if (pendingTargetId) {
      const target = document.getElementById(pendingTargetId);
      if (target) {
        const scrollMargin = getScrollMarginTop(target);
        const targetTop = getSectionTop(target);
        if (atBottom || Math.abs(scrollY - (targetTop - scrollMargin)) <= 4) {
          clearPending();
        } else {
          return;
        }
      }
    }

    if (atBottom) {
      setActive(configSections[configSections.length - 1].id);
      return;
    }

    const scrollMargin = getScrollMarginTop(configSections[0]);
    const activeLine = scrollY + scrollMargin + 1;

    let chosen = configSections[0];
    for (const section of configSections) {
      if (getSectionTop(section) <= activeLine) {
        chosen = section;
      } else {
        break;
      }
    }
    if (chosen) setActive(chosen.id);
  };

  let ticking = false;
  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateActive();
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  window.addEventListener('hashchange', handleHash);
  window.addEventListener('pageshow', () => {
    handleHash();
    updateActive();
  });
  document.fonts?.ready?.then(updateActive);

  if (window.location.hash) {
    handleHash();
  } else {
    updateActive();
  }
}

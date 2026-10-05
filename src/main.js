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
  }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
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
    const code = wrap?.querySelector('pre code')?.innerText || '';
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

const configNav = document.querySelector('.config-nav');
const configSections = document.querySelectorAll('.config-section');
const configNavLinks = document.querySelectorAll('.config-nav a');

if (configNav) {
  // Toggle vertical / sticky navigation when scrolling down past the initial nav position
  const navSentinel = document.createElement('div');
  navSentinel.className = 'config-nav-sentinel';
  navSentinel.style.cssText = 'position: absolute; pointer-events: none; height: 1px; width: 1px;';
  configNav.before(navSentinel);

  const navObserver = new IntersectionObserver(([entry]) => {
    configNav.classList.toggle('is-floating', !entry.isIntersecting);
  }, { threshold: 0, rootMargin: '-68px 0px 0px 0px' });
  navObserver.observe(navSentinel);
}

if (configSections.length && configNavLinks.length && 'IntersectionObserver' in window) {
  const activeObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        configNavLinks.forEach(link => {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
        });
      }
    }
  }, { threshold: 0.2, rootMargin: '-10% 0px -60% 0px' });
  configSections.forEach(section => activeObserver.observe(section));
}



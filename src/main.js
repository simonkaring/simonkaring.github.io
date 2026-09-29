import '@fontsource-variable/geist/wght.css';
import '@fontsource-variable/geist-mono/wght.css';
import './styles.css';

const root = document.documentElement;
const systemLight = matchMedia('(prefers-color-scheme: light)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Theme ------------------------------------------------------------------
const themeButton = document.querySelector('.theme-toggle');
const currentTheme = () => root.dataset.theme || (systemLight.matches ? 'light' : 'dark');
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
  systemLight.addEventListener('change', syncTheme);
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

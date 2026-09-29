const root = document.documentElement;
const systemTheme = matchMedia('(prefers-color-scheme: light)');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const themeButton = document.querySelector('.theme-toggle');
const currentTheme = () => root.dataset.theme || (systemTheme.matches ? 'light' : 'dark');
function syncTheme() {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  themeButton.querySelector('[data-theme-label]').textContent = next === 'light' ? 'Light' : 'Dark';
  themeButton.setAttribute('aria-label', `Switch to ${next} theme`);
  document.querySelector('meta[name="theme-color"]').content = currentTheme() === 'dark' ? '#151614' : '#eeeee6';
  window.dispatchEvent(new CustomEvent('themechange', { detail: currentTheme() }));
}
if (themeButton) {
  themeButton.hidden = false;
  syncTheme();
  themeButton.addEventListener('click', () => {
    root.dataset.theme = currentTheme() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('sk-theme', root.dataset.theme); } catch (_) { /* Private browsing may disable storage. */ }
    syncTheme();
  });
  systemTheme.addEventListener('change', syncTheme);
}

if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const reveal = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.remove('reveal-pending');
        entry.target.classList.add('reveal-visible');
        reveal.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12 });
  document.querySelectorAll('.about-main, .practice-heading, .practice-card, .approach h2, .contact').forEach(element => {
    // Keep already-visible content available when restoring a scroll position.
    if (element.getBoundingClientRect().top > innerHeight) {
      element.classList.add('reveal-pending');
      reveal.observe(element);
    }
  });
  reducedMotion.addEventListener('change', event => {
    if (event.matches) {
      reveal.disconnect();
      document.querySelectorAll('.reveal-pending').forEach(element => element.classList.remove('reveal-pending'));
    }
  });
}

const sculpture = document.querySelector('[data-sculpture]');
if (sculpture) {
  // The static artwork is visible immediately; WebGL is a progressive enhancement.
  const activate = sculpture.querySelector('.sculpture-activate');
  const status = sculpture.querySelector('[data-sculpture-status]');
  let started = false;
  const start = async (userInitiated = false) => {
    if (started) return;
    started = true;
    activate.disabled = true;
    activate.textContent = 'Loading 3D…';
    if (userInitiated) status.textContent = 'Loading interactive sculpture.';
    try {
      const module = await import('./sculpture.js');
      module.initSculpture(sculpture);
    } catch (_) {
      sculpture.dataset.rendering = 'static';
    }
    activate.hidden = true;
    if (userInitiated) {
      status.textContent = sculpture.dataset.rendering === 'webgl' ? 'Interactive sculpture ready. Choose assembled or exploded view.' : '3D is unavailable on this device. The sculpture is shown as a still image.';
      const nextFocus = sculpture.dataset.rendering === 'webgl' ? sculpture.querySelector('[data-view="assembled"]') : status;
      if (nextFocus === status) nextFocus.tabIndex = -1;
      nextFocus.focus({ preventScroll: true });
    }
  };
  // Save mobile bandwidth, battery, and shader-compilation cost until requested.
  if (matchMedia('(pointer: coarse)').matches || innerWidth < 768 || navigator.connection?.saveData) {
    sculpture.dataset.rendering = 'poster';
    activate.hidden = false;
    activate.addEventListener('click', () => start(true));
  } else if ('requestIdleCallback' in window) requestIdleCallback(() => start(), { timeout: 1500 });
  else setTimeout(() => start(), 100);
}

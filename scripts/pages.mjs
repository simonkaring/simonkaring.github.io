import { groups, projects } from '../src/content/projects.js';

const SITE = 'https://simonkaring.github.io';
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const groupLabel = id => groups.find(g => g.id === id)?.label ?? '';

export const workUrl = project => `/work/${project.slug}/`;

export function head({ title, description, path }) {
  return `<meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark light">
    <meta name="theme-color" content="#0c0d0f">
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <link rel="canonical" href="${SITE}${path}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:url" content="${SITE}${path}">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <script>
      try { const t = localStorage.getItem('sk-theme'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch (_) {}
      document.documentElement.classList.add('js');
    </script>
    <script type="module" src="/src/main.js"></script>`;
}

export const siteHeader = (prefix = '/') => `<header class="site-header">
      <a class="mark" href="/" aria-label="Simon Karing, home">sk<span aria-hidden="true">/</span></a>
      <nav aria-label="Main">
        <a href="${prefix}#work">Work</a>
        <a href="${prefix}#about">About</a>
        <a href="${prefix}#contact">Contact</a>
        <button class="theme-toggle" type="button" hidden><span class="theme-dot" aria-hidden="true"></span><span data-theme-label>Light</span></button>
      </nav>
    </header>`;

/** Home page index, grouped. Each row maps to one cluster in the network. */
export function renderWorkList() {
  let n = 0;
  return groups.map(group => {
    const rows = projects.filter(p => p.group === group.id).map(project => {
      const index = projects.indexOf(project);
      n += 1;
      return `<li><a class="work-row" href="${workUrl(project)}" data-cluster="${index}">
              <span class="work-n" aria-hidden="true">${pad(n)}</span>
              <span class="work-name">${esc(project.title)}</span>
              <span class="work-line">${esc(project.subtitle)}</span>
              <span class="work-arrow" aria-hidden="true">↗</span>
            </a></li>`;
    }).join('\n            ');
    return `<div class="work-group reveal">
          <h3 class="work-group-label">${esc(group.label)}</h3>
          <ol class="work-list">
            ${rows}
          </ol>
        </div>`;
  }).join('\n        ');
}

const figure = (image, className = '', eager = false) => `<figure class="shot ${image.phone ? 'shot--phone' : ''} ${className}">
          <img src="${image.src}" width="${image.w}" height="${image.h}" alt="${esc(image.alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
          ${image.caption ? `<figcaption>${esc(image.caption)}</figcaption>` : ''}
        </figure>`;

function renderImages(images) {
  const phones = images.filter(i => i.phone);
  const wides = images.filter(i => !i.phone);
  const lead = wides[0];
  const rest = wides.slice(1);
  const out = { lead: '', gallery: '' };
  if (lead) out.lead = `<div class="case-lead">${figure(lead, 'shot--lead', true)}</div>`;
  const blocks = [];
  if (phones.length) blocks.push(`<div class="phone-row reveal" style="--count:${phones.length}">${phones.map(p => figure(p)).join('')}</div>`);
  if (rest.length) blocks.push(`<div class="wide-stack">${rest.map((image, i) => figure(image, `reveal ${i % 2 ? 'shot--right' : 'shot--left'}`)).join('')}</div>`);
  // Phone-only projects lead with the phone row; others show it after the story.
  if (!lead && phones.length) { out.lead = blocks.shift(); }
  out.gallery = blocks.join('\n');
  return out;
}

const box = (title, note, extra = '') => `<div class="arch-box ${extra}"><strong>${title}</strong><small>${note}</small></div>`;
const layer = (label, boxes, cols = boxes.length) => `<div class="layer"><p class="arch-label">${label}</p><div class="layer-row" style="--cols:${cols}">${boxes.join('')}</div></div>`;
const layered = (id, title, layers, infra) => `<section class="case-diagram reveal" aria-labelledby="diagram-${id}">
        <h2 id="diagram-${id}" class="case-h2">${title}</h2>
        <div class="arch-stack">${layers.join('<div class="layer-link" aria-hidden="true"><span></span></div>')}</div>
        <div class="arch-infra">${infra.map(i => `<span>${i}</span>`).join('')}</div>
      </section>`;

const diagrams = {
  monitor: layered('monitor', 'Architecture', [
    layer('Client', [box('Globe and map', 'MapLibre GL, clusters, arcs, day and night'), box('Panels and feed', 'Site workspace, KPIs, activity stream'), box('Walkthroughs', 'Guided incident tours, URL timeline state')]),
    layer('Boundary', [box('Next.js API routes', 'The only thing the client talks to', 'arch-box--core')]),
    layer('Sources', [box('Reference sites', 'Identities and locations'), box('Deterministic simulator', 'Tasks, audits, incidents, shipments'), box('Real feeds', 'Planned: swap in behind the same routes', 'arch-box--planned')]),
  ], ['Next.js', 'Docker', 'Nginx']),
  count: layered('count', 'Architecture', [
    layer('Clients', [box('Counter on a phone', 'Barcode scanning, search, quantities'), box('Manager dashboard', 'Live status, charts, approvals, Excel')]),
    layer('API', [box('Django REST API', 'Sessions, role and unit scoping, cut-off dates', 'arch-box--core')]),
    layer('Background and integration', [box('Celery workers', 'Notifications and scheduled jobs on Redis'), box('ERP export', 'Two-step XML posting with retries and status')]),
  ], ['Static Web Apps', 'Web Apps', 'Azure SQL', 'Entra ID', 'Azure Pipelines']),
  servicehub: `<section class="case-diagram reveal" aria-labelledby="diagram-title">
        <h2 id="diagram-title" class="case-h2">Architecture, then and now</h2>
        <div class="arch">
          <div class="arch-gen">
            <p class="arch-label">Generation 1</p>
            <div class="arch-box arch-box--mono">
              <strong>Django monolith</strong>
              <ul><li>Server-rendered pages</li><li>Audits and surveys</li><li>Training</li><li>Kiosk feedback</li><li>Feedback analysis</li></ul>
            </div>
            <div class="arch-infra"><span>App Service</span><span>SQL database</span><span>Blob Storage</span></div>
          </div>
          <div class="arch-arrow" aria-hidden="true"><span></span></div>
          <div class="arch-gen arch-gen--next">
            <p class="arch-label">Generation 2</p>
            <div class="arch-row">
              <div class="arch-box"><strong>Vue PWA</strong><small>IndexedDB, offline audits</small></div>
              <div class="arch-box"><strong>Expo app</strong><small>SQLite outbox, QR scanning</small></div>
            </div>
            <div class="arch-box arch-box--core"><strong>Django Ninja API</strong><small>Domain apps, scoped RBAC, atomic sync</small></div>
            <div class="arch-row">
              <div class="arch-box"><strong>Channels</strong><small>WebSocket notifications</small></div>
              <div class="arch-box"><strong>Celery</strong><small>Workers and schedules</small></div>
            </div>
            <div class="arch-infra"><span>Static Web Apps</span><span>App Service</span><span>Redis</span><span>Relational DB</span><span>Blob Storage</span></div>
          </div>
        </div>
      </section>`,
};

export function renderCasePage(project) {
  const index = projects.indexOf(project);
  const next = projects[(index + 1) % projects.length];
  const { lead, gallery } = renderImages(project.images);
  const meta = Object.entries(project.meta).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
  const highlights = project.highlights.map(([title, text], i) => `<li class="reveal"><span class="hl-n" aria-hidden="true">${pad(i + 1)}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></li>`).join('\n          ');
  const path = workUrl(project);
  return `<!doctype html>
<html lang="en">
  <head>
    ${head({ title: `${project.title} · Simon Karing`, description: project.summary, path })}
  </head>
  <body class="case-page">
    <a class="skip-link" href="#main">Skip to content</a>
    ${siteHeader('/')}
    <main id="main" class="case" style="--hue:${index}">
      <header class="case-hero">
        <p class="case-index"><a class="back-link" href="/#work">Work</a><span aria-hidden="true">/</span>${pad(index + 1)}<span class="case-of">/${pad(projects.length)}</span><span class="case-group">${esc(groupLabel(project.group))}</span></p>
        <h1 class="case-title">${esc(project.title)}</h1>
        <p class="case-subtitle">${esc(project.subtitle)}</p>
        <div class="case-intro">
          <p class="case-summary">${esc(project.summary)}</p>
          <dl class="case-meta">${meta}</dl>
        </div>
      </header>
      ${lead}
      <section class="case-story" aria-label="Story">
        <div class="story-block reveal"><h2 class="case-h2">The problem</h2><p>${esc(project.problem)}</p></div>
        <div class="story-block reveal"><h2 class="case-h2">The approach</h2>${project.approach.map(p => `<p>${esc(p)}</p>`).join('')}</div>
      </section>
      ${project.diagram ? diagrams[project.diagram] : ''}
      <section class="case-highlights" aria-labelledby="hl-title">
        <h2 id="hl-title" class="case-h2 reveal">Engineering</h2>
        <ol class="hl-list">
          ${highlights}
        </ol>
      </section>
      ${gallery}
      <section class="case-stack reveal" aria-labelledby="stack-title">
        <h2 id="stack-title" class="case-h2">Built with</h2>
        <ul class="tags">${project.stack.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
      </section>
      <nav class="case-next" aria-label="Next project">
        <a href="${workUrl(next)}"><span class="next-kicker">Next project</span><span class="next-title">${esc(next.title)}<span class="next-arrow" aria-hidden="true">→</span></span></a>
      </nav>
    </main>
    <footer class="site-footer">
      <span>Simon Karing</span>
      <a href="/config/mac/">Mac config</a>
    </footer>
  </body>
</html>
`;
}

export { projects };

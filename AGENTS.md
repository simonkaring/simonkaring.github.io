# Project guidance

## Purpose and voice
- Simon Karing's personal portfolio, published at `simonkaring.github.io` via GitHub Pages (GitHub Actions deploy).
- Simon is a software engineer who owns problems end to end: users and requirements, architecture, data models and APIs, frontend and backend, cloud deployment, production. Primarily Microsoft Azure. Strong interest in AI-assisted engineering. Use his confirmed bio wording; do not invent biography, employers, locations, contact details, metrics, or proficiency levels.
- The only verified public link is https://github.com/simonkaring. Do not link individual project repositories.

## Projects (case studies)
- Enterprise systems: ServiceHub 1 to 2 (lead story), an operations monitor, an inventory counter (team project; describe Simon as a contributor).
- Personal tools: VoltLink (OBD-II / CarPlay), Gitty (Rust/Tauri Git client), Altiplan Calendar, Car Charging DK (label as a prototype; prices are dated), Streamer.
- Experiments: FPD 2026 (describe the technique only; content is internal).
- Work projects must be anonymised: no employer, customer or brand names, logos, internal URLs, or real data. Screenshots only from seeded or altered demo data, reviewed before publishing.
- Streamer: describe as a client for user-configured add-ons and M3U/XMLTV sources. No copyrighted titles, sources, or free-access claims.

## Visual direction
- "Living System": a full-screen GPU node network that assembles into Simon's name and reorganises into connected subsystems as the visitor scrolls. Graphite (`#0c0d0f`) and bone (`#ece9e2`) foundations, one signal-orange accent, Geist + Geist Mono, oversized asymmetric typography.
- The WebGL canvas is progressive enhancement over real HTML. The `<h1>` and all copy remain in the DOM; the name falls back to type without WebGL or JavaScript.
- Aim for distinctive, art-directed quality. Treat Awwwards as an aspiration, never as a claim.
- Motion must be motivated. Support keyboard use, visible focus, reduced motion, WCAG AA contrast in both themes, and responsive layouts.

## Stack and workflow
- Vite multi-page static build (`index.html`, `config/index.html`) to `dist/`; three.js is lazy-loaded. Deployed by `.github/workflows/deploy.yml` after tests pass. Never commit `dist/`.
- Preserve the `/config/` route.
- Case study content lives in `src/content/projects.js`; pages are generated into the gitignored `work/` folder. Each project maps to one cluster in the network (array order). Every screenshot in `public/work/` must be reviewed for names, addresses, URLs and branding before it is added.
- Use `.agents/skills/design-taste-frontend/SKILL.md` for frontend design work, contextually with this file.
- Verify with `npm run build && npm test` (Playwright + axe, desktop, mobile and WebKit). Review screenshots with `node scripts/shots.mjs` against `npm run preview`.

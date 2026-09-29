# simonkaring.github.io

Simon Karing’s personal introduction, built with Jekyll and a progressively enhanced Three.js architectural sculpture.

## Local development

```sh
bundle install
npm ci
npm run build
bundle exec jekyll serve
```

Open `http://127.0.0.1:4000`. After editing `src/`, run `npm run build:assets` to regenerate the JavaScript. CSS lives in `assets/css/site.css`.

## Publishing

The site uses the existing GitHub Pages Jekyll publishing setup. Generated files in `assets/js/` and self-hosted fonts in `assets/fonts/` are included in the repository, so GitHub Pages does not need a Node build step. Run `npm run build` before committing source changes. Keep the generated assets in the same commit as their sources.

## Content

The introduction and capability copy in `index.html` is a draft for Simon’s review. It reflects the confirmed areas of system design, architecture, enterprise software, and personal workflow projects. Specific technologies, named design systems, project case studies, and additional contact details await confirmation.

The existing `/config/mac/` route remains available through `mac-config.md`.

## Verification

```sh
npx playwright install chromium webkit
npm run build
npm test
```

Tests cover mobile/desktop overflow, local routes, keyboard navigation, themes, automated WCAG checks, reduced motion, sculpture controls, and JavaScript/WebGL fallbacks. Screenshots are saved in the ignored `test-results/` directory.

## Assets and accessibility

- Fonts: Space Grotesk and Manrope, self-hosted; licenses in `assets/fonts/`.
- Sculpture: original procedural geometry with a lightweight WebP render as its fallback. Touch devices activate 3D on request to save bandwidth and shader-compilation time. WebGL rendering stops while idle, offscreen, or in a hidden tab. Regenerate the poster with `node scripts/render-poster.mjs http://127.0.0.1:4000` while the preview is running.
- Both color themes follow system preference until explicitly changed. Reduced-motion preference disables entrance and pointer motion.
- Third-party JavaScript license notices ship beside the generated bundles.

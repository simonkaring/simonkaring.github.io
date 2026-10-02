/*
 * Case study content. Single source for the home index and /work/<slug>/ pages.
 * Facts come from the project repositories. Work projects are anonymised:
 * no employer, customer or brand names, and screenshots use seeded demo data.
 */

export const groups = [
  { id: 'enterprise', label: 'Enterprise systems' },
  { id: 'personal', label: 'Personal tools' },
  { id: 'experiment', label: 'Experiments' },
];

export const projects = [
  {
    slug: 'servicehub',
    group: 'enterprise',
    title: 'ServiceHub',
    subtitle: 'From monolith to offline-first platform',
    summary: 'An internal operations platform for audits, surveys, training and service feedback, rebuilt as an API, a web app and a mobile client that keep working offline.',
    meta: {
      Role: 'Developer, across both generations',
      Platform: 'Web, PWA, iOS and Android',
      Type: 'Internal platform',
    },
    stack: ['Python', 'Django', 'Django Ninja', 'Vue 3', 'React Native', 'Expo', 'Redis', 'Celery', 'Azure App Service', 'Azure Static Web Apps', 'Blob Storage', 'Entra ID', 'Azure DevOps'],
    problem: 'Field staff run structured audits, surveys and feedback flows across many sites, often with unreliable connectivity. Managers need the results as tracked actions and role-based reports, not spreadsheets.',
    approach: [
      'The first generation was a modular Django monolith: server-rendered audits and surveys, training, tablet kiosks for service feedback, feedback analysis and Microsoft sign-in, deployed to Azure App Service with release pipelines and post-deploy health checks.',
      'The second generation separates the concerns. A Django Ninja API serves a Vue progressive web app and an Expo mobile app, each deployable on its own, with real-time notifications and background workers.',
    ],
    highlights: [
      ['Offline-first audits', 'Whole audits, photos included, are stored locally in IndexedDB or SQLite and synced as one atomic, idempotent submission. A dropped connection never leaves a half-saved audit.'],
      ['Scoped access', 'Role-based permissions across a location hierarchy, and versioned questionnaires so historic answers stay valid when forms change.'],
      ['Real time', 'Notifications over WebSockets with Django Channels and Redis, with Celery handling scheduled and background work.'],
      ['Delivery', 'Branch-based test and staging environments, tag-based production releases and rollback, with migrations and health checks in the pipeline.'],
    ],
    diagram: 'servicehub',
    images: [],
  },
  {
    slug: 'operations-monitor',
    group: 'enterprise',
    title: 'Operations Monitor',
    subtitle: 'One view of a global portfolio of sites',
    summary: 'A map-driven monitoring prototype that shows site health, incidents and logistics across a large portfolio of locations, designed to be connected to real data sources.',
    meta: {
      Role: 'Design and development',
      Platform: 'Web',
      Status: 'Prototype in progress',
    },
    stack: ['TypeScript', 'Next.js', 'React', 'MapLibre GL', 'Framer Motion', 'Tailwind CSS', 'Vitest', 'Docker'],
    problem: 'Operations leaders need one place to see which sites need attention and why, instead of assembling the picture from separate systems.',
    approach: [
      'Reference site identities are combined with deterministic simulated activity: tasks, audits, incidents, shipments and service metrics. The full experience can be demonstrated today, and each simulated source sits behind an API route that can later be swapped for real data.',
    ],
    highlights: [
      ['Globe and map', 'A 3D globe with clustered health markers, alert pulses, a day and night overlay and animated great-circle logistics arcs.'],
      ['Deterministic simulation', 'The same inputs always produce the same activity, and the timeline state lives in the URL, so any moment can be shared and reproduced.'],
      ['Guided walkthroughs', 'Incident tours move the camera and panels through a scenario, from alert to resolution.'],
      ['Clear boundaries', 'The client only talks to API routes, keeping the swap from simulated to real sources contained.'],
    ],
    diagram: 'monitor',
    images: [],
  },
  {
    slug: 'inventory-count',
    group: 'enterprise',
    title: 'Inventory Count',
    subtitle: 'Stock counting from phone to ERP',
    summary: 'A role-based inventory counting app with barcode scanning, approval workflows, live dashboards and controlled export to an ERP system.',
    meta: {
      Role: 'Contributor in a team',
      Platform: 'Web, mobile-first',
      Type: 'Internal application',
    },
    stack: ['Vue 3', 'TypeScript', 'Pinia', 'Tailwind CSS', 'ZXing', 'Chart.js', 'Django REST Framework', 'Celery', 'Redis', 'Azure Static Web Apps', 'Azure SQL', 'Entra ID', 'Azure Pipelines'],
    problem: 'Counting stock across many units means counters on phones, managers approving sessions, and figures that have to land correctly in the ERP before a cut-off date.',
    approach: [
      'Counters work through sessions on their phones, scanning or searching for products. Managers follow progress on a live dashboard, approve sessions and trigger the export.',
    ],
    highlights: [
      ['Barcode entry', 'Camera scanning of EAN-8 and EAN-13 codes with a scan cooldown, plus search by material, vendor number or barcode.'],
      ['Manager dashboard', 'Live session status, counted value trends and Excel export.'],
      ['ERP export', 'Two-step XML posting with status tracking, retries and cut-off date safeguards.'],
      ['Promotion gates', 'Separate test, staging and production environments with gated releases.'],
    ],
    diagram: 'count',
    images: [],
  },
  {
    slug: 'voltlink',
    group: 'personal',
    title: 'VoltLink',
    subtitle: 'EV telemetry in your pocket and on CarPlay',
    summary: 'A native iOS and CarPlay app that reads live telemetry and diagnostics from an electric car through a Bluetooth OBD-II adapter.',
    meta: {
      Role: 'Personal project',
      Platform: 'iOS 17 and CarPlay',
      Status: 'In development',
    },
    stack: ['Swift', 'SwiftUI', 'SwiftData', 'Swift Charts', 'CoreBluetooth', 'CoreLocation', 'CarPlay', 'ActivityKit'],
    problem: 'Electric cars know a great deal about their battery, charging and faults, but most of it stays hidden behind the dashboard.',
    approach: [
      'VoltLink talks to the car through an inexpensive Bluetooth adapter, decodes manufacturer-specific data and turns it into live telemetry, charging insight, trip history and fault scans, on the phone and in CarPlay.',
    ],
    highlights: [
      ['Protocol stack', 'ISO-TP framing across concurrent ECUs, UDS and SAE J1979 requests, and a command queue with timeouts and stale-response draining.'],
      ['Vehicle profiles', 'A registry of manufacturer and platform decoders with a generic fallback.'],
      ['History', 'Trips and charging sessions recorded automatically and stored with SwiftData.'],
      ['Demo mode', 'A simulated car, including DC fast charging, so every screen works without a vehicle.'],
    ],
    images: [
      { src: '/work/voltlink/telemetry.webp', w: 900, h: 1957, alt: 'Telemetry screen with speed and power gauges, state of charge and pack voltage.', caption: 'Telemetry', phone: true },
      { src: '/work/voltlink/charging.webp', w: 900, h: 1957, alt: 'Charging screen showing 64.9 kilowatts, battery temperature and capacity.', caption: 'Charge and battery health', phone: true },
      { src: '/work/voltlink/diagnostics.webp', w: 900, h: 1957, alt: 'Diagnostics screen listing a trouble code with a scan button.', caption: 'Diagnostics', phone: true },
      { src: '/work/voltlink/trip-history.webp', w: 900, h: 1957, alt: 'Trip history with the current trip and a previous trip with efficiency.', caption: 'Trip history', phone: true },
    ],
  },
  {
    slug: 'gitty',
    group: 'personal',
    title: 'Gitty',
    subtitle: 'A graph-first Git client',
    summary: 'A desktop Git client built around the commit graph, for exploring history and running explicit Git workflows.',
    meta: {
      Role: 'Personal project',
      Platform: 'macOS, Windows and Linux',
      Status: 'In development',
    },
    stack: ['Rust', 'Tauri 2', 'React 19', 'TypeScript', 'Vite', 'Web Workers', 'Canvas', 'Vitest', 'GitHub Actions'],
    problem: 'Large repositories make most Git clients slow, and many hide what Git is actually doing.',
    approach: [
      'Gitty keeps the graph fast at any size and makes every operation explicit. The Rust backend runs the installed Git binary with strict contracts; the React front end renders history with a canvas graph and accessible rows.',
    ],
    highlights: [
      ['Streaming history', 'Paged, topologically ordered history from a pinned rev-list stream with backpressure, with commit metadata and diffs loaded lazily.'],
      ['Rendering', 'Graph lane layout in a Web Worker and a viewport-bounded canvas beneath virtualised, accessible rows.'],
      ['Safe operations', 'Shell-free Git invocation with separate read and write contracts, mutation locks and stale-state checks.'],
      ['Distribution', 'Signed and notarised builds for macOS and Windows from a CI workflow, with tokens in the OS credential store.'],
    ],
    images: [
      { src: '/work/gitty/graph.webp', w: 2000, h: 1250, alt: 'Gitty window with branches sidebar, commit graph with coloured lanes, working changes and commit details.', caption: 'Current Gitty history view. Synthetic demo repository.' },
      { src: '/work/gitty/diff.webp', w: 2000, h: 1250, alt: 'Gitty showing a unified CSS file diff beside the selected commit’s details.', caption: 'Unified commit diff. Synthetic demo repository.' },
    ],
  },
  {
    slug: 'altiplan-calendar',
    group: 'personal',
    title: 'Altiplan Calendar',
    subtitle: 'Shift plans into calendars',
    summary: 'A Chrome extension and backend that turn Altiplan shift plans into subscribable calendar feeds.',
    meta: {
      Role: 'Personal project',
      Platform: 'Chrome extension and backend',
      Status: 'Deployed',
    },
    stack: ['Python', 'Django', 'Django Ninja', 'PostgreSQL', 'Google OAuth', 'Google Calendar API', 'Chrome Extension MV3', 'Railway'],
    problem: 'Shift schedules live in the Altiplan portal, while life runs in a calendar. Copying shifts by hand every month is slow and error-prone.',
    approach: [
      'A Chrome extension reads the Altiplan shift plan directly in the browser and syncs it to a Django backend, which keeps a subscribable calendar feed in sync.',
    ],
    highlights: [
      ['Extension', 'Parses the shift plan page locally, syncs to the backend and shares the feed to a phone by QR code.'],
      ['Living feeds', 'Persistent .ics feeds keyed by three-word passphrases, updated transactionally month by month.'],
      ['Backend', 'A Django Ninja API on PostgreSQL receives synced shifts and serves the feeds, deployed on Railway.'],
    ],
    images: [
      { src: '/work/altiplan/extension.webp', w: 760, h: 2126, alt: 'Altiplan Calendar extension popup showing a calendar feed, QR code and three demo shifts for October 2026.', caption: 'Actual extension popup with synthetic shifts and a dummy subscription feed.' },
    ],
  },
  {
    slug: 'car-charging-dk',
    group: 'personal',
    title: 'Car Charging DK',
    subtitle: 'What charging an EV in Denmark really costs',
    summary: 'A Danish comparison site for electric car charging costs at home, on public networks, or a mix of both.',
    meta: {
      Role: 'Personal project',
      Platform: 'Web',
      Status: 'Prototype, prices from June 2026',
    },
    stack: ['TypeScript', 'Next.js 16', 'React 19', 'next-intl', 'Tailwind CSS 4', 'React Three Fiber', 'GLSL', 'Vitest', 'Playwright', 'GitHub Actions'],
    problem: 'Charging prices are spread across networks, subscriptions and electricity tariffs, which makes it hard to know what a given driver will actually pay.',
    approach: [
      'Enter yearly distance and a car, and the site estimates monthly consumption and compares home tariffs, public networks and a mixed setup.',
    ],
    highlights: [
      ['Cost model', 'Monthly kWh derived from distance and WLTP efficiency, compared across fixed and spot home tariffs, pay-as-you-go and subscriptions.'],
      ['Scheduled data', 'A daily workflow scrapes public price lists, validates the parsed values and commits only real changes.'],
      ['Live spot price', 'Current spot price from a public energy data API, cached with back-off on failure.'],
      ['Visual', 'An animated GLSL potential-field background rendered with React Three Fiber.'],
    ],
    images: [
      { src: '/work/car-charging/hero.webp', w: 2000, h: 1112, alt: 'Landing page with large headline comparing EV charging in Denmark and three charging options.', caption: 'Landing page, Danish locale.' },
      { src: '/work/car-charging/compare.webp', w: 2000, h: 1112, alt: 'Monthly price estimate listing public charging networks for a chosen car and distance.', caption: 'Monthly estimate across public networks.' },
      { src: '/work/car-charging/mobile.webp', w: 900, h: 1770, alt: 'Mobile view of the monthly price estimator.', caption: 'Mobile estimator.', phone: true },
    ],
  },
  {
    slug: 'streamer',
    group: 'personal',
    title: 'Streamer',
    subtitle: 'One player for your own sources',
    summary: 'A media client for user-configured add-ons and M3U/XMLTV sources, with a Flutter app and a native SwiftUI app.',
    meta: {
      Role: 'Personal project',
      Platform: 'iOS, iPadOS, macOS, tvOS, Android and Android TV',
      Status: 'In development',
    },
    stack: ['Flutter', 'Dart', 'Riverpod', 'Isar', 'media_kit', 'Swift', 'SwiftUI', 'AVKit', 'KSPlayer'],
    problem: 'Catalogues, live TV guides and playback usually come from separate apps with separate settings on every device.',
    approach: [
      'Streamer brings user-configured sources into one client with profiles, watch tracking and a live TV guide. It ships no content of its own; everything comes from sources the user adds. There are no screenshots here, because they would show third-party content.',
    ],
    highlights: [
      ['Add-on client', 'Parses manifests, catalogues and streams, with deduplication, caching, timeouts, cancellation and bounded concurrency.'],
      ['Live TV guide', 'M3U and XMLTV parsing with gzip size and expansion-ratio guards, sanitisation and channel matching.'],
      ['Playback', 'Throttled position updates, tuned live buffering and delayed recovery for dropped live streams.'],
      ['Two native paths', 'A cross-platform Flutter app and a native SwiftUI app sharing one product design.'],
    ],
    images: [],
  },
  {
    slug: 'fpd-2026',
    group: 'experiment',
    title: 'FPD 2026',
    subtitle: 'A conference recap as a 3D space',
    summary: 'An interactive 3D recap of a design conference, presented to my team instead of slides.',
    meta: {
      Role: 'Personal project',
      Platform: 'Web, presented live',
      Type: 'Experiment',
    },
    stack: ['TypeScript', 'React 19', 'Three.js', 'React Three Fiber', 'drei', 'Postprocessing', 'WebSocket', 'Playwright', 'ffmpeg'],
    problem: 'A slide deck flattens a multi-stage event. The venue itself is a better structure for telling what happened where.',
    approach: [
      'The venue is modelled in code from floor-plan data and rendered as clay. Talks appear as HTML slides on 3D stage screens, and the audience can join from their phones to react and ask questions.',
    ],
    highlights: [
      ['Code-built venue', 'Geometry generated from layout data, with soft shadows, ambient occlusion, bloom and tone mapping for a clay look.'],
      ['Slides in space', 'HTML slides transformed onto stage screens, navigable by keyboard.'],
      ['Live audience', 'Phones join by QR code through a local WebSocket server, with rate limits and a presenter-only question queue.'],
      ['Deterministic video', 'A kinetic-type recap video rendered frame by frame with Playwright and encoded with ffmpeg.'],
    ],
    images: [
      { src: '/work/fpd/aerial.webp', w: 2000, h: 1125, alt: 'Aerial view of a clay-rendered 3D conference venue with stages, breakout rooms and a food hall, and a card with a Start the tour button.', caption: 'The presentation’s start screen: the whole venue, generated in code from floor-plan data. Event and sponsor names replaced.' },
    ],
  },
];

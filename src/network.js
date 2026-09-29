import {
  BufferAttribute,
  BufferGeometry,
  Color,
  LineSegments,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three';

/*
 * Signature piece: a network of nodes that assembles into the name, then
 * dissolves back into a connected system as the visitor scrolls.
 * World units are CSS pixels on the z = 0 plane, origin at viewport centre.
 */

const FOV = 32;
const CLUSTERS = 9;

const COMMON = /* glsl */ `
  uniform float uTime, uIntro, uMorph, uScroll, uViewH, uPointerAmt, uRadius, uOpacity, uGraphDim, uLetterVis, uSystemVis;
  uniform vec2 uPointer, uTilt;
  uniform vec3 uGraphCenter;
  attribute vec3 aText;
  attribute vec3 aGraph;
  attribute vec4 aSeed; // x: stagger, y: size jitter, z: 0 node / 1 accent / 2 hub, w: arc
  mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0., -s, 0., 1., 0., s, 0., c); }
  mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
  float easeInOut(float x) { return x < .5 ? 4. * x * x * x : 1. - pow(-2. * x + 2., 3.) / 2.; }
  vec3 place(out float t) {
    float d = aSeed.x;
    float intro = easeInOut(clamp(uIntro * 1.7 - d * .7, 0., 1.));
    float away = easeInOut(clamp(uMorph * 1.6 - d * .6, 0., 1.));
    t = intro * (1. - away);

    vec3 g = rotX(.2 + uTilt.y * .3) * rotY(uTime * .035 + uTilt.x * .45) * (aGraph - uGraphCenter) + uGraphCenter;
    g += vec3(sin(uTime * .5 + d * 40.), cos(uTime * .43 + d * 27.), sin(uTime * .37 + d * 13.)) * 5.;

    vec3 tp = vec3(aText.x, uViewH * .5 - (aText.y - uScroll), aText.z);
    tp.xy += vec2(sin(uTime * 1.2 + d * 60.), cos(uTime * 1.05 + d * 45.)) * .45;

    vec3 p = mix(g, tp, t);
    p.z += sin(t * 3.14159) * (aSeed.w - .5) * 420.;

    vec2 dl = p.xy - uPointer;
    float f = exp(-dot(dl, dl) / (2. * uRadius * uRadius)) * uPointerAmt * t;
    p.xy += normalize(dl + 1e-4) * f * uRadius * .42;
    p.z += f * 110.;
    return p;
  }
`;

const pointsMaterial = uniforms => new ShaderMaterial({
  uniforms,
  transparent: true,
  depthWrite: false,
  vertexShader: /* glsl */ `
    ${COMMON}
    uniform float uCamZ, uPR;
    varying float vAlpha;
    varying float vAccent;
    void main() {
      float t;
      vec3 p = place(t);
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      float hub = step(1.5, aSeed.z);
      float size = mix(1.5 + aSeed.y * .9 + hub * 5.5, 1.25 + aSeed.y * 1.1, t);
      gl_PointSize = size * uPR * (uCamZ / -mv.z);
      gl_Position = projectionMatrix * mv;
      float depth = clamp((-mv.z - uCamZ + 450.) / 900., 0., 1.);
      vAlpha = mix(mix(.9, .28, depth) * uGraphDim, 1., t) * uOpacity;
      vAccent = step(.5, aSeed.z);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uInk, uAccent;
    varying float vAlpha;
    varying float vAccent;
    void main() {
      float r = length(gl_PointCoord - .5);
      float a = 1. - smoothstep(.32, .5, r);
      if (a <= 0.) discard;
      gl_FragColor = vec4(mix(uInk, uAccent, vAccent), a * vAlpha);
    }
  `,
});

const linesMaterial = uniforms => new ShaderMaterial({
  uniforms,
  transparent: true,
  depthWrite: false,
  vertexShader: /* glsl */ `
    ${COMMON}
    attribute float aKind; // 0: letter edge, 1: system edge, 2: hub edge
    varying float vAlpha;
    varying float vAccent;
    void main() {
      float t;
      vec3 p = place(t);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
      // Visibility is gated globally so edges never stretch across the screen mid-flight.
      float letter = (1. - step(.5, aKind)) * t * .2 * uLetterVis;
      float system = step(.5, aKind) * (1. - t) * mix(.16, .5, step(1.5, aKind)) * uSystemVis * uGraphDim;
      vAlpha = (letter + system) * uOpacity;
      vAccent = step(1.5, aKind);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uInk, uAccent;
    varying float vAlpha;
    varying float vAccent;
    void main() { gl_FragColor = vec4(mix(uInk, uAccent, vAccent), vAlpha); }
  `,
});

// Deterministic PRNG so the composition is identical between visits.
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const gaussian = random => Math.sqrt(-2 * Math.log(random() + 1e-9)) * Math.cos(2 * Math.PI * random());

/** Rasterise each rendered line of the heading exactly where the DOM draws it. */
function sampleName(name, count, random) {
  const style = getComputedStyle(name);
  const fontSize = parseFloat(style.fontSize);
  const lineHeight = parseFloat(style.lineHeight);
  const letterSpacing = parseFloat(style.letterSpacing) || 0;
  const box = name.getBoundingClientRect();
  const pad = Math.ceil(fontSize * 0.3);
  const width = Math.ceil(innerWidth);
  const height = Math.ceil(box.height + pad * 2);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
  const nativeSpacing = 'letterSpacing' in ctx;
  if (nativeSpacing) ctx.letterSpacing = `${letterSpacing}px`;

  for (const line of name.querySelectorAll('.name-line')) {
    const rect = line.getBoundingClientRect();
    const text = line.textContent.trim();
    const metrics = ctx.measureText(text);
    const ascent = metrics.fontBoundingBoxAscent ?? fontSize * 0.9;
    const descent = metrics.fontBoundingBoxDescent ?? fontSize * 0.25;
    const baseline = rect.top - box.top + pad + (lineHeight - ascent - descent) / 2 + ascent;
    if (nativeSpacing) ctx.fillText(text, rect.left, baseline);
    else {
      let x = rect.left;
      for (const char of text) { ctx.fillText(char, x, baseline); x += ctx.measureText(char).width + letterSpacing; }
    }
  }

  const { data } = ctx.getImageData(0, 0, width, height);
  const filled = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) if (data[(y * width + x) * 4 + 3] > 140) filled.push(x, y);
  }
  const pixels = filled.length / 2;
  const top = box.top + scrollY - pad;
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const p = pixels ? Math.floor(random() * pixels) * 2 : 0;
    out[i * 3] = filled[p] + random() - 0.5 - innerWidth / 2;
    out[i * 3 + 1] = filled[p + 1] + random() - 0.5 + top;
    out[i * 3 + 2] = (random() - 0.5) * 6;
  }
  return { positions: out, fontSize };
}

/** Clustered 3D system layout: nine subsystems around a loose core, plus ambient dust. */
function layoutGraph(count, random, { width, height, mobile }) {
  const radius = Math.min(width, height) * (mobile ? 0.44 : 0.4);
  const center = [mobile ? 0 : width * 0.17, mobile ? -height * 0.05 : 0, 0];
  const centers = [];
  for (let k = 0; k < CLUSTERS; k += 1) {
    const y = 1 - (k + 0.5) / CLUSTERS * 2;
    const r = Math.sqrt(1 - y * y);
    const phi = k * Math.PI * (3 - Math.sqrt(5));
    centers.push([
      center[0] + Math.cos(phi) * r * radius * 1.25,
      center[1] + y * radius * 0.85,
      center[2] + Math.sin(phi) * r * radius * 0.95,
    ]);
  }
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count * 4);
  const cluster = new Int16Array(count);
  const members = centers.map(() => []);
  for (let i = 0; i < count; i += 1) {
    let x; let y; let z;
    const isHub = i < CLUSTERS;
    const isDust = !isHub && random() < 0.12;
    if (isDust) {
      cluster[i] = -1;
      const u = random() * 2 - 1;
      const a = random() * Math.PI * 2;
      const s = Math.cbrt(random()) * radius * 1.7;
      x = center[0] + Math.sqrt(1 - u * u) * Math.cos(a) * s * 1.3;
      y = center[1] + u * s * 0.8;
      z = Math.sqrt(1 - u * u) * Math.sin(a) * s;
    } else {
      const k = isHub ? i : Math.floor(random() * CLUSTERS);
      cluster[i] = k;
      members[k].push(i);
      const spread = isHub ? 0 : radius * 0.16;
      [x, y, z] = [centers[k][0] + gaussian(random) * spread, centers[k][1] + gaussian(random) * spread, centers[k][2] + gaussian(random) * spread];
    }
    positions.set([x, y, z], i * 3);
    const accent = isHub ? 2 : random() < 0.025 ? 1 : 0;
    seeds.set([random(), random(), accent, random()], i * 4);
  }
  return { positions, seeds, cluster, members, center };
}

function buildEdges(count, text, graph, random, fontSize) {
  const edges = [];
  const kinds = [];
  const add = (a, b, kind) => { edges.push(a, b); kinds.push(kind); };

  // Letter edges: short links between neighbouring glyph samples, like a wireframe.
  const cell = fontSize * 0.055;
  const grid = new Map();
  const key = (x, y) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  for (let i = 0; i < count; i += 1) {
    const k = key(text[i * 3], text[i * 3 + 1]);
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  }
  for (let i = 0; i < count; i += 1) {
    if (random() > 0.45) continue;
    const x = text[i * 3]; const y = text[i * 3 + 1];
    const cx = Math.floor(x / cell); const cy = Math.floor(y / cell);
    let best = -1; let bestD = cell * cell;
    for (let gx = cx - 1; gx <= cx + 1; gx += 1) {
      for (let gy = cy - 1; gy <= cy + 1; gy += 1) {
        for (const j of grid.get(`${gx},${gy}`) || []) {
          if (j === i) continue;
          const d = (text[j * 3] - x) ** 2 + (text[j * 3 + 1] - y) ** 2;
          if (d < bestD && d > 4) { bestD = d; best = j; }
        }
      }
    }
    if (best >= 0) add(i, best, 0);
  }

  // System edges: local links inside each subsystem, spokes to its hub, and a hub backbone.
  const g = graph.positions;
  const dist = (a, b) => (g[a * 3] - g[b * 3]) ** 2 + (g[a * 3 + 1] - g[b * 3 + 1]) ** 2 + (g[a * 3 + 2] - g[b * 3 + 2]) ** 2;
  graph.members.forEach((list, k) => {
    for (const i of list) {
      if (i === k || random() > 0.4) continue;
      let best = -1; let bestD = Infinity;
      for (let n = 0; n < 7; n += 1) {
        const j = list[Math.floor(random() * list.length)];
        if (j === i) continue;
        const d = dist(i, j);
        if (d < bestD) { bestD = d; best = j; }
      }
      if (best >= 0) add(i, best, 1);
    }
    for (let n = 0; n < 16 && list.length > 1; n += 1) add(k, list[1 + Math.floor(random() * (list.length - 1))], 1);
  });
  for (let k = 0; k < CLUSTERS; k += 1) {
    add(k, (k + 1) % CLUSTERS, 2);
    if (k % 2 === 0) add(k, (k + 4) % CLUSTERS, 2);
  }
  return { edges, kinds };
}

export async function initNetwork({ canvas, name, reducedMotion }) {
  const root = document.documentElement;
  const nameStyle = getComputedStyle(name);
  await document.fonts.load(`${nameStyle.fontWeight} 100px ${nameStyle.fontFamily}`);
  await document.fonts.ready;

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 1, 20000);
  const mobile = matchMedia('(max-width: 767px), (pointer: coarse)').matches;
  const count = mobile ? 5200 : 13000;

  const uniforms = {
    uTime: { value: 0 }, uIntro: { value: 0 }, uMorph: { value: 0 }, uScroll: { value: scrollY },
    uViewH: { value: innerHeight }, uPointer: { value: [99999, 99999] }, uPointerAmt: { value: 0 },
    uRadius: { value: mobile ? 80 : 150 }, uTilt: { value: [0, 0] }, uGraphCenter: { value: [0, 0, 0] },
    uOpacity: { value: 1 }, uGraphDim: { value: mobile ? 0.5 : 0.8 }, uLetterVis: { value: 0 }, uSystemVis: { value: 1 }, uCamZ: { value: 1 }, uPR: { value: 1 },
    uInk: { value: new Color() }, uAccent: { value: new Color() },
  };
  const points = new Points(new BufferGeometry(), pointsMaterial(uniforms));
  const lines = new LineSegments(new BufferGeometry(), linesMaterial(uniforms));
  points.frustumCulled = false;
  lines.frustumCulled = false;
  scene.add(lines, points);

  const readColors = () => {
    const css = getComputedStyle(root);
    uniforms.uInk.value.set(css.getPropertyValue('--ink').trim());
    uniforms.uAccent.value.set(css.getPropertyValue('--accent').trim());
    dirty = true;
  };

  let size = { width: 0, height: 0 };
  let dirty = true;
  let contactTop = Infinity;

  const build = () => {
    const random = mulberry32(1987);
    const width = innerWidth; const height = innerHeight;
    const text = sampleName(name, count, random);
    const graph = layoutGraph(count, random, { width, height, mobile });
    const { edges, kinds } = buildEdges(count, text.positions, graph, random, text.fontSize);

    const pg = points.geometry;
    pg.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    pg.setAttribute('aText', new BufferAttribute(text.positions, 3));
    pg.setAttribute('aGraph', new BufferAttribute(graph.positions, 3));
    pg.setAttribute('aSeed', new BufferAttribute(graph.seeds, 4));

    const n = edges.length;
    const lText = new Float32Array(n * 3); const lGraph = new Float32Array(n * 3);
    const lSeed = new Float32Array(n * 4); const lKind = new Float32Array(n);
    for (let v = 0; v < n; v += 1) {
      const i = edges[v];
      lText.set(text.positions.subarray(i * 3, i * 3 + 3), v * 3);
      lGraph.set(graph.positions.subarray(i * 3, i * 3 + 3), v * 3);
      lSeed.set(graph.seeds.subarray(i * 4, i * 4 + 4), v * 4);
      lKind[v] = kinds[v >> 1];
    }
    const lg = lines.geometry;
    lg.setAttribute('position', new BufferAttribute(new Float32Array(n * 3), 3));
    lg.setAttribute('aText', new BufferAttribute(lText, 3));
    lg.setAttribute('aGraph', new BufferAttribute(lGraph, 3));
    lg.setAttribute('aSeed', new BufferAttribute(lSeed, 4));
    lg.setAttribute('aKind', new BufferAttribute(lKind, 1));
    uniforms.uGraphCenter.value = graph.center;
  };

  const resize = (force = false) => {
    const width = innerWidth; const height = innerHeight;
    const widthChanged = width !== size.width;
    // Mobile browser chrome changes height while scrolling; only rebuild on real layout changes.
    const rebuild = force || widthChanged || Math.abs(height - size.height) > 160;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.75 : 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const camZ = height / 2 / Math.tan((FOV * Math.PI) / 360);
    camera.position.set(0, 0, camZ);
    camera.far = camZ + 6000;
    camera.updateProjectionMatrix();
    uniforms.uCamZ.value = camZ;
    uniforms.uPR.value = renderer.getPixelRatio();
    uniforms.uViewH.value = height;
    const contact = document.getElementById('contact');
    contactTop = contact ? contact.getBoundingClientRect().top + scrollY : Infinity;
    if (rebuild) { size = { width, height }; build(); }
    dirty = true;
  };

  // Pointer: smoothed, never tracked in DOM state.
  const pointer = { x: 99999, y: 99999, tx: 99999, ty: 99999, amt: 0, target: 0, tiltX: 0, tiltY: 0 };
  const onPointer = event => {
    pointer.tx = event.clientX - innerWidth / 2;
    pointer.ty = innerHeight / 2 - event.clientY;
    if (pointer.x > 9999) { pointer.x = pointer.tx; pointer.y = pointer.ty; }
    pointer.target = 1;
  };
  addEventListener('pointermove', onPointer, { passive: true });
  addEventListener('pointerdown', onPointer, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.target = 0; });
  addEventListener('pointerup', event => { if (event.pointerType !== 'mouse') pointer.target = 0; }, { passive: true });

  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => resize(), 150); });
  addEventListener('themechange', readColors);
  reducedMotion.addEventListener('change', () => { dirty = true; });

  resize(true);
  readColors();

  let introStart = performance.now();
  let morph = 0;
  let last = performance.now();
  let running = false;
  let frame = 0;

  const tick = now => {
    frame = requestAnimationFrame(tick);
    const reduce = reducedMotion.matches;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const vh = innerHeight;
    const y = scrollY;

    const intro = reduce ? 1 : Math.min(1, (now - introStart) / 2600);
    const targetMorph = reduce ? 0 : Math.min(1, Math.max(0, y / (vh * 0.9)));
    morph = reduce ? targetMorph : morph + (targetMorph - morph) * (1 - Math.exp(-dt * 5));
    const fadeStart = contactTop - vh * 1.15;
    const opacity = 1 - Math.min(1, Math.max(0, (y - fadeStart) / (vh * 0.55)));

    const easing = 1 - Math.exp(-dt * 7);
    pointer.x += (pointer.tx - pointer.x) * easing * 1.4;
    pointer.y += (pointer.ty - pointer.y) * easing * 1.4;
    pointer.amt += ((reduce ? 0 : pointer.target) - pointer.amt) * easing * 0.6;
    const tx = pointer.tx > 9999 ? 0 : pointer.tx / innerWidth;
    const ty = pointer.ty > 9999 ? 0 : pointer.ty / vh;
    pointer.tiltX += ((reduce ? 0 : tx) - pointer.tiltX) * easing * 0.35;
    pointer.tiltY += ((reduce ? 0 : ty) - pointer.tiltY) * easing * 0.35;

    const changed = dirty || !reduce || y !== uniforms.uScroll.value;
    if (!changed || (opacity <= 0 && uniforms.uOpacity.value <= 0)) return;
    dirty = false;

    uniforms.uTime.value = reduce ? 0 : uniforms.uTime.value + dt;
    uniforms.uIntro.value = intro;
    uniforms.uMorph.value = morph;
    uniforms.uScroll.value = y;
    uniforms.uOpacity.value = opacity;
    uniforms.uLetterVis.value = smoothstep(0.8, 1, intro) * (1 - smoothstep(0, 0.12, morph));
    uniforms.uSystemVis.value = Math.max(1 - smoothstep(0, 0.3, intro), smoothstep(0.72, 1, morph));
    uniforms.uPointer.value = [pointer.x, pointer.y];
    uniforms.uPointerAmt.value = pointer.amt;
    uniforms.uTilt.value = [pointer.tiltX, pointer.tiltY];
    renderer.render(scene, camera);
    if (root.dataset.rendering !== 'webgl') root.dataset.rendering = 'webgl';
  };

  const play = () => { if (running) return; running = true; last = performance.now(); frame = requestAnimationFrame(tick); };
  const pause = () => { running = false; cancelAnimationFrame(frame); };
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : play()));
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); pause(); root.dataset.rendering = 'static'; });

  introStart = performance.now();
  play();
}

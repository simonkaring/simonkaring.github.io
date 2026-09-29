import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function initSculpture(host) {
  const canvas = host.querySelector('canvas');
  const stage = host.querySelector('.sculpture-stage');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer;
  try {
    // Retain the last frame because this scene deliberately stops rendering while idle.
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  } catch (_) {
    host.dataset.rendering = 'static';
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 60);
  camera.position.set(7, 5.3, 8.5);
  camera.lookAt(0, 0, 0);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  const ambient = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xf2f0df, 4.5);
  key.position.set(-3, 7, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x748dff, 2);
  rim.position.set(4, 0, -4);
  scene.add(rim);

  const silver = new THREE.MeshStandardMaterial({ color: 0xd4d8cc, metalness: 0.92, roughness: 0.23 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x244eff, metalness: 0.45, roughness: 0.22 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x565d50, metalness: 0.9, roughness: 0.3 });
  const shape = new THREE.Shape();
  shape.moveTo(-1.8, -1.4); shape.lineTo(1.8, -1.4); shape.lineTo(1.8, 1.4); shape.lineTo(-1.8, 1.4); shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-1.38, -0.98); hole.lineTo(-1.38, 0.98); hole.lineTo(1.38, 0.98); hole.lineTo(1.38, -0.98); hole.closePath();
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.045, bevelThickness: 0.045 });
  geometry.center();
  geometry.rotateX(-Math.PI / 2);
  const sculpture = new THREE.Group();
  sculpture.rotation.y = -0.16;
  scene.add(sculpture);
  const rings = [];
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(geometry, i === 1 ? blue : silver);
    ring.position.y = (i - 1.5) * 0.73;
    ring.rotation.y = (i - 1.5) * 0.065;
    sculpture.add(ring);
    rings.push(ring);
  }
  const pillarGeometry = new THREE.BoxGeometry(0.15, 2.3, 0.15);
  const pillars = [];
  [[-1.57,-1.17],[1.57,1.17]].forEach(([x,z], i) => {
    const pillar = new THREE.Mesh(pillarGeometry, i ? blue : dark);
    pillar.position.set(x, 0, z);
    sculpture.add(pillar);
    pillars.push(pillar);
  });

  let disposed = false;
  let visible = true;
  let frame = 0;
  let lastTime = 0;
  let targetExpansion = 0;
  let expansion = 0;
  let targetX = 0;
  let targetY = -0.16;
  let progress = reduced.matches ? 1 : 0;

  function draw(time = 0) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    const delta = Math.min((time - lastTime) / 1000 || 0.016, 0.05);
    lastTime = time;
    const blend = reduced.matches ? 1 : 1 - Math.exp(-delta * 7);
    expansion += (targetExpansion - expansion) * blend;
    sculpture.rotation.x += (targetX - sculpture.rotation.x) * blend;
    sculpture.rotation.y += (targetY - sculpture.rotation.y) * blend;
    progress = reduced.matches ? 1 : Math.min(1, progress + delta / 1.4);
    const entrance = 1 - Math.pow(1 - progress, 3);
    sculpture.position.y = -0.2 * (1 - entrance);
    rings.forEach((ring, i) => {
      ring.position.y = (i - 1.5) * (0.73 + expansion * 0.42);
      ring.rotation.y = (i - 1.5) * (0.065 + expansion * 0.1) + (1 - entrance) * 0.22;
    });
    pillars.forEach(pillar => { pillar.scale.y = 1 + expansion * 0.52; });
    renderer.render(scene, camera);
    if (progress < 1 || Math.abs(targetExpansion - expansion) > 0.001 || Math.abs(targetX - sculpture.rotation.x) > 0.001 || Math.abs(targetY - sculpture.rotation.y) > 0.001) wake();
  }
  function wake() { if (!frame && !disposed && visible && !document.hidden) frame = requestAnimationFrame(draw); }
  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Frame the complete object, including its expanded state, at every aspect ratio.
    camera.position.set(7, 5.3, 8.5).multiplyScalar(camera.aspect < 0.9 ? 1.18 : 1);
    camera.updateProjectionMatrix();
    wake();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) { lastTime = 0; wake(); }
    else { cancelAnimationFrame(frame); frame = 0; }
  });
  visibilityObserver.observe(host);

  function pointerMove(event) {
    if (reduced.matches || event.pointerType !== 'mouse') return;
    const rect = stage.getBoundingClientRect();
    targetY = -0.16 + ((event.clientX - rect.left) / rect.width - 0.5) * 0.55;
    targetX = ((event.clientY - rect.top) / rect.height - 0.5) * 0.15;
    wake();
  }
  function pointerLeave() { targetY = -0.16; targetX = 0; wake(); }
  stage.addEventListener('pointermove', pointerMove);
  stage.addEventListener('pointerleave', pointerLeave);
  const controls = host.querySelector('.sculpture-controls');
  controls.hidden = false;
  function setView(event) {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    targetExpansion = button.dataset.view === 'exploded' ? 1 : 0;
    controls.querySelectorAll('button').forEach(control => control.setAttribute('aria-pressed', String(control === button)));
    host.dataset.view = button.dataset.view;
    wake();
  }
  controls.addEventListener('click', setView);
  function themeChange() { wake(); }
  function documentVisibility() { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else { lastTime = 0; wake(); } }
  function motionChange() { if (reduced.matches) pointerLeave(); wake(); }
  document.addEventListener('visibilitychange', documentVisibility);
  window.addEventListener('themechange', themeChange);
  reduced.addEventListener('change', motionChange);
  function fallback(event) {
    event.preventDefault();
    host.classList.remove('is-ready');
    controls.hidden = true;
    host.dataset.rendering = 'static';
    cleanup();
  }
  canvas.addEventListener('webglcontextlost', fallback);
  function cleanup() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    stage.removeEventListener('pointermove', pointerMove);
    stage.removeEventListener('pointerleave', pointerLeave);
    controls.removeEventListener('click', setView);
    document.removeEventListener('visibilitychange', documentVisibility);
    window.removeEventListener('themechange', themeChange);
    reduced.removeEventListener('change', motionChange);
    canvas.removeEventListener('webglcontextlost', fallback);
    geometry.dispose(); pillarGeometry.dispose(); silver.dispose(); blue.dispose(); dark.dispose();
    environment.dispose(); renderer.dispose();
  }
  resize();
  renderer.render(scene, camera);
  host.classList.add('is-ready');
  host.dataset.rendering = 'webgl';
  wake();
}

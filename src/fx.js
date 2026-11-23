import * as THREE from 'three';

const gsap = window.gsap;
export const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 반짝이 입자 (장면마다 하나씩)
export function createSparks(scene, count = 56) {
  const geo = new THREE.SphereGeometry(0.09, 8, 6);
  const sparks = [];
  for (let i = 0; i < count; i += 1) {
    const s = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    s.visible = false;
    scene.add(s);
    sparks.push(s);
  }
  return function burst(pos, color, n, spread = 1) {
    if (REDUCED) n = Math.min(n, 4);
    let used = 0;
    for (const s of sparks) {
      if (used >= n) break;
      if (s.visible) continue;
      used += 1;
      s.visible = true;
      s.material.color.set(color);
      s.position.copy(pos);
      s.scale.setScalar(1);
      const a = Math.random() * Math.PI * 2;
      const r = (0.7 + Math.random() * 1.1) * spread;
      gsap.to(s.position, { x: pos.x + Math.cos(a) * r, y: pos.y + (0.5 + Math.random() * 1.2) * spread, z: pos.z + Math.sin(a) * r * 0.6, duration: 0.55, ease: 'power2.out' });
      gsap.to(s.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.55, ease: 'power1.in', onComplete: () => { s.visible = false; } });
    }
  };
}

// 화면에 떠오르는 글자 (+1, -3 츄르, 짠! 등)
export function floatText(camera, worldPos, text, cls = '') {
  const v = worldPos.clone().project(camera);
  const el = document.createElement('div');
  el.className = `float ${cls}`;
  el.textContent = text;
  el.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
  el.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
  document.body.appendChild(el);
  gsap.fromTo(el, { y: 0, opacity: 1, scale: 0.6 }, { y: -64, opacity: 0, scale: 1.1, duration: 1.0, ease: 'power2.out', onComplete: () => el.remove() });
}

export function floatTextAtScreen(x, y, text, cls = '') {
  const el = document.createElement('div');
  el.className = `float ${cls}`;
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  document.body.appendChild(el);
  gsap.fromTo(el, { y: 0, opacity: 1, scale: 0.6 }, { y: -56, opacity: 0, scale: 1.1, duration: 1.0, ease: 'power2.out', onComplete: () => el.remove() });
}

// 폰 진동(지원하는 기기만) + 화면이 '지잉' 떨리는 효과
export function haptic(pattern = 30) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) { /* 진동을 지원하지 않는 기기 */ }
}

export function buzz(strength = 1) {
  const app = document.getElementById('app');
  if (!app || REDUCED) return;
  const k = { v: 1 };
  gsap.to(k, {
    v: 0, duration: 0.32, ease: 'none',
    onUpdate: () => {
      app.style.transform = `translate(${(Math.random() - 0.5) * 7 * strength * k.v}px, ${(Math.random() - 0.5) * 7 * strength * k.v}px)`;
    },
    onComplete: () => { app.style.transform = ''; },
  });
}

// 3D 모델을 작은 그림으로 만들어서 말풍선·선반에 씁니다
export function makeIcons(renderer, builders, size = 128) {
  const rt = new THREE.WebGLRenderTarget(size, size, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xffffff, 0xffe3ec, 2.6));
  const sun = new THREE.DirectionalLight(0xfff0dc, 1.8);
  sun.position.set(2, 4, 5);
  sc.add(sun);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 30);
  cam.position.set(0, 0.5, 5);
  cam.lookAt(0, 0, 0);
  const prevAlpha = renderer.getClearAlpha();
  const prevColor = renderer.getClearColor(new THREE.Color());
  renderer.setClearColor(0xffffff, 0);
  const out = {};
  const buf = new Uint8Array(size * size * 4);
  Object.entries(builders).forEach(([id, proto]) => {
    const obj = proto.clone();
    obj.rotation.y = 0.55;
    obj.rotation.x = 0.18;
    const box = new THREE.Box3().setFromObject(obj);
    const dim = box.getSize(new THREE.Vector3());
    const s = 1.5 / Math.max(dim.x, dim.y, dim.z);
    obj.scale.setScalar(s);
    box.setFromObject(obj);
    const c = box.getCenter(new THREE.Vector3());
    obj.position.sub(c);
    sc.add(obj);
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(sc, cam);
    renderer.readRenderTargetPixels(rt, 0, 0, size, size, buf);
    renderer.setRenderTarget(null);
    sc.remove(obj);
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y += 1) {
      img.data.set(buf.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    }
    ctx.putImageData(img, 0, 0);
    out[id] = cv.toDataURL('image/png');
  });
  renderer.setClearColor(prevColor, prevAlpha);
  rt.dispose();
  return out;
}

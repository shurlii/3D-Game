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
    const s = 1.85 / Math.max(dim.x, dim.y, dim.z);
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
    // 위아래를 뒤집고, 가장자리 색을 바로잡은 뒤, 스티커처럼 윤곽선을 둘러서 또렷하게 만들어요
    const px = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y += 1) {
      px.set(buf.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
    }
    for (let i = 0; i < px.length; i += 4) {
      const a = px[i + 3];
      if (a > 0 && a < 255) {
        const k = 255 / a;
        px[i] = Math.min(255, px[i] * k); px[i + 1] = Math.min(255, px[i + 1] * k); px[i + 2] = Math.min(255, px[i + 2] * k);
      }
    }
    const img = new ImageData(size, size);
    const R1 = 5;
    const R2 = 8;
    const offs = [];
    for (let dy = -R2; dy <= R2; dy += 1) for (let dx = -R2; dx <= R2; dx += 1) {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= R2) offs.push([dx, dy, d]);
    }
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const i = (y * size + x) * 4;
        if (px[i + 3] >= 128) {
          img.data[i] = px[i]; img.data[i + 1] = px[i + 1]; img.data[i + 2] = px[i + 2]; img.data[i + 3] = 255;
          continue;
        }
        let nearest = 99;
        for (const [dx, dy, d] of offs) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
          if (px[(yy * size + xx) * 4 + 3] >= 128 && d < nearest) nearest = d;
        }
        if (nearest <= R1) { img.data[i] = 255; img.data[i + 1] = 255; img.data[i + 2] = 255; img.data[i + 3] = 255; }
        else if (nearest <= R2) { img.data[i] = 107; img.data[i + 1] = 74; img.data[i + 2] = 58; img.data[i + 3] = 255; }
      }
    }
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    cv.getContext('2d').putImageData(img, 0, 0);
    out[id] = cv.toDataURL('image/png');
  });
  renderer.setClearColor(prevColor, prevAlpha);
  rt.dispose();
  return out;
}

// 동전이 '띠링~' 하는 소리 (짧은 두 음, 소리를 못 내는 기기에서는 조용히 넘어가요)
let audioCtx = null;
export function ding() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = audioCtx || new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const t0 = audioCtx.currentTime;
    [[1318.5, 0], [1760, 0.09]].forEach(([f, d]) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + d);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + d + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.35);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0 + d);
      o.stop(t0 + d + 0.4);
    });
  } catch (e) { /* 소리 없이 진행 */ }
}

// 동전이 톡 튀어 올랐다가 반짝이며 사라지는 효과
export function coinPop(x, y) {
  const coin = document.createElement('div');
  coin.className = 'coin-fx';
  coin.textContent = '츄';
  coin.style.left = `${x}px`;
  coin.style.top = `${y}px`;
  document.body.appendChild(coin);
  const tl = gsap.timeline({ onComplete: () => coin.remove() });
  tl.fromTo(coin, { y: 0, scale: 0.4, opacity: 0, rotationY: 0 }, { y: -46, scale: 1.1, opacity: 1, rotationY: 360, duration: 0.45, ease: 'back.out(2)' });
  tl.to(coin, { y: -34, duration: 0.18, ease: 'power1.in' });
  tl.to(coin, { y: -70, scale: 0.2, opacity: 0, duration: 0.3, ease: 'power2.in' });
  for (let i = 0; i < 6; i += 1) {
    const sp = document.createElement('div');
    sp.className = 'coin-spark';
    sp.style.left = `${x}px`;
    sp.style.top = `${y - 40}px`;
    document.body.appendChild(sp);
    const a = (i / 6) * Math.PI * 2;
    gsap.fromTo(sp, { x: 0, y: 0, scale: 1, opacity: 1 }, { x: Math.cos(a) * 34, y: Math.sin(a) * 34, scale: 0.1, opacity: 0, duration: 0.55, delay: 0.5, ease: 'power2.out', onComplete: () => sp.remove() });
  }
}

import * as THREE from 'three';

const gsap = window.gsap;
const $ = (id) => document.getElementById(id);
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- 게임 규칙 (기존 Meow Bakery 1단계와 같은 규칙) ----------
const DURATION = 30;           // 제한 시간(초)
const RIM_Y = 0.9;             // 바구니 입구 높이
const SPAWN_Y = 10.5;          // 재료가 나타나는 높이
const ITEM_SCALE = 1.3;     // 재료 크기 배율
const SPEEDS = { slow: [3.4, 4.2], mid: [4.8, 5.8], fast: [6.4, 7.6], poop: [4.6, 5.6] };

// ---------- 색과 재료 만들기 ----------
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...extra });
const mesh = (geo, material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  return m;
};

const INGREDIENTS = [
  { id: 'milk', name: '우유', color: '#9ad0ff', speed: 'slow', make() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.7, 0.55, 0.55), mat(0xffffff), 0, -0.12, 0));
    g.add(mesh(new THREE.BoxGeometry(0.7, 0.3, 0.55), mat(0x9ad0ff), 0, 0.3, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 12), mat(0xff7a8a), 0, 0.52, 0));
    return g;
  } },
  { id: 'egg', name: '달걀', color: '#fff0d6', speed: 'fast', make() {
    const g = new THREE.Group();
    const egg = mesh(new THREE.SphereGeometry(0.34, 20, 16), mat(0xfff0d6));
    egg.scale.set(1, 1.28, 1);
    g.add(egg);
    return g;
  } },
  { id: 'butter', name: '버터', color: '#ffe27a', speed: 'slow', make() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.85, 0.42, 0.5), mat(0xffe27a)));
    g.add(mesh(new THREE.BoxGeometry(0.87, 0.16, 0.52), mat(0xffffff), 0, -0.13, 0));
    return g;
  } },
  { id: 'sugar', name: '설탕', color: '#ffd1e0', speed: 'mid', make() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.28, 0.38, 0.75, 18), mat(0xffffff)));
    g.add(mesh(new THREE.CylinderGeometry(0.335, 0.345, 0.2, 18), mat(0xff9fc0), 0, 0.02, 0));
    g.add(mesh(new THREE.SphereGeometry(0.28, 14, 10), mat(0xffffff), 0, 0.4, 0));
    return g;
  } },
  { id: 'salt', name: '소금', color: '#c7e3ff', speed: 'mid', make() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.7, 16), mat(0xc7e3ff)));
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.16, 16), mat(0xb0b7c3), 0, 0.42, 0));
    return g;
  } },
  { id: 'cocoa', name: '코코아', color: '#8a5a3c', speed: 'mid', make() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.66, 20), mat(0x8a5a3c)));
    g.add(mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.14, 20), mat(0xe8b878), 0, 0.38, 0));
    return g;
  } },
  { id: 'strawberry', name: '딸기', color: '#ff5470', speed: 'fast', make() {
    const g = new THREE.Group();
    const body = mesh(new THREE.SphereGeometry(0.36, 20, 16), mat(0xff5470));
    body.scale.set(1, 0.95, 1);
    g.add(body);
    const leaf = mesh(new THREE.ConeGeometry(0.22, 0.18, 6), mat(0x4caf6a), 0, 0.36, 0);
    leaf.rotation.x = Math.PI;
    g.add(leaf);
    return g;
  } },
  { id: 'chocolate', name: '초코칩', color: '#5b3a29', speed: 'fast', make() {
    const g = new THREE.Group();
    const m = mat(0x5b3a29);
    [[-0.22, -0.1, 0], [0.2, -0.05, 0.05], [0, 0.22, -0.05]].forEach(([x, y, z]) => {
      const c = mesh(new THREE.ConeGeometry(0.22, 0.34, 5), m, x, y, z);
      c.rotation.z = x * 1.4;
      g.add(c);
    });
    return g;
  } },
  { id: 'cream', name: '생크림', color: '#ffffff', speed: 'slow', make() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.34, 0.27, 0.36, 18), mat(0xffb3c8), 0, -0.18, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.2, 18), mat(0xffffff), 0, 0.08, 0));
    g.add(mesh(new THREE.ConeGeometry(0.24, 0.32, 18), mat(0xffffff), 0, 0.34, 0));
    return g;
  } },
];
const POOP = { id: 'poop', name: '똥', color: '#8b5a2b', speed: 'poop', make() {
  const g = new THREE.Group();
  const m = mat(0x8b5a2b);
  [[0.36, -0.2], [0.27, 0.05], [0.17, 0.27]].forEach(([r, y]) => {
    const s = mesh(new THREE.SphereGeometry(r, 16, 12), m, 0, y, 0);
    s.scale.y = 0.78;
    g.add(s);
  });
  const eye = new THREE.SphereGeometry(0.045, 8, 8);
  const em = new THREE.MeshBasicMaterial({ color: 0x222222 });
  g.add(mesh(eye, em, -0.08, 0.1, 0.25), mesh(eye, em, 0.08, 0.1, 0.25));
  return g;
} };

// ---------- 시작 ----------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('scene'), antialias: true });
} catch (err) {
  console.error('WebGL을 시작하지 못했습니다.', err);
}

if (!renderer || !gsap) {
  $('start').hidden = true;
  $('nogl').hidden = false;
} else {
  init(renderer);
}

function init(renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const SKY = new THREE.Color(0xcfe8ff);
  scene.background = SKY;
  scene.fog = new THREE.Fog(SKY, 22, 48);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 80);
  const cam = { baseX: 0, baseY: 4.2, z: 12.5, shakeX: 0, shakeY: 0 };
  let halfVisW = 8;   // z=0 평면에서 화면 가로 절반의 월드 길이
  let playHalf = 4.2; // 바구니가 움직이고 재료가 떨어지는 가로 범위(절반)

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    cam.z = aspect < 1 ? 12.5 + (1 - aspect) * 6.5 : 12.5;
    halfVisW = cam.z * Math.tan(THREE.MathUtils.degToRad(22.5)) * aspect;
    playHalf = THREE.MathUtils.clamp(halfVisW - 0.7, 2.3, 4.4);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ----- 빛 -----
  scene.add(new THREE.HemisphereLight(0xffffff, 0xffe3ec, 2.5));
  const sun = new THREE.DirectionalLight(0xfff0dc, 1.8);
  sun.position.set(4, 10, 7);
  scene.add(sun);

  // ----- 바닥(구름 위 빵집 바닥) -----
  const checker = document.createElement('canvas');
  checker.width = checker.height = 128;
  const cg = checker.getContext('2d');
  cg.fillStyle = '#fff6ea'; cg.fillRect(0, 0, 128, 128);
  cg.fillStyle = '#ffd1e0'; cg.fillRect(0, 0, 64, 64); cg.fillRect(64, 64, 64, 64);
  const floorTex = new THREE.CanvasTexture(checker);
  floorTex.colorSpace = THREE.SRGBColorSpace;
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(9, 7);
  const side = mat(0xfff0e0);
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(18, 0.6, 14),
    [side, side, mat(0xffffff, { map: floorTex }), side, side, side]
  );
  floor.position.set(0, -0.3, -1);
  scene.add(floor);

  // ----- 뒤쪽 가게 카운터 + 차양 -----
  const counter = new THREE.Group();
  counter.position.set(0, 0, -4.2);
  counter.add(mesh(new THREE.BoxGeometry(12, 1.4, 1.3), mat(0xd9a066), 0, 0.7, 0));
  counter.add(mesh(new THREE.BoxGeometry(12.3, 0.16, 1.6), mat(0xfff6ea), 0, 1.48, 0.05));
  const cakeColors = [0xffb3c8, 0xfff0d6, 0xc7a0ff, 0xffe27a];
  [-4, -1.4, 1.4, 4].forEach((x, i) => {
    const cake = new THREE.Group();
    cake.add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.45, 24), mat(cakeColors[i]), 0, 0.23, 0));
    cake.add(mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.1, 24), mat(0xffffff), 0, 0.5, 0));
    cake.add(mesh(new THREE.SphereGeometry(0.1, 12, 10), mat(0xe0334f), 0, 0.64, 0));
    cake.position.set(x, 1.56, 0.05);
    counter.add(cake);
  });
  scene.add(counter);

  const awning = new THREE.Group();
  awning.position.set(0, 6.6, -4.2);
  for (let i = 0; i < 14; i += 1) {
    const stripe = mesh(new THREE.BoxGeometry(0.95, 0.14, 2.4), mat(i % 2 ? 0xffffff : 0xff9fb8), (i - 6.5) * 0.95, 0, 0.4);
    stripe.rotation.x = 0.35;
    awning.add(stripe);
  }
  const fringe = new THREE.BoxGeometry(0.95, 0.22, 0.1);
  for (let i = 0; i < 14; i += 1) {
    awning.add(mesh(fringe, mat(i % 2 ? 0xffffff : 0xff9fb8), (i - 6.5) * 0.95, -0.52, 1.5));
  }
  [-6.2, 6.2].forEach((x) => awning.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 6.6, 10), mat(0xd9a066), x, -3.3, 1.3)));
  scene.add(awning);

  // ----- 깃발 장식 -----
  const bunting = new THREE.Group();
  const flagGeo = new THREE.ConeGeometry(0.28, 0.55, 3);
  const flagColors = [0xff9fb8, 0xffe27a, 0x9ad0ff, 0xb9f0c8, 0xc7a0ff];
  const flags = [];
  for (let i = 0; i < 17; i += 1) {
    const t = i / 16;
    const f = mesh(flagGeo, mat(flagColors[i % flagColors.length]), (t - 0.5) * 13, 8.4 - Math.sin(t * Math.PI) * 0.7, -2.2);
    f.rotation.x = Math.PI;
    f.rotation.y = 0.5;
    bunting.add(f);
    flags.push(f);
  }
  scene.add(bunting);

  // ----- 구름 (바닥 주변을 천천히 떠다님) -----
  const cloudMat = mat(0xffffff, { roughness: 1 });
  const cloudBall = new THREE.SphereGeometry(1, 14, 10);
  const clouds = [];
  function makeCloud(x, y, z, s) {
    const c = new THREE.Group();
    [[0, 0, 1], [1.1, -0.15, 0.8], [-1.1, -0.2, 0.75], [0.5, 0.45, 0.7], [-0.5, 0.35, 0.65]].forEach(([dx, dy, r]) => {
      const b = mesh(cloudBall, cloudMat, dx, dy, 0);
      b.scale.setScalar(r);
      c.add(b);
    });
    c.position.set(x, y, z);
    c.scale.setScalar(s);
    c.userData.speed = 0.15 + Math.random() * 0.2;
    scene.add(c);
    clouds.push(c);
  }
  makeCloud(-9, -1.2, -1, 1.8); makeCloud(10, -1.6, 1, 2.1); makeCloud(-6, -2.4, 5, 1.6);
  makeCloud(7, -2.6, 6, 1.4); makeCloud(-13, 5, -14, 2.8); makeCloud(12, 7, -16, 3.2);
  makeCloud(0, 10, -22, 3.4); makeCloud(-18, 1, -18, 2.6);

  // ----- 바구니와 고양이 -----
  const loader = new THREE.TextureLoader();
  const moods = {};
  ['normal', 'happy', 'angry', 'worried'].forEach((m) => {
    const t = loader.load(`./assets/cats/cat_baker_${m}.png`);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    moods[m] = t;
  });
  const cat = new THREE.Sprite(new THREE.SpriteMaterial({ map: moods.normal, transparent: true, alphaTest: 0.05 }));
  cat.scale.set(1.9, 2.5, 1);
  scene.add(cat);

  const basket = new THREE.Group();
  const wicker = mat(0xc98f4e, { side: THREE.DoubleSide });
  basket.add(mesh(new THREE.CylinderGeometry(0.98, 0.72, 0.72, 28, 1, true), wicker, 0, 0, 0));
  basket.add(mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.05, 28), mat(0xa8703a), 0, -0.34, 0));
  const rim = mesh(new THREE.TorusGeometry(0.98, 0.075, 10, 32), mat(0xa8703a), 0, 0.36, 0);
  rim.rotation.x = Math.PI / 2;
  basket.add(rim);
  const band = mesh(new THREE.CylinderGeometry(0.9, 0.82, 0.16, 28, 1, true), mat(0xff9fb8, { side: THREE.DoubleSide }), 0, 0.02, 0);
  basket.add(band);
  const bowL = mesh(new THREE.ConeGeometry(0.13, 0.3, 4), mat(0xff6f91), -0.17, 0.02, 0.97);
  bowL.rotation.z = Math.PI / 2;
  const bowR = mesh(new THREE.ConeGeometry(0.13, 0.3, 4), mat(0xff6f91), 0.17, 0.02, 0.97);
  bowR.rotation.z = -Math.PI / 2;
  basket.add(bowL, bowR);
  scene.add(basket);

  const BASKET_Y = RIM_Y - 0.36;
  const player = { x: 0, target: 0, vx: 0 };
  let moodUntil = 0;
  let moodName = 'normal';
  function setMood(name, seconds) {
    moodName = name;
    moodUntil = performance.now() + seconds * 1000;
    cat.material.map = moods[name];
  }

  // ----- 재료 틀(한 번만 만들고 복제해서 씀) -----
  const protos = new Map();
  [...INGREDIENTS, POOP].forEach((def) => protos.set(def.id, def.make()));
  const shadowGeo = new THREE.CircleGeometry(0.5, 20);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x6b4a3a, transparent: true, opacity: 0.2, depthWrite: false });

  // ----- 반짝이 입자 -----
  const sparks = [];
  const sparkGeo = new THREE.SphereGeometry(0.09, 8, 6);
  for (let i = 0; i < 48; i += 1) {
    const s = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    s.visible = false;
    scene.add(s);
    sparks.push(s);
  }
  function burst(pos, color, count) {
    if (REDUCED) count = Math.min(count, 4);
    let used = 0;
    for (const s of sparks) {
      if (used >= count) break;
      if (s.visible) continue;
      used += 1;
      s.visible = true;
      s.material.color.set(color);
      s.position.copy(pos);
      s.scale.setScalar(1);
      const a = Math.random() * Math.PI * 2;
      const r = 0.7 + Math.random() * 1.1;
      gsap.to(s.position, { x: pos.x + Math.cos(a) * r, y: pos.y + 0.5 + Math.random() * 1.2, z: pos.z + Math.sin(a) * r * 0.6, duration: 0.55, ease: 'power2.out' });
      gsap.to(s.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.55, ease: 'power1.in', onComplete: () => { s.visible = false; } });
    }
  }

  function floatText(text, worldPos, bad = false) {
    const v = worldPos.clone().project(camera);
    const el = document.createElement('div');
    el.className = bad ? 'float bad' : 'float';
    el.textContent = text;
    el.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
    el.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
    document.body.appendChild(el);
    gsap.fromTo(el, { y: 0, opacity: 1, scale: 0.6 }, { y: -64, opacity: 0, scale: 1.1, duration: 0.95, ease: 'power2.out', onComplete: () => el.remove() });
  }

  // ----- 화면 반응 -----
  const flash = document.createElement('div');
  flash.id = 'flash';
  document.body.appendChild(flash);
  function hitEffect() {
    gsap.fromTo(flash, { opacity: 0.38 }, { opacity: 0, duration: 0.45, ease: 'power2.out' });
    if (REDUCED) return;
    const k = { v: 1 };
    gsap.to(k, {
      v: 0, duration: 0.5, ease: 'power2.out',
      onUpdate: () => {
        cam.shakeX = (Math.random() - 0.5) * 0.5 * k.v;
        cam.shakeY = (Math.random() - 0.5) * 0.4 * k.v;
      },
      onComplete: () => { cam.shakeX = 0; cam.shakeY = 0; },
    });
  }
  function squashBasket() {
    gsap.killTweensOf(basket.scale);
    gsap.fromTo(basket.scale, { x: 1.18, y: 0.8, z: 1.18 }, { x: 1, y: 1, z: 1, duration: 0.55, ease: 'elastic.out(1, 0.45)' });
  }

  // ----- HUD -----
  const chipsEl = $('chips');
  const chipEls = {};
  INGREDIENTS.forEach((def) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `<i style="background:${def.color}"></i><b>${def.name}</b><span>0</span>`;
    chipsEl.appendChild(chip);
    chipEls[def.id] = chip;
  });
  const counts = {};
  const resetCounts = () => { INGREDIENTS.forEach((d) => { counts[d.id] = 0; chipEls[d.id].lastChild.textContent = '0'; }); };
  resetCounts();
  const timerEl = $('timer');

  // ----- 게임 상태 -----
  let state = 'menu'; // menu | countdown | play | over | result
  let elapsed = 0;
  let spawnIn = 0.6;
  let lastType = '';
  let poopHits = 0;
  const items = [];

  function clearItems() {
    while (items.length) {
      const it = items.pop();
      scene.remove(it.obj, it.shadow);
    }
  }

  function spawn(demo) {
    const wantPoop = !demo && elapsed > 2 && lastType !== 'poop' && Math.random() < 0.1;
    let def = POOP;
    if (!wantPoop) {
      do { def = INGREDIENTS[Math.floor(Math.random() * INGREDIENTS.length)]; } while (def.id === lastType);
    }
    lastType = def.id;
    const [lo, hi] = SPEEDS[def.speed];
    const x = (Math.random() * 2 - 1) * playHalf;
    const obj = protos.get(def.id).clone();
    obj.scale.setScalar(ITEM_SCALE);
    obj.position.set(x, SPAWN_Y, 0);
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, 0.02, 0);
    scene.add(obj, shadow);
    items.push({
      def, obj, shadow, x, y: SPAWN_Y, speed: lo + Math.random() * (hi - lo),
      spin: (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 2),
      wob: Math.random() * 6, demo,
    });
  }

  function removeItem(i) {
    const it = items[i];
    scene.remove(it.obj, it.shadow);
    items.splice(i, 1);
  }

  function catchItem(i) {
    const it = items[i];
    const pos = new THREE.Vector3(it.x, RIM_Y + 0.2, 0);
    if (it.def.id === 'poop') {
      poopHits += 1;
      resetCounts();
      burst(pos, 0x8b5a2b, 14);
      floatText('앗, 똥! 재료가 사라졌어요', pos.setY(RIM_Y + 1.6), true);
      setMood('angry', 1.1);
      hitEffect();
      gsap.fromTo(basket.rotation, { z: 0.35 }, { z: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    } else {
      counts[it.def.id] += 1;
      const chip = chipEls[it.def.id];
      chip.lastChild.textContent = String(counts[it.def.id]);
      gsap.fromTo(chip, { scale: 1.3 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
      burst(pos, it.def.color, 9);
      floatText(`+1 ${it.def.name}`, pos.setY(RIM_Y + 1.4));
      setMood('happy', 0.5);
      squashBasket();
    }
    removeItem(i);
  }

  function missItem(i) {
    const it = items[i];
    items.splice(i, 1);
    it.shadow.visible = false;
    gsap.to(it.obj.scale, {
      y: ITEM_SCALE * 0.2, x: ITEM_SCALE * 1.3, z: ITEM_SCALE * 1.3, duration: 0.14, ease: 'power1.out',
      onComplete: () => {
        scene.remove(it.obj, it.shadow);
      },
    });
    it.obj.position.y = 0.2;
  }

  // ----- 입력 -----
  const keys = { left: false, right: false };
  function pointerToX(clientX) {
    const ndc = (clientX / window.innerWidth) * 2 - 1;
    return THREE.MathUtils.clamp(ndc * halfVisW, -playHalf, playHalf);
  }
  window.addEventListener('pointermove', (e) => {
    if (e.target.closest && e.target.closest('.card')) return;
    player.target = pointerToX(e.clientX);
  });
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest && e.target.closest('.card')) return;
    player.target = pointerToX(e.clientX);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  });

  // ----- 시작 / 종료 -----
  function startGame() {
    clearItems();
    resetCounts();
    poopHits = 0;
    elapsed = 0;
    spawnIn = 0.4;
    lastType = '';
    timerEl.textContent = String(DURATION);
    timerEl.classList.remove('low');
    $('start').hidden = true;
    $('result').hidden = true;
    $('hud').hidden = false;
    state = 'countdown';

    const cd = $('countdown');
    cd.hidden = false;
    const tl = gsap.timeline({ onComplete: () => { cd.hidden = true; state = 'play'; } });
    ['3', '2', '1', '시작!'].forEach((label) => {
      tl.call(() => { cd.textContent = label; })
        .fromTo(cd, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.28, ease: 'back.out(2.5)' })
        .to(cd, { opacity: 0, duration: 0.22, delay: 0.25 });
    });
  }

  function endGame() {
    state = 'over';
    $('hud').hidden = true;
    const total = INGREDIENTS.reduce((sum, d) => sum + counts[d.id], 0);
    $('total').textContent = String(total);
    $('resultList').innerHTML = INGREDIENTS
      .map((d) => `<li><i style="background:${d.color}"></i>${d.name}<b>${counts[d.id]}</b></li>`)
      .join('');
    $('poopNote').textContent = poopHits > 0 ? `똥을 ${poopHits}번 받았어요.` : '똥을 한 번도 안 받았어요!';
    setMood('happy', 3);
    burst(new THREE.Vector3(player.x, RIM_Y + 0.5, 0.5), 0xffe27a, 30);
    gsap.delayedCall(0.9, () => {
      state = 'result';
      const card = $('result');
      card.hidden = false;
      gsap.fromTo(card.firstElementChild, { y: 40, opacity: 0, scale: 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.8)' });
    });
  }

  $('startBtn').addEventListener('click', startGame);
  $('againBtn').addEventListener('click', startGame);
  gsap.from('#start .card', { y: 40, opacity: 0, scale: 0.92, duration: 0.6, ease: 'back.out(1.8)' });

  // ----- 매 프레임 -----
  const timer = new THREE.Timer();
  const camTarget = new THREE.Vector3();
  function tick() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();

    // 바구니 이동
    if (keys.left) player.target -= 9 * dt;
    if (keys.right) player.target += 9 * dt;
    player.target = THREE.MathUtils.clamp(player.target, -playHalf, playHalf);
    const prevX = player.x;
    player.x += (player.target - player.x) * (1 - Math.exp(-14 * dt));
    player.vx = (player.x - prevX) / Math.max(dt, 0.001);
    basket.position.set(player.x, BASKET_Y, 0.4);
    if (!gsap.isTweening(basket.rotation)) basket.rotation.z = THREE.MathUtils.lerp(basket.rotation.z, -player.vx * 0.025, 0.2);
    cat.position.set(player.x, 1.35 + Math.sin(t * 5) * 0.03, -0.4);

    // 시간
    if (state === 'play') {
      elapsed += dt;
      const left = Math.max(0, DURATION - elapsed);
      const shown = Math.ceil(left);
      if (timerEl.textContent !== String(shown)) timerEl.textContent = String(shown);
      timerEl.classList.toggle('low', left <= 5);
      if (left <= 0) endGame();
    }

    // 재료 만들기 (플레이 중 또는 시작/결과 화면의 장식)
    if (state === 'play' || state === 'menu' || state === 'result') {
      spawnIn -= dt;
      if (spawnIn <= 0) {
        const demo = state !== 'play';
        spawn(demo);
        spawnIn = demo ? 0.7 + Math.random() * 0.5 : Math.max(0.36, 0.62 - elapsed * 0.009) + Math.random() * 0.16;
      }
    }

    // 재료 움직임과 받기
    let poopClose = false;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const it = items[i];
      it.y -= it.speed * dt;
      it.obj.position.set(it.x, it.y, 0);
      it.obj.rotation.y += it.spin * dt;
      it.obj.rotation.z = Math.sin(t * 3 + it.wob) * 0.18;
      const near = THREE.MathUtils.clamp(1 - (it.y - RIM_Y) / 8, 0, 1);
      it.shadow.scale.setScalar(0.5 + near * 0.7);
      if (state === 'play' && !it.demo) {
        if (it.def.id === 'poop' && it.y > RIM_Y && it.y < RIM_Y + 4 && Math.abs(it.x - player.x) < 1.5) poopClose = true;
        if (it.y <= RIM_Y + 0.15 && it.y >= RIM_Y - 0.45 && Math.abs(it.x - player.x) < 1.1) {
          catchItem(i);
          continue;
        }
      }
      if (it.y <= 0.35) missItem(i);
    }

    // 고양이 표정
    if (performance.now() > moodUntil && moodName !== 'normal' && state !== 'result' && state !== 'over') {
      moodName = 'normal';
      cat.material.map = moods.normal;
    }
    if (moodName === 'normal' && poopClose) cat.material.map = moods.worried;
    else if (moodName === 'normal' && cat.material.map !== moods.normal) cat.material.map = moods.normal;

    // 배경 움직임
    clouds.forEach((c) => {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 24) c.position.x = -24;
    });
    flags.forEach((f, i) => { f.rotation.z = Math.sin(t * 1.6 + i * 0.7) * 0.12; });

    // 카메라 (살짝 흔들리는 시선)
    camera.position.set(
      cam.baseX + player.x * 0.12 + cam.shakeX,
      cam.baseY + cam.shakeY,
      cam.z
    );
    camTarget.set(player.x * 0.05, 3.5, 0);
    camera.lookAt(camTarget);

    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(tick);
}

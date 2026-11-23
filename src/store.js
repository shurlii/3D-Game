import * as THREE from 'three';
import { INGREDIENTS, RECIPES, RECIPE_BY_ID, CAT_TYPES, CURRENCY, mat, mesh } from './data.js';
import { createWorld } from './env.js';
import { createSparks, floatText, floatTextAtScreen, haptic, buzz, REDUCED } from './fx.js';

const gsap = window.gsap;
const $ = (id) => document.getElementById(id);

const SEATS = 3;
const CUST_Y = 2.0;            // 손님 고양이 높이
const CUST_Z = -2.7;           // 손님 고양이 위치(카운터 뒤)
const DEBUG_PATIENCE = Number(new URLSearchParams(window.location.search).get('patience')) || 0; // 확인용: ?patience=8
const PATIENCE = DEBUG_PATIENCE || 60;   // 1분 넘게 기다리면 화나서 떠나요
const WORRY_AT = PATIENCE / 3;
const ANGRY_AT = PATIENCE * 0.58;
const ING_BY_ID = Object.fromEntries(INGREDIENTS.map((d) => [d.id, d]));

const sumValues = (m) => Object.values(m).reduce((a, b) => a + b, 0);
const sameMap = (a, b) => {
  const ka = Object.keys(a).filter((k) => a[k] > 0);
  const kb = Object.keys(b).filter((k) => b[k] > 0);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
};

// 파티시에 고양이 (뒷모습)
function buildChef() {
  const g = new THREE.Group();
  const orange = mat(0xffa24d), dark = mat(0xe07a1f), cream = mat(0xfff3dc), white = mat(0xffffff), pink = mat(0xff8fb1), silver = mat(0xcfd4dc, { metalness: 0.4, roughness: 0.35 });

  const body = mesh(new THREE.SphereGeometry(1, 28, 20), orange, 0, 1.15, 0);
  body.scale.set(1.0, 1.15, 0.9);
  g.add(body);
  [0.78, 1.15, 1.52].forEach((y, i) => {
    const s = mesh(new THREE.SphereGeometry(1, 10, 8), dark, (i - 1) * 0.04, y, 0.8);
    s.scale.set(0.42 - i % 2 * 0.08, 0.07, 0.12);
    g.add(s);
  });
  const band = mesh(new THREE.TorusGeometry(0.97, 0.07, 10, 32), white, 0, 1.0, 0);
  band.rotation.x = Math.PI / 2;
  band.scale.set(1, 0.92, 1);
  g.add(band);
  const bowL = mesh(new THREE.ConeGeometry(0.2, 0.5, 4), pink, -0.3, 1.0, 0.95);
  bowL.rotation.z = Math.PI / 2;
  const bowR = mesh(new THREE.ConeGeometry(0.2, 0.5, 4), pink, 0.3, 1.0, 0.95);
  bowR.rotation.z = -Math.PI / 2;
  g.add(bowL, bowR, mesh(new THREE.SphereGeometry(0.13, 12, 10), pink, 0, 1.0, 0.97));

  const head = new THREE.Group();
  head.position.set(0, 2.55, 0);
  const skull = mesh(new THREE.SphereGeometry(0.9, 28, 20), orange);
  skull.scale.set(1.14, 1.0, 1.0);
  head.add(skull);
  [-0.55, 0.55].forEach((x) => {
    const ear = mesh(new THREE.ConeGeometry(0.3, 0.55, 4), orange, x, 0.78, -0.05);
    ear.rotation.z = -x * 0.7;
    head.add(ear);
    const inner = mesh(new THREE.ConeGeometry(0.17, 0.35, 4), pink, x * 1.02, 0.75, 0.16);
    inner.rotation.z = -x * 0.7;
    head.add(inner);
  });
  [-0.28, 0, 0.28].forEach((x, i) => {
    const s = mesh(new THREE.SphereGeometry(1, 8, 6), dark, x, 0.28 - (i === 1 ? 0.04 : 0), 0.88);
    s.scale.set(0.07, 0.22, 0.05);
    head.add(s);
  });
  const hat = new THREE.Group();
  hat.position.set(0, 0.82, 0);
  hat.add(mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.34, 24), white, 0, 0, 0));
  hat.add(mesh(new THREE.SphereGeometry(0.58, 20, 14), white, 0, 0.5, 0));
  [[-0.42, 0.42, 0], [0.42, 0.42, 0], [0, 0.45, 0.4], [0, 0.45, -0.4]].forEach(([x, y, z]) => hat.add(mesh(new THREE.SphereGeometry(0.38, 16, 12), white, x, y, z)));
  hat.add(mesh(new THREE.CylinderGeometry(0.665, 0.665, 0.07, 24), pink, 0, -0.1, 0));
  head.add(hat);
  g.add(head);

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0.25, 0.7, 0.7);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.35, -0.1, 0.45), new THREE.Vector3(0.85, 0.25, 0.55), new THREE.Vector3(1.05, 0.85, 0.3)]);
  tailPivot.add(mesh(new THREE.TubeGeometry(curve, 20, 0.15, 10), orange));
  tailPivot.add(mesh(new THREE.SphereGeometry(0.17, 12, 10), dark, 1.05, 0.88, 0.3));
  g.add(tailPivot);

  [-0.45, 0.45].forEach((x) => {
    const f = mesh(new THREE.SphereGeometry(0.3, 14, 10), cream, x, 0.2, 0.18);
    f.scale.set(1, 0.7, 1.35);
    g.add(f);
  });

  const armL = mesh(new THREE.CapsuleGeometry(0.17, 0.5, 6, 12), orange, -1.0, 1.5, 0.05);
  armL.rotation.z = 0.45;
  g.add(armL);

  const armR = new THREE.Group();
  armR.position.set(0.95, 1.75, 0);
  const upper = mesh(new THREE.CapsuleGeometry(0.17, 0.5, 6, 12), orange, 0.25, 0.3, -0.1);
  upper.rotation.z = -0.9;
  armR.add(upper);
  const whisk = new THREE.Group();
  whisk.position.set(0.62, 0.78, -0.12);
  whisk.rotation.z = -0.25;
  whisk.add(mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.5, 10), silver, 0, 0, 0));
  for (let i = 0; i < 4; i += 1) {
    const w = mesh(new THREE.TorusGeometry(0.17, 0.014, 6, 20), silver, 0, 0.5, 0);
    w.scale.set(0.5, 1.5, 1);
    w.rotation.y = (i * Math.PI) / 4;
    whisk.add(w);
  }
  armR.add(whisk);
  g.add(armR);

  return { group: g, head, tail: tailPivot, armR, whisk, hat };
}

// 오븐
function buildOven() {
  const g = new THREE.Group();
  const bodyMat = mat(0x3a3b44);
  g.add(mesh(new THREE.BoxGeometry(2.5, 2.2, 1.7), bodyMat, 0, 1.2, 0));
  g.add(mesh(new THREE.BoxGeometry(2.62, 0.16, 1.82), mat(0x575966), 0, 2.38, 0));
  [-0.95, 0.95].forEach((x) => g.add(mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.2, 10), mat(0x2a2b32), x, 0.1, 0.65)));
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x3a2418 });
  const glow = mesh(new THREE.PlaneGeometry(1.7, 1.15), glowMat, 0, 1.15, 0.86);
  g.add(glow);
  const tray = mesh(new THREE.BoxGeometry(1.5, 0.06, 0.1), mat(0x9a9ca8), 0, 0.85, 0.87);
  g.add(tray);
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.5, 0.9);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x24262c, transparent: true, opacity: 0.55, roughness: 0.2 });
  hinge.add(mesh(new THREE.BoxGeometry(1.95, 1.4, 0.1), doorMat, 0, 0.7, 0));
  hinge.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.6, 10), mat(0xc9ccd6), 0, 1.5, 0.1)).children[1].rotation.z = Math.PI / 2;
  g.add(hinge);
  const knobColors = [0xff8fa8, 0xffe27a, 0x9ad0ff];
  knobColors.forEach((c, i) => {
    const k = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 14), mat(c), (i - 1) * 0.6, 2.0, 0.88);
    k.rotation.x = Math.PI / 2;
    g.add(k);
  });
  return { group: g, glowMat, door: hinge };
}

export function createStore({ renderer, state, icons, catTexture, foodTexture, iconTexture, save, hooks }) {
  const scene = new THREE.Scene();
  const world = createWorld(scene, { awningZ: -5, awningY: 7.4 });
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 90);
  const burst = createSparks(scene, 64);
  const cam = { z: 11, halfVis: 5 };
  let visible = false;
  let paused = false;
  let isOpen = false;
  let busy = false;
  let ready = false;

  // 카운터
  const counter = new THREE.Group();
  counter.position.set(0, 0, -1.7);
  counter.add(mesh(new THREE.BoxGeometry(22, 1.1, 1.2), mat(0xd9a066), 0, 0.55, 0));
  counter.add(mesh(new THREE.BoxGeometry(22.3, 0.14, 1.5), mat(0xfff6ea), 0, 1.17, 0.05));
  scene.add(counter);

  // 영업 팻말
  function signTexture(text, bg) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, 256, 128);
    x.strokeStyle = '#fff'; x.lineWidth = 10; x.strokeRect(5, 5, 246, 118);
    x.fillStyle = '#fff'; x.font = 'bold 54px "Jua", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 128, 68);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const signClosed = signTexture('CLOSED', '#b9a7a0');
  const signOpen = signTexture('OPEN', '#ff7aa0');
  const sign = new THREE.Group();
  const signFace = mesh(new THREE.PlaneGeometry(2.0, 1.0), new THREE.MeshBasicMaterial({ map: signClosed, side: THREE.DoubleSide }));
  sign.add(signFace);
  sign.position.set(2, 1.9, -1.7);
  sign.scale.setScalar(0.6);
  scene.add(sign);

  // 파티시에와 오븐
  const chef = buildChef();
  chef.group.position.set(0, 0, 3.0);
  chef.group.scale.setScalar(1);
  scene.add(chef.group);
  const oven = buildOven();
  oven.group.position.set(-3.6, 0, 2.8);
  scene.add(oven.group);
  let ovenGlow = 0;
  let whiskFast = 0;

  // 연기
  const puffTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const puffs = [];
  for (let i = 0; i < 16; i += 1) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false, opacity: 0 }));
    s.visible = false;
    scene.add(s);
    puffs.push(s);
  }
  function steam(n = 1) {
    for (let k = 0; k < n; k += 1) {
      const s = puffs.find((p) => !p.visible);
      if (!s) return;
      const o = oven.group.position;
      const sc = oven.group.scale.x;
      s.visible = true;
      s.material.opacity = 0.8;
      s.position.set(o.x + (Math.random() - 0.5) * 1.6 * sc, o.y + 2.5 * sc, o.z + 0.3);
      s.scale.setScalar(0.5 * sc);
      gsap.to(s.position, { y: s.position.y + 1.8 * sc, x: s.position.x + (Math.random() - 0.5) * 0.8, duration: 1.4, ease: 'power1.out' });
      gsap.to(s.scale, { x: 1.5 * sc, y: 1.5 * sc, duration: 1.4 });
      gsap.to(s.material, { opacity: 0, duration: 1.4, ease: 'power1.in', onComplete: () => { s.visible = false; } });
    }
  }

  // 손님 고양이
  const seatX = [-2.7, 0, 2.7];
  const customers = Array(SEATS).fill(null);
  const seatTimer = Array(SEATS).fill(3);
  let seatHalfVis = 5;
  const custLayer = $('custLayer');
  let day = null;
  const newDay = () => ({ revenue: 0, gross: 0, penalty: 0, sold: {}, served: 0, missed: 0, openedAt: Date.now() });

  function pickCatType() {
    const used = new Set(customers.filter(Boolean).map((c) => c.type));
    const free = CAT_TYPES.filter((t) => !used.has(t));
    const list = free.length ? free : CAT_TYPES;
    return list[Math.floor(Math.random() * list.length)];
  }

  function makeCustomer(seat) {
    const recipe = RECIPES[Math.floor(Math.random() * RECIPES.length)];
    const r = Math.random();
    const qty = r < 0.4 ? 1 : r < 0.8 ? 2 : 3;
    const type = pickCatType();
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: catTexture(type, 'normal'), transparent: true, alphaTest: 0.05 }));
    sprite.scale.set(1.9, 2.5, 1);
    const startX = (seat === 2 ? 1 : seat === 0 ? -1 : (Math.random() < 0.5 ? -1 : 1)) * (seatHalfVis + 2);
    sprite.position.set(startX, CUST_Y, CUST_Z);
    scene.add(sprite);
    const el = document.createElement('div');
    el.className = 'cust';
    el.innerHTML = '<div class="bubble"><div class="b-top"><img class="b-food" alt=""><span class="b-qty"></span></div><div class="b-need"></div><div class="gauge"><i></i></div></div><div class="hit"></div>';
    custLayer.appendChild(el);
    const c = { seat, type, recipe, qty, remaining: qty, age: 0, mood: 'normal', sprite, el, phase: Math.random() * 6, status: 'arriving', say: 0 };
    el.querySelector('.b-food').src = recipe.img;
    el.querySelector('.b-qty').textContent = `×${qty}`;
    el.querySelector('.b-need').innerHTML = Object.entries(recipe.needs)
      .map(([id, n]) => `<span class="need">${`<img alt="" src="${icons[id]}">`.repeat(n)}</span>`).join('');
    el.querySelector('.bubble').style.opacity = '0';
    el.addEventListener('click', () => tapCustomer(c));
    c.sprite.userData.targetX = seatX[seat];
    gsap.to(sprite.position, { x: seatX[seat], duration: 1.3, ease: 'power1.out', onComplete: () => {
      if (c.status !== 'arriving') return;
      c.status = 'waiting';
      gsap.fromTo(el.querySelector('.bubble'), { scale: 0.3, opacity: 0, transformOrigin: '50% 100%' }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.2)' });
      haptic(10);
    } });
    return c;
  }

  function sayText(c, text, seconds, cls = '') {
    const b = c.el.querySelector('.bubble');
    b.classList.add('say');
    b.classList.toggle('bad', cls === 'bad');
    b.dataset.old = b.innerHTML;
    b.innerHTML = `<div class="say-text">${text}</div>`;
    gsap.fromTo(b, { scale: 0.7 }, { scale: 1, duration: 0.35, ease: 'back.out(2.5)', transformOrigin: '50% 100%' });
    c.say = seconds;
  }

  function removeCustomer(c) {
    customers[c.seat] = null;
    seatTimer[c.seat] = 4 + Math.random() * 4;
    scene.remove(c.sprite);
    c.el.remove();
  }

  function leave(c, kind) {
    if (c.status === 'leaving') return;
    c.status = 'leaving';
    gsap.killTweensOf(c.sprite.position);
    const dir = c.sprite.position.x >= 0 ? 1 : -1;
    const outX = dir * (seatHalfVis + 3);
    const spr = c.sprite;
    if (kind === 'happy') {
      spr.material.map = catTexture(c.type, 'happy');
      sayText(c, '감사합니다<br>많이 파세요!', 1.5);
      gsap.to(spr.position, { y: spr.position.y + 0.45, duration: 0.2, yoyo: true, repeat: 3, ease: 'power1.out' });
      burst(spr.position.clone().add(new THREE.Vector3(0, 0.6, 0.5)), 0xff9fb8, 12);
      gsap.to(spr.position, { x: outX, duration: 1.1, delay: 1.5, ease: 'power1.in', onComplete: () => removeCustomer(c) });
    } else if (kind === 'angry') {
      spr.material.map = catTexture(c.type, 'angry');
      sayText(c, '장사 그따위로<br>하지마!', 1.4, 'bad');
      const penalty = c.recipe.price * c.remaining;
      state.wallet = Math.max(0, state.wallet - penalty);
      day.revenue -= penalty;
      day.penalty += penalty;
      day.missed += 1;
      hooks.onWallet();
      save();
      floatText(camera, spr.position.clone().add(new THREE.Vector3(0, 1.6, 0.5)), `-${penalty} ${CURRENCY}`, 'bad');
      haptic([90, 50, 90]);
      buzz(1.3);
      if (!REDUCED) gsap.to(spr.position, { x: `+=${0.12}`, duration: 0.05, yoyo: true, repeat: 15 });
      gsap.to(spr.position, { x: outX, duration: 0.9, delay: 1.5, ease: 'power2.in', onComplete: () => removeCustomer(c) });
    } else {
      c.el.querySelector('.bubble').style.opacity = '0';
      gsap.to(spr.position, { x: outX, duration: 1.0, ease: 'power1.in', onComplete: () => removeCustomer(c) });
    }
  }

  // 손님 말풍선을 누르면: 만들어 둔 게 있으면 건네고, 없으면 재료를 넣어서 구워요
  function tapCustomer(c) {
    if (paused || c.status !== 'waiting') return;
    const have = state.goods[c.recipe.id] || 0;
    if (have > 0) { serve(c); return; }
    if (busy) { hooks.toast('지금 굽고 있어요!'); return; }
    clearBowl(true);
    const needs = c.recipe.needs;
    const lacking = Object.entries(needs).filter(([id, n]) => (state.inventory[id] || 0) < n);
    if (lacking.length) {
      const msg = lacking.map(([id, n]) => `${ING_BY_ID[id].name} ${n - (state.inventory[id] || 0)}개`).join(', ');
      hooks.toast(`재료가 부족해요: ${msg}`);
      hooks.onNeed();
      gsap.fromTo(c.el.querySelector('.bubble'), { x: -6 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
      haptic([20, 30, 20]);
      return;
    }
    Object.entries(needs).forEach(([id, n]) => { state.inventory[id] -= n; bowl[id] = (bowl[id] || 0) + n; });
    refreshShelf();
    refreshBowl();
    bake(c.recipe);
  }

  function serveFromGoods(recipeId) {
    if (paused) return;
    const waiting = customers.filter((c) => c && c.status === 'waiting' && c.recipe.id === recipeId).sort((a, b) => b.age - a.age);
    if (!waiting.length) { hooks.toast('이 메뉴를 기다리는 손님이 없어요'); return; }
    serve(waiting[0]);
  }

  function screenToWorld(sx, sy, planeZ) {
    const p = new THREE.Vector3((sx / window.innerWidth) * 2 - 1, -(sy / window.innerHeight) * 2 + 1, 0.5).unproject(camera);
    const dir = p.sub(camera.position).normalize();
    return camera.position.clone().add(dir.multiplyScalar((planeZ - camera.position.z) / dir.z));
  }
  function foodSprite(recipeId, size = 1.1) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: foodTexture(recipeId), transparent: true, alphaTest: 0.05 }));
    s.scale.set(size, size, 1);
    scene.add(s);
    return s;
  }
  function arc(obj, to, dur, peak = 1.2, delay = 0, onComplete) {
    gsap.to(obj.position, { x: to.x, z: to.z, duration: dur, delay, ease: 'power1.inOut' });
    gsap.to(obj.position, { y: Math.max(obj.position.y, to.y) + peak, duration: dur * 0.5, delay, ease: 'power2.out' });
    gsap.to(obj.position, { y: to.y, duration: dur * 0.5, delay: delay + dur * 0.5, ease: 'power2.in', onComplete });
  }

  function serve(c) {
    const id = c.recipe.id;
    const n = Math.min(state.goods[id] || 0, c.remaining);
    if (n <= 0) return;
    state.goods[id] -= n;
    c.remaining -= n;
    const money = n * c.recipe.price;
    state.wallet += money;
    day.revenue += money;
    day.gross += money;
    day.served += n;
    day.sold[id] = (day.sold[id] || 0) + n;
    hooks.onWallet();
    refreshGoods();
    save();
    const goodEl = document.querySelector(`.good[data-id="${id}"]`);
    const r = goodEl ? goodEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight - 100, width: 0, height: 0 };
    const from = screenToWorld(r.left + r.width / 2, r.top + r.height / 2, 2.5);
    const target = c.sprite.position.clone().add(new THREE.Vector3(0, 0.3, 0.6));
    for (let i = 0; i < n; i += 1) {
      const s = foodSprite(id, 1.0);
      s.position.copy(from);
      arc(s, target, 0.55, 1.6, i * 0.14, () => {
        scene.remove(s);
        burst(target, 0xffd1e0, 8);
      });
    }
    gsap.delayedCall(0.55 + (n - 1) * 0.14, () => {
      if (c.status === 'leaving') return;
      c.sprite.material.map = catTexture(c.type, 'happy');
      gsap.fromTo(c.sprite.position, { y: CUST_Y }, { y: CUST_Y + 0.45, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.out' });
      floatText(camera, c.sprite.position.clone().add(new THREE.Vector3(0, 1.3, 0.6)), `+${money} ${CURRENCY}`);
      burst(c.sprite.position.clone().add(new THREE.Vector3(0, 0.8, 0.6)), 0xffe27a, 10);
      haptic([15, 25, 30]);
      buzz(0.8);
      if (c.remaining <= 0) leave(c, 'happy');
      else updateBubble(c);
    });
  }

  function updateBubble(c) {
    c.el.querySelector('.b-qty').textContent = `×${c.remaining}`;
    gsap.fromTo(c.el.querySelector('.b-qty'), { scale: 1.5 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
  }

  // 재료 그릇
  let bowl = {};
  const shelfEl = $('shelf');
  const goodsEl = $('goods');
  const bowlEl = $('bowl');
  const bowlIcons = $('bowlIcons');
  const bakeBtn = $('bakeBtn');

  function buildShelf() {
    shelfEl.innerHTML = '';
    INGREDIENTS.forEach((d) => {
      const col = document.createElement('button');
      col.type = 'button';
      col.className = 'col';
      col.dataset.id = d.id;
      col.setAttribute('aria-label', `${d.name} 넣기`);
      col.innerHTML = '<div class="stack"></div><span class="cnt">0</span>';
      col.addEventListener('click', () => addToBowl(d.id, col));
      shelfEl.appendChild(col);
    });
  }
  function refreshShelf() {
    INGREDIENTS.forEach((d) => {
      const col = shelfEl.querySelector(`[data-id="${d.id}"]`);
      const n = state.inventory[d.id] || 0;
      col.classList.toggle('empty', n === 0);
      col.querySelector('.cnt').textContent = String(n);
      const stack = col.querySelector('.stack');
      const show = Math.min(n, 4);
      if (stack.childElementCount !== show) stack.innerHTML = `<img alt="" src="${icons[d.id]}">`.repeat(show);
    });
  }
  function refreshGoods() {
    goodsEl.innerHTML = '';
    RECIPES.forEach((r) => {
      const n = state.goods[r.id] || 0;
      if (!n) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'good';
      b.dataset.id = r.id;
      b.setAttribute('aria-label', `${r.name} ${n}개, 손님에게 건네기`);
      b.innerHTML = `<img alt="" src="${r.img}"><span>${n}</span>`;
      b.addEventListener('click', () => serveFromGoods(r.id));
      goodsEl.appendChild(b);
    });
  }
  function bowlStatus() {
    const match = RECIPES.find((r) => sameMap(r.needs, bowl));
    const fits = RECIPES.some((r) => Object.keys(bowl).every((k) => (bowl[k] || 0) <= (r.needs[k] || 0)));
    return { match, fits };
  }
  function refreshBowl() {
    const total = sumValues(bowl);
    bowlEl.classList.toggle('on', total > 0);
    bowlIcons.innerHTML = INGREDIENTS.map((d) => (bowl[d.id] ? `<img alt="" src="${icons[d.id]}">`.repeat(bowl[d.id]) : '')).join('');
    const { match, fits } = bowlStatus();
    bakeBtn.hidden = !match;
    if (match) bakeBtn.innerHTML = `<img alt="" src="${match.img}"> ${match.name} 굽기!`;
    $('bowlMsg').textContent = total === 0 ? '' : match ? '' : fits ? '레시피를 맞추는 중...' : '이 조합은 레시피에 없어요. 비워 보세요';
    $('bowlMsg').classList.toggle('bad', total > 0 && !fits);
  }
  function addToBowl(id, el) {
    if (paused || busy) return;
    if (!(state.inventory[id] > 0)) {
      hooks.toast(`${ING_BY_ID[id].name}이(가) 없어요`);
      hooks.onNeed();
      if (el) gsap.fromTo(el, { x: -4 }, { x: 0, duration: 0.35, ease: 'elastic.out(1, 0.3)' });
      return;
    }
    state.inventory[id] -= 1;
    bowl[id] = (bowl[id] || 0) + 1;
    haptic(8);
    refreshShelf();
    refreshBowl();
    const last = bowlIcons.lastElementChild;
    if (last) gsap.fromTo(last, { scale: 0, y: 16 }, { scale: 1, y: 0, duration: 0.3, ease: 'back.out(3)' });
  }
  function clearBowl(silent = false) {
    Object.entries(bowl).forEach(([id, n]) => { state.inventory[id] = (state.inventory[id] || 0) + n; });
    bowl = {};
    refreshShelf();
    refreshBowl();
    if (!silent) save();
  }
  $('clearBtn').addEventListener('click', () => { if (!busy) clearBowl(); });
  bakeBtn.addEventListener('click', () => { const m = bowlStatus().match; if (m && !busy && !paused) bake(m); });

  // 굽기: 재료가 오븐으로 → 김이 모락모락 → 짠! (약 2초)
  function bake(recipe) {
    if (busy) return;
    busy = true;
    const list = [];
    Object.entries(bowl).forEach(([id, n]) => { for (let i = 0; i < n; i += 1) list.push(id); });
    const br = bowlEl.getBoundingClientRect();
    const from = screenToWorld(br.left + br.width / 2, br.top + br.height / 2, 3);
    bowl = {};
    refreshBowl();
    save();
    const op = oven.group.position;
    const os = oven.group.scale.x;
    const mouth = new THREE.Vector3(op.x, 1.3 * os, op.z + 1.0);
    const tl = gsap.timeline({ onComplete: () => { busy = false; } });
    tl.to(oven.door.rotation, { x: 1.35, duration: 0.2, ease: 'power2.out' }, 0);
    tl.to(chef.group.rotation, { y: -0.45, duration: 0.25, ease: 'power2.out' }, 0);
    tl.call(() => { whiskFast = 1; }, null, 0);
    list.slice(0, 9).forEach((id, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTexture(id), transparent: true }));
      s.scale.set(0.8, 0.8, 1);
      s.position.copy(from).add(new THREE.Vector3((i - 4) * 0.25, 0, 0));
      scene.add(s);
      arc(s, mouth, 0.45, 1.8, 0.1 + i * 0.06, () => {
        scene.remove(s);
        burst(mouth, ING_BY_ID[id].color, 3, 0.5);
        gsap.fromTo(oven.group.scale, { y: os * 0.96 }, { y: os, duration: 0.2 });
      });
    });
    tl.to(oven.door.rotation, { x: 0, duration: 0.2, ease: 'power2.in' }, 0.75);
    tl.to({}, { duration: 0.8, onUpdate() { ovenGlow = Math.min(1, ovenGlow + 0.08); if (Math.random() < 0.5) steam(1); } }, 0.8);
    tl.call(() => { ovenGlow = 1; haptic(15); }, null, 0.85);
    if (!REDUCED) tl.to(oven.group.position, { x: op.x + 0.05, duration: 0.05, yoyo: true, repeat: 15, ease: 'none' }, 0.85);
    tl.call(() => {
      // 짠!
      steam(5);
      ovenGlow = 0;
      whiskFast = 0;
      burst(mouth.clone().add(new THREE.Vector3(0, 0.6, 0)), 0xffe27a, 16, 1.2);
      burst(mouth.clone().add(new THREE.Vector3(0, 0.6, 0)), 0xff9fb8, 10, 1.2);
      floatText(camera, mouth.clone().add(new THREE.Vector3(0, 1.6, 0)), '짠!', '');
      haptic([20, 30, 50]);
      buzz(1);
      const food = foodSprite(recipe.id, 0.1);
      food.position.copy(mouth).add(new THREE.Vector3(0, 0.3, 0));
      gsap.to(food.scale, { x: 1.7, y: 1.7, duration: 0.45, ease: 'elastic.out(1, 0.4)' });
      gsap.to(food.position, { y: mouth.y + 1.1, duration: 0.45, ease: 'power2.out' });
      gsap.to(chef.group.position, { y: 0.35, duration: 0.15, yoyo: true, repeat: 1, ease: 'power1.out' });
      gsap.to(chef.group.rotation, { y: 0, duration: 0.35, delay: 0.1, ease: 'power2.out' });
      const gr = goodsEl.getBoundingClientRect();
      const dest = screenToWorld(gr.left + Math.min(gr.width, 60) / 2 + 20, gr.top + 25, 2.5);
      gsap.delayedCall(0.75, () => {
        arc(food, dest, 0.45, 1.2, 0, () => {
          scene.remove(food);
          state.goods[recipe.id] = (state.goods[recipe.id] || 0) + 1;
          save();
          refreshGoods();
          const g = goodsEl.querySelector(`[data-id="${recipe.id}"]`);
          if (g) gsap.fromTo(g, { scale: 1.45 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
        });
        gsap.to(food.scale, { x: 0.8, y: 0.8, duration: 0.45 });
      });
    }, null, 1.65);
    tl.to({}, { duration: 0.01 }, 2.05); // 굽기는 약 2초
    tl.call(() => {}, null, 2.4);
  }

  // 영업 시작 / 종료
  function setSign(open) {
    gsap.to(sign.rotation, { y: Math.PI / 2, duration: 0.18, ease: 'power1.in', onComplete: () => {
      signFace.material.map = open ? signOpen : signClosed;
      gsap.to(sign.rotation, { y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    } });
  }
  function open() {
    if (isOpen) return;
    isOpen = true;
    day = newDay();
    seatTimer.fill(0).forEach((_, i) => { seatTimer[i] = 1.2 + i * 1.8; });
    setSign(true);
    haptic([15, 25, 15]);
    hooks.onOpenChange(true);
  }
  function close() {
    if (!isOpen) return null;
    isOpen = false;
    customers.forEach((c) => { if (c) leave(c, 'quiet'); });
    setSign(false);
    const d = day;
    const record = {
      at: new Date().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      revenue: d.revenue, gross: d.gross, penalty: d.penalty, served: d.served, missed: d.missed, sold: d.sold,
    };
    state.history.unshift(record);
    state.history = state.history.slice(0, 10);
    state.lifetime += Math.max(0, d.revenue);
    day = null;
    save();
    hooks.onOpenChange(false);
    return record;
  }

  // 화면 배치
  function resize(aspect) {
    camera.aspect = aspect;
    cam.z = aspect < 1 ? 12.5 + (1 - aspect) * 9 : 12.5;
    const tan = Math.tan(THREE.MathUtils.degToRad(22.5));
    cam.halfVis = (cam.z - 3.0) * tan * aspect;       // 파티시에 위치에서 화면 가로 절반
    seatHalfVis = (cam.z - CUST_Z) * tan * aspect;       // 손님 위치에서 화면 가로 절반
    const sx = THREE.MathUtils.clamp(seatHalfVis * 0.64, 1.5, 3.4);
    seatX[0] = -sx; seatX[1] = 0; seatX[2] = sx;
    sign.position.x = sx * 0.5;
    const ox = Math.min(3.6, cam.halfVis - 1.15);
    oven.group.position.x = -ox;
    const sc = THREE.MathUtils.clamp((cam.halfVis - 0.3) / 3.4, 0.6, 0.85);
    oven.group.scale.setScalar(sc);
    chef.group.scale.setScalar(THREE.MathUtils.clamp(0.45 + cam.halfVis * 0.1, 0.62, 0.8));
    camera.updateProjectionMatrix();
    customers.forEach((c) => { if (c && c.status === 'waiting') c.sprite.position.x = seatX[c.seat]; });
  }

  const camTarget = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  function update(dt, t) {
    world.update(dt, t);
    // 파티시에: 가만히 있어도 살랑살랑
    chef.group.position.y += (0 - chef.group.position.y) * 0.2;
    chef.group.position.y += Math.sin(t * 2.2) * 0.0035;
    chef.tail.rotation.z = Math.sin(t * 3) * 0.3;
    chef.tail.rotation.y = Math.sin(t * 1.5) * 0.15;
    chef.head.rotation.z = Math.sin(t * 1.3) * 0.05;
    chef.head.rotation.y = Math.sin(t * 0.7) * 0.08;
    chef.armR.rotation.z = Math.sin(t * (5 + whiskFast * 20)) * (0.1 + whiskFast * 0.2);
    chef.armR.rotation.x = Math.cos(t * (5 + whiskFast * 20)) * (0.08 + whiskFast * 0.15);
    chef.whisk.rotation.x = Math.sin(t * 9) * 0.2;
    // 오븐 불빛
    ovenGlow = Math.max(0, ovenGlow - dt * 0.15);
    const g = busy ? ovenGlow : 0;
    oven.glowMat.color.setRGB(0.23 + g * 0.77, 0.14 + g * 0.45, 0.1 + g * 0.1);
    if (isOpen && Math.random() < dt * 0.4) steam(1);
    sign.rotation.z = Math.sin(t * 1.4) * 0.05;

    if (!visible) return;

    // 손님
    if (isOpen && !paused) {
      customers.forEach((c, i) => {
        if (!c) {
          seatTimer[i] -= dt;
          if (seatTimer[i] <= 0) customers[i] = makeCustomer(i);
          return;
        }
        if (c.status !== 'waiting') return;
        c.age += dt;
        const mood = c.age < WORRY_AT ? 'normal' : c.age < ANGRY_AT ? 'worried' : 'angry';
        if (mood !== c.mood) {
          c.mood = mood;
          c.sprite.material.map = catTexture(c.type, mood);
          if (mood !== 'normal') gsap.fromTo(c.sprite.position, { y: CUST_Y }, { y: CUST_Y + 0.25, duration: 0.12, yoyo: true, repeat: 1 });
        }
        const left = Math.max(0, 1 - c.age / PATIENCE);
        const gauge = c.el.querySelector('.gauge i');
        if (gauge) {
          gauge.style.width = `${left * 100}%`;
          gauge.className = mood === 'angry' ? 'bad' : mood === 'worried' ? 'warn' : '';
        }
        if (c.age >= PATIENCE) leave(c, 'angry');
      });
    }
    customers.forEach((c) => {
      if (!c) return;
      if (c.say > 0) c.say -= dt;
      if (c.status === 'waiting') {
        c.sprite.position.y = CUST_Y + Math.abs(Math.sin(t * 2 + c.phase)) * 0.05 + (c.mood === 'angry' ? Math.abs(Math.sin(t * 14)) * 0.05 : 0);
        c.sprite.material.rotation = Math.sin(t * 1.6 + c.phase) * 0.04;
      }
      // DOM 위치
      tmp.set(c.sprite.position.x, CUST_Y, CUST_Z).project(camera); // 말풍선은 흔들리지 않게 기준 높이에 고정
      const sx = (tmp.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-tmp.y * 0.5 + 0.5) * window.innerHeight;
      const top = new THREE.Vector3(c.sprite.position.x, CUST_Y + 1.25, CUST_Z).project(camera);
      const h = Math.abs(((-top.y * 0.5 + 0.5) * window.innerHeight) - sy) * 2;
      c.el.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
      c.el.style.setProperty('--h', `${h}px`);
    });

    camera.position.set(0, 9, cam.z);
    camTarget.set(0, 1.2, -1.5);
    camera.lookAt(camTarget);
  }

  buildShelf();
  refreshShelf();
  refreshGoods();
  refreshBowl();
  ready = true;

  return {
    scene, camera, resize, update, open, close,
    isOpen: () => isOpen,
    getDay: () => day,
    show() { visible = true; $('storeUI').hidden = false; refreshShelf(); refreshGoods(); },
    hide() { visible = false; $('storeUI').hidden = true; },
    setPaused(v) { paused = v; },
    refresh() { refreshShelf(); refreshGoods(); },
    isBusy: () => busy,
    cancelBowl() { if (!busy) clearBowl(true); },
    ready: () => ready,
  };
}

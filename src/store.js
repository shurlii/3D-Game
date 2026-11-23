import * as THREE from 'three';
import { INGREDIENTS, RECIPES, RECIPE_BY_ID, CAT_TYPES, CURRENCY, mat, mesh } from './data.js';
import { createWorld } from './env.js';
import { createCat } from './cat.js';
import { createSparks, floatText, floatTextAtScreen, haptic, buzz, REDUCED } from './fx.js';

const gsap = window.gsap;
const $ = (id) => document.getElementById(id);

const SEATS = 3;
const CUST_Y = 2.3;            // 손님 머리 높이(말풍선 기준)
const CUST_BASE = 0.78;        // 손님 고양이 몸 높이(앞발이 카운터 위에 놓이게)
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

export function createStore({ renderer, state, icons, foodTexture, iconTexture, save, hooks }) {
  const scene = new THREE.Scene();
  const world = createWorld(scene, { awningZ: -5, awningY: 7.4 });
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 90);
  const burst = createSparks(scene, 64);
  const cam = { z: 11, halfVis: 5, focus: 0 };
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

  // 현수막 (대롱대롱 매달려 있어요)
  const bannerTex = (() => {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 300;
    const x = c.getContext('2d');
    x.fillStyle = '#fff6ea';
    x.beginPath(); x.roundRect(8, 8, 1008, 284, 54); x.fill();
    x.lineWidth = 14; x.strokeStyle = '#ff8fab'; x.stroke();
    x.setLineDash([2, 34]); x.lineCap = 'round'; x.lineWidth = 10; x.strokeStyle = '#ffd1e0';
    x.beginPath(); x.roundRect(34, 34, 956, 232, 36); x.stroke();
    x.setLineDash([]);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.font = '48px "Jua", sans-serif';
    x.fillStyle = '#f06b8e';
    x.fillText('M E O W   B A K E R Y', 512, 76);
    let fs = 112;
    x.font = `${fs}px "Jua", sans-serif`;
    const tw = x.measureText('Butter Late Than Never').width;
    if (tw > 880) { fs = Math.floor(fs * 880 / tw); x.font = `${fs}px "Jua", sans-serif`; }
    x.lineWidth = 16; x.strokeStyle = '#ffffff';
    x.strokeText('Butter Late Than Never', 512, 184);
    x.fillStyle = '#6b4a3a';
    x.fillText('Butter Late Than Never', 512, 184);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  })();
  const banner = new THREE.Group();
  banner.position.set(0, 6.95, -3.4);
  banner.add(mesh(new THREE.PlaneGeometry(6.4, 1.875), new THREE.MeshBasicMaterial({ map: bannerTex, transparent: true, side: THREE.DoubleSide }), 0, -1.3, 0));
  [-2.5, 2.5].forEach((x) => {
    banner.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 6), mat(0xd9a066), x, -0.17, 0));
    banner.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(0xff8fab), x, 0, 0));
  });
  scene.add(banner);

  // 파티시에 (뒷모습). 거품기를 들고 있고, 영업이 끝나면 앞을 보고 츄르를 먹어요.
  const chefCat = createCat('baker');
  const chef = { group: chefCat.root, head: chefCat.head, tail: chefCat.tail, armR: chefCat.armR, armL: chefCat.armL };
  chefCat.g.position.y = 0.5;
  chef.group.rotation.y = Math.PI;
  chef.group.position.set(0, 0, 3.0);
  scene.add(chef.group);
  const armBase = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(-0.45, 0.75, 0.5).normalize());
  const silver = mat(0xdfe3ea, { metalness: 0.4, roughness: 0.3 });
  const whisk = new THREE.Group();
  whisk.position.set(0, -0.92, 0);
  whisk.add(mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.5, 10), silver, 0, -0.2, 0));
  for (let i = 0; i < 4; i += 1) {
    const w = mesh(new THREE.TorusGeometry(0.17, 0.016, 6, 20), silver, 0, -0.62, 0);
    w.scale.set(0.5, 1.6, 1);
    w.rotation.y = (i * Math.PI) / 4;
    whisk.add(w);
  }
  chef.armR.add(whisk);
  // 츄르 (영업 종료 때)
  const churu = new THREE.Group();
  churu.position.set(0, -0.92, 0);
  churu.visible = false;
  const churuTex = (() => {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#ffd54a'; x.fillRect(0, 0, 128, 256);
    x.fillStyle = '#ff7aa0'; x.fillRect(0, 150, 128, 106);
    x.fillStyle = '#fff'; x.font = '54px "Jua", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('츄르', 64, 110);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const churuBody = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.62, 16), new THREE.MeshStandardMaterial({ map: churuTex, roughness: 0.5 }), 0, -0.1, 0);
  churu.add(churuBody);
  const churuPaste = mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.22, 12), mat(0xffb27a), 0, -0.5, 0);
  churu.add(churuPaste);
  churu.add(mesh(new THREE.SphereGeometry(0.08, 12, 10), mat(0xffb27a), 0, -0.63, 0));
  chef.armR.add(churu);
  let celebrating = 0;       // 0이면 평소, 1이면 영업 종료 장면
  let celebrateFocus = 0;    // 카메라가 파티시에에게 다가가는 정도
  let eating = false;
  let eatTimer = 0;
  const downVec = new THREE.Vector3(0, -1, 0);
  const eatDir = new THREE.Vector3(0.92, 0.36, 0.81).normalize();
  const qEat = new THREE.Quaternion();
  const qWob = new THREE.Quaternion();
  const eul = new THREE.Euler();
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
    const qty = r < 0.7 ? 1 : r < 0.95 ? 2 : 3;   // 대부분 1개만 주문해요
    const type = pickCatType();
    const cat = createCat(type);
    cat.root.scale.setScalar(1.0);
    cat.armL.rotation.set(-1.15, 0, 0.1);
    cat.armR.rotation.set(-1.15, 0, -0.1);
    const startX = (seat === 2 ? 1 : seat === 0 ? -1 : (Math.random() < 0.5 ? -1 : 1)) * (seatHalfVis + 2);
    cat.root.position.set(startX, CUST_BASE, CUST_Z);
    scene.add(cat.root);
    const el = document.createElement('div');
    el.className = 'cust';
    el.innerHTML = '<div class="bubble"><div class="b-top"><img class="b-food" alt=""><span class="b-qty"></span></div><div class="b-need"></div><div class="gauge"><i></i></div></div><div class="hit"></div>';
    custLayer.appendChild(el);
    const c = { seat, type, recipe, qty, remaining: qty, age: 0, mood: 'normal', cat, sprite: cat.root, el, phase: Math.random() * 6, status: 'arriving', say: 0 };
    el.querySelector('.b-food').src = recipe.img;
    el.querySelector('.b-qty').textContent = `×${qty}`;
    el.querySelector('.b-need').innerHTML = Object.entries(recipe.needs)
      .map(([id, n]) => `<span class="need">${`<img alt="" src="${icons[id]}">`.repeat(n)}</span>`).join('');
    el.querySelector('.bubble').style.opacity = '0';
    el.addEventListener('click', () => tapCustomer(c));
    gsap.to(cat.root.position, { x: seatX[seat], duration: 1.3, ease: 'power1.out', onComplete: () => {
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
      c.cat.setMood('happy');
      sayText(c, '감사합니다<br>많이 파세요!', 1.5);
      gsap.to(spr.position, { y: CUST_BASE + 0.45, duration: 0.2, yoyo: true, repeat: 3, ease: 'power1.out' });
      burst(spr.position.clone().add(new THREE.Vector3(0, 1.8, 0.8)), 0xff9fb8, 12);
      gsap.to(spr.position, { x: outX, duration: 1.1, delay: 1.5, ease: 'power1.in', onComplete: () => removeCustomer(c) });
    } else if (kind === 'angry') {
      c.cat.setMood('angry');
      sayText(c, '장사 그따위로<br>하지마!', 1.4, 'bad');
      const penalty = c.recipe.price * c.remaining;
      state.wallet = Math.max(0, state.wallet - penalty);
      day.revenue -= penalty;
      day.penalty += penalty;
      day.missed += 1;
      hooks.onWallet();
      save();
      floatText(camera, spr.position.clone().add(new THREE.Vector3(0, 2.6, 0.5)), `-${penalty} ${CURRENCY}`, 'bad');
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
    const target = c.sprite.position.clone().add(new THREE.Vector3(0, 1.4, 0.9));
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
      c.cat.setMood('happy');
      gsap.fromTo(c.sprite.position, { y: CUST_BASE }, { y: CUST_BASE + 0.45, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.out' });
      floatText(camera, c.sprite.position.clone().add(new THREE.Vector3(0, 3.3, 0.6)), `+${money} ${CURRENCY}`);
      burst(c.sprite.position.clone().add(new THREE.Vector3(0, 2.0, 0.9)), 0xffe27a, 10);
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
    tl.to(chef.group.rotation, { y: Math.PI + 0.45, duration: 0.25, ease: 'power2.out' }, 0);
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
      gsap.to(chef.group.rotation, { y: Math.PI, duration: 0.35, delay: 0.1, ease: 'power2.out' });
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
    chef.group.scale.setScalar(THREE.MathUtils.clamp(0.44 + cam.halfVis * 0.09, 0.6, 0.85));
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (aspect < 1) camera.setViewOffset(w, h, 0, -Math.round(h * 0.07), w, h); // 위쪽에 현수막 자리를 만들어요
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    customers.forEach((c) => { if (c && c.status === 'waiting') c.sprite.position.x = seatX[c.seat]; });
  }

  const camTarget = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  function update(dt, t) {
    world.update(dt, t);
    // 파티시에: 가만히 있어도 살랑살랑
    if (!celebrating) chef.group.position.y += (0 - chef.group.position.y) * 0.2;
    chef.group.position.y += Math.sin(t * 2.2) * 0.0035;
    chef.tail.rotation.z = Math.sin(t * 3) * 0.3;
    chef.tail.rotation.y = Math.sin(t * 1.5) * 0.15;
    chef.head.rotation.z = Math.sin(t * 1.3) * 0.05;
    chef.head.rotation.y = celebrating ? 0 : Math.sin(t * 0.7) * 0.08;
    if (eating) {
      // 츄르를 입에 대고 냠냠
      qEat.setFromUnitVectors(downVec, eatDir);
      eul.set(Math.sin(t * 7) * 0.1, 0, Math.cos(t * 7) * 0.06);
      qWob.setFromEuler(eul);
      chef.armR.quaternion.copy(qEat).multiply(qWob);
      chef.head.rotation.x = -0.18 + Math.sin(t * 7) * 0.05;
      churuPaste.scale.y = Math.max(0.35, churuPaste.scale.y - dt * 0.05);
      eatTimer -= dt;
      if (eatTimer <= 0) {
        eatTimer = 0.55;
        const p = chef.group.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.6, 3.4 * chef.group.scale.x, 0.6));
        burst(p, Math.random() < 0.5 ? 0xff8fab : 0xffe27a, 6, 0.9);
        floatText(camera, p, Math.random() < 0.5 ? '냠냠' : '♥');
        haptic(10);
      }
    } else {
      const wob = 5 + whiskFast * 20;
      const amp = 0.1 + whiskFast * 0.2;
      eul.set(Math.sin(t * wob) * amp, 0, Math.cos(t * wob) * amp);
      qWob.setFromEuler(eul);
      chef.armR.quaternion.copy(armBase).multiply(qWob);
      chef.head.rotation.x = 0;
    }
    chef.armL.rotation.z = 0.22 + Math.sin(t * 2) * 0.05;
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
          c.cat.setMood(mood);
          if (mood !== 'normal') gsap.fromTo(c.sprite.position, { y: CUST_BASE }, { y: CUST_BASE + 0.25, duration: 0.12, yoyo: true, repeat: 1 });
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
        c.sprite.position.y = CUST_BASE + Math.abs(Math.sin(t * 2 + c.phase)) * 0.05 + (c.mood === 'angry' ? Math.abs(Math.sin(t * 14)) * 0.05 : 0);
        c.cat.g.rotation.z = Math.sin(t * 1.6 + c.phase) * 0.04;
        c.cat.tail.rotation.z = Math.sin(t * 3 + c.phase) * 0.3;
      }
      // DOM 위치
      tmp.set(c.sprite.position.x, CUST_Y, CUST_Z).project(camera); // 말풍선은 흔들리지 않게 기준 높이에 고정
      const sx = (tmp.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-tmp.y * 0.5 + 0.5) * window.innerHeight;
      const top = new THREE.Vector3(c.sprite.position.x, CUST_Y + 1.3, CUST_Z).project(camera);
      const h = Math.abs(((-top.y * 0.5 + 0.5) * window.innerHeight) - sy) * 2;
      c.el.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
      c.el.style.setProperty('--h', `${h}px`);
    });

    const f = cam.focus;
    const wide = camera.aspect >= 1;
    const fz = wide ? 11.5 : 12.5;
    camera.position.set(0, 9 + (3.6 - 9) * f, cam.z + (fz - cam.z) * f);
    camTarget.set((wide ? 2.1 : 0) * f, 1.2 + ((wide ? 1.7 : -0.3) - 1.2) * f, -1.5 + (3 + 1.5) * f);
    camera.lookAt(camTarget);
    banner.rotation.z = Math.sin(t * 1.3) * 0.035;
    banner.rotation.x = Math.sin(t * 0.9) * 0.02;
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
    // 영업이 끝나면 파티시에가 앞을 보고 츄르를 먹어요
    celebrate(on, earned = 0) {
      if (on) {
        celebrating = 1;
        eating = earned > 0;
        eatTimer = 0.3;
        whisk.visible = !eating;
        churu.visible = eating;
        churu.position.y = -0.62;
        churuPaste.scale.y = 1;
        $('storeUI').hidden = true;
        gsap.to(chef.group.rotation, { y: 0, duration: 0.8, ease: 'back.out(1.4)' });
        gsap.fromTo(chef.group.position, { y: 0 }, { y: 0.5, duration: 0.2, yoyo: true, repeat: 1, ease: 'power1.out' });
        gsap.to(cam, { focus: 1, duration: 1.0, ease: 'power2.inOut' });
        chefCat.setMood(eating ? 'happy' : 'worried');
        haptic([20, 30, 40]);
      } else {
        celebrating = 0;
        eating = false;
        whisk.visible = true;
        churu.visible = false;
        gsap.to(chef.group.rotation, { y: Math.PI, duration: 0.6, ease: 'power2.inOut' });
        gsap.to(cam, { focus: 0, duration: 0.8, ease: 'power2.inOut' });
        chefCat.setMood('normal');
        if (visible) $('storeUI').hidden = false;
      }
    },
    ready: () => ready,
  };
}

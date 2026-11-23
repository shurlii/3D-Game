import * as THREE from 'three';
import { INGREDIENTS, POOP, mat, mesh } from './data.js';
import { createWorld } from './env.js';
import { createCat } from './cat.js';
import { createSparks, floatText, haptic, buzz, blip, REDUCED } from './fx.js';

const gsap = window.gsap;
const $ = (id) => document.getElementById(id);

const DURATION = 30;        // 제한 시간(초)
const RIM_Y = 0.9;          // 바구니 입구 높이
const SPAWN_Y = 10.5;       // 재료가 나타나는 높이
const ITEM_SCALE = 1.3;     // 재료 크기 배율
const DEBUG_POOP = new URLSearchParams(window.location.search).has('poop'); // 확인용: ?poop
const SPEEDS = { slow: [3.4, 4.2], mid: [4.8, 5.8], fast: [6.4, 7.6], poop: [4.6, 5.6] };

// 재료 모으기: 하늘에서 떨어지는 재료를 바구니로 받는 30초 게임
export function createGather({ renderer, onFinish }) {
  const scene = new THREE.Scene();
  const world = createWorld(scene);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 80);
  const cam = { baseY: 4.2, z: 12.5, shakeX: 0, shakeY: 0 };
  let halfVisW = 8;
  let playHalf = 4.2;
  let active = false;

  // 뒤쪽 가게 카운터
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

  // 바구니와 고양이
  const catModel = createCat('baker');
  const cat = catModel.root;
  catModel.g.position.y = 0.55;
  catModel.armL.rotation.set(-0.9, 0, 0.55);
  catModel.armR.rotation.set(-0.9, 0, -0.55);
  scene.add(cat);

  const basket = new THREE.Group();
  const wicker = mat(0xc98f4e, { side: THREE.DoubleSide });
  basket.add(mesh(new THREE.CylinderGeometry(0.98, 0.72, 0.72, 28, 1, true), wicker));
  basket.add(mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.05, 28), mat(0xa8703a), 0, -0.34, 0));
  const rim = mesh(new THREE.TorusGeometry(0.98, 0.075, 10, 32), mat(0xa8703a), 0, 0.36, 0);
  rim.rotation.x = Math.PI / 2;
  basket.add(rim);
  basket.add(mesh(new THREE.CylinderGeometry(0.9, 0.82, 0.16, 28, 1, true), mat(0xff9fb8, { side: THREE.DoubleSide }), 0, 0.02, 0));
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
    catModel.setMood(name);
  }

  const protos = new Map();
  [...INGREDIENTS, POOP].forEach((def) => protos.set(def.id, def.make()));
  const shadowGeo = new THREE.CircleGeometry(0.5, 20);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x6b4a3a, transparent: true, opacity: 0.2, depthWrite: false });
  const burst = createSparks(scene, 48);

  // 화면 반응
  const flash = document.createElement('div');
  flash.id = 'flash';
  document.body.appendChild(flash);
  function hitEffect() {
    gsap.fromTo(flash, { opacity: 0.38 }, { opacity: 0, duration: 0.45, ease: 'power2.out' });
    if (REDUCED) return;
    const k = { v: 1 };
    gsap.to(k, {
      v: 0, duration: 0.5, ease: 'power2.out',
      onUpdate: () => { cam.shakeX = (Math.random() - 0.5) * 0.5 * k.v; cam.shakeY = (Math.random() - 0.5) * 0.4 * k.v; },
      onComplete: () => { cam.shakeX = 0; cam.shakeY = 0; },
    });
  }
  // 똥을 담았을 때 화면 가운데에 크게 나오는 문구
  const poopMsg = document.createElement('div');
  poopMsg.id = 'poopMsg';
  poopMsg.textContent = '똥을 담으면 어떡해요!';
  poopMsg.hidden = true;
  document.body.appendChild(poopMsg);
  gsap.set(poopMsg, { xPercent: -50, yPercent: -50 });
  function showPoopMsg() {
    gsap.killTweensOf(poopMsg);
    poopMsg.hidden = false;
    gsap.fromTo(poopMsg, { scale: 0.2, opacity: 0, rotation: -8 }, { scale: 1.15, opacity: 1, rotation: 0, duration: 0.28, ease: 'back.out(2.5)' });
    gsap.to(poopMsg, { scale: 1, duration: 0.2, delay: 0.28 });
    gsap.to(poopMsg, { opacity: 0, y: -30, duration: 0.4, delay: 1.3, onComplete: () => { poopMsg.hidden = true; gsap.set(poopMsg, { y: 0 }); } });
  }

  // 못 받은 달걀: 바닥에서 깨져서 노른자와 흰자가 흘러내려요
  const splats = [];
  const whiteMat = () => new THREE.MeshBasicMaterial({ color: 0xfffdf4, transparent: true, depthWrite: false });
  function eggSplat(x) {
    const g = new THREE.Group();
    g.position.set(x, 0.05, 0.3);
    g.rotation.x = -Math.PI / 2;
    const rimMat = new THREE.MeshBasicMaterial({ color: 0xe8d3a8, transparent: true, depthWrite: false });
    const rim = new THREE.Mesh(new THREE.CircleGeometry(0.74, 24), rimMat);
    rim.scale.set(1.3, 1.0, 1);
    rim.position.z = -0.002;
    g.add(rim);
    const wm = whiteMat();
    const blob = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), wm);
    blob.scale.set(1.25, 0.9, 1);
    g.add(blob);
    [[-0.7, 0.2, 0.3], [0.65, -0.25, 0.28], [0.2, 0.55, 0.22], [-0.3, -0.5, 0.2]].forEach(([dx, dy, r]) => {
      const lobe = new THREE.Mesh(new THREE.CircleGeometry(r, 14), wm);
      lobe.position.set(dx, dy, 0.001);
      g.add(lobe);
    });
    const drip = new THREE.Mesh(new THREE.CircleGeometry(0.2, 12), wm);
    drip.scale.set(0.8, 2.4, 1);
    drip.position.set(0.05, -0.85, 0.001);
    g.add(drip);
    const ym = new THREE.MeshBasicMaterial({ color: 0xffc933, transparent: true, depthWrite: false });
    const yolk = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), ym);
    yolk.position.set(-0.1, 0.05, 0.003);
    g.add(yolk);
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.07, 10), new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, depthWrite: false }));
    hl.position.set(-0.2, 0.15, 0.004);
    g.add(hl);
    const ink = new THREE.MeshBasicMaterial({ color: 0x6b4a3a, transparent: true, depthWrite: false });
    [-0.09, 0.09].forEach((ex) => { const e = new THREE.Mesh(new THREE.CircleGeometry(0.035, 8), ink); e.position.set(-0.1 + ex, 0.03, 0.005); g.add(e); });
    g.scale.setScalar(0.2);
    scene.add(g);
    const mats = [wm, ym, hl.material, ink, rimMat];
    gsap.to(g.scale, { x: ITEM_SCALE * 1.25, y: ITEM_SCALE * 1.25, z: 1, duration: 0.55, ease: 'elastic.out(1, 0.5)' });
    gsap.to(drip.position, { y: -1.25, duration: 2.2, ease: 'power1.out' });
    gsap.to(drip.scale, { y: 3.4, duration: 2.2, ease: 'power1.out' });
    gsap.to(yolk.scale, { y: 0.8, x: 1.1, duration: 1.6 });
    mats.forEach((m) => gsap.to(m, { opacity: 0, duration: 0.8, delay: 2.6 }));
    gsap.delayedCall(3.5, () => scene.remove(g));
    splats.push(g);
  }
  function squashBasket() {
    gsap.killTweensOf(basket.scale);
    gsap.fromTo(basket.scale, { x: 1.18, y: 0.8, z: 1.18 }, { x: 1, y: 1, z: 1, duration: 0.55, ease: 'elastic.out(1, 0.45)' });
  }

  // HUD
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

  // 상태
  let state = 'idle'; // idle | countdown | play | over | result
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

  const TOTAL_WEIGHT = INGREDIENTS.reduce((a, d) => a + d.weight, 0);
  function pickIngredient() {
    // 레시피에 자주 쓰는 재료(버터·설탕·달걀)가 더 자주 나와요
    let tries = 0;
    let def;
    do {
      let r = Math.random() * TOTAL_WEIGHT;
      def = INGREDIENTS.find((d) => (r -= d.weight) < 0) || INGREDIENTS[0];
      tries += 1;
    } while (def.id === lastType && tries < 6);
    return def;
  }

  function spawnOne(def, x) {
    const [lo, hi] = SPEEDS[def.speed];
    const obj = protos.get(def.id).clone();
    obj.scale.setScalar(ITEM_SCALE);
    obj.position.set(x, SPAWN_Y, 0);
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, 0.02, 0);
    scene.add(obj, shadow);
    items.push({ def, obj, shadow, x, y: SPAWN_Y, speed: lo + Math.random() * (hi - lo), spin: 1.4 + Math.random() * 1.6, wob: Math.random() * 6 });
  }

  function spawn() {
    const wantPoop = elapsed > 2 && lastType !== 'poop' && Math.random() < (DEBUG_POOP ? 0.45 : 0.08);
    const x = (Math.random() * 2 - 1) * playHalf;
    if (wantPoop) {
      lastType = 'poop';
      spawnOne(POOP, x);
      return;
    }
    const def = pickIngredient();
    lastType = def.id;
    spawnOne(def, x);
    // 가끔 한 번에 두 개가 떨어져요
    if (Math.random() < 0.4) {
      let x2 = (Math.random() * 2 - 1) * playHalf;
      for (let k = 0; k < 4 && Math.abs(x2 - x) < 1.7; k += 1) x2 = (Math.random() * 2 - 1) * playHalf;
      if (Math.abs(x2 - x) >= 1.7) {
        const d2 = pickIngredient();
        lastType = d2.id;
        spawnOne(d2, x2);
      }
    }
  }

  function removeItem(i) {
    scene.remove(items[i].obj, items[i].shadow);
    items.splice(i, 1);
  }

  function catchItem(i) {
    const it = items[i];
    const pos = new THREE.Vector3(it.x, RIM_Y + 0.2, 0);
    if (it.def.id === 'poop') {
      poopHits += 1;
      resetCounts();
      burst(pos, 0x8b5a2b, 14);
      floatText(camera, pos.clone().setY(RIM_Y + 1.6), '재료가 사라졌어요', 'bad');
      showPoopMsg();
      blip(180, 0.28, 'sawtooth');
      haptic([140, 60, 140, 60, 200]);
      setMood('angry', 1.1);
      hitEffect();
      gsap.fromTo(basket.rotation, { z: 0.35 }, { z: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    } else {
      counts[it.def.id] += 1;
      const chip = chipEls[it.def.id];
      chip.lastChild.textContent = String(counts[it.def.id]);
      gsap.fromTo(chip, { scale: 1.3 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
      burst(pos, it.def.color, 9);
      floatText(camera, pos.clone().setY(RIM_Y + 1.4), `+1 ${it.def.name}`);
      haptic(40); // 담긴 느낌이 손에 오도록 또렷하게 한 번
      blip(660 + Math.min(counts[it.def.id], 8) * 40, 0.12);
      setMood('happy', 0.5);
      squashBasket();
    }
    removeItem(i);
  }

  function missItem(i) {
    const it = items[i];
    items.splice(i, 1);
    it.shadow.visible = false;
    it.obj.position.y = 0.2;
    if (it.def.id === 'egg') {
      scene.remove(it.obj, it.shadow);
      eggSplat(it.x);
      burst(new THREE.Vector3(it.x, 0.3, 0.3), 0xffe9a0, 6, 0.6);
      return;
    }
    gsap.to(it.obj.scale, { y: ITEM_SCALE * 0.2, x: ITEM_SCALE * 1.3, z: ITEM_SCALE * 1.3, duration: 0.14, ease: 'power1.out', onComplete: () => scene.remove(it.obj, it.shadow) });
  }

  // 입력
  const keys = { left: false, right: false };
  const pointerToX = (clientX) => THREE.MathUtils.clamp(((clientX / window.innerWidth) * 2 - 1) * halfVisW, -playHalf, playHalf);
  const onPointer = (e) => {
    if (!active || (e.target.closest && e.target.closest('.card, button'))) return;
    player.target = pointerToX(e.clientX);
  };
  window.addEventListener('pointermove', onPointer);
  window.addEventListener('pointerdown', onPointer);
  window.addEventListener('keydown', (e) => {
    if (!active) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
  });

  // 시작 / 종료
  function startRound() {
    clearItems();
    resetCounts();
    poopHits = 0;
    elapsed = 0;
    spawnIn = 0.4;
    lastType = '';
    timerEl.textContent = String(DURATION);
    timerEl.classList.remove('low');
    $('gatherResult').hidden = true;
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

  function endRound() {
    state = 'over';
    $('hud').hidden = true;
    const total = INGREDIENTS.reduce((sum, d) => sum + counts[d.id], 0);
    $('gTotal').textContent = String(total);
    $('gList').innerHTML = INGREDIENTS.map((d) => `<li><i style="background:${d.color}"></i>${d.name}<b>${counts[d.id]}</b></li>`).join('');
    $('gPoop').textContent = poopHits > 0 ? `똥을 ${poopHits}번 받았어요.` : '똥을 한 번도 안 받았어요!';
    setMood('happy', 3);
    burst(new THREE.Vector3(player.x, RIM_Y + 0.5, 0.5), 0xffe27a, 30);
    haptic([30, 30, 60]);
    // 모은 재료는 바로 매장 창고에 들어갑니다
    onFinish({ ...counts });
    gsap.delayedCall(0.9, () => {
      state = 'result';
      const card = $('gatherResult');
      card.hidden = false;
      gsap.fromTo(card.firstElementChild, { y: 40, opacity: 0, scale: 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.8)' });
    });
  }

  $('gAgainBtn').addEventListener('click', () => { if (active) startRound(); });

  function resize(aspect) {
    camera.aspect = aspect;
    cam.z = aspect < 1 ? 12.5 + (1 - aspect) * 6.5 : 12.5;
    halfVisW = cam.z * Math.tan(THREE.MathUtils.degToRad(22.5)) * aspect;
    playHalf = THREE.MathUtils.clamp(halfVisW - 0.7, 2.3, 4.4);
    camera.updateProjectionMatrix();
  }

  const camTarget = new THREE.Vector3();
  function update(dt, t) {
    world.update(dt, t);
    if (keys.left) player.target -= 9 * dt;
    if (keys.right) player.target += 9 * dt;
    player.target = THREE.MathUtils.clamp(player.target, -playHalf, playHalf);
    const prevX = player.x;
    player.x += (player.target - player.x) * (1 - Math.exp(-14 * dt));
    player.vx = (player.x - prevX) / Math.max(dt, 0.001);
    basket.position.set(player.x, BASKET_Y, 0.4);
    if (!gsap.isTweening(basket.rotation)) basket.rotation.z = THREE.MathUtils.lerp(basket.rotation.z, -player.vx * 0.025, 0.2);
    cat.position.set(player.x, 0.55 + Math.sin(t * 5) * 0.03, -0.35);
    catModel.tail.rotation.z = Math.sin(t * 4) * 0.3;
    catModel.head.rotation.z = THREE.MathUtils.clamp(-player.vx * 0.012, -0.2, 0.2);

    if (state === 'play') {
      elapsed += dt;
      const left = Math.max(0, DURATION - elapsed);
      const shown = Math.ceil(left);
      if (timerEl.textContent !== String(shown)) timerEl.textContent = String(shown);
      timerEl.classList.toggle('low', left <= 5);
      if (left <= 0) endRound();
      spawnIn -= dt;
      if (spawnIn <= 0 && state === 'play') {
        spawn();
        spawnIn = Math.max(0.3, 0.55 - elapsed * 0.008) + Math.random() * 0.14;
      }
    }

    let poopClose = false;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const it = items[i];
      it.y -= it.speed * dt;
      it.obj.position.set(it.x, it.y, 0);
      it.obj.rotation.y = Math.sin(t * it.spin + it.wob) * 0.55; // 이름표가 보이도록 빙글 돌지 않고 살랑살랑
      it.obj.rotation.z = Math.sin(t * 3 + it.wob) * 0.14;
      it.shadow.scale.setScalar(0.5 + THREE.MathUtils.clamp(1 - (it.y - RIM_Y) / 8, 0, 1) * 0.7);
      if (state === 'play') {
        if (it.def.id === 'poop' && it.y > RIM_Y && it.y < RIM_Y + 4 && Math.abs(it.x - player.x) < 1.5) poopClose = true;
        if (it.y <= RIM_Y + 0.15 && it.y >= RIM_Y - 0.45 && Math.abs(it.x - player.x) < 1.1) {
          catchItem(i);
          continue;
        }
      }
      if (it.y <= 0.35) missItem(i);
    }

    if (performance.now() > moodUntil && moodName !== 'normal' && state !== 'result' && state !== 'over') {
      moodName = 'normal';
      catModel.setMood('normal');
    }
    if (moodName === 'normal') catModel.setMood(poopClose ? 'worried' : 'normal');

    camera.position.set(player.x * 0.12 + cam.shakeX, cam.baseY + cam.shakeY, cam.z);
    camTarget.set(player.x * 0.05, 3.5, 0);
    camera.lookAt(camTarget);
  }

  return {
    scene, camera, resize, update,
    enter() {
      active = true;
      player.target = 0;
      startRound();
    },
    leave() {
      active = false;
      state = 'idle';
      clearItems();
      $('hud').hidden = true;
      $('countdown').hidden = true;
      $('gatherResult').hidden = true;
    },
  };
}

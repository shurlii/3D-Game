import * as THREE from 'three';
import { INGREDIENTS, RECIPES, RECIPE_BY_ID, PRICES, BUNDLE_SIZE, CURRENCY, FOOD_MODELS } from './data.js';
import { makeIcons, haptic } from './fx.js';
import { loadState, saveState } from './save.js';
import { createGather } from './gather.js';
import { createStore } from './store.js';

const gsap = window.gsap;
const $ = (id) => document.getElementById(id);

// 귀여운 글꼴이 준비된 뒤에 재료 이름표와 현수막을 그려요 (최대 2초만 기다려요)
try {
  await Promise.race([
    Promise.all([document.fonts.load('40px "Jua"', '가나다라 Butter'), document.fonts.load('40px "Pacifico"', 'Butter'), document.fonts.ready]),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
} catch (e) { /* 글꼴을 못 불러오면 기본 글꼴로 보여요 */ }

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
  boot(renderer);
}

function boot(renderer) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const state = loadState();
  const save = () => saveState(state);

  // ----- 그림(텍스처) -----
  const loader = new THREE.TextureLoader();
  // 3D 재료 모델을 그림으로 바꿔서 말풍선과 선반에 씁니다
  const protos = {};
  INGREDIENTS.forEach((d) => { protos[d.id] = d.make(); });
  RECIPES.forEach((r) => { protos[`food_${r.id}`] = FOOD_MODELS[r.id](); });
  const icons = makeIcons(renderer, protos);
  RECIPES.forEach((r) => { r.img = icons[`food_${r.id}`]; }); // 픽셀 그림 대신 3D 그림
  const iconCache = new Map();
  const foodTexture = (id) => iconTexture(`food_${id}`);
  const iconTexture = (id) => {
    if (!iconCache.has(id)) {
      const t = loader.load(icons[id]);
      t.colorSpace = THREE.SRGBColorSpace;
      iconCache.set(id, t);
    }
    return iconCache.get(id);
  };

  // ----- 화면 요소 -----
  const toastEl = $('toast');
  let toastTween = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    if (toastTween) toastTween.kill();
    toastTween = gsap.fromTo(toastEl, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, onComplete: () => {
      toastTween = gsap.to(toastEl, { opacity: 0, delay: 1.8, duration: 0.3, onComplete: () => { toastEl.hidden = true; } });
    } });
  }
  function pulse(el) {
    gsap.fromTo(el, { scale: 1 }, { scale: 1.18, duration: 0.2, yoyo: true, repeat: 3, ease: 'power1.inOut' });
  }

  function updateWallet() {
    $('walletNum').textContent = state.wallet.toLocaleString('ko-KR');
  }
  function updateTip() {
    const total = Object.values(state.inventory).reduce((a, b) => a + b, 0);
    const goods = Object.values(state.goods).reduce((a, b) => a + b, 0);
    let msg;
    if (!store.isOpen()) {
      msg = total + goods === 0 ? "먼저 '재료 모으기'로 재료를 모아 봐요!" : "'영업 시작'을 눌러 손님을 맞아요!";
    } else if (goods > 0) {
      msg = '구운 메뉴를 눌러서 손님에게 건네요';
    } else {
      msg = '말풍선을 누르면 재료를 넣어 구워요';
    }
    $('tip').textContent = msg;
  }

  // ----- 모드(매장 / 재료 모으기) -----
  const hooks = {
    toast,
    onWallet: () => { updateWallet(); updateTip(); },
    onNeed: () => { pulse($('gatherBtn')); pulse($('shopBtn')); },
    onOpenChange: (open) => {
      $('openBtn').disabled = open;
      $('closeBtn').disabled = !open;
      updateTip();
    },
  };

  const gather = createGather({
    renderer,
    onFinish: (counts) => {
      Object.entries(counts).forEach(([id, n]) => { state.inventory[id] = (state.inventory[id] || 0) + n; });
      save();
    },
  });
  const store = createStore({ renderer, state, icons, foodTexture, iconTexture, save, hooks });
  let current = store;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    store.resize(w / h);
    gather.resize(w / h);
  }
  window.addEventListener('resize', resize);
  resize();

  function transition(el, mid) {
    const r = el ? el.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const w = $('wipe');
    const R = Math.hypot(window.innerWidth, window.innerHeight);
    w.hidden = false;
    gsap.set(w, { clipPath: `circle(0px at ${x}px ${y}px)` });
    gsap.to(w, {
      clipPath: `circle(${R}px at ${x}px ${y}px)`, duration: 0.45, ease: 'power2.in',
      onComplete: () => {
        mid();
        gsap.to(w, { clipPath: `circle(0px at ${x}px ${y}px)`, duration: 0.45, delay: 0.12, ease: 'power2.out', onComplete: () => { w.hidden = true; } });
      },
    });
  }

  function goGather(fromEl) {
    if (store.isBusy()) { toast('지금 굽고 있어요. 잠시만요!'); return; }
    store.cancelBowl();
    haptic(10);
    transition(fromEl, () => {
      store.setPaused(true);
      store.hide();
      current = gather;
      gather.enter();
    });
  }
  function goStore(fromEl) {
    transition(fromEl, () => {
      gather.leave();
      current = store;
      store.setPaused(false);
      store.show();
      store.refresh();
      updateTip();
      updateWallet();
    });
  }

  // ----- 패널 (사기 / 매출 / 영업 결과) -----
  const panel = $('panel');
  const panelBody = $('panelBody');
  function openPanel(html, bottom = false) {
    panelBody.innerHTML = html;
    panel.classList.toggle('bottom', bottom);
    panel.hidden = false;
    store.setPaused(true);
    gsap.fromTo(panel.firstElementChild, { y: 40, opacity: 0, scale: 0.94 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.8)' });
  }
  function closePanel() {
    if (panel.classList.contains('bottom')) store.celebrate(false);
    panel.hidden = true;
    store.setPaused(false);
    store.refresh();
    updateTip();
  }
  $('panelClose').addEventListener('click', closePanel);

  const money = (n) => `${n.toLocaleString('ko-KR')} ${CURRENCY}`;

  function shopHtml() {
    const rows = INGREDIENTS.map((d) => {
      const price = PRICES[d.id];
      return `<li class="shop-row"><img alt="" src="${icons[d.id]}"><span class="nm">${d.name}<small>보유 ${state.inventory[d.id] || 0}개</small></span><button type="button" class="buy" data-id="${d.id}" ${state.wallet < price ? 'disabled' : ''}>${BUNDLE_SIZE}개 · ${price} ${CURRENCY}</button></li>`;
    }).join('');
    return `<p class="eyebrow">재료 사기</p><h2>재료 가게</h2><p class="how">지갑 <b>${money(state.wallet)}</b></p><ul class="shop-list">${rows}</ul>`;
  }
  function openShop() {
    openPanel(shopHtml());
    panelBody.onclick = (e) => {
      const b = e.target.closest('.buy');
      if (!b) return;
      const id = b.dataset.id;
      const price = PRICES[id];
      if (state.wallet < price) return;
      state.wallet -= price;
      state.inventory[id] = (state.inventory[id] || 0) + BUNDLE_SIZE;
      save();
      haptic(15);
      updateWallet();
      panelBody.innerHTML = shopHtml();
      const row = panelBody.querySelector(`[data-id="${id}"]`);
      if (row) gsap.fromTo(row.closest('.shop-row'), { scale: 1.04 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
    };
  }

  function soldHtml(sold) {
    const rows = RECIPES.filter((r) => sold && sold[r.id]).map((r) => `<li><img alt="" src="${r.img}"><span>${r.name}</span><b>${sold[r.id]}개</b></li>`).join('');
    return rows ? `<ul class="sold-list">${rows}</ul>` : '<p class="how">아직 판 메뉴가 없어요.</p>';
  }
  function openSales() {
    panelBody.onclick = null;
    const d = store.getDay();
    const today = d
      ? `<p class="big">${money(d.revenue)}</p><p class="how">영업 중 · 판매 ${d.served}개 · 놓친 손님 ${d.missed}명 (손해 ${money(d.penalty)})</p>${soldHtml(d.sold)}`
      : '<p class="how">영업 중이 아니에요. 영업을 시작하면 오늘 매출이 쌓여요.</p>';
    const hist = state.history.length
      ? `<h3>지난 영업 기록</h3><ul class="hist">${state.history.slice(0, 5).map((h) => `<li><span>${h.at}</span><b>${money(h.revenue)}</b><small>판매 ${h.served}개 · 놓침 ${h.missed}명</small></li>`).join('')}</ul>`
      : '';
    openPanel(`<p class="eyebrow">오늘 매출</p><h2>매출 장부</h2>${today}${hist}<p class="how">누적 매출 <b>${money(state.lifetime)}</b></p>`);
  }
  function openDayResult(r) {
    panelBody.onclick = null;
    const earned = Math.max(0, r.revenue);
    const headline = earned > 0
      ? `<h2 class="big">츄르 ${earned.toLocaleString('ko-KR')}개 값을<br>벌었어요!</h2>`
      : '<h2 class="big">오늘은 츄르를<br>벌지 못했어요</h2>';
    const note = earned > 0 ? '' : '<p class="how">내일은 더 잘할 수 있어요!</p>';
    openPanel(`<p class="eyebrow">영업 종료</p>${headline}${note}<p class="how">판매 ${money(r.gross)} − 놓친 손님 ${money(r.penalty)}<br>판매 ${r.served}개 · 놓친 손님 ${r.missed}명</p>${soldHtml(r.sold)}<p class="how">매출이 장부에 기록됐어요. 누적 매출 <b>${money(state.lifetime)}</b></p>`, true);
    store.celebrate(true, earned);
  }

  // ----- 버튼 연결 -----
  $('startBtn').addEventListener('click', () => {
    $('start').hidden = true;
    store.show();
    updateWallet();
    updateTip();
    haptic(10);
  });
  $('gatherBtn').addEventListener('click', (e) => goGather(e.currentTarget));
  $('gBackBtn').addEventListener('click', (e) => goStore(e.currentTarget));
  $('shopBtn').addEventListener('click', openShop);
  $('salesBtn').addEventListener('click', openSales);
  $('openBtn').addEventListener('click', () => { store.open(); });
  $('closeBtn').addEventListener('click', () => {
    if (store.isBusy()) { toast('지금 굽고 있어요. 잠시만요!'); return; }
    const record = store.close();
    if (record) openDayResult(record);
  });
  gsap.from('#start .card', { y: 40, opacity: 0, scale: 0.92, duration: 0.6, ease: 'back.out(1.8)' });

  window.addEventListener('pagehide', () => { store.cancelBowl(); save(); });

  // ----- 매 프레임 -----
  const timer = new THREE.Timer();
  renderer.setAnimationLoop(() => {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    current.update(dt, timer.getElapsed());
    renderer.render(current.scene, current.camera);
  });

  updateWallet();
}

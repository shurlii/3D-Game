import * as THREE from 'three';

export const CURRENCY = '츄르';
export const BUNDLE_SIZE = 5; // 재료 사기 한 묶음의 개수
// 재료 한 묶음(5개) 가격 (기존 Meow Bakery 2단계와 같은 값)
export const PRICES = { milk: 2, egg: 1, butter: 2, sugar: 1, salt: 4, cocoa: 2, strawberry: 2, chocolate: 1, cream: 2 };

// 메뉴(레시피)와 가격 (기존 Meow Bakery와 같은 값)
export const RECIPES = [
  { id: 'butterCookie', name: '진저브레드 쿠키', price: 3, needs: { butter: 2, sugar: 1, egg: 1 }, img: './assets/foods/52_gingerbreadman.png' },
  { id: 'chocolateCookie', name: '초코칩 쿠키', price: 4, needs: { butter: 2, sugar: 2, egg: 1, chocolate: 3 }, img: './assets/foods/28_cookies.png' },
  { id: 'madeleine', name: '에그타르트', price: 5, needs: { butter: 2, egg: 2, sugar: 2, milk: 1 }, img: './assets/foods/42_eggtart.png' },
  { id: 'strawberryCake', name: '딸기 케이크', price: 8, needs: { strawberry: 3, cream: 2, egg: 2, sugar: 2, milk: 1 }, img: './assets/foods/90_strawberrycake.png' },
  { id: 'sourdough', name: '식빵', price: 5, needs: { milk: 2, butter: 1, salt: 1 }, img: './assets/foods/65_loafbread.png' },
];
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
export const CAT_TYPES = ['cheese', 'mackerel', 'tuxedo', 'white', 'gray', 'calico', 'black', 'siamese'];

// ---------- 색과 재료 만들기 ----------
export const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...extra });
export const mesh = (geo, material, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  return m;
};

// ----- 재료 겉에 붙이는 이름표 -----
const labelCache = new Map();
export function labelTexture(text, { bg = '#ffffff', fg = '#6b4a3a', border = '#6b4a3a', w = 256, h = 128 } = {}) {
  const key = `${text}|${bg}|${fg}|${border}`;
  if (labelCache.has(key)) return labelCache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d');
  const r = 36;
  x.fillStyle = bg;
  x.beginPath();
  x.roundRect(6, 6, w - 12, h - 12, r);
  x.fill();
  x.lineWidth = 7;
  x.strokeStyle = border;
  x.stroke();
  const lines = text.split('\n');
  const size = lines.length > 1 ? 50 : 66;
  x.font = `${size}px "Jua", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.lineJoin = 'round';
  lines.forEach((ln, i) => {
    const y = h / 2 + (i - (lines.length - 1) / 2) * (size * 0.98) + 3;
    x.lineWidth = 8;
    x.strokeStyle = bg;
    x.strokeText(ln, w / 2, y);
    x.fillStyle = fg;
    x.fillText(ln, w / 2, y);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  labelCache.set(key, t);
  return t;
}
const labelMat = (text, opts) => new THREE.MeshBasicMaterial({ map: labelTexture(text, opts), transparent: true, side: THREE.DoubleSide });
// 상자 겉에 붙이는 평평한 이름표
const flatLabel = (text, w, h, x, y, z, opts) => mesh(new THREE.PlaneGeometry(w, h), labelMat(text, opts), x, y, z);
// 통 겉을 감싸는 이름표
const wrapLabel = (text, radius, height, y, opts, len = 2.1) => mesh(
  new THREE.CylinderGeometry(radius + 0.004, radius + 0.004, height, 24, 1, true, -len / 2, len), labelMat(text, opts), 0, y, 0
);

export const INGREDIENTS = [
  { id: 'milk', name: '우유', color: '#6ec1ff', speed: 'slow', weight: 1.2, make() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.72, 0.58, 0.56), mat(0xffffff), 0, -0.12, 0));
    g.add(mesh(new THREE.BoxGeometry(0.72, 0.3, 0.56), mat(0x6ec1ff), 0, 0.32, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 12), mat(0xff5d7a), 0, 0.55, 0));
    g.add(flatLabel('우유', 0.56, 0.3, 0, -0.1, 0.285, { border: '#6ec1ff' }));
    return g;
  } },
  { id: 'egg', name: '달걀', color: '#fff0d6', speed: 'fast', weight: 1.5, make() {
    const g = new THREE.Group();
    const egg = mesh(new THREE.SphereGeometry(0.34, 20, 16), mat(0xffe9c4));
    egg.scale.set(1, 1.28, 1);
    g.add(egg);
    [[-0.1, 0.1, 0.3], [0.12, -0.12, 0.29], [0.05, 0.25, 0.25]].forEach(([x, y, z]) => g.add(mesh(new THREE.SphereGeometry(0.025, 6, 6), mat(0xe0b878), x, y, z)));
    return g;
  } },
  { id: 'butter', name: '버터', color: '#ffd84a', speed: 'slow', weight: 1.5, make() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(0.9, 0.46, 0.52), mat(0xffd84a)));
    g.add(mesh(new THREE.BoxGeometry(0.92, 0.14, 0.54), mat(0xffffff), 0, -0.16, 0));
    g.add(flatLabel('버터', 0.6, 0.28, 0, 0.03, 0.265, { border: '#e8a800' }));
    return g;
  } },
  { id: 'sugar', name: '설탕', color: '#ff9fc0', speed: 'mid', weight: 1.5, make() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.78, 20), mat(0xffffff)));
    g.add(wrapLabel('설탕', 0.35, 0.34, -0.02, { border: '#ff7fa8' }));
    g.add(mesh(new THREE.SphereGeometry(0.3, 14, 10), mat(0xffffff), 0, 0.4, 0));
    g.add(mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), mat(0xffffff), 0.1, 0.62, 0.05));
    return g;
  } },
  { id: 'salt', name: '소금', color: '#8fb4e8', speed: 'mid', weight: 0.8, make() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.72, 20), mat(0xd7e8ff)));
    g.add(wrapLabel('소금', 0.28, 0.34, -0.04, { bg: '#ffffff', fg: '#3d6bb5', border: '#8fb4e8' }));
    g.add(mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.16, 20), mat(0x9aa3b5), 0, 0.44, 0));
    return g;
  } },
  { id: 'cocoa', name: '초코파우더', color: '#8a5a3c', speed: 'mid', weight: 0.5, make() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.7, 24), mat(0x8a5a3c)));
    g.add(wrapLabel('초코\n파우더', 0.36, 0.5, 0, { bg: '#fff3dc', fg: '#6b3f26', border: '#e8b878' }));
    g.add(mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.14, 24), mat(0xe8b878), 0, 0.4, 0));
    return g;
  } },
  { id: 'strawberry', name: '딸기', color: '#ff4d6d', speed: 'fast', weight: 1, make() {
    const g = new THREE.Group();
    const body = mesh(new THREE.SphereGeometry(0.36, 20, 16), mat(0xff4d6d));
    body.scale.set(1, 0.95, 1);
    g.add(body);
    const leaf = mesh(new THREE.ConeGeometry(0.22, 0.18, 6), mat(0x3fb860), 0, 0.36, 0);
    leaf.rotation.x = Math.PI;
    g.add(leaf);
    [[-0.12, 0.05, 0.32], [0.14, -0.08, 0.3], [0.0, -0.2, 0.3], [-0.16, -0.14, 0.28]].forEach(([x, y, z]) => g.add(mesh(new THREE.SphereGeometry(0.03, 6, 6), mat(0xffe9a0), x, y, z)));
    return g;
  } },
  { id: 'chocolate', name: '초코칩', color: '#5b3a29', speed: 'fast', weight: 1, make() {
    const g = new THREE.Group();
    const bag = mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.66, 4, 1), mat(0x7a4a30), 0, -0.02, 0);
    bag.rotation.y = Math.PI / 4;
    bag.scale.z = 0.7;
    g.add(bag);
    g.add(mesh(new THREE.BoxGeometry(0.62, 0.1, 0.22), mat(0x5b3a29), 0, 0.34, 0));
    g.add(flatLabel('초코칩', 0.6, 0.3, 0, -0.04, 0.27, { fg: '#6b3f26', border: '#5b3a29' }));
    return g;
  } },
  { id: 'cream', name: '생크림', color: '#ffb3c8', speed: 'slow', weight: 1, make() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.36, 0.28, 0.4, 22), mat(0xffb3c8), 0, -0.16, 0));
    g.add(wrapLabel('생크림', 0.32, 0.26, -0.16, { border: '#ff8fb1' }, 2.3));
    g.add(mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.2, 22), mat(0xffffff), 0.0, 0.14, 0));
    g.add(mesh(new THREE.ConeGeometry(0.24, 0.32, 18), mat(0xffffff), 0, 0.4, 0));
    g.add(mesh(new THREE.SphereGeometry(0.07, 10, 8), mat(0xff4d6d), 0, 0.6, 0));
    return g;
  } },
];
export const POOP = { id: 'poop', name: '똥', color: '#8b5a2b', speed: 'poop', make() {
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


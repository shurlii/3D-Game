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

export const INGREDIENTS = [
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


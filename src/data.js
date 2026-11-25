import * as THREE from 'three';

export const CURRENCY = '츄르';
export const BUNDLE_SIZE = 5; // 재료 사기 한 묶음의 개수
export const QUICK_BUY = 10; // 선반에서 바로 사는 개수 (묶음 가격 × 2)
// 재료 한 묶음(5개) 가격 (기존 Meow Bakery 2단계와 같은 값)
export const PRICES = { milk: 2, egg: 1, butter: 2, sugar: 1, salt: 4, cocoa: 2, strawberry: 2, chocolate: 1, cream: 2 };

// 메뉴(레시피)와 가격 (기존 Meow Bakery와 같은 값)
export const RECIPES = [
  { id: 'butterCookie', name: '진저브레드 쿠키', price: 3, needs: { butter: 2, sugar: 1, egg: 1 } },
  { id: 'chocolateCookie', name: '초코칩 쿠키', price: 4, needs: { butter: 2, sugar: 2, egg: 1, chocolate: 3 } },
  { id: 'madeleine', name: '에그타르트', price: 5, needs: { butter: 2, egg: 2, sugar: 2, milk: 1 } },
  { id: 'strawberryCake', name: '딸기 케이크', price: 8, needs: { strawberry: 3, cream: 2, egg: 2, sugar: 2, milk: 1 } },
  { id: 'sourdough', name: '식빵', price: 5, needs: { milk: 2, butter: 1, salt: 1 } },
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


// ---------- 메뉴 3D 모델 (말풍선·선반·완성품 그림으로 쓰여요) ----------
// 얼굴을 표면에 납작하게 붙여요. surf(x, y)가 있으면 그 곡면 높이에 맞춰 붙고, 없으면 z 평면에 붙어요
const faceOn = (g, y, z, spread = 0.11, size = 0.04, surf = null) => {
  const zAt = (x, yy) => (surf ? surf(x, yy) : z);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x3a2a24 });
  const eye = new THREE.SphereGeometry(size, 10, 8);
  [-spread, spread].forEach((x) => { const e = mesh(eye, eyeM, x, y, zAt(x, y)); e.scale.z = 0.25; g.add(e); });
  const blush = new THREE.MeshBasicMaterial({ color: 0xff8fa8, transparent: true, opacity: 0.8 });
  const bg = new THREE.CircleGeometry(size * 1.5, 12);
  [-spread * 1.9, spread * 1.9].forEach((x) => g.add(mesh(bg, blush, x, y - size * 1.1, zAt(x, y - size * 1.1) + 0.004)));
  const smile = mesh(new THREE.TorusGeometry(size * 0.9, size * 0.28, 6, 12, Math.PI), eyeM, 0, y - size * 1.4, zAt(0, y - size * 1.4) + 0.004);
  smile.scale.z = 0.3;
  smile.rotation.z = Math.PI;
  g.add(smile);
};
const ball = (r, color, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const m = mesh(new THREE.SphereGeometry(r, 18, 14), mat(color), x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
};

export const FOOD_MODELS = {
  // 진저브레드 쿠키: 사람 모양 쿠키
  butterCookie() {
    const g = new THREE.Group();
    // 사람 모양을 한 장의 윤곽선으로 그려서 한 덩어리로 매끈하게 (쿠키 틀로 찍은 모양)
    const half = [[0, 0.58], [-0.19, 0.52], [-0.275, 0.34], [-0.2, 0.14], [-0.14, 0.07], [-0.3, 0.1], [-0.5, 0.16], [-0.65, 0.17], [-0.72, 0.08], [-0.65, -0.03], [-0.48, -0.06], [-0.33, -0.12], [-0.31, -0.28], [-0.36, -0.46], [-0.4, -0.65], [-0.33, -0.77], [-0.17, -0.75], [-0.1, -0.55], [0, -0.43]];
    const right = half.slice(1, -1).reverse().map(([x, y]) => [-x, y]);
    const pts3 = half.concat(right).map(([x, y]) => new THREE.Vector3(x, y, 0));
    const outline = new THREE.CatmullRomCurve3(pts3, true, 'centripetal').getPoints(220).map((p) => new THREE.Vector2(p.x, p.y));
    const shape = new THREE.Shape(outline);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 6, curveSegments: 1 });
    geo.translate(0, 0, -0.03);
    const body = new THREE.Mesh(geo, mat(0xc98a4b));
    g.add(body);
    const Z = 0.085; // 앞면 높이
    const ic = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [0.0, -0.17, -0.34].forEach((y, i) => { const d = mesh(new THREE.SphereGeometry(0.05, 10, 8), i === 1 ? mat(0xff5d7a) : ic, 0, y, Z); d.scale.z = 0.35; g.add(d); });
    // 리본 모양 아이싱
    [-1, 1].forEach((s) => { const b2 = ball(0.07, 0xff5d7a, s * 0.1, 0.09, Z + 0.003, 1.4, 1, 0.3); b2.rotation.z = s * 0.4; g.add(b2); });
    faceOn(g, 0.32, Z, 0.1, 0.038);
    // 손발 끝 아이싱
    [[-0.63, 0.07], [0.63, 0.07], [-0.27, -0.7], [0.27, -0.7]].forEach(([x, y]) => g.add(ball(0.045, 0xffffff, x, y, Z, 1, 1, 0.3)));
    return g;
  },
  // 초코칩 쿠키: 동그랗고 통통
  chocolateCookie() {
    const g = new THREE.Group();
    const cookie = new THREE.Group();
    cookie.add(ball(0.5, 0xe0a860, 0, 0, 0, 1, 1, 0.42));
    const surf = (x, y) => 0.21 * Math.sqrt(Math.max(0.05, 1 - (x / 0.5) ** 2 - (y / 0.5) ** 2));
    // 초코칩은 듬성듬성, 크기와 모양이 제각각이고 표면에 납작하게 붙은 모양
    [[-0.27, 0.2, 0.06, 1.3, 0.5], [0.05, 0.28, 0.045, 0.9, 2.1], [0.3, 0.13, 0.055, 1.2, 4.0],
      [-0.12, -0.31, 0.05, 1.25, 3.2], [0.27, -0.27, 0.04, 0.9, 5.3], [-0.38, -0.2, 0.04, 1.1, 0.2]].forEach(([x, y, r, sx, rot]) => {
      const chip = ball(r, 0x4a2a1c, x, y, surf(x, y) + 0.002, sx, 0.9, 0.2);
      chip.rotation.z = rot;
      cookie.add(chip);
    });
    faceOn(cookie, -0.06, 0, 0.13, 0.04, surf);
    g.add(cookie);
    g.rotation.z = 0.12;
    return g;
  },
  // 에그타르트: 주름진 껍질과 노란 커스터드
  madeleine() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.46, 0.3, 0.3, 14), mat(0xe6a65b), 0, -0.05, 0));
    g.add(mesh(new THREE.TorusGeometry(0.43, 0.045, 8, 28), mat(0xd48f43), 0, 0.1, 0).rotateX(Math.PI / 2));
    g.add(mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.07, 28), mat(0xffd34d), 0, 0.1, 0));
    [[-0.29, 0.2], [0.3, 0.18], [0.0, -0.3]].forEach(([x, z]) => g.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.012, 12), mat(0xc87a2d), x, 0.141, z)));
    // 얼굴은 커스터드 윗면에 딱 붙여요 (윗면 방향으로 눕힌 얼굴)
    const face = new THREE.Group();
    face.position.set(0, 0.137, 0);
    face.rotation.x = -Math.PI / 2;
    faceOn(face, 0.04, 0, 0.12, 0.04);
    g.add(face);
    g.rotation.x = 0.7;
    return g;
  },
  // 딸기 케이크: 폭신한 생크림과 딸기
  strawberryCake() {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 28), mat(0xffd9a0), 0, -0.3, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.08, 28), mat(0xffffff), 0, -0.16, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.2, 28), mat(0xffd9a0), 0, -0.02, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.54, 0.52, 0.16, 28), mat(0xffffff), 0, 0.16, 0));
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      g.add(ball(0.1, 0xffffff, Math.sin(a) * 0.46, 0.27, Math.cos(a) * 0.46));
    }
    g.add(ball(0.17, 0xff4d6d, 0, 0.4, 0, 1, 1.05, 1));
    const leaf = mesh(new THREE.ConeGeometry(0.1, 0.08, 6), mat(0x3fb860), 0, 0.56, 0);
    leaf.rotation.x = Math.PI;
    g.add(leaf);
    g.add(ball(0.09, 0xff4d6d, 0.34, 0.33, 0.2), ball(0.09, 0xff4d6d, -0.3, 0.33, 0.28));
    faceOn(g, -0.0, 0.51, 0.13, 0.04);
    g.rotation.x = 0.1;
    return g;
  },
  // 식빵: 단면이 보이는 통통한 식빵
  sourdough() {
    const g = new THREE.Group();
    const bump = (r, w) => {
      const sh = new THREE.Shape();
      const hw = w;
      sh.moveTo(-hw, -0.4);
      sh.lineTo(hw, -0.4);
      sh.lineTo(hw, 0.1);
      sh.absarc(hw - r * 0.55, 0.1, r * 0.55, 0, Math.PI / 2, false);
      sh.lineTo(-hw + r * 0.55, 0.1 + r * 0.55);
      sh.absarc(-hw + r * 0.55, 0.1, r * 0.55, Math.PI / 2, Math.PI, false);
      sh.lineTo(-hw, -0.4);
      return sh;
    };
    const crust = new THREE.Mesh(new THREE.ExtrudeGeometry(bump(0.5, 0.5), { depth: 0.6, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 4, curveSegments: 14 }), mat(0xd88f3d));
    crust.position.z = -0.3;
    g.add(crust);
    const crumb = new THREE.Mesh(new THREE.ExtrudeGeometry(bump(0.5, 0.44), { depth: 0.02, bevelEnabled: false, curveSegments: 14 }), mat(0xfff0c4));
    crumb.position.z = 0.36;
    crumb.position.y = 0.0;
    g.add(crumb);
    faceOn(g, 0.06, 0.4, 0.14, 0.042);
    return g;
  },
};

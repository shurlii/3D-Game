import * as THREE from 'three';
import { mat, mesh } from './data.js';

// 고양이 종류별 모양: 털 색, 무늬, 리본·넥타이 같은 꾸미기
export const CAT_STYLES = {
  white: { fur: 0xffffff, earInner: 0xffc4d4, accessory: { type: 'ribbon', color: 0xff8fb1 } },
  tuxedo: { fur: 0x34343f, earInner: 0xff9fb8, muzzle: 0xffffff, chest: 0xffffff, paw: 0xffffff, whiteBlaze: true, accessory: { type: 'bow', color: 0xe0334f } },
  gray: { fur: 0x8f9fb6, earInner: 0xd9b8c4, eye: 0x4fcf8a, accessory: { type: 'tie', color: 0x3f73d6 } }, // 러시안블루
  calico: {
    fur: 0xffffff, earInner: 0xffc4d4, earL: 0x34343f, earR: 0xf3a23c, // 화면 왼쪽 귀 = 주황, 오른쪽 귀 = 검정
    texture: 'calico',
    accessory: { type: 'bell', color: 0xffc93c },
  },
  mackerel: { fur: 0x9aa4b0, stripe: 0x4b5461, earInner: 0xe0b9c4, muzzle: 0xe8edf2, accessory: { type: 'bandana', color: 0x4fc58a } }, // 고등어
  cheese: { fur: 0xffb24d, stripe: 0xe88a24, earInner: 0xffc4cf, muzzle: 0xfff0d2, accessory: { type: 'bow', color: 0x7fc8ff } },
  black: { fur: 0x34343e, earInner: 0xb58cf0, eye: 0xffd54a, accessory: { type: 'ribbon', color: 0xb58cf0 } },
  siamese: { fur: 0xf6e6cf, points: 0x6d4a3a, earInner: 0x8b6a5a, eye: 0x58a8ff, accessory: { type: 'tie', color: 0x2fb7a3 } },
  // 파티시에 (치즈 고양이 + 앞치마 + 모자)
  baker: { fur: 0xffa24d, stripe: 0xe07a1f, earInner: 0xff9fb8, muzzle: 0xfff3dc, chest: 0xfff3dc, paw: 0xfff3dc, chef: true },
};

const DARK = 0x2a2a33;

// 삼색이 무늬를 표면에 납작하게 그린 그림 (덩어리로 튀어나오지 않아요)
function calicoTexture(kind) {
  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, W, H);
  const PX = W / (Math.PI * 2); // 1라디안당 픽셀
  // (옆 각도, 높이 각도, 가로 반지름, 세로 반지름, 색): 크고 매끈한 무늬를 적게
  const patches = kind === 'head'
    ? [[-0.85, 1.0, 0.5, 0.42, '#f3a23c'], [0.85, 1.0, 0.42, 0.38, '#34343f']]
    : [[0.9, 1.75, 0.75, 0.6, '#f3a23c'], [-0.85, 1.35, 0.6, 0.5, '#34343f'], [2.6, 1.5, 0.8, 0.55, '#f3a23c']];
  patches.forEach(([u, th, rx, ry, color]) => {
    x.fillStyle = color;
    [0, 1, -1].forEach((k) => { // 그림 가장자리에서 이어지게
      const cx = (0.25 + (u + k * Math.PI * 2) / (Math.PI * 2)) * W;
      const cy = (th / Math.PI) * H;
      x.beginPath();
      x.ellipse(cx, cy, rx * PX, ry * PX, 0.3, 0, Math.PI * 2);
      x.fill();
    });
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// 귀엽게 둥근 3D 고양이. 앞(+z)을 보고 서 있어요.
export function createCat(styleName) {
  const st = CAT_STYLES[styleName];
  const root = new THREE.Group();
  const g = new THREE.Group();
  root.add(g);

  const fur = mat(st.fur);
  const bodyFur = st.texture === 'calico' ? mat(0xffffff, { map: calicoTexture('body') }) : fur;
  const headFur = st.texture === 'calico' ? mat(0xffffff, { map: calicoTexture('head') }) : fur;
  const point = mat(st.points || st.fur);
  const dark = mat(st.stripe || 0x2a2a33);
  const inner = mat(st.earInner || 0xffb3c8);
  const sph = new THREE.SphereGeometry(1, 28, 20);
  const ell = (m, x, y, z, sx, sy, sz, parent = g) => {
    const e = mesh(sph, m, x, y, z);
    e.scale.set(sx, sy, sz);
    parent.add(e);
    return e;
  };

  // 몸
  ell(bodyFur, 0, 0.55, 0, 0.95, 0.95, 0.85);
  if (st.chest && !st.chef) ell(mat(st.chest), 0, 0.5, 0.52, 0.55, 0.62, 0.42);
  (st.patches || []).filter((p) => p.body).forEach((p) => ell(mat(p.c), p.x, p.y, p.z + 0.1, p.s[0], p.s[1], p.s[2]));
  if (st.stripe) {
    [0.3, 0.6, 0.9].forEach((y, i) => {
      ell(dark, -0.0 + (i - 1) * 0.12, y, -0.8, 0.4 - i * 0.04, 0.07, 0.1);
    });
  }

  // 팔(앞발)
  const mkArm = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.8, 0.93, 0.1);
    // 어깨부터 손목까지 한 덩어리로 매끈하게 이어지는 팔 (어깨는 두툼, 손목은 살짝 잘록)
    const profile = [[0, 0.16], [0.1, 0.15], [0.17, 0.09], [0.2, 0], [0.205, -0.12], [0.19, -0.3], [0.165, -0.5], [0.15, -0.65], [0.16, -0.76], [0.12, -0.84], [0, -0.87]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    pivot.add(mesh(new THREE.LatheGeometry(new THREE.SplineCurve(profile).getPoints(40), 18), fur, 0, 0, 0));
    const paw = ell(st.paw ? mat(st.paw) : point, 0, -0.82, 0, 0.2, 0.17, 0.22, pivot);
    pivot.userData.paw = paw;
    g.add(pivot);
    return pivot;
  };
  const armL = mkArm(1);
  const armR = mkArm(-1);
  armL.rotation.z = 0.22;
  armR.rotation.z = -0.22;

  // 꼬리
  const tail = new THREE.Group();
  tail.position.set(0.25, 0.05, -0.7);
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.35, -0.1, -0.35), new THREE.Vector3(0.85, 0.2, -0.4), new THREE.Vector3(1.05, 0.8, -0.2)]);
  tail.add(mesh(new THREE.TubeGeometry(curve, 20, 0.15, 10), point));
  ell(st.stripe ? dark : point, 1.05, 0.82, -0.2, 0.17, 0.17, 0.17, tail);
  g.add(tail);

  // 머리
  const head = new THREE.Group();
  head.position.set(0, 1.55, 0);
  g.add(head);
  ell(headFur, 0, 0, 0, 1.17 * 0.88, 0.88, 0.9, head);
  if (st.points) ell(point, 0, -0.1, 0.6, 0.6, 0.55, 0.38, head);
  if (st.whiteBlaze) ell(mat(0xffffff), 0, 0.12, 0.7, 0.14, 0.45, 0.2, head);

  // 귀
  [-1, 1].forEach((s) => {
    const earMat = s < 0 ? (st.earR ? mat(st.earR) : (st.points ? point : fur)) : (st.earL ? mat(st.earL) : (st.points ? point : fur));
    const ear = mesh(new THREE.ConeGeometry(0.33, 0.58, 4), earMat, s * 0.6, 0.8, -0.02);
    ear.rotation.z = -s * 0.32;
    head.add(ear);
    const inn = mesh(new THREE.ConeGeometry(0.19, 0.38, 4), inner, s * 0.6, 0.76, 0.12);
    inn.rotation.z = -s * 0.32;
    head.add(inn);
  });
  (st.patches || []).filter((p) => !p.body).forEach((p) => ell(mat(p.c), p.x, p.y, p.z, p.s[0], p.s[1], p.s[2], head));
  if (st.stripe) {
    [-0.22, 0, 0.22].forEach((x, i) => {
      const s = ell(dark, x, 0.66 - (i === 1 ? 0 : 0.03), 0.52, 0.05, 0.2, 0.05, head);
      s.rotation.x = -0.6;
    });
    [-0.3, 0.3].forEach((x) => ell(dark, x * 2.1, -0.05, 0.62, 0.2, 0.04, 0.05, head).rotation.y = x * 2);
  }

  // 주둥이, 코
  const muzzle = ell(mat(st.muzzle || st.fur), 0, -0.22, 0.6, 0.34, 0.27, 0.34, head);
  ell(mat(0xff8fa8), 0, -0.1, 0.93, 0.07, 0.05, 0.05, head);
  // 볼터치
  const blush = mat(0xff8fa8, { transparent: true, opacity: 0.55 });
  [-1, 1].forEach((s) => {
    const b = ell(blush, s * 0.62, -0.12, 0.66, 0.14, 0.09, 0.03, head);
    b.rotation.y = s * 0.7;
  });
  // 수염
  const whiskerMat = mat(0xa99b92);
  [-1, 1].forEach((s) => {
    [-0.1, 0, 0.1].forEach((dy, i) => {
      const w = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 5), whiskerMat, s * 0.88, -0.2 + dy, 0.62);
      w.rotation.z = Math.PI / 2 + s * (i - 1) * 0.18;
      w.rotation.y = -s * 0.5;
      head.add(w);
    });
  });

  // 표정 조각들
  const ex = 0.4;
  const irisColor = st.eye || DARK;
  const irisMat = mat(irisColor, { roughness: 0.3 });
  const pupilMat = mat(DARK, { roughness: 0.3 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyes = [];
  const happyEyes = [];
  [-1, 1].forEach((s) => {
    const e = new THREE.Group();
    e.position.set(s * ex, 0.04, 0.8);
    ell(irisMat, 0, 0, 0, 0.14, 0.18, 0.08, e);
    if (st.eye) ell(pupilMat, 0, 0, 0.04, 0.07, 0.13, 0.05, e);
    ell(shine, 0.05, 0.07, 0.08, 0.04, 0.045, 0.03, e);
    ell(shine, -0.04, -0.05, 0.08, 0.02, 0.02, 0.02, e);
    head.add(e);
    eyes.push(e);
    const h = mesh(new THREE.TorusGeometry(0.12, 0.032, 6, 14, Math.PI), pupilMat, s * ex, 0.02, 0.84);
    head.add(h);
    happyEyes.push(h);
  });
  const browMat = mat(0x4a3a35);
  const brows = [-1, 1].map((s) => {
    const b = mesh(new THREE.BoxGeometry(0.24, 0.05, 0.04), browMat, s * ex, 0.3, 0.84);
    head.add(b);
    return { mesh: b, s };
  });
  const smileMat = pupilMat;
  const smile = new THREE.Group();
  [-1, 1].forEach((s) => {
    const m = mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 14, Math.PI), smileMat, s * 0.06, -0.24, 0.93);
    m.rotation.z = Math.PI;
    smile.add(m);
  });
  head.add(smile);
  const frown = mesh(new THREE.TorusGeometry(0.08, 0.017, 6, 14, Math.PI), smileMat, 0, -0.3, 0.92);
  head.add(frown);
  const open = new THREE.Group();
  const mouthIn = ell(mat(0xff6f86), 0, -0.3, 0.9, 0.11, 0.09, 0.04, open);
  ell(mat(0xff9fb0), 0, -0.34, 0.92, 0.06, 0.04, 0.03, open);
  head.add(open);
  const sweat = new THREE.Group();
  ell(mat(0x8fd3ff), 0.78, 0.3, 0.6, 0.07, 0.1, 0.06, sweat);
  const sweatTop = mesh(new THREE.ConeGeometry(0.06, 0.12, 8), mat(0x8fd3ff), 0.78, 0.42, 0.6);
  sweat.add(sweatTop);
  head.add(sweat);
  const vein = new THREE.Group();
  [0.6, -0.6].forEach((r) => {
    const b = mesh(new THREE.BoxGeometry(0.2, 0.05, 0.03), mat(0xff3d5a), 0, 0, 0);
    b.rotation.z = r;
    vein.add(b);
  });
  vein.position.set(-0.78, 0.5, 0.55);
  head.add(vein);

  // 꾸미기
  const acc = st.accessory;
  if (acc) {
    const accMat = mat(acc.color);
    const bow = (parent, x, y, z, k, rz = 0, rx = 0) => {
      // 통통하고 둥근 리본: 양쪽 둥근 날개 + 가운데 매듭 (그룹으로 묶어 표면 기울기에 맞춰요)
      const grp = new THREE.Group();
      grp.position.set(x, y, z);
      grp.rotation.set(rx, 0, rz);
      [-1, 1].forEach((s) => {
        const w = ell(accMat, s * 0.2 * k, 0, 0, 0.22 * k, 0.19 * k, 0.11 * k, grp);
        w.rotation.z = s * 0.28;
      });
      ell(accMat, 0, 0, 0.03 * k, 0.1 * k, 0.1 * k, 0.09 * k, grp);
      parent.add(grp);
    };
    if (acc.type === 'bow') {
      const collar = mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 24), accMat, 0, 0.82, 0);
      collar.rotation.x = Math.PI / 2;
      collar.scale.set(1.15, 0.95, 1);
      g.add(collar);
      bow(g, 0, 0.8, 0.8, 1.1);
    } else if (acc.type === 'ribbon') {
      // 머리 표면(타원체) 위에 살짝 얹히도록 높이와 기울기를 계산해요
      const hx = 0.6; const hz = 0.28;
      const rad = Math.sqrt(1 - (hx / 1.03) ** 2 - (hz / 0.9) ** 2);
      const surfY = 0.88 * rad;
      const slopeX = -0.88 * (hx / 1.03 ** 2) / rad;
      const slopeZ = -0.88 * (hz / 0.9 ** 2) / rad;
      bow(head, hx, surfY + 0.19, hz, 1.1, Math.atan(slopeX), -Math.atan(slopeZ));
    } else if (acc.type === 'tie') {
      ell(accMat, 0, 0.82, 0.78, 0.1, 0.09, 0.08);
      const t = mesh(new THREE.CylinderGeometry(0.07, 0.15, 0.55, 4), accMat, 0, 0.5, 0.8);
      t.scale.z = 0.35;
      g.add(t);
    } else if (acc.type === 'bell') {
      const collar = mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 24), mat(0xff6f91), 0, 0.82, 0);
      collar.rotation.x = Math.PI / 2;
      collar.scale.set(1.15, 0.95, 1);
      g.add(collar);
      ell(mat(acc.color, { metalness: 0.4, roughness: 0.3 }), 0, 0.72, 0.82, 0.12, 0.12, 0.12);
    } else if (acc.type === 'bandana') {
      const collar = mesh(new THREE.TorusGeometry(0.62, 0.06, 8, 24), accMat, 0, 0.82, 0);
      collar.rotation.x = Math.PI / 2;
      collar.scale.set(1.15, 0.95, 1);
      g.add(collar);
      const tri = mesh(new THREE.ConeGeometry(0.33, 0.45, 3), accMat, 0, 0.6, 0.78);
      tri.rotation.set(0, 0, Math.PI);
      tri.scale.z = 0.3;
      g.add(tri);
    }
  }

  // 파티시에 꾸미기
  let hat = null;
  if (st.chef) {
    const white = mat(0xffffff);
    const pink = mat(0xff8fb1);
    ell(white, 0, 0.32, 0.5, 0.64, 0.74, 0.42);
    // 앞치마 가슴 하트
    const hs = new THREE.Shape();
    hs.moveTo(0, -0.45);
    hs.bezierCurveTo(-0.55, -0.05, -0.5, 0.4, -0.2, 0.4);
    hs.bezierCurveTo(-0.08, 0.4, 0, 0.3, 0, 0.22);
    hs.bezierCurveTo(0, 0.3, 0.08, 0.4, 0.2, 0.4);
    hs.bezierCurveTo(0.5, 0.4, 0.55, -0.05, 0, -0.45);
    const heart = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 }), mat(0xff8fb1));
    heart.scale.setScalar(0.34);
    heart.position.set(0, 0.3, 0.93);
    g.add(heart);
    // 어깨끈: 앞치마 위쪽에서 어깨를 넘어 등 뒤 허리까지 몸에 붙여서
    const bodyY = (x, z) => 0.55 + 0.95 * Math.sqrt(Math.max(0.012, 1 - (x / 0.95) ** 2 - (z / 0.85) ** 2));
    [-1, 1].forEach((sx) => {
      const pts = [[0.3, 0.74], [0.42, 0.6], [0.58, 0.4], [0.72, 0.15], [0.72, -0.15], [0.58, -0.4], [0.42, -0.6], [0.3, -0.74], [0.24, -0.8], [0.2, -0.83]]
        .map(([x, z]) => new THREE.Vector3(sx * x, bodyY(x, z) + 0.035, z));
      const strap2 = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.05, 8), white);
      g.add(strap2);
    });
    const strap = mesh(new THREE.TorusGeometry(0.9, 0.055, 8, 28), white, 0, 0.45, 0);
    strap.rotation.x = Math.PI / 2;
    strap.scale.set(1.04, 0.9, 1);
    g.add(strap);
    // 뒤쪽 앞치마 리본: 둥글고 풍성한 날개 + 매듭 + 늘어진 끈
    [-1, 1].forEach((s) => {
      const w = ell(pink, s * 0.3, 0.47, -0.93, 0.3, 0.24, 0.13);
      w.rotation.z = s * 0.25;
      const tail = ell(pink, s * 0.1, 0.2, -0.93, 0.1, 0.24, 0.07);
      tail.rotation.z = s * 0.3;
    });
    ell(pink, 0, 0.45, -0.96, 0.13, 0.13, 0.11);
    hat = new THREE.Group();
    hat.position.set(0, 0.86, 0);
    hat.add(mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.34, 24), white, 0, 0, 0));
    ell(white, 0, 0.5, 0, 0.58, 0.58, 0.58, hat);
    [[-0.42, 0.42, 0], [0.42, 0.42, 0], [0, 0.45, 0.4], [0, 0.45, -0.4]].forEach(([x, y, z]) => {
      const p = mesh(sph, white, x, y, z);
      p.scale.setScalar(0.38);
      hat.add(p);
    });
    hat.add(mesh(new THREE.CylinderGeometry(0.665, 0.665, 0.07, 24), pink, 0, -0.1, 0));
    head.add(hat);
    // 머리 뒤 줄무늬
    [-0.28, 0, 0.28].forEach((x, i) => ell(dark, x, 0.28 - (i === 1 ? 0.04 : 0), -0.86, 0.07, 0.22, 0.05, head));
  }

  // 표정 바꾸기
  const mood = { name: 'normal' };
  function setMood(name) {
    mood.name = name;
    const happy = name === 'happy';
    eyes.forEach((e) => { e.visible = !happy; e.scale.y = name === 'angry' ? 0.6 : 1; });
    happyEyes.forEach((h) => { h.visible = happy; });
    smile.visible = name === 'normal';
    open.visible = happy;
    frown.visible = name === 'angry' || name === 'worried';
    frown.scale.setScalar(name === 'worried' ? 0.7 : 1);
    sweat.visible = name === 'worried';
    vein.visible = name === 'angry';
    brows.forEach(({ mesh: b, s }) => {
      b.visible = name === 'worried' || name === 'angry';
      b.rotation.z = (name === 'worried' ? -1 : 1) * 0.38 * s;
      b.position.y = name === 'worried' ? 0.34 : 0.28;
    });
  }
  setMood('normal');

  return { root, g, head, tail, armL, armR, hat, setMood, mood };
}

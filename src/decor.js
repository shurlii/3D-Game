import * as THREE from 'three';
import { mat, mesh, labelTexture } from './data.js';

// 카운터 위를 채우는 소품들: 윙윙 믹서, 스텐 볼, 밀가루, 밀대, 컵케이크
const TOP = 1.245; // 카운터 윗면 높이
const ZF = -1.3;   // 카운터 앞쪽(손님보다 파티시에에 가까운 쪽)

const steel = () => mat(0xdfe5ee, { metalness: 0.65, roughness: 0.28 });
const ell = (r, color, sx, sy, sz, x = 0, y = 0, z = 0) => {
  const m = mesh(new THREE.SphereGeometry(r, 20, 14), mat(color), x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
};

function flourPatch(x, z, r, a = 0.85, y = TOP) {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: a, depthWrite: false });
  const p = mesh(new THREE.CircleGeometry(r, 18), m, x, y + 0.004, z);
  p.rotation.x = -Math.PI / 2;
  p.scale.set(1.3, 1, 1);
  g.add(p);
  for (let i = 0; i < 6; i += 1) {
    const d = mesh(new THREE.CircleGeometry(r * (0.12 + Math.random() * 0.12), 8), m, x + (Math.random() - 0.5) * r * 3.2, y + 0.005, z + (Math.random() - 0.5) * r * 1.8);
    d.rotation.x = -Math.PI / 2;
    g.add(d);
  }
  return g;
}
// 밀가루 위에 콕콕 찍힌 고양이 발자국
function pawPrint(x, z, rot = 0) {
  const g = new THREE.Group();
  const m = new THREE.MeshBasicMaterial({ color: 0xe8d3b8, depthWrite: false });
  const pad = mesh(new THREE.CircleGeometry(0.075, 12), m, 0, 0, 0);
  pad.scale.set(1.2, 1, 1);
  g.add(pad);
  [[-0.1, 0.1], [-0.035, 0.15], [0.035, 0.15], [0.1, 0.1]].forEach(([dx, dz]) => g.add(mesh(new THREE.CircleGeometry(0.03, 8), m, dx, dz, 0)));
  g.rotation.x = -Math.PI / 2;
  g.rotation.z = rot;
  g.position.set(x, TOP + 0.007, z);
  return g;
}

function buildMixer() {
  const g = new THREE.Group();
  const white = mat(0xfffaf3, { roughness: 0.35 });
  const pink = mat(0xff8fa8);
  g.add(mesh(new THREE.BoxGeometry(1.15, 0.1, 0.72), white, 0, 0.05, 0));
  g.add(ell(0.2, 0xfffaf3, 1, 1.9, 1, -0.4, 0.55, -0.15)); // 기둥
  // 머리 (귀엽게 통통)
  const head = new THREE.Group();
  head.position.set(0, 0.98, -0.15);
  head.add(ell(0.34, 0xfffaf3, 1.75, 0.9, 1, 0, 0, 0));
  head.add(ell(0.17, 0xfffaf3, 1, 1, 1, 0.55, -0.02, 0.0));
  head.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 12), pink, 0.3, 0.2, 0.26).rotateX(Math.PI / 2));
  const dial = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 12), pink, 0.0, 0.0, 0.31);
  dial.rotation.x = Math.PI / 2;
  head.add(dial);
  g.add(head);
  // 볼과 노란 반죽
  const bowl = new THREE.Group();
  bowl.position.set(0.12, 0.1, 0.12);
  bowl.add(mesh(new THREE.CylinderGeometry(0.46, 0.3, 0.48, 24, 1, true), steel(), 0, 0.26, 0));
  bowl.children[0].material.side = THREE.DoubleSide;
  bowl.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 24), steel(), 0, 0.02, 0));
  bowl.add(mesh(new THREE.TorusGeometry(0.46, 0.03, 8, 28), steel(), 0, 0.5, 0).rotateX(Math.PI / 2));
  const batter = new THREE.Group();
  batter.position.y = 0.38;
  batter.add(mesh(new THREE.CylinderGeometry(0.4, 0.34, 0.2, 24), mat(0xffd966), 0, 0, 0));
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2;
    batter.add(ell(0.11, 0xffe58f, 1, 0.5, 1, Math.cos(a) * 0.2, 0.1, Math.sin(a) * 0.2));
  }
  bowl.add(batter);
  g.add(bowl);
  // 돌아가는 휘핑 날
  const beater = new THREE.Group();
  beater.position.set(0.12, 0.88, 0.12);
  beater.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 8), steel(), 0, 0.17, 0));
  for (let i = 0; i < 3; i += 1) {
    const w = mesh(new THREE.TorusGeometry(0.15, 0.015, 6, 20), steel(), 0, -0.1, 0);
    w.scale.set(0.55, 1.5, 1);
    w.rotation.y = (i * Math.PI) / 3;
    beater.add(w);
  }
  beater.position.y = 0.8;
  g.add(beater);
  return { group: g, head, beater, batter };
}

function steelBowl() {
  const g = new THREE.Group();
  const side = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.28, 0.36, 24, 1, true), steel());
  side.material.side = THREE.DoubleSide;
  side.position.y = 0.2;
  g.add(side);
  g.add(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.03, 24), steel(), 0, 0.03, 0));
  g.add(mesh(new THREE.TorusGeometry(0.46, 0.025, 8, 28), steel(), 0, 0.38, 0).rotateX(Math.PI / 2));
  // 딸기와 달걀이 담겨 있어요
  g.add(mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.05, 24), mat(0xfff0d6), 0, 0.28, 0));
  [[-0.14, 0.05], [0.12, -0.1], [0.0, 0.14]].forEach(([x, z], i) => {
    const e = ell(0.12, i === 1 ? 0xff4d6d : 0xffe9c4, 1, i === 1 ? 0.95 : 1.25, 1, x, 0.4, z);
    g.add(e);
  });
  // 거품기가 걸쳐져 있어요
  const whisk = new THREE.Group();
  whisk.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.4, 8), steel(), 0, 0.2, 0));
  for (let i = 0; i < 3; i += 1) {
    const w = mesh(new THREE.TorusGeometry(0.1, 0.01, 6, 16), steel(), 0, -0.05, 0);
    w.scale.set(0.5, 1.5, 1);
    w.rotation.y = (i * Math.PI) / 3;
    whisk.add(w);
  }
  whisk.position.set(0.3, 0.52, 0.05);
  whisk.rotation.z = -1.05;
  g.add(whisk);
  return g;
}

function flourBag() {
  const g = new THREE.Group();
  const paper = mat(0xf2dcb4);
  const body = mesh(new THREE.BoxGeometry(0.8, 1.0, 0.45), paper, 0, 0.5, 0);
  g.add(body);
  g.add(mesh(new THREE.BoxGeometry(0.84, 0.14, 0.49), mat(0xe6c997), 0, 0.99, 0));
  const label = mesh(new THREE.PlaneGeometry(0.62, 0.34), new THREE.MeshBasicMaterial({ map: labelTexture('밀가루', { bg: '#fff9ec', border: '#e6a64b', fg: '#8a5a2c' }), transparent: true }), 0, 0.5, 0.228);
  g.add(label);
  g.add(mesh(new THREE.CircleGeometry(0.06, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.28, 0.78, 0.229));
  // 흘러나온 밀가루 더미
  g.add(ell(0.3, 0xffffff, 1.5, 0.28, 1, 0.65, 0.04, 0.2));
  g.rotation.z = -0.05;
  return g;
}

function rollingPin() {
  const g = new THREE.Group();
  const wood = mat(0xe0a566);
  const rp = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.8, 16), wood, 0, 0, 0);
  rp.rotation.z = Math.PI / 2;
  g.add(rp);
  [-1, 1].forEach((s) => {
    const h = mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.28, 10), mat(0xc98a4b), s * 0.54, 0, 0);
    h.rotation.z = Math.PI / 2;
    g.add(h);
    g.add(ell(0.06, 0xc98a4b, 1, 1, 1, s * 0.69, 0, 0));
  });
  g.position.y = 0.11;
  g.rotation.y = 0.35;
  return g;
}

function cupcake(color = 0xff9fc0) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.2, 12), mat(0xe8a8b8), 0, 0.1, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.22, 0.2, 0.1, 12), mat(0xffe3a3), 0, 0.25, 0));
  g.add(ell(0.22, color, 1, 0.8, 1, 0, 0.36, 0));
  g.add(ell(0.15, color, 1, 0.8, 1, 0, 0.5, 0));
  g.add(mesh(new THREE.ConeGeometry(0.08, 0.14, 8), mat(color), 0, 0.64, 0));
  g.add(ell(0.05, 0xff4d6d, 1, 1, 1, 0, 0.74, 0));
  return g;
}

export function createDecor(scene) {
  const root = new THREE.Group();
  root.position.set(0, TOP, -1.7);
  scene.add(root);

  const mixer = buildMixer();
  const mixerG = mixer.group;
  mixerG.position.set(-1.4, 0, ZF + 1.7 - 0.05);
  root.add(mixerG);

  const bowl = steelBowl();
  bowl.position.set(1.3, 0, ZF + 1.7 - 0.05);
  root.add(bowl);

  const bag = flourBag();
  root.add(bag);
  const pin = rollingPin();
  root.add(pin);
  const cups = new THREE.Group();
  const c1 = cupcake(0xff9fc0);
  const c2 = cupcake(0xb9e3ff);
  c2.position.set(0.42, 0, 0.05);
  cups.add(c1, c2);
  root.add(cups);

  // 밀가루 얼룩과 발자국 (소품마다 그 둘레에 묻어 있어요)
  mixerG.add(flourPatch(0.1, 0.25, 0.6, 0.85, 0.001));
  bowl.add(flourPatch(0, 0.1, 0.55, 0.8, 0.001));
  bag.add(flourPatch(0.5, 0.3, 0.75, 0.9, 0.001));
  pin.add(flourPatch(0, 0.0, 0.6, 0.8, -0.109));
  cups.add(flourPatch(0.2, 0.1, 0.5, 0.75, 0.001));
  let t = 0;
  return {
    root,
    // 손님 자리 간격(sx)과 화면 가로 절반(vis)에 맞춰 소품을 배치해요
    place(sx, vis) {
      const k = THREE.MathUtils.clamp(sx / 2.6, 0.62, 1);
      const zf = 0.42;
      mixerG.position.set(-sx * 0.5, 0, zf);
      mixerG.scale.setScalar(k);
      bowl.position.set(sx * 0.5 + 0.05, 0, zf + 0.1);
      bowl.scale.setScalar(k * 0.9);
      const outer = Math.min(vis - 0.9, sx + 1.5);
      bag.position.set(outer, 0, 0.1);
      bag.scale.setScalar(k * 0.9);
      pin.position.set(-outer + 0.2, 0, 0.35);
      pin.scale.setScalar(k);
      cups.position.set(outer - 1.15, 0, 0.45);
      cups.scale.setScalar(k * 0.95);
    },
    update(dt, tt) {
      t = tt;
      mixer.beater.rotation.y += dt * 9;
      mixer.batter.rotation.y -= dt * 5;
      mixer.batter.scale.y = 1 + Math.sin(t * 7) * 0.05;
      mixer.head.rotation.z = Math.sin(t * 22) * 0.012;
      mixer.head.position.y = 0.98 + Math.sin(t * 22) * 0.004;
    },
  };
}

import * as THREE from 'three';
import { mat, mesh, FOOD_MODELS } from './data.js';
import { createCat } from './cat.js';

// 매장 뒤쪽 휴게 공간: 소파와 티테이블, 캣타워, 캣휠, 그리고 쉬고 있는 손님 고양이들
const capsule = (r, len, material, x, y, z) => mesh(new THREE.CapsuleGeometry(r, len, 6, 14), material, x, y, z);
const ball = (r, material, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const m = mesh(new THREE.SphereGeometry(r, 18, 14), material, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
};

function buildSofa() {
  const g = new THREE.Group();
  const body = mat(0xff9fbd);
  const soft = mat(0xffc3d6);
  const gold = mat(0xe8b45a, { metalness: 0.3, roughness: 0.4 });
  g.add(mesh(new THREE.BoxGeometry(3.3, 0.42, 1.25), body, 0, 0.42, 0));
  [-0.72, 0.72].forEach((x) => g.add(mesh(new THREE.BoxGeometry(1.5, 0.3, 1.05), soft, x, 0.78, 0.08)));
  const back = capsule(0.33, 2.6, body, 0, 1.2, -0.5);
  back.rotation.z = Math.PI / 2;
  g.add(back);
  [-1.72, 1.72].forEach((x) => {
    const arm = capsule(0.3, 0.7, body, x, 0.95, 0);
    arm.rotation.x = Math.PI / 2;
    g.add(arm);
    g.add(mesh(new THREE.BoxGeometry(0.4, 0.6, 1.25), body, x, 0.55, 0));
  });
  [[-1.5, -0.45], [1.5, -0.45], [-1.5, 0.45], [1.5, 0.45]].forEach(([x, z]) => g.add(mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.22, 8), gold, x, 0.11, z)));
  const pillow = (x, color, rz) => { const p = mesh(new THREE.BoxGeometry(0.5, 0.5, 0.16), mat(color), x, 1.2, -0.12); p.rotation.z = rz; p.rotation.y = -0.2; return p; };
  g.add(pillow(-1.25, 0xfff2b8, 0.2), pillow(1.25, 0xbfe3ff, -0.2));
  return g;
}

function buildTable() {
  const g = new THREE.Group();
  const wood = mat(0xe9b783);
  g.add(mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.1, 28), mat(0xfff4ea), 0, 0.88, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.05, 28), mat(0xff9fbd), 0, 0.82, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.8, 12), wood, 0, 0.42, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.08, 20), wood, 0, 0.04, 0));
  // 찻주전자와 컵, 케이크
  const teapot = new THREE.Group();
  teapot.add(ball(0.2, mat(0xbfe3ff), 0, 0, 0, 1, 0.85, 1));
  teapot.add(ball(0.07, mat(0xff8fab), 0, 0.17, 0));
  const spout = mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.22, 8), mat(0xbfe3ff), 0.25, 0.04, 0);
  spout.rotation.z = -0.9;
  teapot.add(spout);
  teapot.position.set(-0.3, 1.08, -0.1);
  g.add(teapot);
  [[0.3, -0.35], [0.4, 0.3]].forEach(([x, z]) => {
    g.add(mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.13, 12), mat(0xfff9f2), x, 1.0, z));
  });
  const cake = FOOD_MODELS.strawberryCake();
  cake.scale.setScalar(0.36);
  cake.position.set(0.0, 1.17, 0.32);
  g.add(cake);
  g.add(mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.04, 16), mat(0xffffff), 0, 0.96, 0.32));
  return g;
}

function buildStool() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.14, 16), mat(0xff9fbd), 0, 0.5, 0));
  [0, 1, 2].forEach((i) => {
    const a = (i / 3) * Math.PI * 2;
    const leg = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6), mat(0xe9b783), Math.cos(a) * 0.2, 0.22, Math.sin(a) * 0.2);
    g.add(leg);
  });
  return g;
}

function buildTower() {
  const g = new THREE.Group();
  const carpet = mat(0xb9d5ee);
  const sisal = mat(0xd9b27c, { roughness: 0.95 });
  g.add(mesh(new THREE.BoxGeometry(1.9, 0.3, 1.5), carpet, 0, 0.15, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 3.3, 14), sisal, 0.1, 1.9, 0));
  // 집
  const house = new THREE.Group();
  house.add(mesh(new THREE.BoxGeometry(1.2, 1.0, 1.1), carpet, 0, 0.5, 0));
  house.add(mesh(new THREE.BoxGeometry(1.3, 0.12, 1.2), mat(0xff9fbd), 0, 1.04, 0));
  house.add(mesh(new THREE.CircleGeometry(0.34, 18), mat(0x4a3b5c), 0, 0.42, 0.56));
  house.position.set(-0.2, 0.3, 0.1);
  g.add(house);
  // 발판
  const plat = (y, x, r) => { const p = mesh(new THREE.CylinderGeometry(r, r, 0.14, 24), carpet, x, y, 0); const rim = mesh(new THREE.TorusGeometry(r, 0.05, 8, 24), mat(0xff9fbd), x, y + 0.04, 0); rim.rotation.x = Math.PI / 2; g.add(p, rim); };
  plat(2.2, 0.5, 0.75);
  plat(3.45, 0.1, 0.7);
  // 장난감 (달랑달랑)
  const toy = new THREE.Group();
  toy.position.set(0.9, 2.2, 0.45);
  toy.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.7, 4), mat(0xffffff), 0, -0.35, 0));
  toy.add(ball(0.13, mat(0xff5d7a), 0, -0.78, 0));
  toy.add(ball(0.07, mat(0xffe27a), 0.08, -0.62, 0.05));
  g.add(toy);
  g.userData.toy = toy;
  return g;
}

function buildWheel() {
  const g = new THREE.Group();
  const frame = mat(0xffffff);
  const pink = mat(0xff9fbd);
  const wheel = new THREE.Group();
  wheel.position.set(0, 1.85, 0);
  const ring = mesh(new THREE.TorusGeometry(1.5, 0.13, 12, 40), pink, 0, 0, 0.0);
  wheel.add(ring);
  const ring2 = mesh(new THREE.TorusGeometry(1.5, 0.13, 12, 40), pink, 0, 0, -0.9);
  wheel.add(ring2);
  const drum = mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.9, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xfff2d6, roughness: 0.8, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }), 0, 0, -0.45);
  drum.rotation.x = Math.PI / 2;
  wheel.add(drum);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const rung = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 6), frame, Math.cos(a) * 1.42, Math.sin(a) * 1.42, -0.45);
    rung.rotation.x = Math.PI / 2;
    wheel.add(rung);
  }
  wheel.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.2, 12), mat(0xe8b45a), 0, 0, -0.45).rotateX(Math.PI / 2));
  g.add(wheel);
  // 받침대
  [-0.28, -0.9].forEach((z) => {
    [-1, 1].forEach((s) => {
      const leg = mesh(new THREE.BoxGeometry(0.16, 2.2, 0.16), frame, s * 0.55, 1.0, z);
      leg.rotation.z = -s * 0.5;
      g.add(leg);
    });
  });
  g.add(mesh(new THREE.BoxGeometry(2.6, 0.16, 1.4), mat(0xb9d5ee), 0, 0.08, -0.6));
  g.userData.wheel = wheel;
  return g;
}

function plant() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.4, 12), mat(0xff9fbd), 0, 0.2, 0));
  [[0, 0.75, 0, 0.38], [-0.22, 0.6, 0.05, 0.26], [0.22, 0.62, -0.05, 0.28]].forEach(([x, y, z, r]) => g.add(ball(r, mat(0x6fcf8c), x, y, z)));
  return g;
}

function zzzSprite() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const x = c.getContext('2d');
  x.font = '44px "Jua", sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 8; x.strokeStyle = '#ffffff'; x.lineJoin = 'round';
  x.strokeText('Zzz', 64, 34);
  x.fillStyle = '#7aa7e8';
  x.fillText('Zzz', 64, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(1.0, 0.5, 1);
  return s;
}

export function createLounge(scene) {
  const root = new THREE.Group();
  scene.add(root);

  const rug = mesh(new THREE.CircleGeometry(1, 40), mat(0xffe3ec), 0, 0.012, 0);
  rug.rotation.x = -Math.PI / 2;
  root.add(rug);
  const rug2 = mesh(new THREE.RingGeometry(0.82, 0.9, 40), mat(0xff9fbd), 0, 0.014, 0);
  rug2.rotation.x = -Math.PI / 2;
  root.add(rug2);

  const sofa = buildSofa();
  const table = buildTable();
  const tower = buildTower();
  const wheelSet = buildWheel();
  const stoolA = buildStool();
  const stoolB = buildStool();
  const plantA = plant();
  const plantB = plant();
  [sofa, table, tower, wheelSet, stoolA, stoolB, plantA, plantB].forEach((o) => root.add(o));

  // 쉬고 있는 손님들
  const cats = [];
  const addCat = (type, parent, x, y, z, s, mood = 'normal', ry = 0) => {
    const c = createCat(type);
    c.root.scale.setScalar(s);
    c.root.position.set(x, y + 0.4 * s, z);
    c.root.rotation.y = ry;
    c.setMood(mood);
    c.armL.rotation.set(-0.5, 0, 0.3);
    c.armR.rotation.set(-0.5, 0, -0.3);
    parent.add(c.root);
    cats.push({ ...c, phase: Math.random() * 6, base: c.root.position.y });
    return c;
  };
  const sofaCatA = addCat('white', sofa, -0.8, 0.85, 0.05, 0.62, 'happy');
  const sofaCatB = addCat('calico', sofa, 0.8, 0.85, 0.05, 0.62, 'happy');
  const teaCat = addCat('siamese', stoolA, 0, 0.58, 0, 0.55, 'happy');
  const teaCat2 = addCat('gray', stoolB, 0, 0.58, 0, 0.55, 'normal');
  const towerCat = addCat('cheese', tower, 0.1, 3.52, 0, 0.5, 'happy');
  const houseCat = addCat('black', tower, -0.2, 0.3 + 1.1, 0.1, 0.4, 'normal');
  const wheel = wheelSet.userData.wheel;
  const wheelCatHolder = new THREE.Group();
  wheelCatHolder.position.set(0, 0, -0.45);
  wheel.add(wheelCatHolder);
  const runCat = createCat('tuxedo');
  runCat.root.scale.setScalar(0.5);
  runCat.setMood('happy');
  wheelSet.add(runCat.root);
  runCat.root.position.set(0, 1.85 - 1.45 + 0.4 * 0.5 + 0.05, -0.45);

  const zzz = [zzzSprite(), zzzSprite()];
  sofa.add(zzz[0], zzz[1]);

  let layout = { k: 1 };
  return {
    root,
    place(vis) {
      const k = THREE.MathUtils.clamp(vis / 8.5, 0.52, 1);
      layout.k = k;
      const z = -6.2;
      rug.position.set(0, 0.012, z);
      rug.scale.set(5.2 * k, 3.1 * k, 1);
      rug2.scale.copy(rug.scale);
      rug2.position.copy(rug.position);
      const X = (v) => v * k;
      sofa.position.set(X(-2.6), 0, X(0) + z - 0.2);
      sofa.scale.setScalar(k);
      table.position.set(X(2.6), 0, z);
      table.scale.setScalar(k);
      stoolA.position.set(X(1.5), 0, z + 0.9 * k);
      stoolB.position.set(X(3.7), 0, z + 0.9 * k);
      stoolA.scale.setScalar(k); stoolB.scale.setScalar(k);
      tower.position.set(X(-7.2), 0, z - 1.4);
      tower.scale.setScalar(k * 0.95);
      wheelSet.position.set(X(7.4), 0, z - 1.2);
      wheelSet.scale.setScalar(k * 0.95);
      wheelSet.rotation.y = -0.35;
      tower.rotation.y = 0.3;
      plantA.position.set(X(-5.0), 0, z + 0.6);
      plantB.position.set(X(5.4), 0, z + 0.4);
      plantA.scale.setScalar(k * 1.1); plantB.scale.setScalar(k);
    },
    update(dt, t) {
      cats.forEach((c) => {
        c.tail.rotation.z = Math.sin(t * 2 + c.phase) * 0.35;
        c.g.scale.y = 1 + Math.sin(t * 1.6 + c.phase) * 0.012; // 숨쉬기
      });
      // 티타임 고양이: 컵을 홀짝
      teaCat.armR.rotation.x = -0.9 + Math.sin(t * 1.4) * 0.35;
      teaCat2.head.rotation.z = Math.sin(t * 0.8) * 0.08;
      towerCat.head.rotation.z = Math.sin(t * 0.7 + 1) * 0.1;
      houseCat.head.rotation.y = Math.sin(t * 0.6) * 0.35;
      const toy = tower.userData.toy;
      toy.rotation.z = Math.sin(t * 2.1) * 0.35;
      // 캣휠: 천천히 돌고 고양이는 열심히 달려요
      wheel.rotation.z -= dt * 0.9;
      runCat.armL.rotation.x = Math.sin(t * 9) * 0.7;
      runCat.armR.rotation.x = -Math.sin(t * 9) * 0.7;
      runCat.g.position.y = Math.abs(Math.sin(t * 9)) * 0.08;
      runCat.tail.rotation.z = Math.sin(t * 7) * 0.4;
      // 자는 고양이의 Zzz
      zzz.forEach((s, i) => {
        const p = (t * 0.35 + i * 0.5) % 1;
        const base = i === 0 ? -0.8 : 0.8;
        s.position.set(base + p * 0.5, 2.1 + p * 0.9, 0.1);
        s.material.opacity = Math.sin(p * Math.PI);
        s.scale.setScalar(0.5 + p * 0.5);
        s.scale.y = s.scale.x * 0.5;
      });
    },
  };
}

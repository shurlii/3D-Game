import * as THREE from 'three';
import { mat, mesh } from './data.js';

// 구름 위 빵집의 바닥, 차양, 깃발, 구름. 게임 장면과 매장 장면이 함께 씁니다.
export function createWorld(scene, { awningZ = -4.2, awningY = 6.6 } = {}) {
  const SKY = new THREE.Color(0xcfe8ff);
  scene.background = SKY;
  scene.fog = new THREE.Fog(SKY, 24, 52);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xffe3ec, 2.5));
  const sun = new THREE.DirectionalLight(0xfff0dc, 1.8);
  sun.position.set(4, 10, 7);
  scene.add(sun);

  // 바닥
  const checker = document.createElement('canvas');
  checker.width = checker.height = 128;
  const cg = checker.getContext('2d');
  cg.fillStyle = '#fff6ea'; cg.fillRect(0, 0, 128, 128);
  cg.fillStyle = '#ffd1e0'; cg.fillRect(0, 0, 64, 64); cg.fillRect(64, 64, 64, 64);
  const floorTex = new THREE.CanvasTexture(checker);
  floorTex.colorSpace = THREE.SRGBColorSpace;
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(10, 12);
  const side = mat(0xfff0e0);
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(20, 0.6, 24),
    [side, side, mat(0xffffff, { map: floorTex }), side, side, side]
  );
  floor.position.set(0, -0.3, 0);
  scene.add(floor);

  // 차양
  const awning = new THREE.Group();
  awning.position.set(0, awningY, awningZ);
  for (let i = 0; i < 14; i += 1) {
    const stripe = mesh(new THREE.BoxGeometry(0.95, 0.14, 2.4), mat(i % 2 ? 0xffffff : 0xff9fb8), (i - 6.5) * 0.95, 0, 0.4);
    stripe.rotation.x = 0.35;
    awning.add(stripe);
  }
  const fringe = new THREE.BoxGeometry(0.95, 0.22, 0.1);
  for (let i = 0; i < 14; i += 1) {
    awning.add(mesh(fringe, mat(i % 2 ? 0xffffff : 0xff9fb8), (i - 6.5) * 0.95, -0.52, 1.5));
  }
  [-6.2, 6.2].forEach((x) => awning.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, awningY, 10), mat(0xd9a066), x, -awningY / 2, 1.3)));
  scene.add(awning);

  // 깃발
  const flagGeo = new THREE.ConeGeometry(0.28, 0.55, 3);
  const flagColors = [0xff9fb8, 0xffe27a, 0x9ad0ff, 0xb9f0c8, 0xc7a0ff];
  const flags = [];
  for (let i = 0; i < 17; i += 1) {
    const t = i / 16;
    const f = mesh(flagGeo, mat(flagColors[i % flagColors.length]), (t - 0.5) * 13, awningY + 1.8 - Math.sin(t * Math.PI) * 0.7, awningZ + 2);
    f.rotation.x = Math.PI;
    f.rotation.y = 0.5;
    scene.add(f);
    flags.push(f);
  }

  // 구름
  const cloudMat = mat(0xffffff, { roughness: 1 });
  const cloudBall = new THREE.SphereGeometry(1, 14, 10);
  const clouds = [];
  function makeCloud(x, y, z, s) {
    const c = new THREE.Group();
    [[0, 0, 1], [1.1, -0.15, 0.8], [-1.1, -0.2, 0.75], [0.5, 0.45, 0.7], [-0.5, 0.35, 0.65]].forEach(([dx, dy, r]) => {
      const b = mesh(cloudBall, cloudMat, dx, dy, 0);
      b.scale.setScalar(r);
      c.add(b);
    });
    c.position.set(x, y, z);
    c.scale.setScalar(s);
    c.userData.speed = 0.15 + Math.random() * 0.2;
    scene.add(c);
    clouds.push(c);
  }
  // 아래쪽 구름은 윗부분이 바닥(y=0)보다 확실히 아래에 오도록 높이를 계산해요
  const low = (x, z, s) => makeCloud(x, -0.9 - 1.25 * s, z, s);
  low(-10, -1, 1.8); low(11, 1, 2.1); low(-7, 6, 1.6); low(8, 8, 1.4); low(-2, 14, 2.0); low(3, -15, 2.4); makeCloud(-13, 5, -14, 2.8); makeCloud(12, 7, -16, 3.2);
  makeCloud(0, 10, -22, 3.4); makeCloud(-18, 1, -18, 2.6); makeCloud(16, 2, -12, 2.4);

  return {
    update(dt, t) {
      clouds.forEach((c) => {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > 24) c.position.x = -24;
      });
      flags.forEach((f, i) => { f.rotation.z = Math.sin(t * 1.6 + i * 0.7) * 0.12; });
    },
  };
}

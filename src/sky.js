// 시작 화면: 화면 가득 뭉게구름 하늘에서 빵과 쿠키가 떨어져요 (2D 캔버스, 가벼워요)
export function startSky(canvas, imgSrcs) {
  const ctx = canvas.getContext('2d');
  const imgs = imgSrcs.filter(Boolean).map((src) => { const i = new Image(); i.src = src; return i; });
  const rnd = (a, b) => a + Math.random() * (b - a);
  let W = 0; let H = 0; let dpr = 1; let raf = 0; let running = true;
  let back = null; let front = null;
  const items = [];

  // 구름 덩어리 하나 = 둥근 방울 여러 개를 겹쳐서 통통하게
  function drawClouds(x, list) {
    list.forEach(([cx, cy, w, tone]) => {
      const n = 7;
      for (let i = 0; i < n; i += 1) {
        const t = i / (n - 1);
        const r = w * (0.16 + 0.1 * Math.sin(t * Math.PI) + Math.random() * 0.05);
        const px = cx + (t - 0.5) * w;
        const py = cy - Math.sin(t * Math.PI) * w * 0.1 + (Math.random() - 0.5) * w * 0.06;
        const g = x.createRadialGradient(px - r * 0.3, py - r * 0.4, r * 0.1, px, py, r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.65, tone); g.addColorStop(1, tone);
        x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
      }
    });
  }
  const layerCanvas = () => {
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    const x = c.getContext('2d'); x.scale(dpr, dpr);
    return [c, x];
  };
  function build() {
    const s = Math.max(W, H * 0.7);
    // 뒤쪽 구름: 하늘 중간~아래에 옅게
    const [bc, bx] = layerCanvas();
    const bi = [];
    for (let i = 0; i < 9; i += 1) bi.push([rnd(-0.05, 1.05) * W, H * rnd(0.38, 0.78), s * rnd(0.35, 0.6), '#e3f1ff']);
    drawClouds(bx, bi);
    // 앞쪽 구름: 아래와 양옆, 위쪽까지 통통하게 가득
    const [fc, fx] = layerCanvas();
    const fi = [];
    for (let i = 0; i < 7; i += 1) fi.push([(i / 6) * W * 1.1 - W * 0.05, H * rnd(0.86, 1.02), s * rnd(0.45, 0.7), i % 2 ? '#fff0f5' : '#ffffff']);
    for (let i = 0; i < 3; i += 1) fi.push([-W * 0.02, H * (0.45 + i * 0.22), s * 0.38, '#ffffff'], [W * 1.02, H * (0.4 + i * 0.24), s * 0.38, '#fff0f5']);
    for (let i = 0; i < 4; i += 1) fi.push([rnd(0.1, 0.9) * W, H * rnd(0, 0.05), s * rnd(0.3, 0.45), '#ffffff']);
    drawClouds(fx, fi);
    back = bc; front = fc;
  }

  function spawn(initial) {
    const size = rnd(60, 104);
    items.push({
      img: imgs[Math.floor(Math.random() * imgs.length)],
      x: rnd(0.04, 0.96) * W, y: initial ? rnd(-0.2, 0.9) * H : -size,
      s: size, v: rnd(40, 90), rot: rnd(-0.5, 0.5), vr: rnd(-0.7, 0.7), sw: rnd(0, 6), swa: rnd(8, 26),
    });
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = canvas.clientWidth; H = canvas.clientHeight;
    if (!W || !H) return;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    build();
    if (!items.length) {
      const n = Math.round(Math.min(16, Math.max(9, W / 70)));
      for (let i = 0; i < n; i += 1) spawn(true);
    }
  }

  let last = performance.now(); let t = 0;
  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (!W || !H || !back) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(back, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    let fell = 0;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const it = items[i];
      it.y += it.v * dt; it.rot += it.vr * dt;
      if (it.y > H * 0.95) { items.splice(i, 1); fell += 1; continue; }
      ctx.save();
      ctx.translate(it.x + Math.sin(t * 1.2 + it.sw) * it.swa, it.y);
      ctx.rotate(it.rot);
      if (it.img.complete) ctx.drawImage(it.img, -it.s / 2, -it.s / 2, it.s, it.s);
      ctx.restore();
    }
    for (let i = 0; i < fell; i += 1) spawn(false);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(front, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();
  raf = requestAnimationFrame(frame);
  return { stop() { running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); } };
}

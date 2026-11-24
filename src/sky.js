// 시작 화면: 화면 가득 뭉게구름 하늘에서 빵과 쿠키가 떨어져요 (2D 캔버스, 가벼워요)
export function startSky(canvas, imgSrcs) {
  const ctx = canvas.getContext('2d');
  const imgs = imgSrcs.filter(Boolean).map((src) => { const i = new Image(); i.src = src; return i; });
  const rnd = (a, b) => a + Math.random() * (b - a);
  let W = 0; let H = 0; let dpr = 1; let raf = 0; let running = true;
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
  // 하늘에 몇 개만 둥둥 떠다니는 구름 (메인 화면처럼)
  const puffs = [];
  function build() {
    puffs.length = 0;
    const s = Math.max(W, H * 0.7);
    const n = W > H ? 6 : 4;
    for (let i = 0; i < n; i += 1) {
      const w = s * rnd(0.22, 0.34);
      const c = document.createElement('canvas');
      c.width = Math.ceil(w * 1.5 * dpr); c.height = Math.ceil(w * 0.9 * dpr);
      const x = c.getContext('2d'); x.scale(dpr, dpr);
      drawClouds(x, [[w * 0.75, w * 0.55, w, i % 2 ? '#fff0f5' : '#ffffff']]);
      puffs.push({ c, w: w * 1.5, h: w * 0.9, x: rnd(-0.1, 1) * W, y: H * (0.08 + (i / n) * 0.8) + rnd(-0.04, 0.04) * H, v: rnd(6, 16) });
    }
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
    if (!W || !H) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    puffs.forEach((p) => { p.x += p.v * dt; if (p.x > W + 20) p.x = -p.w; ctx.drawImage(p.c, p.x, p.y, p.w, p.h); });
    let fell = 0;
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const it = items[i];
      it.y += it.v * dt; it.rot += it.vr * dt;
      if (it.y > H + it.s) { items.splice(i, 1); fell += 1; continue; }
      ctx.save();
      ctx.translate(it.x + Math.sin(t * 1.2 + it.sw) * it.swa, it.y);
      ctx.rotate(it.rot);
      if (it.img.complete) ctx.drawImage(it.img, -it.s / 2, -it.s / 2, it.s, it.s);
      ctx.restore();
    }
    for (let i = 0; i < fell; i += 1) spawn(false);
  }
  window.addEventListener('resize', resize);
  resize();
  raf = requestAnimationFrame(frame);
  return { stop() { running = false; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); } };
}

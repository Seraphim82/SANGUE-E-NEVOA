/**
 * Ilustrações das cenas.
 *
 * Desenha o fundo de cada cena num <canvas>: usa a pintura de img/scenes/ quando ela
 * existe e, como reserva, uma ilustração procedural em silhuetas. Por cima aplica as
 * animações (névoa, brasas, neve, vento) e, em combate, os retratos dos inimigos.
 */
"use strict";

const ART = (() => {
  const W = 1000,
    H = 455,
    TAU = Math.PI * 2;
  const lerp = (a, b, f) => a + (b - a) * f;
  function rng(seed) {
    let s = (seed * 2654435761) >>> 0 || 7;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  const rgba = (a, al) => `rgba(${a[0]},${a[1]},${a[2]},${al})`;
  function sky(c, st) {
    const g = c.createLinearGradient(0, 0, 0, H);
    st.forEach(([o, col]) => g.addColorStop(o, col));
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }
  function glow(c, x, y, r, col, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function stars(c, n, seed, t, maxY) {
    const R = rng(seed);
    for (let i = 0; i < n; i++) {
      const x = R() * W,
        y = R() * maxY,
        s = R() * 1.6 + 0.4,
        p = R() * TAU;
      c.fillStyle = `rgba(230,236,245,${0.3 + 0.35 * Math.sin(t * 1.3 + p) ** 2})`;
      c.fillRect(x, y, s, s);
    }
  }
  function moon(c, x, y, r) {
    glow(c, x, y, r * 7, [190, 210, 235], 0.2);
    c.fillStyle = "#e8edf0";
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
    c.fillStyle = "rgba(150,165,180,.35)";
    c.beginPath();
    c.arc(x - r * 0.3, y - r * 0.2, r * 0.22, 0, TAU);
    c.arc(x + r * 0.25, y + r * 0.3, r * 0.15, 0, TAU);
    c.fill();
  }
  function ridge(c, base, amp, col, seed, f = 1, jag = 0) {
    const R = rng(seed);
    const p = [R() * TAU, R() * TAU, R() * TAU, R() * TAU];
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, H);
    for (let x = 0; x <= W; x += 5) {
      const u = (x / W) * TAU * f;
      const v =
        0.5 +
        0.28 * Math.sin(u + p[0]) +
        0.14 * Math.sin(u * 2.3 + p[1]) +
        0.06 * Math.sin(u * 5.7 + p[2]) +
        jag * 0.06 * Math.sin(u * 17 + p[3]);
      c.lineTo(x, base - amp * v);
    }
    c.lineTo(W, H);
    c.closePath();
    c.fill();
  }
  function ground(c, y, col) {
    c.fillStyle = col;
    c.fillRect(0, y, W, H - y);
  }
  function pine(c, x, y, s, col) {
    c.fillStyle = col;
    for (let i = 0; i < 3; i++) {
      const w = s * (0.36 - i * 0.08),
        yy = y - s * 0.12 - i * s * 0.24;
      c.beginPath();
      c.moveTo(x - w, yy);
      c.lineTo(x, yy - s * 0.46);
      c.lineTo(x + w, yy);
      c.fill();
    }
    c.fillRect(x - s * 0.03, y - s * 0.14, s * 0.06, s * 0.14);
  }
  function oak(c, x, y, s, col, seed = 1) {
    const R = rng(seed);
    c.fillStyle = col;
    c.strokeStyle = col;
    c.lineWidth = s * 0.07;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + s * 0.1, y - s * 0.35, x - s * 0.03, y - s * 0.58);
    c.stroke();
    for (let i = 0; i < 8; i++) {
      c.beginPath();
      c.arc(x + (R() - 0.5) * s * 0.75, y - s * 0.62 - R() * s * 0.3, s * (0.13 + R() * 0.12), 0, TAU);
      c.fill();
    }
  }
  function flameTongue(c, x, y, w, h, sway, col) {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x - w, y);
    c.bezierCurveTo(x - w, y - h * 0.45, x + sway - w * 0.35, y - h * 0.7, x + sway, y - h);
    c.bezierCurveTo(x + sway + w * 0.35, y - h * 0.7, x + w, y - h * 0.45, x + w, y);
    c.closePath();
    c.fill();
  }
  function flames(c, x, y, s, t, seed = 1, spread, cold) {
    spread = spread == null ? s * 0.3 : spread;
    const R = rng(seed);
    glow(c, x, y - s * 0.3, s * 1.5, cold ? [150, 190, 230] : [255, 120, 40], cold ? 0.25 : 0.42);
    const cols = cold ? ["#30465f", "#5f80a3", "#c6dbee"] : ["#8a240c", "#e0601a", "#ffd27a"];
    for (let i = 0; i < 6; i++) {
      const ox = (R() - 0.5) * 2 * spread,
        base = s * (0.45 + R() * 0.6),
        sp = 7 + R() * 5,
        ph = R() * TAU;
      const hh = base * (0.78 + 0.22 * Math.sin(t * sp + ph)),
        ww = s * (0.11 + R() * 0.09),
        sw = Math.sin(t * 3.1 + ph) * ww * 0.8;
      for (let k = 0; k < 3; k++) {
        const f = 1 - k * 0.3;
        flameTongue(c, x + ox, y, ww * f, hh * f, sw * f, cols[k]);
      }
    }
  }
  function embers(c, x, y, spread, height, n, t, seed, col = [255, 170, 80], size = 2.2) {
    const R = rng(seed);
    for (let i = 0; i < n; i++) {
      const sp = 25 + R() * 45,
        ph = R() * height,
        life = (t * sp + ph) % height;
      const px = x + (R() - 0.5) * spread + Math.sin(t * 2 + i) * 14 * (life / height);
      const a = 1 - life / height;
      c.fillStyle = rgba(col, a * 0.9);
      c.fillRect(px, y - life, size, size);
    }
  }
  function falling(c, n, t, seed, col, speed = 20, size = 2) {
    const R = rng(seed);
    for (let i = 0; i < n; i++) {
      const x = (R() * W + Math.sin(t * 0.7 + i) * 20 + W) % W,
        y = (R() * H + t * speed * (0.6 + R() * 0.8)) % H;
      c.fillStyle = rgba(col, 0.35 + R() * 0.4);
      c.fillRect(x, y, size, size);
    }
  }
  function mist(c, y, band, n, t, seed, al, col = [210, 222, 230], speed = 8) {
    const R = rng(seed);
    for (let i = 0; i < n; i++) {
      const span = W * 1.8;
      const x = ((R() * span + t * speed * (0.5 + R())) % span) - W * 0.4;
      const yy = y + (R() - 0.5) * band;
      const r = 60 + R() * 110;
      c.save();
      c.translate(x, yy);
      c.scale(2.8, 1);
      glow(c, 0, 0, r, col, al * (0.6 + R() * 0.4));
      c.restore();
    }
  }
  function water(c, y0, y1, col, t, seed, sh = [170, 200, 225]) {
    c.fillStyle = col;
    c.fillRect(0, y0, W, y1 - y0);
    const R = rng(seed);
    for (let i = 0; i < 80; i++) {
      const yy = y0 + R() * (y1 - y0),
        len = 10 + R() * 40,
        x = ((R() * W + t * (8 + R() * 18)) % (W + 60)) - 30;
      c.fillStyle = rgba(sh, 0.05 + 0.13 * Math.sin(t * 1.7 + i) ** 2);
      c.fillRect(x, yy, len, 1.5);
    }
  }
  function reflection(c, x, y0, y1, t, col = [220, 232, 240]) {
    for (let yy = y0; yy < y1; yy += 6) {
      const w = 8 + (yy - y0) * 0.25 + Math.sin(t * 2 + yy * 0.3) * 5;
      c.fillStyle = rgba(col, 0.32 * (1 - (yy - y0) / (y1 - y0)));
      c.fillRect(x - w / 2 + Math.sin(t * 1.5 + yy) * 3, yy, w, 2);
    }
  }
  function reeds(c, y, n, seed, col, t, hmax = 70) {
    const R = rng(seed);
    c.strokeStyle = col;
    c.fillStyle = col;
    c.lineWidth = 2;
    for (let i = 0; i < n; i++) {
      const x = R() * W,
        h = 25 + R() * hmax,
        sw = Math.sin(t * 1.2 + i) * 5;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + sw * 0.3, y - h * 0.5, x + sw, y - h);
      c.stroke();
      if (R() < 0.25) {
        c.beginPath();
        c.ellipse(x + sw, y - h + 6, 2.6, 8, 0, 0, TAU);
        c.fill();
      }
    }
  }
  function cliff(c, pts, col) {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach((p) => c.lineTo(p[0], p[1]));
    c.closePath();
    c.fill();
  }
  function stone(c, x, y, w, h, col) {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x - w / 2, y);
    c.lineTo(x - w * 0.42, y - h * 0.85);
    c.quadraticCurveTo(x, y - h * 1.08, x + w * 0.4, y - h * 0.9);
    c.lineTo(x + w / 2, y);
    c.fill();
  }
  function wisp(c, x, y, t, i, col = [150, 255, 210]) {
    const px = x + Math.sin(t * 0.8 + i * 2) * 30,
      py = y + Math.sin(t * 1.3 + i) * 14;
    glow(c, px, py, 16, col, 0.55 + 0.3 * Math.sin(t * 3 + i));
    c.fillStyle = rgba(col, 0.95);
    c.fillRect(px - 1.5, py - 1.5, 3, 3);
  }
  function house(c, x, y, s, col, o = {}) {
    const w = s * 1.3,
      h = s * 0.55;
    c.fillStyle = col;
    c.fillRect(x - w / 2, y - h, w, h);
    c.beginPath();
    c.moveTo(x - w / 2 - s * 0.12, y - h + s * 0.04);
    c.lineTo(x - w * 0.15, y - h - s * 0.55);
    c.lineTo(x + w * 0.15, y - h - s * 0.55);
    c.lineTo(x + w / 2 + s * 0.12, y - h + s * 0.04);
    c.fill();
    if (o.win) {
      glow(c, x + w * 0.21, y - h * 0.5, s * 0.5, [255, 160, 70], 0.3);
      c.fillStyle = "#f0a050";
      c.fillRect(x + w * 0.15, y - h * 0.68, s * 0.13, s * 0.13);
    }
    if (o.burn) flames(c, x, y - h - s * 0.15, s * 0.95, o.t || 0, o.seed || 1, w * 0.42, o.cold);
  }
  function tower(c, x, y, w, h, col, o = {}) {
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(x - w / 2, y);
    c.lineTo(x - w * 0.44, y - h);
    if (o.ruin) {
      const R = rng(9);
      for (let i = 1; i <= 8; i++)
        c.lineTo(x - w * 0.44 + (w * 0.88 * i) / 8, y - h - R() * h * 0.16 * (i % 2 ? 1 : 0.3));
    } else {
      for (let i = 0; i < 4; i++) {
        const bx = x - w * 0.44 + (w * 0.88 * i) / 4;
        c.lineTo(bx, y - h - h * 0.06);
        c.lineTo(bx + w * 0.11, y - h - h * 0.06);
        c.lineTo(bx + w * 0.11, y - h);
      }
    }
    c.lineTo(x + w * 0.44, y - h);
    c.lineTo(x + w / 2, y);
    c.fill();
    if (o.lit) {
      glow(c, x, y - h * 0.6, w * 0.7, [255, 150, 60], 0.3);
      c.fillStyle = "#f0a050";
      c.fillRect(x - w * 0.04, y - h * 0.66, w * 0.08, h * 0.09);
    }
  }
  function waterfall(c, x, y, w, h, t) {
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, "rgba(205,222,236,.85)");
    g.addColorStop(1, "rgba(160,190,212,.55)");
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x - w / 2, y);
    c.lineTo(x + w / 2, y);
    c.lineTo(x + w * 0.62, y + h);
    c.lineTo(x - w * 0.62, y + h);
    c.fill();
    const R = rng(5);
    c.strokeStyle = "rgba(255,255,255,.55)";
    c.lineWidth = 1.6;
    for (let i = 0; i < 46; i++) {
      const f = R(),
        len = 20 + R() * 50,
        ly = y + ((t * (130 + R() * 90) + R() * h) % h);
      const lx = x + (f - 0.5) * lerp(w, w * 1.24, (ly - y) / h);
      c.beginPath();
      c.moveTo(lx, ly);
      c.lineTo(lx, Math.min(y + h, ly + len));
      c.stroke();
    }
    mist(c, y + h - 10, 40, 6, t, 3, 0.3, [232, 240, 246], 14);
  }
  function person(c, x, y, s, col, o = {}) {
    c.save();
    c.fillStyle = col;
    c.strokeStyle = col;
    c.lineCap = "round";
    c.lineJoin = "round";
    const t = o.t || 0,
      lean = o.hunch ? s * 0.07 : 0,
      sh = y - s * 0.8 + (o.hunch ? s * 0.05 : 0),
      hp = y - s * 0.45,
      hr = s * 0.068;
    const hx = x + lean * 1.5,
      hy = y - s + hr + (o.hunch ? s * 0.1 : 0) + (o.breathe ? Math.sin(t * 2) * s * 0.006 : 0);
    if (o.dress || o.seated) {
      c.beginPath();
      c.moveTo(x - s * 0.11 + lean, sh);
      c.lineTo(x + s * 0.11 + lean, sh);
      c.lineTo(x + s * (o.seated ? 0.25 : 0.21), y);
      c.lineTo(x - s * (o.seated ? 0.25 : 0.21), y);
      c.fill();
    } else {
      c.lineWidth = s * 0.068;
      c.beginPath();
      c.moveTo(x - s * 0.05, hp);
      c.lineTo(x - s * (0.08 + (o.stride || 0)), y);
      c.moveTo(x + s * 0.05, hp);
      c.lineTo(x + s * (0.08 + (o.stride || 0)), y);
      c.stroke();
      c.beginPath();
      c.moveTo(x - s * 0.115 + lean, sh);
      c.lineTo(x + s * 0.115 + lean, sh);
      c.lineTo(x + s * 0.1, hp + s * 0.06);
      c.lineTo(x - s * 0.1, hp + s * 0.06);
      c.fill();
    }
    if (o.cloak) {
      c.beginPath();
      c.moveTo(x - s * 0.1 + lean, sh);
      c.quadraticCurveTo(x - s * 0.34, y - s * 0.32 + Math.sin(t * 1.2) * 3, x - s * 0.28, y - s * 0.04);
      c.lineTo(x - s * 0.04, y - s * 0.22);
      c.fill();
    }
    c.beginPath();
    c.arc(hx, hy, hr, 0, TAU);
    c.fill();
    c.fillRect(hx - s * 0.026, hy, s * 0.052, sh - hy + 2);
    if (o.hair) {
      c.beginPath();
      c.moveTo(hx - hr, hy - hr * 0.3);
      c.quadraticCurveTo(hx - hr * 2.4, hy + s * 0.25, hx - hr * 1.4 + Math.sin(t * 1.3) * 5, hy + s * 0.46);
      c.lineTo(hx + hr * 0.2, hy + s * 0.12);
      c.lineTo(hx + hr * 0.8, hy - hr * 0.2);
      c.fill();
    }
    c.lineWidth = s * 0.05;
    const lhx = x - s * (o.armOut ? 0.3 : 0.19) + lean,
      lhy = y - s * (o.armOut ? 0.62 : 0.47);
    const rhx = x + s * 0.2 + (o.armUp ? 0 : lean),
      rhy = o.armUp ? y - s * 0.98 : y - s * 0.5;
    c.beginPath();
    c.moveTo(x - s * 0.1 + lean, sh + s * 0.03);
    c.lineTo(lhx, lhy);
    c.moveTo(x + s * 0.1 + lean, sh + s * 0.03);
    c.lineTo(rhx, rhy);
    c.stroke();
    c.lineWidth = s * 0.026;
    if (o.staff) {
      c.beginPath();
      c.moveTo(rhx, y);
      c.lineTo(rhx + s * 0.02, y - s * 1.12);
      c.stroke();
    }
    if (o.stick) {
      c.beginPath();
      c.moveTo(rhx, rhy);
      c.lineTo(rhx + s * 0.1, y);
      c.stroke();
    }
    if (o.sword) {
      c.lineWidth = s * 0.03;
      c.beginPath();
      if (o.armUp) {
        c.moveTo(rhx, rhy);
        c.lineTo(rhx - s * 0.1, rhy - s * 0.45);
      } else {
        c.moveTo(rhx, rhy);
        c.lineTo(rhx + s * 0.26, rhy + s * 0.3);
      }
      c.stroke();
      c.lineWidth = s * 0.02;
      c.beginPath();
      c.moveTo(rhx - s * 0.05, rhy + (o.armUp ? 0 : -s * 0.02));
      c.lineTo(rhx + s * 0.05, rhy + (o.armUp ? -s * 0.02 : s * 0.03));
      c.stroke();
    }
    if (o.pike) {
      c.lineWidth = s * 0.028;
      c.beginPath();
      c.moveTo(rhx - s * 0.15, y + s * 0.02);
      c.lineTo(rhx + s * 0.25, y - s * 1.25);
      c.stroke();
      c.beginPath();
      c.moveTo(rhx + s * 0.29, y - s * 1.36);
      c.lineTo(rhx + s * 0.19, y - s * 1.12);
      c.lineTo(rhx + s * 0.33, y - s * 1.15);
      c.fill();
    }
    if (o.hammer) {
      c.lineWidth = s * 0.035;
      const ex = rhx + s * 0.05,
        ey = rhy - s * 0.3;
      c.beginPath();
      c.moveTo(rhx, rhy);
      c.lineTo(ex, ey);
      c.stroke();
      c.fillRect(ex - s * 0.08, ey - s * 0.05, s * 0.16, s * 0.09);
    }
    if (o.torch) {
      c.lineWidth = s * 0.03;
      c.beginPath();
      c.moveTo(rhx, rhy);
      c.lineTo(rhx + s * 0.06, rhy - s * 0.25);
      c.stroke();
      flames(c, rhx + s * 0.06, rhy - s * 0.24, s * 0.14, t, 7, s * 0.03);
    }
    if (o.bow) {
      c.lineWidth = s * 0.02;
      c.beginPath();
      c.arc(lhx - s * 0.02, lhy, s * 0.32, -1.2, 1.2);
      c.stroke();
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(lhx - s * 0.02 + s * 0.32 * Math.cos(-1.2), lhy + s * 0.32 * Math.sin(-1.2));
      c.lineTo(lhx + s * 0.12, lhy);
      c.lineTo(lhx - s * 0.02 + s * 0.32 * Math.cos(1.2), lhy + s * 0.32 * Math.sin(1.2));
      c.stroke();
    }
    if (o.shield) {
      c.beginPath();
      c.arc(lhx, lhy, s * 0.13, 0, TAU);
      c.fill();
    }
    if (o.helm) {
      c.beginPath();
      c.ellipse(hx, hy - hr * 0.35, hr * 1.05, hr * 0.85, 0, Math.PI, 0);
      c.fill();
      c.fillRect(hx - hr * 1.6, hy - hr * 0.45, hr * 3.2, hr * 0.32);
    }
    if (o.eyes) {
      c.fillStyle = o.eyes;
      c.fillRect(hx + hr * 0.2, hy - hr * 0.15, hr * 0.38, hr * 0.2);
    }
    if (o.cap) {
      c.fillStyle = "#9b1c1c";
      c.beginPath();
      c.moveTo(hx - hr * 1.1, hy - hr * 0.3);
      c.quadraticCurveTo(hx - hr * 0.2, hy - hr * 3.8, hx + hr * 1.8, hy - hr * 2.5 + Math.sin(t * 2) * 2);
      c.lineTo(hx + hr * 1.1, hy - hr * 0.2);
      c.fill();
      c.fillStyle = "rgba(155,28,28,.6)";
      c.fillRect(hx + hr * 1.5, hy - hr * 2.3 + ((t * 30) % (hr * 3)), 2, 4);
    }
    c.restore();
  }
  function horse(c, x, y, s, col, o = {}) {
    c.save();
    c.fillStyle = col;
    c.strokeStyle = col;
    c.lineCap = "round";
    const t = o.t || 0;
    const by = y - s * 0.78 - (o.kneel ? -s * 0.12 : 0);
    c.lineWidth = s * 0.07;
    [
      [-0.42, 0],
      [-0.3, 1.5],
      [0.32, 0],
      [0.44, 1.5],
    ].forEach(([lx, ph], i) => {
      const front = i > 1;
      c.beginPath();
      c.moveTo(x + lx * s, by + s * 0.1);
      if (o.kneel && front) {
        c.lineTo(x + lx * s + s * 0.14, y - s * 0.1);
        c.lineTo(x + lx * s + s * 0.36, y - s * 0.04);
      } else if (o.rear && front) {
        c.lineTo(x + lx * s + s * 0.14, by - s * 0.12 + Math.sin(t * 6 + ph) * 5);
        c.lineTo(x + lx * s + s * 0.22, by + s * 0.12);
      } else {
        c.lineTo(x + lx * s + Math.sin(t * 1.6 + ph) * 1.5, y);
      }
      c.stroke();
    });
    c.beginPath();
    c.ellipse(x, by, s * 0.58, s * 0.24, o.rear ? -0.35 : 0, 0, TAU);
    c.fill();
    const nx = x + s * 0.42,
      ny = by - s * 0.08 - (o.rear ? s * 0.15 : 0);
    const hx = x + s * (o.rear ? 0.62 : 0.78),
      hy = y - s * (o.rear ? 1.6 : o.kneel ? 1.12 : 1.3) + Math.sin(t * 1.1) * 2;
    c.beginPath();
    c.moveTo(nx - s * 0.14, ny + s * 0.12);
    c.lineTo(nx + s * 0.1, ny + s * 0.12);
    c.lineTo(hx + s * 0.06, hy + s * 0.08);
    c.lineTo(hx - s * 0.1, hy - s * 0.05);
    c.fill();
    c.save();
    c.translate(hx, hy);
    c.rotate(o.rear ? 0.4 : 0.8);
    c.beginPath();
    c.ellipse(s * 0.12, 0, s * 0.2, s * 0.08, 0, 0, TAU);
    c.fill();
    c.restore();
    c.beginPath();
    c.moveTo(hx - s * 0.06, hy - s * 0.04);
    c.lineTo(hx - s * 0.03, hy - s * 0.18);
    c.lineTo(hx + s * 0.04, hy - s * 0.04);
    c.fill();
    c.lineWidth = s * 0.06;
    c.beginPath();
    c.moveTo(x - s * 0.56, by - s * 0.08);
    c.quadraticCurveTo(x - s * 0.82, by + s * 0.1 + Math.sin(t) * 4, x - s * 0.72, by + s * 0.52);
    c.stroke();
    if (o.mane) {
      c.strokeStyle = o.mane;
      c.lineWidth = s * 0.024;
      for (let i = 0; i < 10; i++) {
        const f = i / 9;
        const mx = lerp(nx - s * 0.06, hx - s * 0.07, f),
          my = lerp(ny, hy, f);
        c.beginPath();
        c.moveTo(mx, my);
        c.quadraticCurveTo(
          mx - s * 0.08,
          my + s * 0.15,
          mx - s * 0.13 + Math.sin(t * 1.5 + i) * 4,
          my + s * 0.34,
        );
        c.stroke();
      }
    }
    if (o.eyes) glow(c, hx + s * 0.07, hy + s * 0.03, s * 0.09, [120, 255, 170], 0.85);
    c.restore();
  }
  function dog(c, x, y, s, col, o = {}) {
    c.save();
    c.fillStyle = col;
    c.strokeStyle = col;
    c.lineCap = "round";
    const t = o.t || 0;
    const by = y - s * 0.5;
    c.lineWidth = s * 0.08;
    [
      [-0.35, 0],
      [-0.25, Math.PI],
      [0.3, Math.PI / 2],
      [0.4, Math.PI * 1.5],
    ].forEach(([lx, ph]) => {
      const a = o.run ? Math.sin(t * 12 + ph) * 0.55 : 0;
      c.beginPath();
      c.moveTo(x + lx * s, by);
      c.lineTo(x + lx * s + Math.sin(a) * s * 0.45, by + Math.cos(a) * s * 0.45);
      c.stroke();
    });
    c.beginPath();
    c.ellipse(x, by - s * 0.05, s * 0.48, s * 0.16, 0, 0, TAU);
    c.fill();
    c.beginPath();
    c.moveTo(x + s * 0.33, by - s * 0.14);
    c.lineTo(x + s * 0.55, by - s * 0.36);
    c.lineTo(x + s * 0.63, by - s * 0.2);
    c.lineTo(x + s * 0.42, by + s * 0.05);
    c.fill();
    c.beginPath();
    c.arc(x + s * 0.6, by - s * 0.33, s * 0.12, 0, TAU);
    c.fill();
    c.beginPath();
    c.moveTo(x + s * 0.66, by - s * 0.38);
    c.lineTo(x + s * 0.9, by - s * 0.29);
    c.lineTo(x + s * 0.66, by - s * 0.22);
    c.fill();
    c.beginPath();
    c.moveTo(x + s * 0.53, by - s * 0.42);
    c.lineTo(x + s * 0.5, by - s * 0.58);
    c.lineTo(x + s * 0.62, by - s * 0.44);
    c.fill();
    c.lineWidth = s * 0.05;
    c.beginPath();
    c.moveTo(x - s * 0.46, by - s * 0.1);
    c.quadraticCurveTo(x - s * 0.66, by - s * 0.32, x - s * 0.72, by - s * 0.16 + Math.sin(t * 8) * 3);
    c.stroke();
    if (o.eyes) glow(c, x + s * 0.65, by - s * 0.36, s * 0.07, o.eyes, 0.9);
    c.restore();
  }
  function mirror(c, x, fn) {
    c.save();
    c.translate(x, 0);
    c.scale(-1, 1);
    c.translate(-x, 0);
    fn();
    c.restore();
  }
  function lying(c, x, y, s, col, o) {
    c.save();
    c.translate(x + s * 0.35, y - s * 0.07);
    c.rotate(-Math.PI / 2);
    person(c, 0, 0, s, col, o);
    c.restore();
  }
  function hillTop(cx, cy, rx, ry, x) {
    const d = (x - cx) / rx;
    return cy - ry * Math.sqrt(Math.max(0, 1 - d * d));
  }
  function saltire(c, x, y, t) {
    c.strokeStyle = "#0a0d12";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x, y - 170);
    c.stroke();
    const w = 90,
      h = 56,
      wave = Math.sin(t * 2) * 4;
    c.save();
    c.translate(x, y - 168);
    c.fillStyle = "#1f4f8f";
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(w / 2, wave, w, 0);
    c.lineTo(w, h);
    c.quadraticCurveTo(w / 2, h + wave, 0, h);
    c.fill();
    c.strokeStyle = "#eef2f5";
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(3, 3);
    c.lineTo(w - 3, h - 3);
    c.moveTo(w - 3, 3);
    c.lineTo(3, h - 3);
    c.stroke();
    c.restore();
  }
  const NIGHT = [
    [0, "#05090f"],
    [0.6, "#122033"],
    [1, "#26384c"],
  ];
  const SCENES = {
    titulo(c, t) {
      sky(c, NIGHT);
      stars(c, 160, 1, t, 300);
      moon(c, 780, 90, 26);
      ridge(c, 300, 120, "#1a283a", 11, 0.8);
      mist(c, 315, 40, 7, t, 1, 0.16);
      ridge(c, 360, 90, "#111b27", 12, 1.2);
      c.fillStyle = "#070c12";
      c.beginPath();
      c.ellipse(330, 520, 360, 150, 0, 0, TAU);
      c.fill();
      ridge(c, 470, 40, "#070c12", 14, 0.5);
      [140, 200, 262, 400, 460, 520].forEach((x, i) =>
        stone(c, x, hillTop(330, 520, 360, 150, x) + 6, 22 + (i % 2) * 8, 46 + ((i * 7) % 20), "#070c12"),
      );
      person(c, 330, hillTop(330, 520, 360, 150, 330) + 4, 100, "#070c12", { staff: 1, cloak: 1, t });
      for (let i = 0; i < 5; i++) wisp(c, 160 + i * 80, 330 - (i % 2) * 20, t, i);
      mist(c, 430, 30, 6, t, 2, 0.14, [200, 215, 230], 12);
    },
    aldeia(c, t) {
      sky(c, [
        [0, "#1d1a33"],
        [0.45, "#5b2f45"],
        [0.78, "#c0603a"],
        [1, "#e39a4f"],
      ]);
      stars(c, 40, 2, t, 140);
      ridge(c, 300, 90, "#3a2a3e", 3);
      ridge(c, 350, 60, "#271c2b", 4, 1.4);
      ground(c, 398, "#130c12");
      [
        [110, 60],
        [235, 70],
        [355, 58],
        [650, 66],
        [775, 72],
        [900, 58],
      ].forEach(([x, s], i) => house(c, x, 402, s, "#150d14", { win: i % 2 === 0 }));
      flames(c, 500, 408, 52, t, 3);
      embers(c, 500, 400, 60, 240, 30, t, 3);
      person(c, 445, 410, 48, "#0c070b", { t });
      person(c, 560, 410, 44, "#0c070b", { t, dress: 1 });
      person(c, 600, 410, 70, "#0c070b", { t, cloak: 1 });
      [
        [300, 404],
        [705, 404],
        [828, 404],
      ].forEach(([x, y], i) => {
        glow(c, x, y - 6, 22, [255, 150, 50], 0.5 + 0.15 * Math.sin(t * 6 + i));
        c.fillStyle = "#e8892b";
        c.beginPath();
        c.arc(x, y - 6, 5, 0, TAU);
        c.fill();
      });
      mist(c, 420, 20, 5, t, 4, 0.08, [240, 200, 170], 6);
    },
    fogueira(c, t) {
      sky(c, [
        [0, "#110c1c"],
        [1, "#3d2337"],
      ]);
      stars(c, 90, 5, t, 260);
      ridge(c, 330, 70, "#211627", 6);
      ground(c, 420, "#0d0910");
      oak(c, 830, 425, 230, "#0c080d", 3);
      const R = rng(8);
      for (let i = 0; i < 26; i++) {
        c.fillStyle = "#b8282a";
        c.beginPath();
        c.arc(830 + (R() - 0.5) * 170, 250 + R() * 90, 3, 0, TAU);
        c.fill();
      }
      flames(c, 520, 428, 115, t, 4);
      embers(c, 520, 410, 130, 400, 55, t, 5);
      person(c, 350, 428, 175, "#0b070c", { hunch: 1, dress: 1, stick: 1, t });
      person(c, 665, 428, 165, "#0b070c", { cloak: 1, t });
    },
    taverna(c, t) {
      sky(c, [
        [0, "#1d130c"],
        [1, "#3c2617"],
      ]);
      c.fillStyle = "#0f0905";
      c.fillRect(0, 0, W, 22);
      c.fillRect(0, 48, W, 16);
      [170, 590].forEach((x) => c.fillRect(x, 0, 22, H));
      c.fillStyle = "#1d130b";
      c.fillRect(730, 250, 190, 180);
      c.fillStyle = "#090503";
      c.beginPath();
      c.moveTo(760, 430);
      c.lineTo(760, 320);
      c.quadraticCurveTo(825, 270, 890, 320);
      c.lineTo(890, 430);
      c.fill();
      glow(c, 825, 390, 240, [255, 140, 60], 0.35);
      flames(c, 825, 428, 55, t, 6);
      glow(c, 385, 120, 90, [255, 190, 110], 0.35 + 0.05 * Math.sin(t * 5));
      c.fillStyle = "#f3b562";
      c.fillRect(379, 108, 12, 16);
      ground(c, 425, "#0b0604");
      c.fillStyle = "#0a0604";
      c.fillRect(140, 352, 430, 14);
      c.fillRect(160, 366, 10, 60);
      c.fillRect(540, 366, 10, 60);
      [
        [220, "#0a0604"],
        [330, "#0a0604"],
        [455, "#0a0604"],
      ].forEach(([x, col], i) => person(c, x, 426, 125 + i * 6, col, { seated: 1, t, armOut: i === 1 }));
      person(c, 660, 428, 190, "#0a0604", { cloak: 1, t });
      c.fillStyle = "#0a0604";
      [
        [250, 340],
        [380, 340],
        [470, 340],
      ].forEach(([x, y]) => c.fillRect(x, y, 11, 13));
    },
    forja(c, t) {
      sky(c, [
        [0, "#0d0806"],
        [1, "#27160d"],
      ]);
      c.fillStyle = "#1a0f0a";
      c.fillRect(70, 290, 230, 140);
      c.fillStyle = "#080403";
      c.beginPath();
      c.moveTo(130, 430);
      c.lineTo(130, 370);
      c.quadraticCurveTo(185, 330, 240, 370);
      c.lineTo(240, 430);
      c.fill();
      glow(c, 185, 390, 280, [255, 120, 40], 0.42);
      flames(c, 185, 430, 46, t, 9);
      ground(c, 430, "#0a0605");
      c.fillStyle = "#080403";
      c.fillRect(495, 356, 150, 20);
      c.beginPath();
      c.moveTo(645, 356);
      c.lineTo(700, 362);
      c.lineTo(645, 376);
      c.fill();
      c.fillRect(540, 376, 60, 36);
      c.fillRect(515, 410, 110, 22);
      const R = rng(11);
      for (let i = 0; i < 34; i++) {
        const a = -Math.PI * (0.1 + R() * 0.8),
          sp = 60 + R() * 120,
          life = (t * 1.4 + R()) % 1;
        const d = life * sp;
        c.fillStyle = `rgba(255,${(180 + R() * 60) | 0},90,${1 - life})`;
        c.fillRect(570 + Math.cos(a) * d, 356 + Math.sin(a) * d + life * life * 40, 2.4, 2.4);
      }
      person(c, 740, 430, 235, "#080403", { armUp: 1, hammer: 1, t, breathe: 1 });
    },
    fogo(c, t) {
      sky(c, [
        [0, "#0b0505"],
        [0.5, "#3d120c"],
        [1, "#b8471c"],
      ]);
      mist(c, 140, 140, 8, t, 6, 0.55, [18, 8, 6], 18);
      ridge(c, 320, 60, "#1a0a07", 21);
      ground(c, 405, "#0c0605");
      [
        [90, 64],
        [260, 72],
        [420, 58],
        [600, 70],
        [780, 66],
        [930, 60],
      ].forEach(([x, s], i) => house(c, x, 408, s, "#110706", { burn: 1, t, seed: i + 2 }));
      embers(c, 500, 410, 1000, 380, 110, t, 4);
      [
        [215, 1],
        [790, -1],
      ].forEach(([x, dir]) => {
        const f = () => {
          horse(c, x, 425, 120, "#070303", { t });
          person(c, x - 5, 425 - 120 * 0.82, 100, "#070303", { seated: 1, helm: 1, torch: 1, t });
        };
        dir > 0 ? f() : mirror(c, x, f);
      });
    },
    dama(c, t) {
      sky(c, [
        [0, "#0a111b"],
        [1, "#2b3b4f"],
      ]);
      ridge(c, 320, 60, "#16212d", 21);
      ground(c, 405, "#0a0f16");
      [
        [90, 64],
        [260, 72],
        [700, 70],
        [880, 66],
      ].forEach(([x, s], i) => house(c, x, 408, s, "#0d141c", { burn: 1, t: 1.7, seed: i + 2, cold: 1 }));
      const R = rng(14);
      for (let i = 0; i < 120; i++) {
        const x = R() * W,
          y = 60 + R() * 340;
        c.fillStyle = `rgba(255,${(190 + R() * 50) | 0},120,${0.35 + 0.4 * Math.sin(t * 0.8 + i) ** 2})`;
        c.fillRect(x, y, 2, 2);
      }
      glow(c, 500, 300, 260, [200, 225, 245], 0.4 + 0.05 * Math.sin(t));
      person(c, 500, 415, 235, "#eef5f9", { dress: 1, hair: 1, t, armOut: 1 });
      mist(c, 410, 30, 7, t, 5, 0.18, [210, 225, 240], 3);
    },
    cinzas(c, t) {
      sky(c, [
        [0, "#232428"],
        [1, "#77736b"],
      ]);
      ridge(c, 330, 70, "#45433f", 8);
      ground(c, 400, "#1c1a19");
      c.strokeStyle = "#100e0d";
      c.lineWidth = 7;
      [
        [140, 90],
        [330, 70],
        [620, 85],
        [820, 75],
      ].forEach(([x, h]) => {
        c.beginPath();
        c.moveTo(x - 40, 402);
        c.lineTo(x - 38, 402 - h);
        c.moveTo(x + 40, 402);
        c.lineTo(x + 36, 402 - h * 0.7);
        c.moveTo(x - 38, 402 - h);
        c.lineTo(x + 10, 402 - h * 1.2);
        c.stroke();
      });
      for (let k = 0; k < 4; k++) {
        const bx = [140, 330, 620, 820][k];
        for (let i = 0; i < 7; i++) {
          const yy = 380 - ((t * 14 + i * 45) % 320);
          glow(
            c,
            bx + Math.sin(t * 0.5 + i + k) * 25 + i * 6,
            yy,
            40 + i * 6,
            [60, 58, 56],
            0.35 * (yy / 380),
          );
        }
      }
      falling(c, 70, t, 9, [200, 196, 190], 14, 2);
    },
    caes(c, t, o) {
      sky(c, NIGHT);
      stars(c, 80, 7, t, 200);
      moon(c, 150, 80, 20);
      for (let i = 0; i < 26; i++) pine(c, i * 40 + 10, 372, 70 + ((i * 37) % 30), "#132030");
      ground(c, 372, "#0b131c");
      mist(c, 380, 20, 6, t, 3, 0.14);
      for (let i = 0; i < 10; i++)
        pine(c, i * 110 + (i % 2) * 30 - 20, 455, 170 + ((i * 53) % 60), "#04080c");
      ground(c, 425, "#04080c");
      if (!(o && o.bare)) {
        dog(c, 360 + Math.sin(t * 1.2) * 6, 430, 90, "#020304", { run: 1, t, eyes: [255, 130, 60] });
        dog(c, 540 + Math.sin(t * 1.2 + 1) * 6, 436, 95, "#020304", {
          run: 1,
          t: t + 0.3,
          eyes: [255, 130, 60],
        });
      }
    },
    pantano(c, t) {
      sky(c, NIGHT);
      stars(c, 120, 8, t, 250);
      moon(c, 700, 90, 24);
      ridge(c, 330, 30, "#16222e", 5, 0.6);
      water(c, 328, H, "#0a141e", t, 3);
      reflection(c, 700, 332, 440, t);
      for (let i = 0; i < 5; i++) wisp(c, 150 + i * 170, 300 + (i % 2) * 30, t, i);
      mist(c, 340, 40, 8, t, 4, 0.16);
      reeds(c, 455, 90, 3, "#03070a", t, 110);
      reeds(c, 360, 30, 4, "#0b1520", t, 30);
    },
    vau(c, t, o) {
      sky(c, NIGHT);
      stars(c, 110, 9, t, 220);
      moon(c, 820, 80, 22);
      ridge(c, 300, 70, "#15212d", 6);
      for (let i = 0; i < 24; i++) pine(c, i * 44, 334, 60 + ((i * 29) % 25), "#0b131b");
      water(c, 330, 422, "#0b1721", t, 5);
      reflection(c, 820, 334, 420, t);
      mist(c, 350, 30, 7, t, 6, 0.18);
      cliff(
        c,
        [
          [0, H],
          [0, 405],
          [200, 398],
          [460, 410],
          [620, 425],
          [1000, 430],
          [1000, H],
        ],
        "#05080c",
      );
      if (!o.bare) horse(c, 330, 405, 135, "#020304", { kneel: 1, t, mane: "#1f3d2c", eyes: o.visao });
    },
    kelpie_rio(c, t) {
      sky(c, NIGHT);
      stars(c, 110, 9, t, 220);
      moon(c, 820, 80, 22);
      ridge(c, 300, 70, "#15212d", 6);
      for (let i = 0; i < 24; i++) pine(c, i * 44, 334, 60 + ((i * 29) % 25), "#0b131b");
      water(c, 330, H, "#0b1721", t, 5);
      horse(c, 500, 470, 170, "#020304", { rear: 1, t, mane: "#1f3d2c", eyes: 1 });
      c.fillStyle = "rgba(11,23,33,.92)";
      c.fillRect(0, 395, W, H);
      water(c, 395, H, "rgba(11,23,33,.0)", t, 8);
      const R = rng(3);
      for (let i = 0; i < 40; i++) {
        const life = (t * 1.5 + R()) % 1;
        const a = -Math.PI * (0.15 + R() * 0.7);
        c.fillStyle = `rgba(210,230,240,${1 - life})`;
        c.fillRect(
          520 + Math.cos(a) * life * 120,
          395 + Math.sin(a) * life * 90 + life * life * 80,
          2.5,
          2.5,
        );
      }
      mist(c, 395, 20, 6, t, 6, 0.2);
    },
    rochedos(c, t, o) {
      sky(c, [
        [0, "#2f3944"],
        [0.7, "#8d8c84"],
        [1, "#b7ad98"],
      ]);
      ridge(c, 330, 80, "#58626b", 13);
      mist(c, 330, 60, 8, t, 7, 0.3, [220, 222, 220], 6);
      cliff(
        c,
        [
          [0, H],
          [0, 60],
          [60, 80],
          [120, 140],
          [150, 200],
          [230, 230],
          [270, 330],
          [300, H],
        ],
        "#1b2124",
      );
      cliff(
        c,
        [
          [1000, H],
          [1000, 90],
          [900, 100],
          [790, 140],
          [760, 230],
          [720, 330],
          [690, H],
        ],
        "#1b2124",
      );
      oak(c, 80, 90, 110, "#141a1c", 4);
      oak(c, 940, 104, 120, "#141a1c", 6);
      ground(c, 425, "#151a1c");
      person(c, 860, 108, 95, "#0d1012", { bow: 1, armOut: 1, cloak: 1, t });
      if (!(o && o.bare)) person(c, 500, 428, 205, "#0d1012", { staff: 1, t, breathe: 1 });
    },
    acampamento(c, t) {
      c.fillStyle = "#0a0706";
      c.fillRect(0, 0, W, H);
      c.save();
      c.beginPath();
      c.ellipse(500, 190, 280, 150, 0, 0, TAU);
      c.clip();
      sky(c, [
        [0, "#3a4a60"],
        [1, "#a7a399"],
      ]);
      waterfall(c, 500, 40, 300, 330, t);
      c.restore();
      glow(c, 500, 410, 330, [255, 140, 60], 0.38);
      ground(c, 428, "#0a0706");
      c.strokeStyle = "#0a0706";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(455, 428);
      c.lineTo(500, 340);
      c.lineTo(545, 428);
      c.stroke();
      c.fillStyle = "#0a0706";
      c.beginPath();
      c.ellipse(500, 372, 24, 16, 0, 0, TAU);
      c.fill();
      flames(c, 500, 430, 56, t, 12);
      embers(c, 500, 410, 40, 240, 22, t, 13);
      [
        [300, 120],
        [395, 110],
        [615, 115],
        [715, 128],
      ].forEach(([x, s], i) => person(c, x, 432, s, "#060403", { seated: 1, t, hair: i === 2 }));
    },
    torre(c, t) {
      sky(c, NIGHT);
      stars(c, 130, 4, t, 260);
      moon(c, 160, 70, 20);
      cliff(
        c,
        [
          [0, H],
          [0, 250],
          [200, 240],
          [420, 232],
          [440, H],
        ],
        "#06090d",
      );
      cliff(
        c,
        [
          [560, H],
          [560, 262],
          [605, 226],
          [900, 214],
          [1000, 230],
          [1000, H],
        ],
        "#06090d",
      );
      tower(c, 735, 222, 95, 175, "#05080b", { ruin: 1, lit: 1 });
      waterfall(c, 500, 232, 105, 240, t);
      mist(c, 450, 40, 8, t, 8, 0.22);
      person(c, 640, 330, 34, "#05080b", { armUp: 1 });
    },
    torre_dentro(c, t, o) {
      sky(c, [
        [0, "#140908"],
        [1, "#2c1411"],
      ]);
      c.strokeStyle = "rgba(0,0,0,.35)";
      c.lineWidth = 2;
      for (let r = 0; r < 14; r++) {
        const y = r * 34;
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(W, y);
        c.stroke();
        for (let x = (r % 2) * 45; x < W; x += 90) {
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x, y + 34);
          c.stroke();
        }
      }
      c.fillStyle = "rgba(180,200,230,.07)";
      c.beginPath();
      c.moveTo(492, 110);
      c.lineTo(510, 110);
      c.lineTo(640, 430);
      c.lineTo(420, 430);
      c.fill();
      c.fillStyle = "#c9d6e6";
      c.fillRect(493, 92, 16, 42);
      glow(c, 320, 190, 80, [255, 140, 60], 0.4);
      flames(c, 320, 200, 26, t, 15);
      c.fillStyle = "#0c0605";
      c.beginPath();
      c.moveTo(640, H);
      for (let i = 0; i < 9; i++) {
        c.lineTo(640 + i * 45, 430 - i * 30);
        c.lineTo(685 + i * 45, 430 - i * 30);
      }
      c.lineTo(1000, H);
      c.fill();
      ground(c, 430, "#0c0605");
      c.fillStyle = "#3d0a08";
      [
        [380, 440, 70],
        [575, 445, 60],
      ].forEach(([x, y, r]) => {
        c.beginPath();
        c.ellipse(x, y, r, 8, 0, 0, TAU);
        c.fill();
      });
      lying(c, 370, 440, 140, "#070303", { helm: 1 });
      lying(c, 560, 445, 130, "#070303", {});
      person(c, 200, 430, 195, "#070303", { helm: 1, sword: 1, shield: 1, cloak: 1, t, breathe: 1 });
      if (!(o && o.bare))
        person(c, 790, 342, 150, "#070303", { cap: 1, pike: 1, hunch: 1, eyes: "#ff4a30", t });
    },
    cachoeira(c, t) {
      sky(c, [
        [0, "#2b3a55"],
        [0.55, "#b48a78"],
        [1, "#f2cf9a"],
      ]);
      glow(c, 500, 330, 300, [255, 220, 160], 0.45);
      for (let k = 0; k < 3; k++) {
        c.strokeStyle = ["rgba(255,120,120,.10)", "rgba(255,230,120,.09)", "rgba(120,170,255,.09)"][k];
        c.lineWidth = 10;
        c.beginPath();
        c.arc(500, 470, 300 - k * 10, Math.PI * 1.1, Math.PI * 1.9);
        c.stroke();
      }
      cliff(
        c,
        [
          [0, H],
          [0, 90],
          [180, 110],
          [380, 120],
          [420, H],
        ],
        "#1b1e26",
      );
      cliff(
        c,
        [
          [1000, H],
          [1000, 80],
          [820, 100],
          [620, 120],
          [580, H],
        ],
        "#1b1e26",
      );
      waterfall(c, 500, 120, 170, 335, t);
      mist(c, 380, 120, 10, t, 9, 0.35, [245, 240, 235], 10);
      c.globalAlpha = 0.5 + 0.15 * Math.sin(t * 0.7);
      person(c, 500, 380, 190, "#f6fbfd", { dress: 1, hair: 1, t });
      c.globalAlpha = 1;
    },
    alvorada(c, t) {
      sky(c, [
        [0, "#1d2b45"],
        [0.5, "#6d6f8a"],
        [0.8, "#e0a07a"],
        [1, "#f6c98a"],
      ]);
      glow(c, 700, 300, 200, [255, 210, 150], 0.6);
      c.fillStyle = "#fde8bf";
      c.beginPath();
      c.arc(700, 300, 34, 0, TAU);
      c.fill();
      ridge(c, 330, 80, "#7b7f9a", 2);
      mist(c, 330, 40, 7, t, 1, 0.25, [250, 225, 200], 6);
      ridge(c, 370, 80, "#4d5170", 3, 1.3);
      ridge(c, 400, 70, "#2c3048", 4, 0.8);
      c.fillStyle = "#10121c";
      c.beginPath();
      c.ellipse(260, 520, 380, 160, 0, 0, TAU);
      c.fill();
      const gy = hillTop(260, 520, 380, 160, 250);
      person(c, 250, gy + 4, 120, "#10121c", { staff: 1, cloak: 1, t });
      person(c, 205, hillTop(260, 520, 380, 160, 205) + 4, 70, "#10121c", { t });
      saltire(c, 330, hillTop(260, 520, 380, 160, 330) + 4, t);
    },
    morte(c, t) {
      sky(c, [
        [0, "#18191c"],
        [1, "#55524d"],
      ]);
      ridge(c, 320, 80, "#33322f", 7);
      mist(c, 350, 50, 8, t, 2, 0.25, [160, 158, 154], 5);
      ground(c, 430, "#121110");
      c.fillStyle = "#1d1b19";
      [
        [440, 430, 40, 18],
        [480, 430, 42, 18],
        [520, 430, 40, 18],
        [460, 412, 38, 16],
        [500, 412, 38, 16],
        [480, 395, 34, 14],
      ].forEach(([x, y, rx, ry]) => {
        c.beginPath();
        c.ellipse(x, y, rx / 1.4, ry / 1.3, 0, 0, TAU);
        c.fill();
      });
      c.fillStyle = "#0b0a09";
      c.fillRect(477, 250, 7, 150);
      c.fillRect(458, 290, 45, 7);
      c.beginPath();
      c.ellipse(482, 240, 15, 9, 0, 0, TAU);
      c.fill();
      c.beginPath();
      c.moveTo(493, 236);
      c.lineTo(508, 240);
      c.lineTo(493, 243);
      c.fill();
      c.beginPath();
      c.moveTo(470, 240);
      c.lineTo(450, 248 + Math.sin(t * 2) * 2);
      c.lineTo(472, 246);
      c.fill();
      falling(c, 50, t, 4, [180, 178, 174], 10, 2);
    },
  };
  /* combate */
  const FOE = {
    recruta: (c, x, y, t, col) => person(c, x, y, 190, col, { helm: 1, sword: 1, t, breathe: 1 }),
    cao: (c, x, y, t, col) => dog(c, x - 30, y, 110, col, { t, eyes: [255, 130, 60] }),
    kelpie: (c, x, y, t, col) => horse(c, x - 40, y, 150, col, { t, mane: "#1f3d2c", eyes: 1 }),
    tam: (c, x, y, t, col) => person(c, x, y, 195, col, { staff: 1, t, breathe: 1 }),
    redcap: (c, x, y, t, col) => person(c, x, y, 150, col, { cap: 1, pike: 1, hunch: 1, eyes: "#ff4a30", t }),
    blackwood: (c, x, y, t, col) =>
      person(c, x, y, 205, col, { helm: 1, sword: 1, shield: 1, cloak: 1, armUp: 1, t, breathe: 1 }),
  };
  const PAINT = [
    "guardiao",
    "schiltron",
    "terra_queimada",
    "mensageiro",
    "acamp_eduardo",
    "cailleach_julho",
    "falkirk",
    "cavalaria_foge",
    "arqueiros_carga",
    "chuva_flechas",
    "schiltron_rompe",
    "callendar",
    "renuncia",
    "falkirk_fim",
    "floresta_1305",
    "glasgow",
    "dumbarton",
    "robroyston",
    "captura",
    "comboio",
    "westminster",
    "londres",
    "cailleach_londres",
    "bruce",
    "scone",
    "methven",
    "aranha",
    "castelo_noite",
    "bannock",
    "bohun",
    "neve_junho",
    "abade",
    "avanco",
    "gillies",
    "pedra_campo",
    "cailleach_final",
    "fim_primavera",
    "fim_selo",
    "fim_inverno",
    "epilogo",
    "ettrick",
    "wallace",
    "treino",
    "acamp_ingles",
    "drip",
    "vespera",
    "cailleach_rio",
    "carpinteiro",
    "frades",
    "batalha",
    "cabeca",
    "arqueiros",
    "ponte_cai",
    "gelo",
    "kelpies",
    "vitoria",
    "dama_ponte",
    "inverno",
    "lobos",
    "partida",
    "ponte",
    "musgo",
    "sluagh_ceu",
    "tay",
    "dunsinane",
    "eremita",
    "cerco",
    "betulas",
    "tumulo",
    "camara",
    "cailleach",
    "boca",
    "lanark",
    "chegada",
    "resgate",
    "escalada",
    "portao",
    "blackwood",
    "titulo",
    "aldeia",
    "fogueira",
    "taverna",
    "forja",
    "fogo",
    "dama",
    "cinzas",
    "caes",
    "pantano",
    "vau",
    "kelpie_rio",
    "rochedos",
    "acampamento",
    "torre",
    "torre_dentro",
    "cachoeira",
    "alvorada",
    "morte",
  ];
  const IMGS = {};
  PAINT.forEach((k) => {
    const im = new Image();
    im.decoding = "async";
    im.onload = () => kick();
    im.src = "img/scenes/" + k + ".jpg";
    IMGS[k] = im;
  });
  function cover(c, im, t) {
    const z = 1.05 + 0.025 * Math.sin(t * 0.06),
      s = Math.max(W / im.naturalWidth, H / im.naturalHeight) * z,
      w = im.naturalWidth * s,
      h = im.naturalHeight * s;
    c.drawImage(im, (W - w) / 2 + Math.sin(t * 0.035) * 10, (H - h) / 2 + Math.cos(t * 0.04) * 4, w, h);
  }
  const FIRE = {
    terra_queimada: [500, 420, 1.6],
    acamp_eduardo: [500, 430, 1],
    methven: [500, 430, 1.4],
    robroyston: [500, 430, 0.6],
    acamp_ingles: [500, 430, 1],
    vespera: [500, 430, 0.8],
    batalha: [500, 440, 1],
    vitoria: [500, 430, 1.2],
    inverno: [500, 420, 0.4],
    eremita: [500, 420, 0.3],
    cerco: [500, 420, 1.2],
    lanark: [500, 440, 1.6],
    chegada: [500, 420, 0.8],
    resgate: [500, 400, 1.2],
    aldeia: [500, 400, 0.6],
    fogueira: [500, 400, 1],
    forja: [500, 380, 0.7],
    fogo: [500, 430, 1.6],
    acampamento: [500, 420, 0.5],
    taverna: [700, 400, 0.4],
    torre_dentro: [330, 220, 0.4],
  };
  function paintFx(c, t, key) {
    const f = FIRE[key];
    if (f) embers(c, f[0], f[1], W * f[2], 300, Math.round(30 * f[2] + 10), t, 21);
    if (key === "dama") {
      const R = rng(14);
      for (let i = 0; i < 90; i++) {
        const x = R() * W,
          y = 40 + R() * 360;
        c.fillStyle = `rgba(210,230,250,${0.25 + 0.45 * Math.sin(t * 0.8 + i) ** 2})`;
        c.fillRect(x, y, 2, 2);
      }
    }
    if (key === "cinzas" || key === "morte") falling(c, 70, t, 9, [210, 206, 200], 14, 2);
    if (
      {
        inverno: 1,
        lobos: 1,
        boca: 1,
        partida: 1,
        cailleach_julho: 1,
        neve_junho: 1,
        cailleach_final: 1,
        fim_inverno: 1,
        floresta_1305: 1,
      }[key]
    )
      falling(
        c,
        key === "lobos" || key === "boca" ? 160 : 70,
        t,
        5,
        [240, 244, 248],
        key === "lobos" || key === "boca" ? 60 : 22,
        2.4,
      );
    if (key === "pantano" || key === "titulo") {
      for (let i = 0; i < 5; i++) wisp(c, 140 + i * 170, 250 + (i % 2) * 60, t, i);
    }
    const heavy = {
      callendar: 1,
      falkirk_fim: 1,
      londres: 1,
      cailleach_londres: 1,
      fim_selo: 1,
      drip: 1,
      cailleach_rio: 1,
      dama_ponte: 1,
      carpinteiro: 1,
      frades: 1,
      musgo: 1,
      betulas: 1,
      tumulo: 1,
      tay: 1,
      dunsinane: 1,
      sluagh_ceu: 1,
      vau: 1,
      kelpie_rio: 1,
      cachoeira: 1,
      torre: 1,
      pantano: 1,
      rochedos: 1,
      caes: 1,
      titulo: 1,
    }[key];
    mist(
      c,
      heavy ? 380 : 410,
      heavy ? 70 : 30,
      heavy ? 8 : 5,
      t,
      31,
      heavy ? 0.16 : 0.08,
      [220, 228, 234],
      7,
    );
  }
  const PORT = {};
  function maskPortrait(im) {
    const cv = document.createElement("canvas");
    cv.width = im.naturalWidth;
    cv.height = im.naturalHeight;
    const x = cv.getContext("2d");
    x.drawImage(im, 0, 0);
    x.globalCompositeOperation = "destination-in";
    const w = cv.width,
      h = cv.height;
    x.translate(w / 2, h * 0.52);
    x.scale(1, (h / w) * 0.98);
    const g = x.createRadialGradient(0, 0, w * 0.28, 0, 0, w * 0.5);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(-w, -w, w * 2, w * 2);
    return cv;
  }
  [
    "templario",
    "guarda",
    "avatar",
    "fergus",
    "arqueiro",
    "cavaleiro_montado",
    "gerard",
    "recruta",
    "cao",
    "kelpie",
    "tam",
    "redcap",
    "blackwood",
    "lobo_inverno",
    "lobo_rei",
    "cavaleiro",
    "soldado",
    "baobhan",
    "sluagh",
    "morto_picto",
  ].forEach((k) => {
    const im = new Image();
    im.onload = () => {
      PORT[k] = maskPortrait(im);
      kick();
    };
    im.src = "img/portraits/" + k + ".jpg";
  });
  const FALLBACK = {
    guardiao: "taverna",
    schiltron: "rochedos",
    terra_queimada: "fogo",
    mensageiro: "caes",
    acamp_eduardo: "fogo",
    cailleach_julho: "dama",
    falkirk: "alvorada",
    cavalaria_foge: "alvorada",
    arqueiros_carga: "fogo",
    chuva_flechas: "cinzas",
    schiltron_rompe: "fogo",
    callendar: "caes",
    renuncia: "torre_dentro",
    falkirk_fim: "morte",
    floresta_1305: "caes",
    glasgow: "aldeia",
    dumbarton: "torre",
    robroyston: "fogo",
    captura: "fogo",
    comboio: "alvorada",
    westminster: "torre_dentro",
    londres: "cinzas",
    cailleach_londres: "dama",
    bruce: "taverna",
    scone: "taverna",
    methven: "fogo",
    aranha: "acampamento",
    castelo_noite: "torre",
    bannock: "alvorada",
    bohun: "alvorada",
    neve_junho: "dama",
    abade: "alvorada",
    avanco: "fogo",
    gillies: "alvorada",
    pedra_campo: "dama",
    cailleach_final: "dama",
    fim_primavera: "alvorada",
    fim_selo: "cachoeira",
    fim_inverno: "cinzas",
    epilogo: "alvorada",
    ettrick: "rochedos",
    wallace: "rochedos",
    treino: "rochedos",
    acamp_ingles: "fogo",
    drip: "vau",
    vespera: "torre",
    cailleach_rio: "dama",
    carpinteiro: "vau",
    frades: "alvorada",
    batalha: "fogo",
    cabeca: "fogo",
    arqueiros: "rochedos",
    ponte_cai: "vau",
    gelo: "dama",
    kelpies: "kelpie_rio",
    vitoria: "alvorada",
    dama_ponte: "cachoeira",
    inverno: "acampamento",
    lobos: "caes",
    partida: "alvorada",
    ponte: "torre",
    musgo: "pantano",
    sluagh_ceu: "cinzas",
    tay: "vau",
    dunsinane: "titulo",
    eremita: "taverna",
    cerco: "fogo",
    betulas: "rochedos",
    tumulo: "titulo",
    camara: "torre_dentro",
    cailleach: "dama",
    boca: "caes",
    lanark: "fogo",
    chegada: "aldeia",
    resgate: "fogo",
    escalada: "torre",
    portao: "torre",
    blackwood: "torre_dentro",
  };
  let wind = 0,
    windGoal = 0;
  function setWind(v) {
    windGoal = v;
    kick();
  }
  function windLayer(c, t, a) {
    const R = rng(77);
    c.lineCap = "round";
    for (let i = 0; i < 26; i++) {
      const y = R() * H * 0.9,
        len = 80 + R() * 140,
        sp = 520 + R() * 420,
        x = ((t * sp + R() * W * 1.6) % (W * 1.6)) - W * 0.3,
        w = Math.sin(t * 3 + i) * 8;
      c.strokeStyle = `rgba(225,234,242,${(0.12 + R() * 0.2) * Math.min(1, a)})`;
      c.lineWidth = 1 + R() * 1.2;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + len * 0.5, y + w, x + len, y - w * 0.5);
      c.stroke();
    }
    const cols = ["#a87cc0", "#c99ad6", "#cfa94f", "#e1e5d6"];
    for (let i = 0; i < 46; i++) {
      const sp = 260 + R() * 300,
        x = ((t * sp * (0.6 + a * 0.4) + R() * W * 1.4) % (W * 1.4)) - W * 0.2,
        y = (R() * H + Math.sin(t * 2 + i) * 30) % H,
        r = t * 4 + i;
      c.save();
      c.globalAlpha = Math.min(1, a) * 0.85;
      c.translate(x, y);
      c.rotate(r);
      c.fillStyle = cols[i % 4];
      c.beginPath();
      c.ellipse(0, 0, 4, 1.8, 0, 0, TAU);
      c.fill();
      c.restore();
    }
  }
  let cur = null,
    last = 0,
    raf = 0;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FX = { hit: {}, hurt: 0 };
  function show(key, opts) {
    cur = { key, opts: opts || {}, combat: null };
    kick();
  }
  function showCombat(key, getter) {
    cur = { key, opts: {}, combat: getter };
    kick();
  }
  function draw(now) {
    const cv = document.getElementById("art");
    if (!cv || !cur) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(cv.clientWidth * dpr),
      h = Math.round(w / 2.2);
    if (!w) return;
    if (cv.width !== w || cv.height !== h) {
      cv.width = w;
      cv.height = h;
    }
    const c = cv.getContext("2d");
    c.setTransform(w / W, 0, 0, h / H, 0, 0);
    const t = reduce ? 3 : now / 1000;
    const fn = SCENES[cur.key] || SCENES[FALLBACK[cur.key]] || SCENES.titulo;
    c.clearRect(0, 0, W, H);
    const im = IMGS[cur.key];
    const dup =
      cur.combat &&
      {
        vau: 1,
        kelpie_rio: 1,
        torre_dentro: 1,
        caes: 1,
        rochedos: 1,
        lobos: 1,
        boca: 1,
        musgo: 1,
        sluagh_ceu: 1,
        tumulo: 1,
        ponte: 1,
        cerco: 1,
        cailleach_final: 1,
        callendar: 1,
      }[cur.key];
    if (!dup && im && im.complete && im.naturalWidth) {
      cover(c, im, t);
      paintFx(c, t, cur.key);
    } else fn(c, t, cur.combat ? { ...cur.opts, bare: 1 } : cur.opts);
    wind += (windGoal - wind) * 0.08;
    if (!cur.combat && wind > 0.02) windLayer(c, t, wind);
    if (cur.combat) {
      const g = cur.combat();
      if (g && g.foes) {
        c.fillStyle = "rgba(0,0,0,.45)";
        c.fillRect(0, 0, W, H);
        const n = g.foes.length;
        g.foes.forEach((f, i) => {
          const alive = f.hp > 0;
          const age = FX.hit[i] ? now - FX.hit[i] : 1e9,
            red = age < 380;
          if (PORT[f.pic || f.k]) {
            const P = PORT[f.pic || f.k],
              ph = H * (n === 1 ? 1.02 : 0.9),
              pw = (ph * P.width) / P.height,
              x =
                W / 2 + (i - (n - 1) / 2) * Math.min(W * 0.4, pw * 0.95) + (red ? Math.sin(now / 18) * 7 : 0),
              y = H - ph + H * 0.06 + Math.sin(t * 1.6 + i) * 2;
            c.save();
            if (i === g.sel && alive) glow(c, x, H * 0.62, ph * 0.5, [224, 138, 69], 0.3);
            if (!alive) {
              c.globalAlpha = 0.35;
              c.filter = "grayscale(1) brightness(.55)";
            }
            if (i % 2) {
              c.translate(x, 0);
              c.scale(-1, 1);
              c.translate(-x, 0);
            }
            c.drawImage(P, x - pw / 2, y, pw, ph);
            c.filter = "none";
            c.setTransform(c.getTransform());
            c.globalAlpha = 1;
            if (red) {
              c.globalCompositeOperation = "lighter";
              glow(c, x, H * 0.55, ph * 0.45, [255, 40, 20], 0.35 * (1 - age / 380));
            }
            c.restore();
            return;
          }
          const x = n === 1 ? 540 : 360 + i * (360 / (n - 1)),
            y = 436;
          const col = red ? "#8f1a12" : "#030405";
          c.save();
          c.fillStyle = "rgba(0,0,0,.5)";
          c.beginPath();
          c.ellipse(x, y + 2, 70, 9, 0, 0, TAU);
          c.fill();
          if (i === g.sel && alive) {
            c.save();
            c.translate(x, y);
            c.scale(1, 0.22);
            glow(c, 0, 0, 120, [224, 138, 69], 0.5);
            c.restore();
          }
          if (red) glow(c, x, y - 90, 140, [255, 60, 40], 0.25 * (1 - age / 380));
          if (!alive) {
            c.globalAlpha = 0.45;
            c.translate(x + 70, y - 10);
            c.rotate(-Math.PI / 2);
            (FOE[f.k] || FOE.recruta)(c, 0, 0, t, col);
          } else (FOE[f.k] || FOE.recruta)(c, x, y, t, col);
          c.restore();
        });
      }
    }
    const hd = now - FX.hurt;
    if (hd < 550) {
      const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.65);
      g.addColorStop(0, "rgba(190,30,20,0)");
      g.addColorStop(1, `rgba(190,30,20,${0.6 * (1 - hd / 550)})`);
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    }
  }
  function loop(now) {
    raf = 0;
    if (document.hidden) return;
    if (now - last > 33) {
      last = now;
      draw(now);
    }
    if ((!reduce || Math.abs(windGoal - wind) > 0.02) && document.getElementById("art"))
      raf = requestAnimationFrame(loop);
  }
  function kick() {
    if (!raf) raf = requestAnimationFrame(loop);
  }
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) kick();
  });
  addEventListener("resize", () => kick());
  return { show, showCombat, FX, kick, setWind };
})();

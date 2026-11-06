/**
 * Vento guia: partículas de urze que sopram até a escolha em foco.
 */
"use strict";

/** Limite de partículas na tela ao mesmo tempo. */
const MAX_PARTICLES = 75;

const WIND = (() => {
  const cv = document.createElement("canvas");
  cv.id = "windfx";
  cv.setAttribute("aria-hidden", "true");
  document.body.appendChild(cv);
  const ctx = cv.getContext("2d");
  let ps = [],
    target = null,
    raf = 0,
    amt = 0,
    burst = 0;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLS = ["#a87cc0", "#c99ad6", "#cfa94f", "#e0c97e", "#e1e5d6", "#86a062"];
  function size() {
    const d = Math.min(2, devicePixelRatio || 1);
    cv.width = innerWidth * d;
    cv.height = innerHeight * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  size();
  addEventListener("resize", size);
  function spawn() {
    const L = Math.random() < 0.78;
    return {
      x: L ? -20 : Math.random() * innerWidth * 0.7,
      y: L ? Math.random() * innerHeight : -20,
      vx: 3 + Math.random() * 3,
      vy: (Math.random() - 0.5) * 2,
      r: Math.random() * 3,
      vr: (Math.random() - 0.5) * 0.25,
      s: 2.2 + Math.random() * 3.6,
      c: COLS[(Math.random() * COLS.length) | 0],
      ph: Math.random() * 6.28,
      life: 1.2,
      orbit: 0,
      streak: Math.random() < 0.12,
    };
  }
  function tick() {
    raf = 0;
    const W = innerWidth,
      H = innerHeight;
    ctx.clearRect(0, 0, W, H);
    amt += ((target ? 1 : 0) - amt) * 0.06;
    if (target) {
      const novas = Math.min(burst > 0.3 ? 6 : 3, MAX_PARTICLES - ps.length);
      for (let k = 0; k < novas; k++) ps.push(spawn());
    }
    let tx = 0,
      ty = 0;
    if (target) {
      const r = target.getBoundingClientRect();
      tx = r.left + Math.min(r.width * 0.3, 200);
      ty = Math.min(H - 20, Math.max(20, r.top + r.height / 2));
    }
    const sp = 1 + burst * 1.8,
      now = performance.now();
    for (const p of ps) {
      if (target && !p.leaving) {
        const dx = tx - p.x,
          dy = ty - p.y,
          d = Math.hypot(dx, dy) || 1;
        if (d < 46) p.orbit = 1;
        const wob = Math.sin(p.ph + now / 280) * 1.6;
        const ux = dx / d,
          uy = dy / d;
        const dsx = ux * 7 * sp - uy * wob,
          dsy = uy * 7 * sp + ux * wob;
        if (p.orbit) {
          p.vx += -uy * 0.7 + ux * 0.15;
          p.vy += ux * 0.7 + uy * 0.15;
          p.life -= 0.035;
        }
        p.vx += (dsx - p.vx) * 0.05;
        p.vy += (dsy - p.vy) * 0.05;
      } else {
        p.vx *= 1.01;
        p.vy += 0.03;
        p.life -= 0.02;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life)) * 0.7 * Math.max(0.25, amt);
      if (p.streak) {
        ctx.strokeStyle = "#dfe8ee";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 7, p.y - p.vy * 7);
        ctx.stroke();
      } else {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.s, p.s * 0.45, 0, 0, 6.283);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    ps = ps.filter((p) => p.life > 0 && p.x < W + 60 && p.y < H + 60 && p.y > -80);
    burst *= 0.95;
    if (ps.length || target) raf = requestAnimationFrame(tick);
  }
  function point(el) {
    target = el;
    if (!reduce && !raf) raf = requestAnimationFrame(tick);
  }
  function release(el) {
    if (!el || target === el) {
      target = null;
      ps.forEach((p) => (p.leaving = 1));
    }
  }
  function gust() {
    burst = 1;
  }
  return { point, release, gust, particleCount: () => ps.length };
})();
let committing = false;
function focusChoice(btn) {
  document.querySelectorAll(".choice.wind-on").forEach((b) => {
    if (b !== btn) b.classList.remove("wind-on");
  });
  if (btn.classList.contains("wind-on")) return;
  btn.classList.add("wind-on");
  WIND.point(btn);
  ART.setWind(1);
  AUD.gust();
}
function unfocusChoice(btn) {
  if (committing) return;
  btn.classList.remove("wind-on");
  WIND.release(btn);
  if (!document.querySelector(".choice.wind-on")) ART.setWind(0);
}
function commitChoice(btn, i) {
  if (committing) return;
  committing = true;
  focusChoice(btn);
  btn.classList.add("go");
  WIND.point(btn);
  WIND.gust();
  ART.setWind(1.7);
  AUD.gust(true);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  setTimeout(
    () => {
      committing = false;
      WIND.release();
      ART.setWind(0);
      choose(i);
    },
    reduce ? 0 : 460,
  );
}
function bindChoices(el) {
  const list = [...el.querySelectorAll(".choice")];
  list.forEach((btn) => {
    const i = +btn.dataset.i;
    btn.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") focusChoice(btn);
    });
    btn.addEventListener("pointerleave", (e) => {
      if (e.pointerType === "mouse") unfocusChoice(btn);
    });
    btn.addEventListener("pointerdown", (e) => {
      btn._touch = e.pointerType !== "mouse";
      btn._was = btn.classList.contains("wind-on");
    });
    btn.addEventListener("focus", () => {
      if (!btn._touch) focusChoice(btn);
    });
    btn.addEventListener("blur", () => unfocusChoice(btn));
    btn.addEventListener("click", () => {
      if (btn._touch && !btn._was) {
        btn._touch = false;
        focusChoice(btn);
        return;
      }
      btn._touch = false;
      commitChoice(btn, i);
    });
    btn.addEventListener("keydown", (e) => {
      const k = list.indexOf(btn);
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        list[(k + 1) % list.length].focus();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        list[(k - 1 + list.length) % list.length].focus();
      }
    });
  });
}

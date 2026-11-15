/**
 * Modo cinema: encena cada rodada de combate e abre cada capítulo como num filme.
 *
 * A lógica do combate continua instantânea e é a única fonte da verdade. Enquanto ela
 * roda, registra tomadas com CINEMA.shot(): quem atacou quem, se acertou e quanto feriu.
 * Ao fim da ação do jogador, CINEMA.end() encena essas tomadas numa camada por cima da
 * página. Um clique, toque ou tecla pula a cena. Com "reduzir movimento" ativado no
 * sistema, ou com o cinema desligado no menu, nada é encenado.
 *
 * Os movimentos usam molas amortecidas (oscilador harmônico): cada ator tem uma posição
 * alvo e a mola o leva até ela de forma suave e contínua, sem trancos. A inclinação do
 * corpo vem da velocidade, e uma respiração lenta mantém as figuras vivas.
 */
"use strict";

const CINEMA = (() => {
  const W = 1000;
  const H = 420;
  const FEET_Y = 385;
  const HERO_HOME = 290;
  const FOE_HOME = 710;
  const BAR_HEIGHT = 46;
  const MAX_SHOTS = 24;
  const WATCHDOG_MS = 20000;
  const PREF_KEY = "sen-cinema";
  /** Velocidade de cada modo: 1 é o tempo normal, 0 desliga. */
  const MODES = { completo: 1, rapido: 0.55, desligado: 0 };
  /** Sons do combate que o cinema toca no momento do impacto, em vez de na hora do clique. */
  const COMBAT_SOUNDS = new Set(["dado", "erro", "golpe", "ferido", "magia", "sucesso"]);
  const SPELL_COLORS = {
    sp_luz: [150, 255, 170],
    sp_cura: [255, 214, 120],
    sp_nevoa: [210, 222, 232],
    sp_espinhos: [190, 60, 70],
    sp_beltane: [110, 170, 255],
    sp_tempestade: [200, 225, 255],
    sp_estacoes: [255, 200, 120],
    sp_bride: [255, 236, 170],
  };
  const AMULET_COLORS = {
    sorveira: [220, 60, 50],
    crina: [90, 200, 220],
    pedra: [200, 200, 160],
    fragmento: [110, 170, 255],
  };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let mode = loadMode();
  let capture = null; // gravação em andamento: { shots, roster, art }
  let film = null; // filme em exibição

  // ---------------------------------------------------------------- preferências

  function loadMode() {
    try {
      const saved = JSON.parse(localStorage.getItem(PREF_KEY) || "null");
      if (saved && typeof saved.mode === "string" && Object.hasOwn(MODES, saved.mode)) return saved.mode;
    } catch {
      // Preferência ausente ou ilegível: usa o padrão.
    }
    return "completo";
  }

  function setMode(next) {
    if (!Object.hasOwn(MODES, next)) return;
    mode = next;
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({ mode }));
    } catch {
      // Armazenamento indisponível: a preferência vale só nesta sessão.
    }
  }

  const enabled = () => !reduceMotion && MODES[mode] > 0;

  // ---------------------------------------------------------------- gravação

  /** Começa a gravar as tomadas de uma ação do jogador no combate `combat`. */
  function begin(combat) {
    if (!enabled() || !combat) return;
    capture = {
      shots: [],
      art: combat.art,
      target: typeof selTarget === "number" ? selTarget : 0,
      roster: combat.foes.map((f) => ({ k: f.k, pic: f.pic || f.k, n: f.n, max: f.max, hp: f.hp })),
    };
    AUD.hold();
  }

  /** Registra uma tomada. Ignorada quando nada está sendo gravado. */
  function shot(s) {
    if (capture && capture.shots.length < MAX_SHOTS) capture.shots.push(s);
  }

  /** Termina a gravação e encena o que aconteceu. */
  function end() {
    if (!capture) return;
    const { shots, roster, art, target } = capture;
    capture = null;
    const held = AUD.release();
    if (!shots.length) {
      held.forEach((s) => AUD.sting(s));
      return;
    }
    const later = held.filter((s) => !COMBAT_SOUNDS.has(s));
    startFilm({ kind: "combat", shots, roster, art, target, later });
  }

  // ---------------------------------------------------------------- física

  /** Mola amortecida: `to` é o alvo, `k` a rigidez e `d` o amortecimento. */
  function spring(value, k = 170, d = 20) {
    return { v: value, vel: 0, to: value, k, d };
  }

  function stepSpring(s, dt, speed) {
    const k = s.k / (speed * speed);
    const d = s.d / speed;
    const a = -k * (s.v - s.to) - d * s.vel;
    s.vel += a * dt;
    s.v += s.vel * dt;
  }

  function makeActor(x) {
    return {
      x: spring(x),
      y: spring(0),
      arm: spring(0, 260, 24),
      alpha: spring(1, 90, 18),
      flash: 0,
      flashColor: "255,255,255",
      ghost: 0,
      phase: Math.random() * 6,
    };
  }

  function stepActor(a, dt, speed) {
    for (const key of ["x", "y", "arm", "alpha"]) stepSpring(a[key], dt, speed);
    a.flash = Math.max(0, a.flash - dt * 3.5);
    a.ghost = Math.max(0, a.ghost - dt * 2.5);
  }

  // ---------------------------------------------------------------- figuras

  const heroCanvas = document.createElement("canvas");
  heroCanvas.width = FIG.W;
  heroCanvas.height = FIG.H;
  const tintCanvas = document.createElement("canvas");

  function heroLook(armAngle, t) {
    const look = HERO_LOOKS[state?.look] || HERO_LOOKS[DEFAULT_LOOK];
    return {
      look: ARMOR[state.armor]?.look,
      weapon: state.weapon,
      wl: upLevel("arma", state.weapon),
      amulet: state.amulet,
      shield: canShield(state),
      woad: state.sangue >= 1,
      transparent: true,
      armAngle,
      ...look.figure,
      t,
    };
  }

  /** Desenha uma imagem com um brilho colorido por cima (golpe recebido). */
  function drawTinted(c, img, x, y, w, h, color, amount) {
    c.drawImage(img, x, y, w, h);
    if (amount <= 0) return;
    tintCanvas.width = img.width;
    tintCanvas.height = img.height;
    const t = tintCanvas.getContext("2d");
    t.clearRect(0, 0, img.width, img.height);
    t.drawImage(img, 0, 0);
    t.globalCompositeOperation = "source-atop";
    t.fillStyle = `rgba(${color},${Math.min(0.85, amount)})`;
    t.fillRect(0, 0, img.width, img.height);
    c.drawImage(tintCanvas, x, y, w, h);
  }

  function drawHero(c, a, t) {
    const portrait = heroPortrait(state);
    const breath = 1 + 0.012 * Math.sin(t * 2.1 + a.phase);
    const lean = Math.max(-0.22, Math.min(0.22, a.x.vel * 0.0006));
    c.save();
    c.globalAlpha = Math.max(0, Math.min(1, a.alpha.v));
    c.translate(a.x.v, FEET_Y + a.y.v);
    c.rotate(lean);
    c.scale(breath, breath);
    if (portrait) {
      const h = 400;
      const w = (h * portrait.width) / portrait.height;
      drawTinted(c, portrait, -w / 2, -h, w, h, a.flashColor, a.flash);
    } else {
      const g = heroCanvas.getContext("2d");
      g.clearRect(0, 0, FIG.W, FIG.H);
      FIG.draw(g, t, heroLook(a.arm.v, t));
      const h = 400;
      const w = (h * FIG.W) / FIG.H;
      // Os pés da figura ficam a 470 de 520 px: alinha esse ponto com o chão da cena.
      drawTinted(c, heroCanvas, -w / 2, -h * (470 / 520), w, h, a.flashColor, a.flash);
    }
    c.restore();
  }

  function drawFoe(c, a, foe, t, scale = 1) {
    if (!foe) return;
    const img = ART.portrait(foe.pic);
    const breath = 1 + 0.012 * Math.sin(t * 1.9 + a.phase);
    const lean = Math.max(-0.22, Math.min(0.22, a.x.vel * 0.0006));
    c.save();
    c.globalAlpha = Math.max(0, Math.min(1, a.alpha.v));
    c.translate(a.x.v, FEET_Y + a.y.v);
    c.rotate(lean);
    c.scale(breath * scale, breath * scale);
    if (a.ghost > 0) {
      c.save();
      c.globalAlpha *= a.ghost * 0.4;
      c.translate(-70, 0);
      if (img) c.drawImage(img, -150, -400, 300, 400);
      c.restore();
    }
    if (img) {
      const h = 400;
      const w = (h * img.width) / img.height;
      drawTinted(c, img, -w / 2, -h, w, h, a.flashColor, a.flash);
    } else {
      c.scale(1.7, 1.7);
      ART.foeSilhouette(c, foe.k, 0, 0, t, a.flash > 0.2 ? "#7a1410" : "#050608");
    }
    c.restore();
  }

  // ---------------------------------------------------------------- efeitos

  function addText(f, text, x, y, color, size = 34, life = 1.1) {
    f.fx.push({ type: "text", text, x, y, color, size, age: 0, life });
  }

  function addSparks(f, x, y, color, count = 18, power = 420) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = power * (0.3 + Math.random() * 0.7);
      f.particles.push({
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 120,
        life: 0.5 + Math.random() * 0.4,
        age: 0,
        color,
        size: 2 + Math.random() * 2.5,
        gravity: 700,
      });
    }
  }

  function addRising(f, x, y, color, count = 30) {
    for (let i = 0; i < count; i++) {
      f.particles.push({
        x: x + (Math.random() - 0.5) * 160,
        y: y + Math.random() * 120,
        vx: (Math.random() - 0.5) * 30,
        vy: -60 - Math.random() * 90,
        life: 0.9 + Math.random() * 0.6,
        age: 0,
        color,
        size: 2 + Math.random() * 3,
        gravity: -20,
      });
    }
  }

  function addEffect(f, type, props) {
    f.fx.push({ type, age: 0, life: 0.35, ...props });
  }

  function impactPoint(f) {
    return { x: f.foe.x.v - 40, y: FEET_Y - 210 };
  }

  function drawEffects(c, f, dt) {
    for (const p of f.particles) {
      p.age += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = 1 - p.age / p.life;
      if (k <= 0) continue;
      c.fillStyle = `rgba(${p.color},${k})`;
      c.fillRect(p.x, p.y, p.size, p.size);
    }
    f.particles = f.particles.filter((p) => p.age < p.life);

    for (const e of f.fx) {
      e.age += dt;
      const k = Math.min(1, e.age / e.life);
      const fade = 1 - k;
      if (e.type === "slash") {
        c.save();
        c.translate(e.x, e.y);
        c.rotate(e.dir || 0);
        const sweep = -1.1 + k * 2.2;
        c.lineCap = "round";
        for (let i = 0; i < 3; i++) {
          c.strokeStyle = `rgba(${e.color || "255,240,210"},${fade * (0.9 - i * 0.25)})`;
          c.lineWidth = 10 - i * 3;
          c.beginPath();
          c.arc(0, 0, 120 + i * 8, sweep - 0.9, sweep);
          c.stroke();
        }
        c.restore();
      } else if (e.type === "ring") {
        c.strokeStyle = `rgba(${e.color || "255,230,190"},${fade})`;
        c.lineWidth = 8 * fade + 1;
        c.beginPath();
        c.arc(e.x, e.y, 20 + k * (e.size || 140), 0, Math.PI * 2);
        c.stroke();
      } else if (e.type === "thrust") {
        c.strokeStyle = `rgba(255,245,225,${fade})`;
        c.lineWidth = 6 * fade + 1;
        c.beginPath();
        c.moveTo(e.x - 260 * (1 - k * 0.3), e.y);
        c.lineTo(e.x + 30, e.y);
        c.stroke();
      } else if (e.type === "projectile") {
        const x = e.x0 + (e.x1 - e.x0) * k;
        const y = e.y0 + (e.y1 - e.y0) * k - Math.sin(k * Math.PI) * (e.arc || 0);
        c.strokeStyle = `rgba(230,220,200,${0.6})`;
        c.lineWidth = e.arrow ? 3 : 2;
        c.beginPath();
        c.moveTo(x - (e.arrow ? 46 : 18), y + (e.arrow ? 0 : 2));
        c.lineTo(x, y);
        c.stroke();
        c.fillStyle = "#d8d2c4";
        c.beginPath();
        c.arc(x, y, e.arrow ? 3 : 6, 0, Math.PI * 2);
        c.fill();
      } else if (e.type === "aura") {
        ART.glow(c, e.x, e.y, 150 + 60 * Math.sin(k * Math.PI), e.color, 0.55 * Math.sin(k * Math.PI));
      } else if (e.type === "beam") {
        const g = c.createLinearGradient(e.x0, 0, e.x1, 0);
        g.addColorStop(0, `rgba(${e.color},0)`);
        g.addColorStop(1, `rgba(${e.color},${fade})`);
        c.strokeStyle = g;
        c.lineWidth = 14 * fade + 2;
        c.beginPath();
        c.moveTo(e.x0, e.y);
        c.lineTo(e.x1, e.y);
        c.stroke();
        ART.glow(c, e.x1, e.y, 120, e.color, fade * 0.8);
      } else if (e.type === "thorns") {
        c.strokeStyle = `rgba(70,40,30,${fade})`;
        c.lineWidth = 6;
        for (let i = 0; i < 7; i++) {
          const bx = e.x - 90 + i * 30;
          const top = FEET_Y - 40 - Math.min(1, k * 3) * (90 + ((i * 37) % 70));
          c.beginPath();
          c.moveTo(bx, FEET_Y);
          c.quadraticCurveTo(bx + 18, (FEET_Y + top) / 2, bx + 6, top);
          c.stroke();
        }
      } else if (e.type === "hail") {
        c.strokeStyle = `rgba(220,235,255,${0.7 * fade})`;
        c.lineWidth = 2;
        for (let i = 0; i < 80; i++) {
          const x = (i * 97 + e.age * 900) % W;
          const y = (i * 53 + e.age * 1300) % H;
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x - 6, y + 18);
          c.stroke();
        }
      } else if (e.type === "mist") {
        c.fillStyle = `rgba(210,222,232,${0.5 * Math.sin(k * Math.PI)})`;
        c.fillRect(0, 0, W, H);
      } else if (e.type === "shield") {
        c.strokeStyle = `rgba(150,200,255,${fade})`;
        c.lineWidth = 5;
        c.beginPath();
        c.arc(e.x, e.y, 70 + k * 30, -1.3, 1.3);
        c.stroke();
      } else if (e.type === "text") {
        const rise = k * 50;
        c.save();
        c.globalAlpha = k < 0.15 ? k / 0.15 : fade < 0.3 ? fade / 0.3 : 1;
        c.font = `700 ${e.size}px "Alegreya Sans SC", "Gill Sans", sans-serif`;
        c.textAlign = "center";
        c.lineWidth = 6;
        c.strokeStyle = "rgba(0,0,0,.75)";
        c.strokeText(e.text, e.x, e.y - rise);
        c.fillStyle = e.color;
        c.fillText(e.text, e.x, e.y - rise);
        c.restore();
      }
    }
    f.fx = f.fx.filter((e) => e.age < e.life);
  }

  // ---------------------------------------------------------------- roteiros

  const heroLabel = () => (state?.name ? state.name : "Você");

  /**
   * Cada tipo de tomada vira um roteiro: duração em segundos e eventos marcados no tempo.
   * Os eventos mudam alvos de molas e criam efeitos; as molas cuidam do movimento.
   */
  function script(f, s) {
    const foeIndex = s.foe ?? s.all?.[0]?.foe;
    const foeData = foeIndex !== undefined ? f.roster[foeIndex] : null;
    const name = foeData?.n || "";
    const ev = [];
    const at = (time, fn) => ev.push({ time, fn, done: false });
    let dur = 1.2;

    const focusOn = () => {
      if (foeIndex !== undefined && f.focus !== foeIndex) {
        f.focus = foeIndex;
        f.foe.x.v = FOE_HOME + 260;
        f.foe.x.to = FOE_HOME;
        f.foe.alpha.v = 0;
        f.foe.alpha.to = 1;
        f.foe.y.to = 0;
      }
    };
    const damageFoe = (dmg, killed) => {
      if (foeData) foeData.hp = Math.max(0, foeData.hp - dmg);
      if (killed) {
        at(0.95, () => {
          f.foe.alpha.to = 0;
          f.foe.y.to = 90;
          addText(f, `${name} cai`, FOE_HOME, FEET_Y - 330, "#e9e2d0", 26, 1.2);
        });
      }
    };

    if (s.type === "strike" && s.by === "hero") {
      const ranged = s.kind === "stone" || s.kind === "arrow";
      f.subtitle = `${heroLabel()} ${ranged ? "dispara contra" : "ataca"} ${name}`;
      f.dice = s.roll || null;
      at(0, () => {
        focusOn();
        AUD.sting("dado");
        f.cam.cx.to = 470;
        f.cam.zoom.to = 1.07;
        f.hero.x.to = HERO_HOME - 40;
        f.hero.arm.to = -1.5;
      });
      const hitTime = ranged ? 0.62 : 0.5;
      if (ranged) {
        at(0.32, () => {
          f.hero.arm.to = 0.4;
          addEffect(f, "projectile", {
            x0: f.hero.x.v + 70,
            y0: FEET_Y - 250,
            x1: FOE_HOME - 30,
            y1: FEET_Y - 220,
            arc: s.kind === "stone" ? 60 : 12,
            arrow: s.kind === "arrow",
            life: 0.3,
          });
        });
      } else {
        at(0.24, () => {
          f.hero.x.to = FOE_HOME - 175;
          f.cam.zoom.to = 1.15;
          f.cam.cx.to = 560;
        });
        at(0.44, () => (f.hero.arm.to = 1.05));
      }
      at(hitTime, () => {
        const p = impactPoint(f);
        if (s.outcome === "hit") {
          if (s.kind === "cut") addEffect(f, "slash", { x: p.x, y: p.y, dir: 0.3 });
          else if (s.kind === "imp" || s.kind === "arrow") addEffect(f, "thrust", { x: p.x, y: p.y });
          else addEffect(f, "ring", { x: p.x, y: p.y });
          addSparks(f, p.x, p.y, s.crit ? "255,210,120" : "255,236,200", s.crit ? 34 : 18);
          f.foe.flash = 1;
          f.foe.flashColor = "255,250,235";
          f.foe.x.to = FOE_HOME + (s.crit ? 110 : 60);
          f.shake = s.crit ? 26 : 14;
          if (s.crit) {
            f.slowUntil = f.time + 0.35;
            addText(f, "ACERTO CRÍTICO", W / 2, 110, "#ffd27a", 40, 1.3);
          }
          addText(f, `−${s.dmg}`, p.x + 40, p.y - 40, "#ffd27a", 46);
          AUD.sting("golpe");
          damageFoe(s.dmg, s.killed);
        } else if (s.outcome === "miss") {
          f.foe.x.to = FOE_HOME + 130;
          f.foe.y.to = -12;
          f.foe.ghost = 1;
          addText(f, "ERROU", p.x, p.y - 60, "#d3dcdd", 34);
          AUD.sting("erro");
        } else {
          addSparks(f, p.x - 40, p.y + 10, "255,220,150", 22, 360);
          addEffect(f, "ring", { x: p.x - 40, y: p.y + 10, size: 60, color: "255,220,150" });
          f.hero.x.to = HERO_HOME + 120;
          f.shake = 8;
          addText(f, "DEFENDIDO", p.x, p.y - 60, "#d3dcdd", 34);
          AUD.sting("erro");
        }
      });
      at(0.8, () => {
        f.hero.arm.to = 0;
        f.hero.x.to = HERO_HOME;
        if (!s.killed) {
          f.foe.x.to = FOE_HOME;
          f.foe.y.to = 0;
        }
        f.cam.zoom.to = 1.03;
        f.cam.cx.to = W / 2;
      });
      dur = 1.3;
    } else if (s.type === "strike" && s.by === "foe") {
      f.subtitle = `${name} ataca`;
      f.dice = s.roll || null;
      if (s.outcome === "stunned") {
        at(0, () => {
          focusOn();
          f.foe.x.to = FOE_HOME + 30;
          addText(f, "ATORDOADO", FOE_HOME, FEET_Y - 320, "#ffd27a", 30);
        });
        at(0.35, () => (f.foe.x.to = FOE_HOME - 20));
        at(0.6, () => (f.foe.x.to = FOE_HOME));
        dur = 0.75;
      } else {
        at(0, () => {
          focusOn();
          f.foe.x.to = FOE_HOME + 45;
          f.cam.cx.to = 520;
          f.cam.zoom.to = 1.08;
        });
        at(0.22, () => {
          f.foe.x.to = HERO_HOME + 175;
          f.cam.zoom.to = 1.15;
          f.cam.cx.to = 430;
        });
        at(0.45, () => {
          const hx = f.hero.x.v + 40;
          const hy = FEET_Y - 220;
          if (s.outcome === "hit") {
            f.hero.flash = 1;
            f.hero.flashColor = "200,40,30";
            f.hero.x.to = HERO_HOME - 70;
            f.hurt = 1;
            f.shake = s.crit ? 26 : 16;
            addSparks(f, hx, hy, "200,60,40", 16, 300);
            addText(f, `−${s.dmg}`, hx - 40, hy - 40, "#ff7a6a", 46);
            if (s.crit) addText(f, "CRÍTICO", W / 2, 110, "#ff7a6a", 40, 1.3);
            AUD.sting("ferido");
          } else if (s.outcome === "dodge") {
            f.hero.x.to = HERO_HOME - 120;
            f.hero.y.to = -14;
            f.hero.ghost = 1;
            addText(f, "ESQUIVA", hx - 60, hy - 60, "#9fd08a", 34);
            AUD.sting("erro");
          } else if (s.outcome === "parry") {
            f.hero.arm.to = -0.9;
            addSparks(f, hx + 50, hy, "255,220,150", 24, 380);
            addEffect(f, "ring", { x: hx + 50, y: hy, size: 60, color: "255,220,150" });
            f.foe.x.to = FOE_HOME - 80;
            f.shake = 8;
            addText(f, "APARADO", hx, hy - 60, "#9fd08a", 34);
            AUD.sting("erro");
          } else if (s.outcome === "block") {
            addEffect(f, "shield", { x: hx + 30, y: hy + 40, life: 0.5 });
            addSparks(f, hx + 60, hy + 30, "180,210,255", 20, 340);
            f.foe.x.to = FOE_HOME - 60;
            f.shake = 8;
            addText(f, "BLOQUEIO", hx, hy - 60, "#9fd08a", 34);
            AUD.sting("erro");
          } else {
            f.foe.x.to = HERO_HOME + 60;
            addText(f, "ERROU", hx, hy - 60, "#d3dcdd", 34);
            AUD.sting("erro");
          }
        });
        at(0.75, () => {
          f.foe.x.to = FOE_HOME;
          f.hero.x.to = HERO_HOME;
          f.hero.y.to = 0;
          f.hero.arm.to = 0;
          f.cam.zoom.to = 1.03;
          f.cam.cx.to = W / 2;
        });
        dur = 1.1;
      }
    } else if (s.type === "ally") {
      f.subtitle = `${s.name} ataca ${name}`;
      at(0, () => {
        focusOn();
        f.cam.cx.to = 600;
      });
      at(0.25, () => {
        const p = impactPoint(f);
        if (s.outcome === "hit") {
          addEffect(f, "slash", { x: p.x, y: p.y, dir: -0.5, color: "210,230,255" });
          addSparks(f, p.x, p.y, "220,235,255", 16);
          f.foe.flash = 0.8;
          f.foe.x.to = FOE_HOME + 50;
          f.shake = 10;
          addText(f, `−${s.dmg}`, p.x + 40, p.y - 40, "#cfe2ff", 40);
          AUD.sting("golpe");
          damageFoe(s.dmg, s.killed);
        } else {
          addText(f, s.outcome === "miss" ? "ERROU" : "DEFENDIDO", p.x, p.y - 60, "#d3dcdd", 30);
        }
      });
      at(0.55, () => {
        if (!s.killed) f.foe.x.to = FOE_HOME;
        f.cam.cx.to = W / 2;
      });
      dur = s.killed ? 1.1 : 0.8;
    } else if (s.type === "spell") {
      const color = SPELL_COLORS[s.key] || [220, 230, 255];
      const rgb = color.join(",");
      f.subtitle = `${heroLabel()} conjura ${SK[s.key]?.n || "uma magia"}`;
      f.dice = s.roll || null;
      at(0, () => {
        if (foeIndex !== undefined) focusOn();
        AUD.sting("dado");
        f.hero.arm.to = -2.2;
        f.cam.zoom.to = 1.06;
        addEffect(f, "aura", { x: f.hero.x.v, y: FEET_Y - 220, color, life: 0.9 });
        addRising(f, f.hero.x.v, FEET_Y - 120, rgb, 24);
      });
      at(0.55, () => {
        f.hero.arm.to = 0.6;
        if (s.outcome !== "ok") {
          addText(f, "A MAGIA SE DISSIPA", W / 2, 120, "#d3dcdd", 34, 1.2);
          addRising(f, f.hero.x.v, FEET_Y - 220, "150,150,150", 30);
          return;
        }
        AUD.sting("magia");
        const p = impactPoint(f);
        if (s.key === "sp_cura" || s.key === "sp_bride") {
          addRising(f, f.hero.x.v, FEET_Y - 120, rgb, 50);
          addText(f, `+${s.heal} PV`, f.hero.x.v, FEET_Y - 330, "#9fd08a", 44);
        } else if (s.key === "sp_nevoa") {
          addEffect(f, "mist", { life: 1 });
          addText(f, "NÉVOA", W / 2, 120, "#e3ebee", 40);
        } else if (s.key === "sp_luz") {
          addEffect(f, "beam", { x0: f.hero.x.v + 60, x1: p.x, y: p.y, color, life: 0.5 });
          f.foe.flash = 1;
          f.foe.flashColor = "190,255,200";
          addText(f, "OFUSCADO", p.x, p.y - 70, "#b8ffc4", 32);
        } else if (s.key === "sp_espinhos") {
          addEffect(f, "thorns", { x: FOE_HOME, life: 0.9 });
          f.foe.flash = 1;
          f.foe.flashColor = "200,60,60";
          addText(f, `−${s.dmg}`, p.x + 40, p.y - 40, "#ffd27a", 46);
          damageFoe(s.dmg, s.killed);
        } else if (s.key === "sp_beltane") {
          addEffect(f, "beam", { x0: f.hero.x.v + 60, x1: p.x, y: p.y, color, life: 0.5 });
          addSparks(f, p.x, p.y, rgb, 40, 380);
          f.foe.flash = 1;
          f.foe.flashColor = "140,190,255";
          addText(f, `−${s.dmg}`, p.x + 40, p.y - 40, "#ffd27a", 46);
          damageFoe(s.dmg, s.killed);
        } else if (s.key === "sp_tempestade") {
          addEffect(f, "hail", { life: 1.1 });
          f.shake = 12;
          for (const hit of s.all || []) {
            const target = f.roster[hit.foe];
            if (target) target.hp = Math.max(0, target.hp - hit.dmg);
          }
          const total = (s.all || []).reduce((sum, hit) => sum + hit.dmg, 0);
          addText(f, `−${total} no total`, W / 2, 120, "#ffd27a", 40, 1.2);
        } else if (s.key === "sp_estacoes") {
          addEffect(f, "aura", { x: W / 2, y: H / 2, color, life: 1 });
          addRising(f, W / 2, H - 120, "255,200,120", 40);
          addRising(f, W / 2, H - 120, "150,255,170", 30);
          addText(f, `+${s.heal} PV`, f.hero.x.v, FEET_Y - 330, "#9fd08a", 44);
        }
      });
      at(1.0, () => {
        f.hero.arm.to = 0;
        f.cam.zoom.to = 1.03;
      });
      dur = 1.35;
    } else if (s.type === "heal") {
      f.subtitle = s.source === "folego" ? "Fôlego das Highlands" : "Ervas sobre as feridas";
      at(0, () => {
        addRising(f, f.hero.x.v, FEET_Y - 100, "160,230,140", 40);
        addText(f, `+${s.amount} PV`, f.hero.x.v, FEET_Y - 330, "#9fd08a", 44);
        AUD.sting("sucesso");
      });
      dur = 0.9;
    } else if (s.type === "guard") {
      f.subtitle = `${heroLabel()} se fecha em defesa`;
      at(0, () => {
        f.hero.y.to = 12;
        f.hero.arm.to = -0.7;
        addEffect(f, "shield", { x: f.hero.x.v + 40, y: FEET_Y - 200, life: 0.6 });
        addText(f, "DEFESA TOTAL", f.hero.x.v, FEET_Y - 340, "#cfe2ff", 32);
      });
      at(0.55, () => {
        f.hero.y.to = 0;
        f.hero.arm.to = 0;
      });
      dur = 0.75;
    } else if (s.type === "feint") {
      f.subtitle = `${heroLabel()} finge um golpe`;
      f.dice = s.roll || null;
      at(0, () => {
        focusOn();
        AUD.sting("dado");
        f.hero.x.to = HERO_HOME + 90;
        f.hero.arm.to = -0.8;
      });
      at(0.3, () => {
        f.hero.x.to = HERO_HOME;
        f.hero.arm.to = 0;
        if (s.ok) {
          f.foe.x.to = FOE_HOME + 50;
          addText(f, "FINTA!", FOE_HOME, FEET_Y - 320, "#ffd27a", 34);
        } else addText(f, "NÃO CAIU NA FINTA", FOE_HOME, FEET_Y - 320, "#d3dcdd", 28);
      });
      at(0.6, () => (f.foe.x.to = FOE_HOME));
      dur = 0.85;
    } else if (s.type === "amulet") {
      const color = AMULET_COLORS[s.key] || [255, 255, 255];
      f.subtitle = AMU_ACT[s.key]?.n || "Amuleto";
      at(0, () => {
        addEffect(f, "aura", { x: f.hero.x.v, y: FEET_Y - 210, color, life: 0.9 });
        addRising(f, f.hero.x.v, FEET_Y - 160, color.join(","), 30);
        AUD.sting("magia");
      });
      dur = 0.9;
    } else if (s.type === "flee") {
      f.subtitle = s.ok ? `${heroLabel()} foge` : `${heroLabel()} tenta fugir`;
      at(0, () => (f.hero.x.to = s.ok ? -220 : HERO_HOME - 90));
      at(0.5, () => {
        if (!s.ok) f.hero.x.to = HERO_HOME;
      });
      dur = 0.85;
    } else if (s.type === "end") {
      if (s.result === "flee") {
        dur = 0.2;
      } else if (s.result === "win") {
        f.subtitle = "Vitória";
        at(0, () => {
          f.foe.alpha.to = 0;
          f.hero.arm.to = -1.6;
          f.hero.x.to = HERO_HOME + 60;
          f.cam.cx.to = 380;
          f.cam.zoom.to = 1.1;
          addEffect(f, "aura", { x: HERO_HOME + 60, y: FEET_Y - 220, color: [255, 210, 120], life: 1.3 });
          addText(f, "VITÓRIA", W / 2, 120, "#ffd27a", 54, 1.5);
        });
        dur = 1.5;
      } else {
        f.subtitle = s.result === "death" ? "O fim" : "Você cai";
        at(0, () => {
          f.hero.y.to = 70;
          f.hero.alpha.to = 0.35;
          f.dark = 1;
        });
        dur = 1.4;
      }
    }
    return { dur, ev, started: false };
  }

  // ---------------------------------------------------------------- exibição

  const overlay = () => document.getElementById("cinema");

  function startFilm(spec) {
    const el = overlay();
    if (!el) {
      (spec.later || []).forEach((s) => AUD.sting(s));
      return;
    }
    stop();
    const speed = MODES[mode] || 1;
    const f = {
      ...spec,
      speed,
      time: 0,
      clock: 0,
      index: -1,
      current: null,
      shotTime: 0,
      hero: makeActor(HERO_HOME - 220),
      foe: makeActor(FOE_HOME + 260),
      focus: spec.target ?? null,
      cam: { zoom: spring(1.0, 50, 13), cx: spring(W / 2, 50, 13) },
      shake: 0,
      hurt: 0,
      dark: 0,
      fx: [],
      particles: [],
      subtitle: "",
      dice: null,
      bars: 0,
      slowUntil: 0,
      startedAt: performance.now(),
      last: performance.now(),
      raf: 0,
    };
    f.hero.x.to = HERO_HOME;
    f.foe.x.v = FOE_HOME + 140;
    f.foe.x.to = FOE_HOME;
    film = f;
    el.hidden = false;
    el.classList.remove("closing");
    f.raf = requestAnimationFrame(frame);
  }

  /** Para o filme e devolve a página. Toca os sons que ficaram para o fim (vitória, derrota). */
  function stop() {
    if (!film) return;
    cancelAnimationFrame(film.raf);
    const later = film.later || [];
    film = null;
    const el = overlay();
    if (el) el.hidden = true;
    later.forEach((s) => AUD.sting(s));
  }

  function nextShot(f) {
    f.index++;
    if (f.kind === "title") return false;
    if (f.index >= f.shots.length) return false;
    f.current = script(f, f.shots[f.index]);
    f.shotTime = 0;
    return true;
  }

  function frame(now) {
    const f = film;
    if (!f) return;
    try {
      let dt = Math.min(1 / 30, (now - f.last) / 1000);
      f.last = now;
      if (f.time < f.slowUntil) dt *= 0.35;
      f.time += dt;
      const sdt = dt / f.speed;
      if (now - f.startedAt > WATCHDOG_MS) return stop();

      if (f.kind === "combat") {
        if (!f.current || f.shotTime >= f.current.dur) {
          if (!nextShot(f)) {
            f.closing = (f.closing || 0) + sdt;
            if (f.closing > 0.35) return stop();
          }
        }
        if (f.current && f.shotTime < f.current.dur) {
          for (const e of f.current.ev) {
            if (!e.done && f.shotTime >= e.time) {
              e.done = true;
              e.fn();
            }
          }
          f.shotTime += sdt;
        }
        stepActor(f.hero, dt, f.speed);
        stepActor(f.foe, dt, f.speed);
        stepSpring(f.cam.zoom, dt, f.speed);
        stepSpring(f.cam.cx, dt, f.speed);
        f.bars = Math.min(1, f.bars + sdt * 4);
        drawCombat(f, sdt);
      } else {
        f.shotTime += sdt;
        if (f.shotTime >= f.dur) return stop();
        drawTitle(f);
      }
      f.raf = requestAnimationFrame(frame);
    } catch (err) {
      // Um erro na encenação nunca pode prender o jogador: fecha o filme.
      stop();
      throw err;
    }
  }

  function canvasContext() {
    const cv = overlay()?.querySelector("canvas");
    if (!cv) return null;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(cv.clientWidth * dpr);
    const h = Math.round((w * H) / W);
    if (!w) return null;
    if (cv.width !== w || cv.height !== h) {
      cv.width = w;
      cv.height = h;
    }
    const c = cv.getContext("2d");
    c.setTransform(w / W, 0, 0, h / H, 0, 0);
    return c;
  }

  function drawCombat(f, sdt) {
    const c = canvasContext();
    if (!c) return;
    const t = performance.now() / 1000;
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);
    c.save();
    const sx = (Math.random() - 0.5) * f.shake;
    const sy = (Math.random() - 0.5) * f.shake;
    f.shake *= Math.pow(0.0005, sdt);
    c.translate(W / 2 + sx, H / 2 + sy);
    c.scale(f.cam.zoom.v, f.cam.zoom.v);
    c.translate(-f.cam.cx.v, -H / 2);
    c.save();
    c.translate(0, (H - ART.H) / 2);
    ART.paintBackground(c, f.art, t, { combat: true });
    c.restore();
    c.fillStyle = "rgba(0,0,0,.38)";
    c.fillRect(-200, -200, W + 400, H + 400);

    // Inimigos que não estão em foco ficam ao fundo, menores e escurecidos.
    f.roster.forEach((foe, i) => {
      if (i === f.focus || foe.hp <= 0) return;
      const back = makeBackActor(f, i);
      drawFoe(c, back, foe, t, 0.72);
    });
    const focusFoe = f.focus !== null ? f.roster[f.focus] : null;
    const heroInFront = f.hero.x.v > f.foe.x.v - 300;
    if (!heroInFront) drawHero(c, f.hero, t);
    drawFoe(c, f.foe, focusFoe, t);
    if (heroInFront) drawHero(c, f.hero, t);
    drawEffects(c, f, sdt);
    c.restore();

    if (focusFoe) drawHealthBar(c, focusFoe);
    if (f.hurt > 0) {
      const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.65);
      g.addColorStop(0, "rgba(190,30,20,0)");
      g.addColorStop(1, `rgba(190,30,20,${0.55 * f.hurt})`);
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
      f.hurt = Math.max(0, f.hurt - sdt * 2);
    }
    if (f.dark > 0) {
      f.darkLevel = Math.min(0.75, (f.darkLevel || 0) + sdt * 0.8);
      c.fillStyle = `rgba(0,0,0,${f.darkLevel})`;
      c.fillRect(0, 0, W, H);
    }
    drawBars(c, f);
  }

  function makeBackActor(f, i) {
    const slot = (i * 37) % 3;
    return {
      x: { v: FOE_HOME + 120 + slot * 70, vel: 0 },
      y: { v: -20 - slot * 10 },
      alpha: { v: 0.55 },
      flash: 0,
      ghost: 0,
      phase: i,
    };
  }

  function drawHealthBar(c, foe) {
    const w = 180;
    const x = W - w - 40;
    const y = BAR_HEIGHT + 18;
    c.fillStyle = "rgba(0,0,0,.6)";
    c.fillRect(x - 2, y - 2, w + 4, 12);
    c.fillStyle = "#c4504a";
    c.fillRect(x, y, w * Math.max(0, foe.hp / foe.max), 8);
    c.font = '600 15px "Alegreya Sans SC", sans-serif';
    c.textAlign = "right";
    c.fillStyle = "#e9e2d0";
    c.fillText(foe.n, x + w, y - 8);
  }

  function drawBars(c, f) {
    const h = BAR_HEIGHT * easeOut(f.bars);
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, h);
    c.fillRect(0, H - h, W, h);
    if (f.subtitle && f.bars > 0.9) {
      c.font = 'italic 22px "Alegreya", Georgia, serif';
      c.textAlign = "center";
      c.fillStyle = "#e3e9ea";
      c.fillText(f.subtitle, W / 2, H - 16);
    }
    if (f.dice && f.bars > 0.9) drawDice(c, f.dice);
  }

  function drawDice(c, roll) {
    const size = 24;
    roll.dice.forEach((d, i) => {
      const x = 24 + i * (size + 6);
      const y = H - BAR_HEIGHT + 11;
      c.fillStyle = "#e8e2d2";
      c.fillRect(x, y, size, size);
      c.fillStyle = "#1a1a1a";
      c.font = '700 15px "Alegreya Sans SC", sans-serif';
      c.textAlign = "center";
      c.fillText(String(d), x + size / 2, y + 17);
    });
    c.textAlign = "left";
    c.font = '600 15px "Alegreya Sans SC", sans-serif';
    c.fillStyle = roll.sum <= roll.target ? "#9fd08a" : "#e07a6a";
    c.fillText(`${roll.sum} ≤ ${roll.target}?`, 24 + 3 * (size + 6) + 4, H - BAR_HEIGHT + 28);
  }

  const easeOut = (x) => 1 - Math.pow(1 - x, 3);

  // ---------------------------------------------------------------- cartela de capítulo

  /** Abre um capítulo como num filme: pintura, título e subtítulo. */
  function titleCard(eyebrow, art) {
    if (!enabled()) return;
    const [chapter, name] = String(eyebrow)
      .split("·")
      .map((x) => x.trim());
    startFilm({ kind: "title", chapter, name: name || "", art, dur: 3.4, later: [] });
  }

  function drawTitle(f) {
    const c = canvasContext();
    if (!c) return;
    const p = f.shotTime / f.dur;
    const t = performance.now() / 1000;
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);
    c.save();
    const zoom = 1.08 - 0.06 * p;
    c.translate(W / 2, H / 2);
    c.scale(zoom, zoom);
    c.translate(-W / 2, -H / 2 + (H - ART.H) / 2);
    c.globalAlpha = Math.min(1, p * 3) * (p > 0.85 ? (1 - p) / 0.15 : 1);
    ART.paintBackground(c, f.art, t, {});
    c.restore();
    c.fillStyle = "rgba(0,0,0,.45)";
    c.fillRect(0, 0, W, H);
    const textAlpha =
      p < 0.2 ? 0 : p < 0.35 ? (p - 0.2) / 0.15 : p > 0.82 ? Math.max(0, (0.97 - p) / 0.15) : 1;
    c.globalAlpha = textAlpha;
    c.textAlign = "center";
    c.fillStyle = "#e08a45";
    c.font = '700 20px "Alegreya Sans SC", sans-serif';
    c.fillText(f.chapter.toUpperCase().split("").join(" "), W / 2, H / 2 - 42);
    c.fillStyle = "#eef2f2";
    c.font = `${48 + p * 6}px "Uncial Antiqua", Georgia, serif`;
    c.fillText(f.name, W / 2, H / 2 + 22);
    c.globalAlpha = 1;
    f.bars = 1;
    drawBars(c, { ...f, subtitle: "", dice: null, bars: 1 });
  }

  // ---------------------------------------------------------------- controles

  function setupOverlay() {
    const el = overlay();
    if (!el) return;
    const skip = (e) => {
      if (!film) return;
      e.preventDefault();
      e.stopPropagation();
      stop();
    };
    el.addEventListener("pointerdown", skip);
    document.addEventListener("keydown", (e) => {
      if (film) skip(e);
    });
  }

  return {
    begin,
    shot,
    end,
    titleCard,
    stop,
    setMode,
    setupOverlay,
    get mode() {
      return mode;
    },
    isPlaying: () => !!film,
    isEnabled: enabled,
    MODES,
  };
})();

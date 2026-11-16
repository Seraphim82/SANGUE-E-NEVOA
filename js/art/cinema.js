/**
 * Modo cinema: encena cada rodada de combate e abre cada capítulo como num filme.
 *
 * A lógica do combate continua instantânea e é a única fonte da verdade. Enquanto ela
 * roda, registra tomadas com CINEMA.shot(): quem atacou quem, se acertou e quanto feriu.
 * Ao fim da ação do jogador, CINEMA.end() monta cada tomada como uma sequência de planos
 * pintados (o rosto do herói, o close da arma, o inimigo atingido) e corta entre eles
 * como num filme: aproximação lenta da câmera, borrão no corte rápido, clarão no impacto,
 * tremor, faíscas e câmera lenta no acerto crítico.
 *
 * Os planos ficam em img/action/<chave>.jpg (lista em ACTION_SHOTS). Quando um plano não
 * existe, o cinema usa o retrato pintado do herói ou do inimigo sobre a cena.
 *
 * Um clique, toque ou tecla pula a cena. Com "reduzir movimento" ativado no sistema, ou
 * com o cinema desligado no menu, nada é encenado.
 */
"use strict";

const CINEMA = (() => {
  const W = 1000;
  const H = 420;
  const BAR_HEIGHT = 46;
  const MAX_SHOTS = 24;
  const WATCHDOG_MS = 25000;
  const PREF_KEY = "sen-cinema";
  /** Ritmo de cada modo: 1 é o tempo normal, menor é mais rápido, 0 desliga. */
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
  /** Onde ficam o herói e o inimigo nos planos fechados (terço esquerdo e terço direito). */
  const HERO_SPOT = { x: 330, y: 190 };
  const FOE_SPOT = { x: 680, y: 190 };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let mode = loadMode();
  let capture = null; // gravação em andamento
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

  // ---------------------------------------------------------------- planos pintados

  const shotImages = {};

  /** Começa a baixar um plano, se ele existir. */
  function want(key) {
    if (!ACTION_SHOTS.has(key) || shotImages[key]) return;
    const im = new Image();
    im.src = `img/action/${key}.jpg`;
    shotImages[key] = im;
  }

  /** O plano já carregado, ou `null`. */
  function plate(key) {
    const im = shotImages[key];
    return im && im.complete && im.naturalWidth ? im : null;
  }

  const heroKey = () => `${state.look || DEFAULT_LOOK}_${state.armor}`;

  /** Baixa antes do primeiro golpe os planos que este combate pode usar. */
  function preload(combat) {
    if (!enabled() || !combat || !state) return;
    want(`heroi_furia_${heroKey()}`);
    want(`heroi_dor_${heroKey()}`);
    want(`arma_golpe_${state.weapon}`);
    want(`arma_aparo_${state.weapon}`);
    if (canShield(state)) want("escudo");
    for (const f of combat.foes) {
      for (const pose of ["ataque", "atingido", "queda"]) want(`inimigo_${pose}_${f.pic || f.k}`);
    }
  }

  // ---------------------------------------------------------------- gravação

  /** Começa a gravar as tomadas de uma ação do jogador no combate `combat`. */
  function begin(combat) {
    if (!enabled() || !combat) return;
    preload(combat);
    capture = {
      shots: [],
      art: combat.art,
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
    const { shots, roster, art } = capture;
    capture = null;
    const held = AUD.release();
    if (!shots.length) {
      held.forEach((s) => AUD.sting(s));
      return;
    }
    const later = held.filter((s) => !COMBAT_SOUNDS.has(s));
    startFilm({ kind: "combat", cuts: montage(shots, roster), roster, art, later });
  }

  // ---------------------------------------------------------------- montagem

  const heroLabel = () => (state?.name ? state.name : "Você");

  /**
   * Um plano da montagem.
   * @param view o que mostrar: { plate } um plano pintado, { hero } o retrato do herói,
   *   { foe } o retrato de um inimigo, ou { wide } a cena inteira
   * @param o duração (dur), zoom inicial e final (z0, z1), deslocamento (x0, x1), corte com
   *   borrão (whip), clarão (flash), tremor (shake), câmera lenta (slow), escurecer (dark),
   *   legenda (sub), dados (dice) e eventos marcados no tempo (at: [[tempo, função]])
   */
  function cut(view, o) {
    return { view, dur: 0.5, z0: 1, z1: 1.06, x0: 0, x1: 0, at: [], ...o };
  }

  /** Planos do herói e do inimigo, com o retrato como reserva quando o plano não existe. */
  function heroPlate(pose) {
    return { plate: `heroi_${pose}_${heroKey()}`, fallback: { hero: true, pose } };
  }
  function foePlate(foe, pose) {
    return { plate: `inimigo_${pose}_${foe?.pic}`, fallback: { foe, pose } };
  }
  function weaponPlate(kind) {
    return { plate: `arma_${kind}_${state.weapon}`, fallback: heroPlate("furia") };
  }

  /** Transforma as tomadas gravadas na lista de planos do filme. */
  function montage(shots, roster) {
    const cuts = [];
    const add = (...list) => cuts.push(...list);
    const dmgText =
      (s, color = "#ffd27a") =>
      (fx) =>
        fx.text(`−${s.dmg}`, FOE_SPOT.x - 40, 150, color, 58);

    for (const s of shots) {
      const foe = s.foe !== undefined ? roster[s.foe] : null;
      const name = foe?.n || "";
      const roll = s.roll || null;
      const fall = () => {
        if (foe) foe.hp = Math.max(0, foe.hp - (s.dmg || 0));
        if (s.killed)
          add(
            cut(foePlate(foe, "queda"), {
              dur: 1.1,
              z0: 1.04,
              z1: 1.14,
              dark: true,
              sub: `${name} cai`,
              at: [[0, () => AUD.sting("golpe")]],
            }),
          );
      };

      if (s.type === "strike" && s.by === "hero") {
        const sub = `${heroLabel()} ${s.kind === "stone" || s.kind === "arrow" ? "dispara contra" : "ataca"} ${name}`;
        add(
          cut(heroPlate("furia"), {
            dur: 0.55,
            z0: 1.0,
            z1: 1.1,
            x0: 10,
            x1: -25,
            sub,
            dice: roll,
            at: [[0, () => AUD.sting("dado")]],
          }),
        );
        if (s.outcome === "parry") {
          add(
            cut(weaponPlate("aparo"), {
              dur: 0.75,
              whip: true,
              flash: 0.7,
              shake: 14,
              z0: 1.12,
              z1: 1.04,
              sub,
              dice: roll,
              at: [
                [
                  0,
                  (fx) => {
                    AUD.sting("erro");
                    fx.sparks(W / 2, H / 2, "255,210,140", 40, 520);
                    fx.text("DEFENDIDO", W / 2, 120, "#e8eef0", 40);
                  },
                ],
              ],
            }),
          );
          continue;
        }
        add(
          cut(weaponPlate("golpe"), {
            dur: 0.32,
            whip: true,
            z0: 1.05,
            z1: 1.18,
            x0: 40,
            x1: -40,
            sub,
            dice: roll,
          }),
        );
        if (s.outcome === "miss") {
          add(
            cut(
              { wide: true, foe },
              {
                dur: 0.7,
                z0: 1.08,
                z1: 1.02,
                sub,
                dice: roll,
                at: [
                  [
                    0,
                    (fx) => {
                      AUD.sting("erro");
                      fx.text("ERROU", W / 2, 130, "#d3dcdd", 44);
                    },
                  ],
                ],
              },
            ),
          );
          continue;
        }
        add(
          cut(foePlate(foe, "atingido"), {
            dur: s.crit ? 1.1 : 0.8,
            flash: 1,
            shake: s.crit ? 30 : 18,
            slow: s.crit ? 0.4 : 0,
            z0: 1.1,
            z1: 1.02,
            x0: -20,
            x1: 15,
            sub,
            dice: roll,
            at: [
              [
                0,
                (fx) => {
                  AUD.sting("golpe");
                  fx.sparks(
                    FOE_SPOT.x - 60,
                    FOE_SPOT.y,
                    s.crit ? "255,200,110" : "255,236,200",
                    s.crit ? 50 : 28,
                  );
                  dmgText(s)(fx);
                  if (s.crit) fx.text("ACERTO CRÍTICO", W / 2, 110, "#ffd27a", 44, 1.4);
                },
              ],
            ],
          }),
        );
        fall();
      } else if (s.type === "strike" && s.by === "foe") {
        const sub = `${name} ataca`;
        if (s.outcome === "stunned") {
          add(
            cut(foePlate(foe, "atingido"), {
              dur: 0.8,
              z0: 1.02,
              z1: 1.08,
              sub: `${name} ainda está atordoado`,
              at: [[0.1, (fx) => fx.text("ATORDOADO", FOE_SPOT.x, 120, "#ffd27a", 36)]],
            }),
          );
          continue;
        }
        add(
          cut(foePlate(foe, "ataque"), {
            dur: 0.55,
            z0: 1.0,
            z1: 1.12,
            x0: -10,
            x1: 25,
            sub,
            dice: roll,
            at: [[0, () => AUD.sting("dado")]],
          }),
        );
        if (s.outcome === "hit") {
          add(
            cut(heroPlate("dor"), {
              dur: s.crit ? 1.1 : 0.85,
              whip: true,
              flash: 0.6,
              hurt: true,
              shake: s.crit ? 30 : 20,
              slow: s.crit ? 0.4 : 0,
              z0: 1.12,
              z1: 1.03,
              x0: 20,
              x1: -10,
              sub,
              dice: roll,
              at: [
                [
                  0,
                  (fx) => {
                    AUD.sting("ferido");
                    fx.sparks(HERO_SPOT.x + 40, HERO_SPOT.y, "190,40,30", 22, 360);
                    fx.text(`−${s.dmg}`, HERO_SPOT.x + 60, 150, "#ff7a6a", 58);
                    if (s.crit) fx.text("CRÍTICO", W / 2, 110, "#ff7a6a", 44, 1.4);
                  },
                ],
              ],
            }),
          );
        } else if (s.outcome === "parry" || (s.outcome === "block" && !canShield(state))) {
          const label = s.outcome === "parry" ? "APARADO" : "A ARMADURA SEGURA";
          add(
            cut(weaponPlate("aparo"), {
              dur: 0.75,
              whip: true,
              flash: 0.7,
              shake: 14,
              z0: 1.12,
              z1: 1.04,
              sub,
              dice: roll,
              at: [
                [
                  0,
                  (fx) => {
                    AUD.sting("erro");
                    fx.sparks(W / 2, H / 2, "255,210,140", 40, 520);
                    fx.text(label, W / 2, 120, "#9fd08a", 40);
                  },
                ],
              ],
            }),
          );
        } else if (s.outcome === "block") {
          add(
            cut(
              { plate: "escudo", fallback: { wide: true } },
              {
                dur: 0.75,
                whip: true,
                flash: 0.6,
                shake: 16,
                z0: 1.12,
                z1: 1.04,
                sub,
                dice: roll,
                at: [
                  [
                    0,
                    (fx) => {
                      AUD.sting("erro");
                      fx.sparks(W / 2, H / 2, "220,200,160", 34, 460);
                      fx.text("BLOQUEIO", W / 2, 120, "#9fd08a", 40);
                    },
                  ],
                ],
              },
            ),
          );
        } else if (s.outcome === "dodge") {
          add(
            cut(heroPlate("furia"), {
              dur: 0.7,
              whip: true,
              z0: 1.1,
              z1: 1.02,
              x0: 60,
              x1: -40,
              sub,
              dice: roll,
              at: [
                [
                  0,
                  (fx) => {
                    AUD.sting("erro");
                    fx.text("ESQUIVA", W / 2, 120, "#9fd08a", 40);
                  },
                ],
              ],
            }),
          );
        } else {
          add(
            cut(
              { wide: true, foe },
              {
                dur: 0.65,
                z0: 1.08,
                z1: 1.02,
                sub,
                dice: roll,
                at: [
                  [
                    0,
                    (fx) => {
                      AUD.sting("erro");
                      fx.text("ERROU", W / 2, 130, "#d3dcdd", 44);
                    },
                  ],
                ],
              },
            ),
          );
        }
      } else if (s.type === "ally") {
        const sub = `${s.name} ataca ${name}`;
        if (s.outcome === "hit") {
          add(
            cut(foePlate(foe, "atingido"), {
              dur: 0.75,
              flash: 0.8,
              shake: 14,
              z0: 1.08,
              z1: 1.02,
              sub,
              at: [
                [
                  0,
                  (fx) => {
                    AUD.sting("golpe");
                    fx.sparks(FOE_SPOT.x - 60, FOE_SPOT.y, "220,235,255", 24);
                    dmgText(s, "#cfe2ff")(fx);
                  },
                ],
              ],
            }),
          );
          fall();
        } else {
          add(
            cut(
              { wide: true, foe },
              {
                dur: 0.6,
                sub,
                at: [
                  [
                    0,
                    (fx) => fx.text(s.outcome === "miss" ? "ERROU" : "DEFENDIDO", W / 2, 130, "#d3dcdd", 38),
                  ],
                ],
              },
            ),
          );
        }
      } else if (s.type === "spell") {
        const color = SPELL_COLORS[s.key] || [220, 230, 255];
        const rgb = color.join(",");
        const sub = `${heroLabel()} conjura ${SK[s.key]?.n || "uma magia"}`;
        add(
          cut(heroPlate("furia"), {
            dur: 0.8,
            z0: 1.0,
            z1: 1.1,
            sub,
            dice: roll,
            at: [
              [
                0,
                (fx) => {
                  AUD.sting("dado");
                  fx.aura(HERO_SPOT.x, HERO_SPOT.y, color, 0.9);
                  fx.rising(HERO_SPOT.x, H - 40, rgb, 40);
                },
              ],
            ],
          }),
        );
        if (s.outcome !== "ok") {
          add(
            cut(heroPlate("dor"), {
              dur: 0.7,
              sub,
              dice: roll,
              at: [
                [
                  0,
                  (fx) => {
                    fx.rising(HERO_SPOT.x, H - 40, "150,150,150", 30);
                    fx.text("A MAGIA SE DISSIPA", W / 2, 120, "#d3dcdd", 36, 1.2);
                  },
                ],
              ],
            }),
          );
          continue;
        }
        const strikeFoe = ["sp_luz", "sp_espinhos", "sp_beltane"].includes(s.key);
        if (strikeFoe) {
          add(
            cut(foePlate(foe, "atingido"), {
              dur: 0.9,
              flash: 1,
              tint: rgb,
              shake: s.key === "sp_luz" ? 6 : 18,
              z0: 1.1,
              z1: 1.02,
              sub,
              at: [
                [
                  0,
                  (fx) => {
                    AUD.sting("magia");
                    if (s.key === "sp_espinhos") fx.thorns(FOE_SPOT.x);
                    else fx.aura(FOE_SPOT.x - 40, FOE_SPOT.y, color, 0.7);
                    fx.sparks(FOE_SPOT.x - 60, FOE_SPOT.y, rgb, 40, 440);
                    if (s.key === "sp_luz") fx.text("OFUSCADO", FOE_SPOT.x, 120, "#b8ffc4", 38);
                    else dmgText(s)(fx);
                  },
                ],
              ],
            }),
          );
          if (s.key !== "sp_luz") fall();
        } else {
          const total = (s.all || []).reduce((sum, hit) => sum + hit.dmg, 0);
          add(
            cut(
              { wide: true, foe },
              {
                dur: 1.0,
                tint: rgb,
                shake: s.key === "sp_tempestade" ? 14 : 0,
                sub,
                at: [
                  [
                    0,
                    (fx) => {
                      AUD.sting("magia");
                      if (s.key === "sp_tempestade") {
                        fx.effect("hail", { life: 1.1 });
                        fx.text(`−${total} no total`, W / 2, 120, "#ffd27a", 44, 1.2);
                      } else if (s.key === "sp_nevoa") {
                        fx.effect("mist", { life: 1 });
                        fx.text("NÉVOA", W / 2, 120, "#e3ebee", 44);
                      } else {
                        fx.aura(W / 2, H / 2, color, 1);
                        fx.rising(W / 2, H - 40, rgb, 60);
                        fx.text(`+${s.heal} PV`, W / 2, 130, "#9fd08a", 50);
                      }
                    },
                  ],
                ],
              },
            ),
          );
          if (s.key === "sp_tempestade")
            for (const hit of s.all || []) {
              const target = roster[hit.foe];
              if (target) target.hp = Math.max(0, target.hp - hit.dmg);
            }
        }
      } else if (s.type === "heal") {
        add(
          cut(
            { hero: true },
            {
              dur: 0.9,
              z0: 1.0,
              z1: 1.06,
              sub: s.source === "folego" ? "Fôlego das Highlands" : "Ervas sobre as feridas",
              at: [
                [
                  0,
                  (fx) => {
                    AUD.sting("sucesso");
                    fx.rising(HERO_SPOT.x, H - 40, "160,230,140", 50);
                    fx.text(`+${s.amount} PV`, HERO_SPOT.x + 160, 140, "#9fd08a", 50);
                  },
                ],
              ],
            },
          ),
        );
      } else if (s.type === "guard") {
        add(
          cut(
            { hero: true },
            {
              dur: 0.8,
              z0: 1.06,
              z1: 1.0,
              sub: `${heroLabel()} se fecha em defesa`,
              at: [
                [
                  0,
                  (fx) => {
                    fx.effect("shield", { x: HERO_SPOT.x + 110, y: HERO_SPOT.y, life: 0.7 });
                    fx.text("DEFESA TOTAL", HERO_SPOT.x + 160, 130, "#cfe2ff", 38);
                  },
                ],
              ],
            },
          ),
        );
      } else if (s.type === "feint") {
        const sub = `${heroLabel()} finge um golpe`;
        add(
          cut(heroPlate("furia"), {
            dur: 0.5,
            z0: 1.0,
            z1: 1.08,
            sub,
            dice: roll,
            at: [[0, () => AUD.sting("dado")]],
          }),
        );
        add(
          cut(foePlate(foe, s.ok ? "atingido" : "ataque"), {
            dur: 0.7,
            whip: true,
            sub,
            dice: roll,
            at: [
              [
                0,
                (fx) =>
                  fx.text(
                    s.ok ? "FINTA!" : "NÃO CAIU NA FINTA",
                    FOE_SPOT.x,
                    120,
                    s.ok ? "#ffd27a" : "#d3dcdd",
                    38,
                  ),
              ],
            ],
          }),
        );
      } else if (s.type === "amulet") {
        const color = AMULET_COLORS[s.key] || [255, 255, 255];
        add(
          cut(
            { hero: true },
            {
              dur: 0.9,
              z0: 1.0,
              z1: 1.08,
              sub: AMU_ACT[s.key]?.n || "Amuleto",
              at: [
                [
                  0,
                  (fx) => {
                    AUD.sting("magia");
                    fx.aura(HERO_SPOT.x, HERO_SPOT.y, color, 1);
                    fx.rising(HERO_SPOT.x, H - 40, color.join(","), 40);
                  },
                ],
              ],
            },
          ),
        );
      } else if (s.type === "flee") {
        add(
          cut(
            { wide: true },
            { dur: 0.7, z0: 1.0, z1: 1.1, sub: s.ok ? `${heroLabel()} foge` : `${heroLabel()} tenta fugir` },
          ),
        );
      } else if (s.type === "end" && s.result === "win") {
        add(
          cut(heroPlate("furia"), {
            dur: 1.5,
            z0: 1.02,
            z1: 1.14,
            sub: "Vitória",
            at: [
              [
                0,
                (fx) => {
                  fx.aura(HERO_SPOT.x, HERO_SPOT.y, [255, 210, 120], 1.4);
                  fx.text("VITÓRIA", W / 2, 120, "#ffd27a", 60, 1.6);
                },
              ],
            ],
          }),
        );
      } else if (s.type === "end" && s.result !== "flee") {
        add(
          cut(heroPlate("dor"), {
            dur: 1.5,
            z0: 1.0,
            z1: 1.12,
            dark: true,
            sub: s.result === "death" ? "O fim" : "Você cai",
          }),
        );
      }
    }
    return cuts;
  }

  // ---------------------------------------------------------------- efeitos

  function effectsApi(f) {
    return {
      text(text, x, y, color, size = 34, life = 1.1) {
        f.fx.push({ type: "text", text, x, y, color, size, age: 0, life });
      },
      sparks(x, y, color, count = 18, power = 420) {
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
            size: 2 + Math.random() * 3,
            gravity: 700,
          });
        }
      },
      rising(x, y, color, count = 30) {
        for (let i = 0; i < count; i++) {
          f.particles.push({
            x: x + (Math.random() - 0.5) * 260,
            y: y - Math.random() * 120,
            vx: (Math.random() - 0.5) * 30,
            vy: -60 - Math.random() * 110,
            life: 0.9 + Math.random() * 0.7,
            age: 0,
            color,
            size: 2 + Math.random() * 3,
            gravity: -20,
          });
        }
      },
      aura(x, y, color, life) {
        f.fx.push({ type: "aura", x, y, color, age: 0, life });
      },
      thorns(x) {
        f.fx.push({ type: "thorns", x, age: 0, life: 0.9 });
      },
      effect(type, props) {
        f.fx.push({ type, age: 0, life: 0.5, ...props });
      },
    };
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
      if (e.type === "aura") {
        ART.glow(c, e.x, e.y, 180 + 80 * Math.sin(k * Math.PI), e.color, 0.6 * Math.sin(k * Math.PI));
      } else if (e.type === "thorns") {
        c.strokeStyle = `rgba(60,34,26,${fade})`;
        c.lineWidth = 9;
        for (let i = 0; i < 8; i++) {
          const bx = e.x - 160 + i * 42;
          const top = H - 60 - Math.min(1, k * 3) * (150 + ((i * 37) % 90));
          c.beginPath();
          c.moveTo(bx, H);
          c.quadraticCurveTo(bx + 24, (H + top) / 2, bx + 8, top);
          c.stroke();
        }
      } else if (e.type === "hail") {
        c.strokeStyle = `rgba(220,235,255,${0.7 * fade})`;
        c.lineWidth = 2;
        for (let i = 0; i < 90; i++) {
          const x = (i * 97 + e.age * 900) % W;
          const y = (i * 53 + e.age * 1300) % H;
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x - 6, y + 18);
          c.stroke();
        }
      } else if (e.type === "mist") {
        c.fillStyle = `rgba(210,222,232,${0.55 * Math.sin(k * Math.PI)})`;
        c.fillRect(0, 0, W, H);
      } else if (e.type === "shield") {
        c.strokeStyle = `rgba(150,200,255,${fade})`;
        c.lineWidth = 6;
        c.beginPath();
        c.arc(e.x, e.y, 110 + k * 40, -1.3, 1.3);
        c.stroke();
      } else if (e.type === "text") {
        const rise = k * 40;
        c.save();
        c.globalAlpha = k < 0.12 ? k / 0.12 : fade < 0.3 ? fade / 0.3 : 1;
        c.font = `700 ${e.size}px "Alegreya Sans SC", "Gill Sans", sans-serif`;
        c.textAlign = "center";
        c.lineWidth = 7;
        c.strokeStyle = "rgba(0,0,0,.8)";
        c.strokeText(e.text, e.x, e.y - rise);
        c.fillStyle = e.color;
        c.fillText(e.text, e.x, e.y - rise);
        c.restore();
      }
    }
    f.fx = f.fx.filter((e) => e.age < e.life);
  }

  // ---------------------------------------------------------------- exibição

  const overlay = () => document.getElementById("cinema");

  function startFilm(spec) {
    const el = overlay();
    if (!el || (spec.kind === "combat" && !spec.cuts.length)) {
      (spec.later || []).forEach((s) => AUD.sting(s));
      return;
    }
    stop();
    film = {
      ...spec,
      speed: MODES[mode] || 1,
      index: -1,
      current: null,
      shotTime: 0,
      shake: 0,
      fx: [],
      particles: [],
      bars: 0,
      startedAt: performance.now(),
      last: performance.now(),
      raf: 0,
    };
    clearTimeout(shieldTimer);
    el.classList.remove("shield");
    el.hidden = false;
    film.raf = requestAnimationFrame(frame);
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

  function nextCut(f) {
    f.index++;
    if (f.index >= f.cuts.length) return false;
    f.current = f.cuts[f.index];
    f.current.at.forEach((e) => (e.done = false));
    f.shotTime = 0;
    f.shake = Math.max(f.shake, f.current.shake || 0);
    f.fx = f.fx.filter((e) => e.type === "text" && e.age < e.life * 0.6);
    return true;
  }

  function frame(now) {
    const f = film;
    if (!f) return;
    try {
      const real = Math.min(1 / 30, (now - f.last) / 1000);
      f.last = now;
      if (now - f.startedAt > (f.maxMs || WATCHDOG_MS)) return stop();
      if (f.kind === "finale") {
        // O trailer do final tem o próprio ritmo: o modo "rápido" do combate não vale aqui.
        f.shotTime += real;
        if (f.shotTime >= f.dur) return stop();
        drawFinale(f);
      } else if (f.kind === "combat") {
        const cur = f.current;
        const slow = cur?.slow && f.shotTime > 0.05 && f.shotTime < 0.05 + cur.slow ? 0.3 : 1;
        const dt = (real * slow) / f.speed;
        if (!cur || f.shotTime >= cur.dur) {
          if (!nextCut(f)) return stop();
        }
        const api = effectsApi(f);
        for (const e of f.current.at) {
          if (!e.done && f.shotTime >= e[0]) {
            e.done = true;
            e[1](api);
          }
        }
        f.shotTime += dt;
        f.bars = Math.min(1, f.bars + dt * 5);
        drawCombat(f, dt);
      } else {
        f.shotTime += real / f.speed;
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

  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeInOut = (x) => x * x * (3 - 2 * x);

  /** Desenha a imagem cobrindo o quadro, como `object-fit: cover`. */
  function cover(c, im, dx = 0) {
    const s = Math.max(W / im.width, H / im.height);
    const w = im.width * s;
    const h = im.height * s;
    c.drawImage(im, (W - w) / 2 + dx, (H - h) / 2, w, h);
  }

  /** A cena do combate ao fundo, escurecida. */
  function sceneBackdrop(c, f, t, darken = 0.45) {
    c.save();
    c.translate(0, (H - ART.H) / 2);
    ART.paintBackground(c, f.art, t, { combat: true });
    c.restore();
    c.fillStyle = `rgba(0,0,0,${darken})`;
    c.fillRect(0, 0, W, H);
  }

  /** Retrato pintado (3:4, com borda suave) de pé num dos lados do quadro. */
  function standing(c, im, x, height) {
    const w = (height * im.width) / im.height;
    c.drawImage(im, x - w / 2, H - height * 0.94, w, height);
  }

  /** Desenha o conteúdo de um plano: o plano pintado ou a reserva com os retratos. */
  function drawView(c, f, view, t, dx) {
    const im = view.plate ? plate(view.plate) : null;
    if (im) return cover(c, im, dx);
    // Sem o plano, usa a reserva, que pode ser outro plano (o rosto do herói no lugar da arma).
    if (view.plate && view.fallback.plate) return drawView(c, f, view.fallback, t, dx);
    const v = view.plate ? view.fallback : view;
    sceneBackdrop(c, f, t, v.wide ? 0.3 : 0.55);
    if (v.hero) {
      const p = heroPortrait(state);
      if (p) standing(c, p, HERO_SPOT.x + dx, H * 1.12);
      if (v.pose === "dor") {
        c.fillStyle = "rgba(150,20,10,.25)";
        c.fillRect(0, 0, W, H);
      }
    } else if (v.foe) {
      const p = ART.portrait(v.foe.pic);
      if (p) {
        c.save();
        if (v.pose === "queda") {
          c.translate(FOE_SPOT.x, H);
          c.rotate(0.35);
          c.translate(-FOE_SPOT.x, -H);
        }
        standing(c, p, FOE_SPOT.x + dx, H * 1.12);
        c.restore();
      } else {
        c.save();
        c.translate(FOE_SPOT.x + dx, H - 10);
        c.scale(2.4, 2.4);
        ART.foeSilhouette(c, v.foe.k, 0, 0, t, "#050608");
        c.restore();
      }
    } else if (v.wide && view.foe) {
      const p = ART.portrait(view.foe.pic);
      if (p) standing(c, p, FOE_SPOT.x + 60 + dx, H * 1.05);
    }
  }

  function drawCombat(f, dt) {
    const c = canvasContext();
    if (!c) return;
    const t = performance.now() / 1000;
    const cur = f.current;
    const p = Math.min(1, f.shotTime / cur.dur);
    const e = easeInOut(p);
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);

    c.save();
    const sx = (Math.random() - 0.5) * f.shake;
    const sy = (Math.random() - 0.5) * f.shake;
    f.shake *= Math.pow(0.002, dt);
    const zoom = cur.z0 + (cur.z1 - cur.z0) * easeOut(p);
    c.translate(W / 2 + sx, H / 2 + sy);
    c.scale(zoom, zoom);
    c.translate(-W / 2, -H / 2);
    const dx = cur.x0 + (cur.x1 - cur.x0) * e;
    // Corte rápido: os primeiros instantes do plano chegam borrados, como numa câmera em movimento.
    const whip = cur.whip ? Math.max(0, 1 - f.shotTime / 0.12) : 0;
    if (whip > 0) {
      for (let i = 3; i >= 1; i--) {
        c.globalAlpha = 0.28 * whip;
        drawView(c, f, cur.view, t, dx - i * 60 * whip);
      }
      c.globalAlpha = 1;
    }
    drawView(c, f, cur.view, t, dx);
    if (cur.tint) {
      c.fillStyle = `rgba(${cur.tint},${0.18 * Math.sin(p * Math.PI)})`;
      c.fillRect(0, 0, W, H);
    }
    c.restore();

    drawEffects(c, f, dt);

    const focus = cur.view.fallback?.foe || cur.view.foe;
    const target = focus || f.roster.find((x) => x.hp > 0);
    if (target) drawHealthBar(c, target);
    // Vinheta: bordas escuras que puxam o olhar para o centro.
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, cur.hurt ? `rgba(150,20,10,${0.65 * (1 - p)})` : "rgba(0,0,0,.55)");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    if (cur.flash && f.shotTime < 0.12) {
      c.fillStyle = `rgba(255,248,235,${cur.flash * (1 - f.shotTime / 0.12)})`;
      c.fillRect(0, 0, W, H);
    }
    if (cur.dark) {
      c.fillStyle = `rgba(0,0,0,${0.7 * p})`;
      c.fillRect(0, 0, W, H);
    }
    drawBars(c, f.bars, cur.sub, cur.dice);
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

  function drawBars(c, bars, subtitle, dice) {
    const h = BAR_HEIGHT * easeOut(bars);
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, h);
    c.fillRect(0, H - h, W, h);
    if (bars < 0.9) return;
    if (subtitle) {
      c.font = 'italic 22px "Alegreya", Georgia, serif';
      c.textAlign = "center";
      c.fillStyle = "#e3e9ea";
      c.fillText(subtitle, W / 2, H - 16);
    }
    if (dice) drawDice(c, dice);
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
    drawBars(c, 1, "", null);
  }

  // ---------------------------------------------------------------- trailer do final

  /** Quanto dura cada quadro do trailer e a fusão entre um e outro, em segundos. */
  const SLIDE_S = 4.6;
  const FADE_S = 0.9;
  const FINALE_LINES = {
    primavera: [
      "O acordo das estações",
      "A Velha do Inverno aceitou o seu acordo. O inverno vem em Samhain e vai embora em Beltane.",
    ],
    selo: ["O selo", "A Cailleach voltou a dormir dentro da Pedra, por mais mil anos."],
    dama: ["O sacrifício da Dama", "A Dama Branca abraçou a irmã, e as duas se foram juntas."],
    inverno: ["O inverno eterno", "Você cumpriu a sua palavra. A Velha está livre, e a neve não parou mais."],
  };
  const FINALE_ART = {
    primavera: "fim_primavera",
    selo: "fim_selo",
    dama: "fim_selo",
    inverno: "fim_inverno",
  };

  /** Os quadros do trailer: a jornada de 1296 a 1314, o final escolhido, a vitória e o herói. */
  function finaleSlides(ending) {
    const flag = (k) => !!state?.flags?.[k];
    const [endTitle, endLine] = FINALE_LINES[ending] || FINALE_LINES.selo;
    return [
      {
        art: "aldeia",
        eyebrow: "1296 · Kilbride",
        line: "Você era gente comum, numa aldeia às margens do Clyde.",
      },
      { art: "fogo", eyebrow: "Noite de Samhain", line: "Até a noite em que os ingleses trouxeram o fogo." },
      {
        art: flag("kelpie_divida") ? "vau" : "kelpie_rio",
        eyebrow: "A névoa",
        line: "Você fugiu pela névoa, e as coisas antigas acordaram com você.",
      },
      {
        art: "ponte_cai",
        eyebrow: "1297 · Stirling",
        line: "Em Stirling, a ponte caiu, e o maior exército do mundo caiu com ela.",
      },
      {
        art: "falkirk",
        eyebrow: "1298 · Falkirk",
        line: tamVivo()
          ? "Em Falkirk, a Escócia sangrou. Mas não se rendeu."
          : "Em Falkirk, a Escócia sangrou. E Tam ficou lá.",
      },
      {
        art: "westminster",
        eyebrow: "1305 · Londres",
        line: "Wallace foi traído e morto. Mas não esquecido.",
      },
      { art: "bruce", eyebrow: "1306 · Scone", line: "Robert Bruce foi coroado rei, e a guerra recomeçou." },
      {
        art: "bannock",
        eyebrow: "24 de junho de 1314 · Bannockburn",
        line: "Dois exércitos. Um riacho. Uma última manhã.",
      },
      {
        art: "cavalaria_foge",
        eyebrow: "Bannockburn",
        line: "E o exército de Eduardo II se desfez entre dois rios.",
      },
      { art: FINALE_ART[ending] || "fim_selo", eyebrow: endTitle, line: endLine },
      { art: "vitoria", eyebrow: "", line: "A Escócia é livre.", big: true },
      { hero: true, art: "epilogo", eyebrow: "Sua lenda", line: "" },
      { end: true, art: "epilogo" },
    ];
  }

  /** Toca o trailer do final. Roda mesmo com as cenas de luta desligadas; só fica parado com "reduzir movimento". */
  function finale(ending) {
    if (state) heroPortrait(state);
    const slides = finaleSlides(ending);
    AUD.mood("final");
    startFilm({
      kind: "finale",
      slides,
      dur: slides.length * SLIDE_S,
      maxMs: (slides.length * SLIDE_S + 5) * 1000,
      later: [],
    });
  }

  function wrapText(c, text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(" ");
    const lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (c.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    lines.forEach((l, i) => c.fillText(l, x, y + (i - (lines.length - 1) / 2) * lineHeight));
  }

  function drawSlide(c, f, slide, local, alpha, t) {
    if (alpha <= 0) return;
    const move = reduceMotion ? 0 : local / SLIDE_S;
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);
    if (slide.end) {
      c.restore();
      drawEndCard(c, local, alpha);
      return;
    }
    c.save();
    const zoom = 1.04 + 0.08 * move;
    c.translate(W / 2, H / 2);
    c.scale(zoom, zoom);
    c.translate(-W / 2, -H / 2 + (H - ART.H) / 2);
    ART.paintBackground(c, slide.art, reduceMotion ? 3 : t, {});
    c.restore();
    const shade = c.createLinearGradient(0, H * 0.35, 0, H);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(1, `rgba(0,0,0,${slide.hero ? 0.8 : 0.72})`);
    c.fillStyle = shade;
    c.fillRect(0, 0, W, H);
    const textIn = Math.min(1, Math.max(0, (local - 0.5) / 0.7));
    c.globalAlpha = alpha * textIn;
    c.textAlign = "center";
    if (slide.hero) {
      c.fillStyle = "rgba(0,0,0,.45)";
      c.fillRect(0, 0, W, H);
      const p = state ? heroPortrait(state) : null;
      if (p) {
        const h = H * 1.02;
        const w = (h * p.width) / p.height;
        c.drawImage(p, W * 0.3 - w / 2, H - h, w, h);
      }
      c.textAlign = "left";
      c.fillStyle = "#e08a45";
      c.font = '700 18px "Alegreya Sans SC", sans-serif';
      c.fillText("S U A   L E N D A", W * 0.52, H / 2 - 70);
      c.fillStyle = "#eef2f2";
      c.font = '44px "Uncial Antiqua", Georgia, serif';
      c.fillText(state?.name || "", W * 0.52, H / 2 - 18);
      c.font = 'italic 24px "Alegreya", Georgia, serif';
      c.fillStyle = "#d8dfe0";
      c.fillText(state ? title(state) : "", W * 0.52, H / 2 + 22);
      c.font = '600 16px "Alegreya Sans SC", sans-serif';
      c.fillStyle = "#b7c2c4";
      c.fillText(state ? `${state.earned} pontos de experiência · 1296–1314` : "", W * 0.52, H / 2 + 56);
    } else {
      if (slide.eyebrow) {
        c.fillStyle = "#e08a45";
        c.font = '700 18px "Alegreya Sans SC", sans-serif';
        c.fillText(slide.eyebrow.toUpperCase(), W / 2, H - (slide.big ? 210 : 112));
      }
      c.fillStyle = "#eef2f2";
      if (slide.big) {
        c.font = `${54 + 6 * move}px "Uncial Antiqua", Georgia, serif`;
        c.fillText(slide.line, W / 2, H / 2 + 20);
      } else {
        c.font = 'italic 28px "Alegreya", Georgia, serif';
        wrapText(c, slide.line, W / 2, H - 74, W * 0.78, 34);
      }
    }
    c.restore();
  }

  function drawEndCard(c, local, alpha) {
    const k = Math.min(1, local / 1.4);
    c.save();
    c.globalAlpha = alpha * k;
    c.textAlign = "center";
    c.fillStyle = "#eef2f2";
    c.font = '84px "Uncial Antiqua", Georgia, serif';
    c.fillText("Fim", W / 2, H / 2 + 6);
    c.globalAlpha = alpha * Math.min(1, Math.max(0, (local - 1) / 1));
    c.fillStyle = "#e08a45";
    c.font = '700 18px "Alegreya Sans SC", sans-serif';
    c.fillText("S A N G U E   E   N É V O A", W / 2, H / 2 + 56);
    c.restore();
  }

  function drawFinale(f) {
    const c = canvasContext();
    if (!c) return;
    const t = performance.now() / 1000;
    const i = Math.min(f.slides.length - 1, Math.floor(f.shotTime / SLIDE_S));
    const local = f.shotTime - i * SLIDE_S;
    c.fillStyle = "#000";
    c.fillRect(0, 0, W, H);
    // Fusão: o quadro anterior some enquanto o novo aparece.
    if (i > 0 && local < FADE_S) drawSlide(c, f, f.slides[i - 1], local + SLIDE_S, 1, t);
    drawSlide(c, f, f.slides[i], local, i > 0 ? Math.min(1, local / FADE_S) : Math.min(1, local / 1.2), t);
    drawBars(c, 1, "", null);
  }

  // ---------------------------------------------------------------- controles

  /** Quanto tempo a película fica depois do toque que pula a cena, segurando o resto dele. */
  const SHIELD_MS = 450;
  let shieldTimer = 0;

  function setupOverlay() {
    const el = overlay();
    if (!el) return;
    const dropShield = () => {
      clearTimeout(shieldTimer);
      el.classList.remove("shield");
      if (!film) el.hidden = true;
    };
    const skip = (e) => {
      if (!film) return;
      e.preventDefault();
      e.stopPropagation();
      stop();
      if (e.type !== "pointerdown") return;
      // O filme some no começo do toque, mas o fim dele (o "click") ainda vem. Sem a
      // película, ele cairia no botão que estava por baixo e repetiria a ação.
      el.hidden = false;
      el.classList.add("shield");
      clearTimeout(shieldTimer);
      shieldTimer = setTimeout(dropShield, SHIELD_MS);
    };
    el.addEventListener("pointerdown", skip);
    el.addEventListener("click", (e) => {
      if (!el.classList.contains("shield")) return;
      e.preventDefault();
      e.stopPropagation();
      dropShield();
    });
    document.addEventListener("keydown", (e) => {
      if (film) skip(e);
    });
  }

  return {
    begin,
    shot,
    end,
    preload,
    titleCard,
    finale,
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

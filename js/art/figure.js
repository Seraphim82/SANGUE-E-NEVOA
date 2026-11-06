/**
 * Retrato animado do herói na tela de Personagem.
 */
"use strict";

const FIG = (() => {
  const W = 400,
    H = 520,
    TAU = Math.PI * 2;
  const cache = new WeakMap();
  function pats(c) {
    let p = cache.get(c);
    if (p) return p;
    const o = document.createElement("canvas");
    o.width = o.height = 36;
    const x = o.getContext("2d");
    x.fillStyle = "#2c553a";
    x.fillRect(0, 0, 36, 36);
    x.fillStyle = "rgba(28,48,88,.9)";
    x.fillRect(0, 9, 36, 9);
    x.fillRect(9, 0, 9, 36);
    x.fillStyle = "rgba(10,18,30,.45)";
    x.fillRect(0, 0, 36, 4);
    x.fillRect(0, 0, 4, 36);
    x.fillStyle = "rgba(176,42,42,.95)";
    x.fillRect(0, 25, 36, 2);
    x.fillRect(25, 0, 2, 36);
    x.fillStyle = "rgba(232,212,120,.75)";
    x.fillRect(0, 31, 36, 1);
    x.fillRect(31, 0, 1, 36);
    const m = document.createElement("canvas");
    m.width = 8;
    m.height = 6;
    const y = m.getContext("2d");
    y.fillStyle = "#5f6a73";
    y.fillRect(0, 0, 8, 6);
    y.strokeStyle = "#aeb8c0";
    y.lineWidth = 1;
    y.beginPath();
    y.arc(4, 0, 3, 0, Math.PI);
    y.stroke();
    y.beginPath();
    y.arc(0, 3, 3, 0, Math.PI);
    y.stroke();
    y.beginPath();
    y.arc(8, 3, 3, 0, Math.PI);
    y.stroke();
    p = { tartan: c.createPattern(o, "repeat"), mail: c.createPattern(m, "repeat") };
    cache.set(c, p);
    return p;
  }
  function poly(c, pts, fill) {
    c.fillStyle = fill;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
    c.fill();
  }
  function limb(c, pts, w, col) {
    c.strokeStyle = col;
    c.lineWidth = w;
    c.lineCap = "round";
    c.lineJoin = "round";
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.stroke();
  }
  function glow(c, x, y, r, rgb, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function weapon(c, k, lv, t) {
    const steel = c.createLinearGradient(266, 0, 296, 0);
    steel.addColorStop(0, "#8e9aa2");
    steel.addColorStop(0.5, "#eef3f6");
    steel.addColorStop(1, "#76838b");
    if (lv >= 2 && k !== "punhos")
      glow(
        c,
        280,
        330,
        lv >= 3 ? 120 : 80,
        lv >= 3 ? "230,190,100" : "200,215,230",
        lv >= 3 ? 0.28 + 0.06 * Math.sin(t * 3) : 0.16,
      );
    k = { lanca: "pique", espada_guerra: "espada", arco_longo: "arco" }[k] || k;
    switch (k) {
      case "bordao":
        limb(
          c,
          [
            [284, 96],
            [287, 472],
          ],
          9,
          "#6b4a2b",
        );
        if (lv)
          limb(
            c,
            [
              [284, 300],
              [285, 330],
            ],
            11,
            "#3a2616",
          );
        break;
      case "funda": {
        const s = Math.sin(t * 2) * 4;
        c.strokeStyle = "#8a6a44";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(275, 330);
        c.quadraticCurveTo(268, 370, 282 + s, 392);
        c.moveTo(281, 330);
        c.quadraticCurveTo(298, 370, 288 + s, 392);
        c.stroke();
        c.fillStyle = "#5a4128";
        c.beginPath();
        c.ellipse(285 + s, 395, 9, 6, 0, 0, TAU);
        c.fill();
        break;
      }
      case "faca":
        poly(
          c,
          [
            [273, 332],
            [282, 332],
            [279, 386],
            [275, 392],
          ],
          steel,
        );
        c.fillStyle = "#3a2616";
        c.fillRect(272, 312, 10, 20);
        break;
      case "martelo":
        limb(
          c,
          [
            [277, 312],
            [281, 402],
          ],
          8,
          "#6b4a2b",
        );
        c.fillStyle = "#3b3f42";
        c.fillRect(262, 396, 40, 22);
        c.fillStyle = "rgba(255,255,255,.15)";
        c.fillRect(262, 396, 40, 4);
        break;
      case "espada":
        c.fillStyle = "#3a2616";
        c.fillRect(272, 298, 10, 24);
        c.fillStyle = "#9a8450";
        c.beginPath();
        c.arc(277, 296, 6, 0, TAU);
        c.fill();
        c.fillRect(254, 320, 46, 6);
        poly(
          c,
          [
            [271, 326],
            [284, 326],
            [287, 452],
            [277, 472],
            [268, 452],
          ],
          steel,
        );
        break;
      case "arco":
        c.strokeStyle = "#6b4a2b";
        c.lineWidth = 5;
        c.beginPath();
        c.arc(262, 322, 120, -0.95, 0.95);
        c.stroke();
        c.strokeStyle = "#d8d0bc";
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(262 + 120 * Math.cos(-0.95), 322 + 120 * Math.sin(-0.95));
        c.lineTo(262 + 120 * Math.cos(0.95), 322 + 120 * Math.sin(0.95));
        c.stroke();
        break;
      case "machado":
        limb(
          c,
          [
            [282, 180],
            [276, 470],
          ],
          8,
          "#5a3f26",
        );
        poly(
          c,
          [
            [284, 190],
            [322, 170],
            [330, 236],
            [286, 222],
          ],
          steel,
        );
        break;
      case "pique":
        limb(
          c,
          [
            [300, 66],
            [270, 470],
          ],
          7,
          "#5a3f26",
        );
        poly(
          c,
          [
            [302, 18],
            [311, 68],
            [292, 64],
          ],
          steel,
        );
        poly(
          c,
          [
            [296, 74],
            [314, 82],
            [300, 100],
          ],
          "#8f1d1d",
        );
        break;
    }
  }
  function amulet(c, k) {
    if (!k) return;
    c.strokeStyle = "#3a2616";
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(186, 174);
    c.lineTo(200, 206);
    c.lineTo(214, 174);
    c.stroke();
    if (k === "sorveira") {
      limb(
        c,
        [
          [191, 209],
          [209, 215],
        ],
        3,
        "#5a3f26",
      );
      c.fillStyle = "#c42a2e";
      [
        [195, 215],
        [201, 217],
        [206, 212],
      ].forEach(([x, y]) => {
        c.beginPath();
        c.arc(x, y, 3.2, 0, TAU);
        c.fill();
      });
    }
    if (k === "crina") {
      c.strokeStyle = "#2f6a46";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(196, 206);
      c.quadraticCurveTo(206, 214, 198, 226);
      c.stroke();
    }
    if (k === "fragmento") {
      glow(c, 200, 214, 22, "110,170,255", 0.5);
      c.fillStyle = "#15181c";
      c.beginPath();
      c.moveTo(194, 208);
      c.lineTo(206, 206);
      c.lineTo(208, 220);
      c.lineTo(196, 222);
      c.fill();
    }
    if (k === "pedra") {
      c.fillStyle = "#80888e";
      c.beginPath();
      c.arc(200, 215, 8, 0, TAU);
      c.fill();
      c.fillStyle = "#141a1d";
      c.beginPath();
      c.arc(201, 214, 2.6, 0, TAU);
      c.fill();
    }
  }
  function draw(c, t, st) {
    const P = pats(c),
      L = st.look || {},
      SKIN = "#d4ab86",
      HAIR = "#3a2618";
    const g = c.createRadialGradient(200, 190, 10, 200, 260, 380);
    g.addColorStop(0, "#2a3b44");
    g.addColorStop(1, "#090d0f");
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.fillStyle = "rgba(205,222,236,.05)";
    c.beginPath();
    c.moveTo(150, 0);
    c.lineTo(250, 0);
    c.lineTo(340, 470);
    c.lineTo(60, 470);
    c.fill();
    for (let i = 0; i < 28; i++) {
      const x = (i * 73) % 400,
        y = H - ((t * 12 + i * 41) % H);
      c.fillStyle = `rgba(220,230,236,${0.12 + 0.14 * Math.sin(t + i)})`;
      c.fillRect(x, y, 2, 2);
    }
    c.save();
    c.translate(200, 470);
    c.scale(1, 0.16);
    glow(c, 0, 0, 180, "0,0,0", 0.6);
    c.restore();
    const br = Math.sin(t * 1.7) * 1.3,
      sw = Math.sin(t * 1.1) * 5;
    c.save();
    c.translate(0, br);
    if (L.glow) {
      glow(c, 200, 300, 230, "200,225,245", 0.22 + 0.05 * Math.sin(t));
    }
    if (L.cloak || L.plaid) {
      const pts = [
        [150, 182],
        [250, 182],
        [292 + sw, 468],
        [108 + sw * 0.6, 468],
      ];
      poly(c, pts, L.plaid ? P.tartan : L.cloak);
      poly(c, pts, "rgba(0,0,0,.28)");
    }
    const hose = L.hose || "#4a3d2e";
    limb(
      c,
      [
        [184, 372],
        [180, 452],
      ],
      26,
      hose,
    );
    limb(
      c,
      [
        [216, 372],
        [220, 452],
      ],
      26,
      hose,
    );
    poly(
      c,
      [
        [164, 440],
        [196, 440],
        [200, 472],
        [158, 472],
      ],
      "#2a1c12",
    );
    poly(
      c,
      [
        [204, 440],
        [236, 440],
        [242, 472],
        [200, 472],
      ],
      "#2a1c12",
    );
    const body = L.mail ? P.mail : L.tunic || "#6e5a41";
    if (L.kilt) {
      poly(
        c,
        [
          [150, 290],
          [250, 290],
          [264, 390],
          [136, 390],
        ],
        P.tartan,
      );
      c.strokeStyle = "rgba(0,0,0,.3)";
      c.lineWidth = 1.5;
      for (let x = 146; x < 258; x += 12) {
        c.beginPath();
        c.moveTo(x, 296);
        c.lineTo(x + (x - 200) * 0.14, 388);
        c.stroke();
      }
    } else
      poly(
        c,
        [
          [152, 290],
          [248, 290],
          [258, 378],
          [142, 378],
        ],
        body,
      );
    const torso = [
      [146, 180],
      [254, 180],
      [248, 298],
      [152, 298],
    ];
    poly(c, torso, body);
    c.save();
    c.beginPath();
    torso.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.closePath();
    c.clip();
    if (L.quilt) {
      c.strokeStyle = "rgba(60,45,25,.5)";
      c.lineWidth = 1.2;
      for (let k = -8; k < 10; k++) {
        c.beginPath();
        c.moveTo(146 + k * 16, 180);
        c.lineTo(266 + k * 16, 298);
        c.stroke();
        c.beginPath();
        c.moveTo(254 - k * 16, 180);
        c.lineTo(134 - k * 16, 298);
        c.stroke();
      }
    }
    if (L.stitch) {
      c.strokeStyle = "rgba(230,200,150,.35)";
      c.setLineDash([4, 4]);
      c.lineWidth = 1.2;
      [170, 200, 230].forEach((x) => {
        c.beginPath();
        c.moveTo(x, 182);
        c.lineTo(x, 296);
        c.stroke();
      });
      c.setLineDash([]);
    }
    c.restore();
    if (L.surcoat) {
      poly(
        c,
        [
          [172, 186],
          [228, 186],
          [236, 382],
          [164, 382],
        ],
        L.surcoat,
      );
      c.fillStyle = "rgba(230,190,90,.85)";
      c.beginPath();
      c.moveTo(200, 224);
      c.lineTo(212, 246);
      c.lineTo(200, 268);
      c.lineTo(188, 246);
      c.fill();
    }
    if (L.plaid) {
      poly(
        c,
        [
          [146, 182],
          [180, 178],
          [254, 292],
          [232, 306],
        ],
        P.tartan,
      );
      poly(
        c,
        [
          [146, 182],
          [180, 178],
          [254, 292],
          [232, 306],
        ],
        "rgba(0,0,0,.12)",
      );
      c.fillStyle = "#b08a3a";
      c.beginPath();
      c.arc(165, 192, 8, 0, TAU);
      c.fill();
      c.strokeStyle = "#6b5220";
      c.lineWidth = 2;
      c.stroke();
    }
    c.fillStyle = "#3a2616";
    c.fillRect(150, 286, 100, 10);
    c.fillStyle = "#b9a26a";
    c.fillRect(194, 285, 12, 12);
    const sleeve = L.mail ? P.mail : L.tunic || "#6e5a41";
    if (st.shield) {
      c.save();
      c.beginPath();
      c.arc(118, 302, 52, 0, TAU);
      c.clip();
      c.fillStyle = "#6b4a2b";
      c.fillRect(60, 240, 120, 130);
      c.strokeStyle = "rgba(40,25,10,.55)";
      c.lineWidth = 2;
      for (let k = -2; k <= 2; k++) {
        c.beginPath();
        c.moveTo(118 + k * 20, 240);
        c.lineTo(118 + k * 20, 360);
        c.stroke();
      }
      c.restore();
      c.strokeStyle = "#3a2a1a";
      c.lineWidth = 5;
      c.beginPath();
      c.arc(118, 302, 52, 0, TAU);
      c.stroke();
      c.fillStyle = "#8d969b";
      c.beginPath();
      c.arc(118, 302, 12, 0, TAU);
      c.fill();
    } else {
      limb(
        c,
        [
          [156, 192],
          [134, 254],
          [126, 316],
        ],
        24,
        sleeve,
      );
      c.fillStyle = SKIN;
      c.beginPath();
      c.arc(125, 322, 11, 0, TAU);
      c.fill();
    }
    limb(
      c,
      [
        [244, 192],
        [266, 254],
        [276, 316],
      ],
      24,
      sleeve,
    );
    if (L.plaid)
      limb(
        c,
        [
          [152, 190],
          [140, 228],
        ],
        26,
        P.tartan,
      );
    c.fillStyle = SKIN;
    c.beginPath();
    c.arc(277, 322, 11, 0, TAU);
    c.fill();
    c.fillStyle = SKIN;
    c.fillRect(190, 152, 20, 30);
    if (L.coif) {
      c.fillStyle = P.mail;
      c.beginPath();
      c.arc(200, 132, 40, 0, TAU);
      c.fill();
      poly(
        c,
        [
          [160, 142],
          [240, 142],
          [250, 194],
          [150, 194],
        ],
        P.mail,
      );
    } else {
      c.fillStyle = HAIR;
      c.beginPath();
      c.arc(200, 128, 35, Math.PI * 0.92, Math.PI * 2.08);
      c.fill();
      c.beginPath();
      c.moveTo(172, 126);
      c.quadraticCurveTo(158, 176, 170 + sw * 0.3, 206);
      c.lineTo(182, 150);
      c.fill();
    }
    c.fillStyle = SKIN;
    c.beginPath();
    c.ellipse(200, 137, L.coif ? 24 : 29, L.coif ? 28 : 33, 0, 0, TAU);
    c.fill();
    if (!L.coif) {
      c.fillStyle = HAIR;
      c.beginPath();
      c.ellipse(200, 112, 31, 15, 0, Math.PI, 0);
      c.fill();
    }
    if (st.woad) {
      c.fillStyle = "rgba(48,92,170,.72)";
      c.fillRect(176, 129, 48, 9);
    }
    c.fillStyle = "#2a1a10";
    c.fillRect(186, 134, 7, 3);
    c.fillRect(207, 134, 7, 3);
    c.fillStyle = "rgba(120,60,40,.6)";
    c.fillRect(194, 156, 12, 2);
    amulet(c, st.amulet);
    weapon(c, st.weapon, st.wl || 0, t);
    if (L.glow) {
      for (let i = 0; i < 6; i++) {
        const y = 470 - ((t * 20 + i * 80) % 420);
        glow(c, 120 + ((i * 53) % 170) + Math.sin(t + i) * 10, y, 40, "220,232,242", 0.12);
      }
    }
    c.restore();
  }
  return { draw, W, H };
})();

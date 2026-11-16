/**
 * Carta do Herói: uma carta rara, dourada, com o retrato pintado e a história do herói.
 *
 * É desenhada num canvas no próprio aparelho (nada sai dele) e pode ser baixada como imagem
 * ou compartilhada. No fim de uma campanha da Mesa, cada jogador recebe a sua.
 */
"use strict";

const CARD_W = 750;
const CARD_H = 1050;
const ROMAN_CH = ["", "I", "II", "III", "IV", "V", "VI"];
const FINAL_NAMES = {
  primavera: "O acordo das estações",
  selo: "O selo",
  dama: "O sacrifício da Dama",
  inverno: "O inverno eterno",
};
/** A raridade da carta acompanha o título do herói. */
const RARITY = {
  Camponês: 1,
  Fugitivo: 1,
  Rebelde: 2,
  "Guerreiro das Highlands": 3,
  "Herói da Escócia": 4,
  Lenda: 5,
};

function loadImage(src) {
  return new Promise((ok) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => ok(null);
    im.src = src;
  });
}

/** Dourado metálico: um degradê com faixas claras e escuras, como folha de ouro. */
function goldGradient(c, x0, y0, x1, y1) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, "#7a5418");
  g.addColorStop(0.18, "#f6dc8a");
  g.addColorStop(0.32, "#b3832c");
  g.addColorStop(0.5, "#fff1b8");
  g.addColorStop(0.66, "#a8741f");
  g.addColorStop(0.82, "#f2d27a");
  g.addColorStop(1, "#6e4a12");
  return g;
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function goldFrame(c, x, y, w, h, r, lw) {
  c.save();
  c.lineWidth = lw;
  c.strokeStyle = goldGradient(c, x, y, x + w, y + h);
  roundRect(c, x, y, w, h, r);
  c.stroke();
  c.lineWidth = 1;
  c.strokeStyle = "rgba(255,248,214,.75)";
  roundRect(c, x + lw / 2 + 1, y + lw / 2 + 1, w - lw - 2, h - lw - 2, Math.max(2, r - lw / 2));
  c.stroke();
  c.restore();
}

/** Brilhos em estrela espalhados pela moldura, como o reflexo de uma carta rara. */
function sparkles(c, n, seed) {
  let s = seed;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  c.save();
  for (let i = 0; i < n; i++) {
    const edge = rnd() < 0.5;
    const x = edge ? (rnd() < 0.5 ? 18 + rnd() * 20 : CARD_W - 38 + rnd() * 20) : 30 + rnd() * (CARD_W - 60);
    const y = edge ? 30 + rnd() * (CARD_H - 60) : rnd() < 0.5 ? 16 + rnd() * 20 : CARD_H - 36 + rnd() * 20;
    const r = 3 + rnd() * 7;
    c.fillStyle = `rgba(255,250,220,${0.55 + rnd() * 0.45})`;
    c.beginPath();
    c.moveTo(x, y - r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.quadraticCurveTo(x, y, x, y + r);
    c.quadraticCurveTo(x, y, x - r, y);
    c.quadraticCurveTo(x, y, x, y - r);
    c.fill();
  }
  c.restore();
}

function fitText(c, text, maxW, size, font) {
  let s = size;
  c.font = `${s}px ${font}`;
  while (c.measureText(text).width > maxW && s > 12) {
    s -= 1;
    c.font = `${s}px ${font}`;
  }
  return s;
}

function wrapLines(c, text, maxW) {
  const words = String(text).split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (c.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

/** Os dados que vão na carta, tirados do herói. */
function cardData(hero) {
  const skills = Object.keys(hero.skills || {})
    .filter((k) => SK[k])
    .map((k) => ({ n: SK[k].n, v: skillLevel(hero, k) }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 3);
  const lv = (slot, k) => (hero.up || {})[`${slot}:${k}`] || 0;
  const cap = Number((/^c(\d)/.exec(hero.scene || "") || [0, 1])[1]);
  return {
    name: hero.name,
    origin: ORIGINS[hero.origin]?.n || "",
    title: title(hero),
    attrs: hero.attrs,
    skills,
    weapon: `${WEAPONS[hero.weapon]?.n || ""} · ${LV[lv("arma", hero.weapon)] || LV[0]}`,
    armor: `${ARMOR[hero.armor]?.n || ""} · ${LV[lv("roupa", hero.armor)] || LV[0]}`,
    amulet: hero.amulet ? ITEMS[hero.amulet]?.n || "" : "",
    earned: hero.earned || 0,
    hp: maxHP(hero),
    final: FINAL_NAMES[hero.flags?.final] || "",
    chapter: hero.flags?.fim_jogo ? "Até Bannockburn, 1314" : `Até o Capítulo ${ROMAN_CH[cap] || "I"}`,
    conquistas: Object.keys(ACH.perfil.conquistas).length,
    total: Object.keys(ACHIEVEMENTS).length,
    rarity: RARITY[title(hero)] || 1,
    look: hero.look || DEFAULT_LOOK,
    armorKey: hero.armor,
  };
}

/**
 * Desenha a carta do herói no canvas `cv` (750 × 1050). Com `semPinturas`, desenha sem as
 * imagens: aberto direto do disco, o navegador não deixa exportar canvas com imagens.
 */
async function drawHeroCard(cv, hero, semPinturas = false) {
  const d = cardData(hero);
  cv.width = CARD_W;
  cv.height = CARD_H;
  const c = cv.getContext("2d");
  try {
    // Carrega antes as fontes usadas na carta: sem isso, o canvas usaria uma fonte genérica.
    await Promise.all(
      [
        '40px "Uncial Antiqua"',
        '700 22px "Alegreya Sans SC"',
        '600 15px "Alegreya Sans SC"',
        '18px "Alegreya"',
        'italic 18px "Alegreya"',
      ].map((f) => document.fonts?.load(f)),
    );
    await document.fonts?.ready;
  } catch {
    // Sem a API de fontes: desenha com as que já estiverem prontas.
  }
  const retrato =
    !semPinturas && HERO_PORTRAITS.has(`${d.look}_${d.armorKey}`)
      ? await loadImage(`img/heroes/${d.look}_${d.armorKey}.jpg`)
      : null;
  const fundo = semPinturas ? null : await loadImage("img/scenes/titulo.jpg");

  // Corpo da carta: preto com moldura dourada grossa.
  c.fillStyle = "#0c0b0a";
  roundRect(c, 0, 0, CARD_W, CARD_H, 36);
  c.fill();
  c.fillStyle = goldGradient(c, 0, 0, CARD_W, CARD_H);
  roundRect(c, 14, 14, CARD_W - 28, CARD_H - 28, 26);
  c.fill();
  c.fillStyle = "#15120e";
  roundRect(c, 30, 30, CARD_W - 60, CARD_H - 60, 18);
  c.fill();
  if (fundo) {
    c.save();
    roundRect(c, 30, 30, CARD_W - 60, CARD_H - 60, 18);
    c.clip();
    c.globalAlpha = 0.18;
    c.drawImage(fundo, -200, 0, (CARD_H * fundo.width) / fundo.height, CARD_H);
    c.restore();
  }

  // Faixa do nome.
  goldFrame(c, 44, 44, CARD_W - 88, 70, 14, 4);
  c.fillStyle = "rgba(20,16,10,.85)";
  roundRect(c, 48, 48, CARD_W - 96, 62, 11);
  c.fill();
  c.fillStyle = "#fbefc8";
  c.textBaseline = "middle";
  c.textAlign = "left";
  fitText(c, d.name, CARD_W - 240, 40, '"Uncial Antiqua", Georgia, serif');
  c.fillText(d.name, 66, 80);
  // Gemas de raridade, como o custo de mana de uma carta.
  for (let i = 0; i < d.rarity; i++) {
    const gx = CARD_W - 74 - i * 30;
    const g = c.createRadialGradient(gx - 4, 76, 2, gx, 80, 13);
    g.addColorStop(0, "#fff6d0");
    g.addColorStop(0.4, "#e8b765");
    g.addColorStop(1, "#7a5418");
    c.fillStyle = g;
    c.beginPath();
    c.arc(gx, 80, 12, 0, Math.PI * 2);
    c.fill();
  }

  // Ilustração: o retrato pintado do herói.
  const ax = 54;
  const ay = 128;
  const aw = CARD_W - 108;
  const ah = 440;
  c.save();
  roundRect(c, ax, ay, aw, ah, 10);
  c.clip();
  const ceu = c.createLinearGradient(0, ay, 0, ay + ah);
  ceu.addColorStop(0, "#1d2328");
  ceu.addColorStop(1, "#08090a");
  c.fillStyle = ceu;
  c.fillRect(ax, ay, aw, ah);
  if (fundo) {
    c.globalAlpha = 0.45;
    c.drawImage(fundo, ax - 120, ay, (ah * fundo.width) / fundo.height, ah);
    c.globalAlpha = 1;
  }
  if (retrato) {
    // O retrato tem fundo preto: a borda suave o funde no cenário, como os retratos dos inimigos.
    const suave = ART.maskPortrait(retrato);
    const h = ah * 1.1;
    const w = (h * suave.width) / suave.height;
    c.drawImage(suave, ax + (aw - w) / 2, ay - 8, w, h);
  } else {
    const fig = document.createElement("canvas");
    fig.width = FIG.W;
    fig.height = FIG.H;
    FIG.draw(fig.getContext("2d"), 2, {
      look: ARMOR[hero.armor]?.look,
      weapon: hero.weapon,
      amulet: hero.amulet,
      ...(HERO_LOOKS[d.look] || HERO_LOOKS[DEFAULT_LOOK]).figure,
    });
    const h = ah;
    const w = (h * FIG.W) / FIG.H;
    c.drawImage(fig, ax + (aw - w) / 2, ay, w, h);
  }
  // Reflexo de folha holográfica sobre a ilustração.
  const foil = c.createLinearGradient(ax, ay, ax + aw, ay + ah);
  foil.addColorStop(0, "rgba(255,255,255,0)");
  foil.addColorStop(0.42, "rgba(255,236,170,0)");
  foil.addColorStop(0.5, "rgba(255,240,190,.22)");
  foil.addColorStop(0.58, "rgba(170,220,255,0)");
  foil.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = foil;
  c.fillRect(ax, ay, aw, ah);
  c.restore();
  goldFrame(c, ax - 4, ay - 4, aw + 8, ah + 8, 12, 6);

  // Linha de tipo: "Herói — origem · título" e o símbolo da coleção.
  const ty = ay + ah + 14;
  goldFrame(c, 44, ty, CARD_W - 88, 52, 12, 4);
  c.fillStyle = "rgba(20,16,10,.85)";
  roundRect(c, 48, ty + 4, CARD_W - 96, 44, 9);
  c.fill();
  c.fillStyle = "#f3e2b0";
  const tipo = `Herói — ${d.origin} · ${d.title}`;
  fitText(c, tipo, CARD_W - 190, 26, '"Alegreya Sans SC", sans-serif');
  c.fillText(tipo, 64, ty + 27);
  c.font = '30px "Uncial Antiqua", Georgia, serif';
  c.fillStyle = goldGradient(c, CARD_W - 110, ty, CARD_W - 60, ty + 50);
  c.textAlign = "center";
  c.fillText("✠", CARD_W - 84, ty + 28);

  // Caixa de texto: atributos, perícias, equipamento e o final.
  const bx = 54;
  const by = ty + 66;
  const bw = CARD_W - 108;
  const bh = CARD_H - by - 110;
  const perg = c.createLinearGradient(0, by, 0, by + bh);
  perg.addColorStop(0, "#efe2c2");
  perg.addColorStop(1, "#d9c49a");
  c.fillStyle = perg;
  roundRect(c, bx, by, bw, bh, 10);
  c.fill();
  goldFrame(c, bx - 3, by - 3, bw + 6, bh + 6, 12, 5);
  c.textAlign = "left";
  c.fillStyle = "#2a1d10";
  // Atributos em quatro brasões.
  const attrs = ["ST", "DX", "IQ", "HT"];
  attrs.forEach((a, i) => {
    const cx = bx + 60 + i * ((bw - 120) / 3);
    c.fillStyle = "#3a2a16";
    c.beginPath();
    c.arc(cx, by + 40, 26, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = goldGradient(c, cx - 26, by + 14, cx + 26, by + 66);
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = "#fbefc8";
    c.textAlign = "center";
    c.font = '700 22px "Alegreya Sans SC", sans-serif';
    c.fillText(String(d.attrs?.[a] ?? ""), cx, by + 38);
    c.font = '700 12px "Alegreya Sans SC", sans-serif';
    c.fillStyle = "#3a2a16";
    c.fillText(a, cx, by + 78);
  });
  c.textAlign = "left";
  c.fillStyle = "#2a1d10";
  let ly = by + 108;
  c.font = '600 19px "Alegreya Sans SC", sans-serif';
  const linha = (rotulo, valor) => {
    if (!valor) return;
    c.font = '700 17px "Alegreya Sans SC", sans-serif';
    c.fillText(rotulo, bx + 18, ly);
    const lw = c.measureText(rotulo).width + 10;
    c.font = '18px "Alegreya", Georgia, serif';
    const resto = wrapLines(c, valor, bw - 36 - lw);
    resto.slice(0, 2).forEach((l, i) => c.fillText(l, bx + 18 + lw, ly + i * 22));
    ly += 22 * Math.min(2, resto.length) + 8;
  };
  linha("Perícias:", d.skills.map((s) => `${s.n} ${s.v}`).join(" · "));
  linha("Arma:", d.weapon);
  linha("Roupa:", d.armor);
  linha("Amuleto:", d.amulet);
  linha("Jornada:", `${d.chapter}${d.final ? ` · ${d.final}` : ""}`);
  // Frase de efeito, em itálico, como o texto de ambientação das cartas.
  c.strokeStyle = "rgba(90,60,25,.4)";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(bx + 30, ly + 2);
  c.lineTo(bx + bw - 30, ly + 2);
  c.stroke();
  c.font = 'italic 18px "Alegreya", Georgia, serif';
  c.fillStyle = "#4a3418";
  const frase = d.final
    ? "“Não lutamos por glória, mas pela liberdade.”"
    : "“A névoa guarda o nome de quem não se rende.”";
  // A frase só entra se couber inteira dentro da caixa.
  const linhasFrase = wrapLines(c, frase, bw - 50);
  if (ly + 22 + (linhasFrase.length - 1) * 21 <= by + bh - 6)
    linhasFrase.forEach((l, i) => c.fillText(l, bx + 24, ly + 22 + i * 21));

  // Rodapé: coleção, conquistas e o "poder/resistência" (PV / PP).
  c.fillStyle = "#e9d9ae";
  c.font = '600 15px "Alegreya Sans SC", sans-serif';
  c.textAlign = "left";
  c.fillText(`Sangue e Névoa · 1296–1314 · ★ ${d.conquistas}/${d.total} conquistas`, 50, CARD_H - 62);
  goldFrame(c, CARD_W - 196, CARD_H - 104, 146, 58, 14, 4);
  c.fillStyle = "rgba(20,16,10,.9)";
  roundRect(c, CARD_W - 192, CARD_H - 100, 138, 50, 11);
  c.fill();
  c.fillStyle = "#fbefc8";
  c.textAlign = "center";
  c.font = '700 26px "Alegreya Sans SC", sans-serif';
  c.fillText(`${d.hp} / ${d.earned}`, CARD_W - 123, CARD_H - 74);
  c.font = '600 11px "Alegreya Sans SC", sans-serif';
  c.fillStyle = "#e9d9ae";
  c.fillText("PV / PP", CARD_W - 123, CARD_H - 40);

  sparkles(c, 26, (d.name.length * 7919 + d.earned) % 233280);
  return cv;
}

/** Abre a carta do herói atual numa janela, com baixar e compartilhar. */
async function openHeroCard(hero = state) {
  if (!hero) return;
  const ov = document.getElementById("overlay");
  ov.hidden = false;
  ov.innerHTML = `<div class="panel-wrap"><div class="panel card-panel" role="dialog" aria-label="Carta do Herói">
   <div class="eyebrow">Carta do Herói</div>
   <div class="hero-card"><canvas id="cardcv" width="${CARD_W}" height="${CARD_H}" aria-label="Carta de ${esc(hero.name)}"></canvas><div class="card-shine" aria-hidden="true"></div></div>
   <div class="slot-acoes card-acoes"><button class="btn primary" id="cardSave">Baixar a carta</button><button class="btn" id="cardShare" hidden>Compartilhar</button><button class="btn" id="cardClose">Fechar</button></div>
  </div></div>`;
  ov.scrollTop = 0;
  const cv = document.getElementById("cardcv");
  await drawHeroCard(cv, hero);
  const arquivo = `carta-${
    String(hero.name)
      .normalize("NFD")
      .replace(/[^\w-]+/g, "")
      .toLowerCase() || "heroi"
  }.png`;
  // Exporta a carta. Se o navegador recusar (página aberta do disco), refaz sem as pinturas.
  const comBlob = async (fn) => {
    try {
      cv.toBlob((b) => b && fn(b), "image/png");
    } catch {
      const copia = document.createElement("canvas");
      await drawHeroCard(copia, hero, true);
      copia.toBlob((b) => b && fn(b), "image/png");
      toast("Carta salva sem as pinturas. Pelo site do jogo ela sai completa.");
    }
  };
  document.getElementById("cardSave").onclick = () =>
    comBlob((b) => {
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url;
      a.download = arquivo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    });
  const share = document.getElementById("cardShare");
  if (navigator.canShare && navigator.share) {
    share.hidden = false;
    share.onclick = () =>
      comBlob((b) => {
        const f = new File([b], arquivo, { type: "image/png" });
        if (navigator.canShare({ files: [f] }))
          navigator.share({ files: [f], title: `Carta de ${hero.name}` }).catch(() => {
            // A pessoa desistiu de compartilhar: nada a fazer.
          });
      });
  }
  document.getElementById("cardClose").onclick = () => {
    closeEvolve();
    if (state && state.mode === "playing") render();
  };
}

/**
 * Aparência do herói e galeria da jornada.
 *
 * O jogador escolhe uma aparência na criação. Ela muda a figura desenhada no canvas e,
 * quando existirem, os retratos pintados em img/heroes/<aparência>_<roupa>.jpg.
 * A galeria guarda como o herói estava (roupa, arma, amuleto, sangue) no começo de
 * cada capítulo, para mostrar a evolução ao longo da história.
 */
"use strict";

const HERO_LOOKS = {
  ruivo: {
    n: "Cabelo ruivo e barba",
    figure: { skin: "#e0b896", hair: "#8a3a1c", beard: true },
  },
  moreno: {
    n: "Cabelo escuro e barba",
    figure: { skin: "#c99d78", hair: "#1e1510", beard: true },
  },
  ruiva: {
    n: "Cabelo ruivo longo",
    figure: { skin: "#e6c0a0", hair: "#9a4220", longHair: true },
  },
  morena: {
    n: "Cabelo escuro longo",
    figure: { skin: "#c49572", hair: "#24170f", longHair: true },
  },
};
const DEFAULT_LOOK = "ruivo";

/**
 * Retratos pintados já gerados, no formato "<aparência>_<roupa>". Só os listados aqui
 * são carregados, para o jogo não pedir arquivos que não existem. Enquanto a lista
 * estiver vazia, o herói é desenhado pela figura do canvas.
 */
const HERO_PORTRAITS = new Set([]);
const heroPortraitCache = {};

/** Retrato pintado do herói na roupa atual, ou `null` se ainda não houver (ou não carregou). */
function heroPortrait(c, armor) {
  if (!c) return null;
  const key = `${c.look || DEFAULT_LOOK}_${armor || c.armor}`;
  if (!HERO_PORTRAITS.has(key)) return null;
  if (!heroPortraitCache[key]) {
    const entry = { ready: null };
    const im = new Image();
    // O fundo preto do retrato some numa borda suave, como nos retratos dos inimigos.
    im.addEventListener("load", () => (entry.ready = ART.maskPortrait(im)));
    im.src = `img/heroes/${key}.jpg`;
    heroPortraitCache[key] = entry;
  }
  return heroPortraitCache[key].ready;
}

/** Quantos capítulos cabem na galeria da jornada. */
const JOURNEY_MAX = 6;

/** Guarda na galeria como o herói está ao começar o capítulo `chapter` (1 a 6). */
function recordJourney(c, chapter) {
  if (!c) return;
  if (!Array.isArray(c.journey)) c.journey = [];
  if (c.journey.some((j) => j.ch === chapter)) return;
  c.journey.push({
    ch: chapter,
    armor: c.armor,
    weapon: c.weapon,
    wl: upLevel("arma", c.weapon),
    amulet: c.amulet,
    sangue: c.sangue,
    hpMax: maxHP(c),
  });
  c.journey = c.journey.slice(-JOURNEY_MAX);
}

/**
 * Validação de saves.
 *
 * Um save lido do armazenamento do navegador é tratado como dado não confiável: pode
 * estar corrompido, ser de uma versão antiga do jogo ou ter sido editado à mão.
 * `sanitizeSave` reconstrói um herói consistente a partir dele, aproveitando só os
 * campos válidos, ou devolve `null` quando não há como aproveitar o save.
 *
 * Regras gerais:
 * - Chaves só são aceitas se existirem nas tabelas do jogo (Object.hasOwn), o que
 *   também barra chaves como "__proto__" e "constructor".
 * - Números são limitados a faixas plausíveis; valores inválidos voltam ao padrão.
 * - Textos que vão para a tela são limitados e continuam passando por esc().
 * - O histórico de combate (HTML) nunca é restaurado do save.
 */
"use strict";

const SAVE_LIMITS = Object.freeze({
  nameLength: 24,
  attrMin: 6,
  attrMax: 20,
  maxSkillPoints: 200,
  maxCount: 999,
  maxCoins: 1_000_000,
  maxPoints: 100_000,
  maxBloodLevel: 4,
  maxSigns: 3,
  maxUpgrade: 3,
  maxFlagText: 40,
});

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Número finito dentro de [min, max]; caso contrário, o valor padrão. */
function clampNumber(value, min, max, fallback) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

const clampInt = (value, min, max, fallback) => Math.round(clampNumber(value, min, max, fallback));

/** Mantém só as chaves que existem em `table`, com valores inteiros válidos. */
function pickCounts(source, table, max) {
  const out = {};
  if (!isPlainObject(source)) return out;
  for (const key of Object.keys(source)) {
    if (!Object.hasOwn(table, key)) continue;
    const n = clampInt(source[key], 0, max, 0);
    if (n > 0) out[key] = n;
  }
  return out;
}

/** Lista sem repetições, só com chaves que existem em `table`. */
const pickKeys = (list, table) =>
  Array.isArray(list)
    ? [...new Set(list.filter((k) => typeof k === "string" && Object.hasOwn(table, k)))]
    : [];

function sanitizeFlags(source) {
  const out = {};
  if (!isPlainObject(source)) return out;
  for (const key of Object.keys(source)) {
    if (!/^\w{1,40}$/.test(key)) continue;
    const v = source[key];
    if (typeof v === "number" && Number.isFinite(v)) out[key] = v;
    else if (typeof v === "boolean") out[key] = v ? 1 : 0;
    else if (typeof v === "string" && v.length <= SAVE_LIMITS.maxFlagText && /^\w*$/.test(v)) out[key] = v;
  }
  return out;
}

function sanitizeUpgrades(source) {
  const out = {};
  if (!isPlainObject(source)) return out;
  for (const key of Object.keys(source)) {
    const m = /^([wa])_(\w+)$/.exec(key);
    if (!m) continue;
    const table = m[1] === "w" ? WEAPONS : ARMOR;
    if (!Object.hasOwn(table, m[2])) continue;
    const level = clampInt(source[key], 0, SAVE_LIMITS.maxUpgrade, 0);
    if (level > 0) out[key] = level;
  }
  return out;
}

/** Cena salva, ou o começo do capítulo dela, ou o começo do jogo. */
function sanitizeScene(scene) {
  if (typeof scene === "string" && Object.hasOwn(SC, scene)) return scene;
  const chapter = typeof scene === "string" ? /^c(\d)_/.exec(scene) : null;
  const chapterStart = chapter ? `c${chapter[1]}_inicio` : null;
  return chapterStart && Object.hasOwn(SC, chapterStart) ? chapterStart : "c1_inicio";
}

/** Reconstrói um combate salvo, ou devolve null para voltar à cena anterior à luta. */
function sanitizeCombat(raw) {
  if (!isPlainObject(raw) || !Array.isArray(raw.foes) || !raw.foes.length || !isPlainObject(raw.spec))
    return null;
  const { spec } = raw;
  const validFoes = raw.foes.every(
    (f) => isPlainObject(f) && Object.hasOwn(FOES, f.k) && Number.isFinite(f.hp),
  );
  if (!validFoes || !Object.hasOwn(SC, spec.win) || !Object.hasOwn(SC, spec.lose)) return null;
  const knownAllies = Object.values(ALLY);
  const allies = Array.isArray(spec.allies)
    ? spec.allies.map((a) => knownAllies.find((k) => isPlainObject(a) && k.n === a.n)).filter(Boolean)
    : [];
  const foes = raw.foes.map((f) => {
    const base = FOES[f.k];
    return {
      k: f.k,
      ...base,
      // Só aceita o nome do bestiário, opcionalmente seguido do número ("Cão de caça 2").
      n:
        typeof f.n === "string" && f.n.startsWith(base.n) && /^( \d{1,2})?$/.test(f.n.slice(base.n.length))
          ? f.n
          : base.n,
      max: base.hp,
      hp: clampInt(f.hp, -base.hp * 10, base.hp, base.hp),
      blind: clampInt(f.blind, 0, 5, 0),
      stun: 0,
      feinted: false,
    };
  });
  return {
    spec: {
      e: foes.map((f) => f.k),
      win: spec.win,
      lose: spec.lose,
      flee: Object.hasOwn(SC, spec.flee) ? spec.flee : undefined,
      nonlethal: !!spec.nonlethal,
      allies,
    },
    round: clampInt(raw.round, 1, 999, 1),
    log: [],
    foes,
    mist: 0,
    pen: 0,
    shock: 0,
    allout: false,
    totaldef: false,
    last: null,
    art: typeof raw.art === "string" && /^\w+$/.test(raw.art) ? raw.art : undefined,
    used: {},
    rowan: 0,
    seer: false,
    feroz: false,
    stone: 0,
  };
}

/**
 * Valida um save. Devolve um herói pronto para jogar ou `null`.
 * @param {unknown} raw objeto lido do armazenamento (já convertido de JSON)
 */
function sanitizeSave(raw) {
  if (!isPlainObject(raw) || typeof raw.origin !== "string" || !Object.hasOwn(ORIGINS, raw.origin))
    return null;
  if (raw.mode === "creating") return null; // criação interrompida: recomeça a criação

  const name = typeof raw.name === "string" ? raw.name.trim().slice(0, SAVE_LIMITS.nameLength) : "";
  const c = newChar(name || "Rowan", raw.origin);
  c.mode = "playing";

  for (const a of Object.keys(c.attrs)) {
    c.attrs[a] = clampInt(raw.attrs?.[a], SAVE_LIMITS.attrMin, SAVE_LIMITS.attrMax, c.attrs[a]);
  }
  if (isPlainObject(raw.skills)) c.skills = pickCounts(raw.skills, SK, SAVE_LIMITS.maxSkillPoints);
  if (Array.isArray(raw.adv)) {
    c.adv = raw.adv
      .filter((a) => isPlainObject(a) && typeof a.n === "string" && Number.isFinite(a.p))
      .map((a) => ({ n: a.n.slice(0, 40), p: clampInt(a.p, -100, 100, 0) }));
  }

  const weapons = pickKeys(raw.weapons, WEAPONS);
  if (weapons.length) c.weapons = weapons;
  if (!c.weapons.includes("punhos")) c.weapons.push("punhos");
  c.weapon = c.weapons.includes(raw.weapon) ? raw.weapon : c.weapons[0];

  c.outfits = [...new Set(["la", ...c.outfits, ...pickKeys(raw.outfits, ARMOR)])];
  if (typeof raw.armor === "string" && Object.hasOwn(ARMOR, raw.armor)) {
    c.armor = raw.armor;
    if (!c.outfits.includes(raw.armor)) c.outfits.push(raw.armor);
  }
  c.shield = typeof raw.shield === "boolean" ? raw.shield : c.shield;

  c.inv = pickCounts(raw.inv, ITEMS, SAVE_LIMITS.maxCount);
  c.amulet = Object.hasOwn(AMULETS, raw.amulet) && c.inv[raw.amulet] ? raw.amulet : null;
  c.mat = { ferro: 0, couro: 0, tecido: 0, prata: 0, ...pickCounts(raw.mat, MATS, SAVE_LIMITS.maxCount) };
  c.up = sanitizeUpgrades(raw.up);
  c.techs = pickKeys(raw.techs, TECHS);

  c.coins = clampInt(raw.coins, 0, SAVE_LIMITS.maxCoins, c.coins);
  c.unspent = clampInt(raw.unspent, 0, SAVE_LIMITS.maxPoints, c.unspent);
  c.earned = clampInt(raw.earned, 0, SAVE_LIMITS.maxPoints, c.earned);
  c.sangue = clampInt(raw.sangue, 0, SAVE_LIMITS.maxBloodLevel, 0);
  c.sinais = clampInt(raw.sinais, 0, SAVE_LIMITS.maxSigns, 0);
  c.visao = raw.visao === true;
  c.dead = raw.dead === true;

  c.flags = sanitizeFlags(raw.flags);
  c.visited = {};
  if (isPlainObject(raw.visited))
    for (const id of Object.keys(raw.visited)) if (Object.hasOwn(SC, id)) c.visited[id] = 1;
  c.scene = sanitizeScene(raw.scene);
  c.combat = sanitizeCombat(raw.combat);

  c.hp = clampInt(raw.hp, -maxHP(c) * 5, maxHP(c), maxHP(c));
  c.fp = clampInt(raw.fp, 0, maxFP(c), maxFP(c));
  return c;
}

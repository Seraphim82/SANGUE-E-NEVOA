/**
 * Mecânica de jogo: dados, testes de 3d6, nível de perícia e atributos derivados.
 */
"use strict";

const r6 = () => 1 + Math.floor(Math.random() * 6);
const rollN = (n) => Array.from({ length: n }, r6);
const sum = (a) => a.reduce((x, y) => x + y, 0);
function parseDmg(s) {
  const m = /^(\d+)d([+-]\d+)?$/.exec(s);
  return { n: +m[1], mod: m[2] ? +m[2] : 0 };
}
function fmtDmg(d) {
  return d.n + "d" + (d.mod > 0 ? "+" + d.mod : d.mod < 0 ? d.mod : "");
}
function rollDmg(d) {
  const dice = rollN(d.n);
  return { dice, total: Math.max(1, sum(dice) + d.mod) };
}
function test(target) {
  const dice = rollN(3),
    s = sum(dice);
  const critOk = s <= 4 || (s === 5 && target >= 15) || (s === 6 && target >= 16);
  const critFail = s >= 17 || s >= target + 10;
  const ok = critOk || (!critFail && s <= target);
  return { dice, sum: s, target, ok, critOk, critFail, margin: target - s };
}
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

function stepsFor(p) {
  return p >= 4 ? 2 + Math.floor((p - 4) / 4) : p >= 2 ? 1 : 0;
}
function nextPts(p) {
  return p === 0 ? 1 : p === 1 ? 2 : p === 2 ? 4 : p + 4;
}
function attrVal(c, a) {
  if (a === "Vontade" || a === "Per") return c.attrs.IQ;
  return c.attrs[a];
}
function skillLevel(c, k, skills) {
  const s = SK[k],
    pts = (skills || c.skills)[k] || 0,
    base = c.attrs[s.a];
  if (!pts) {
    if (s.spell || DIFF[s.d].def === null) return null;
    return base + DIFF[s.d].def + gearBonus(c, k);
  }
  return base + DIFF[s.d].off + stepsFor(pts) + gearBonus(c, k);
}
function gearBonus(c, k) {
  let b = 0;
  const a = ARMOR[c.armor];
  if (a && a.bonus && a.bonus[k]) b += a.bonus[k];
  if (c.amulet === "crina" && k === "natacao") b += 2;
  if (c.amulet === "pedra" && k === "saber") b += 1;
  return b;
}
function armorRD(c) {
  const L = upA(c);
  return ARMOR[c.armor].rd + (L >= 1 ? 1 : 0) + (L >= 3 ? 1 : 0);
}
function statValue(c, key) {
  if (key in ATTR_COST || key === "Vontade" || key === "Per")
    return {
      n: key,
      v: attrVal(c, key) + (key === "Vontade" && (c.amulet === "pedra" || c.amulet === "fragmento") ? 1 : 0),
    };
  const lv = skillLevel(c, key);
  return { n: SK[key].n, v: lv === null ? -99 : lv };
}
function bestOf(c, opts) {
  let best = null;
  for (const [k, mod] of opts) {
    const o = statValue(c, k);
    const v = o.v + (mod || 0);
    if (!best || v > best.v) best = { n: o.n + (mod ? (mod > 0 ? " +" + mod : " " + mod) : ""), v, k };
  }
  return best;
}
const upA = (c) => (c.up && c.up["a_" + c.armor]) || 0,
  upW = (c, k) => (c.up && c.up["w_" + (k || c.weapon)]) || 0;
const HERO = 1; // Bônus de Herói: +1 em todas as defesas ativas
const HERO_HP = 3; // Vigor de Herói: +3 PV para um jogo solo menos punitivo
const maxHP = (c) => c.attrs.ST + HERO_HP + (upA(c) >= 3 ? 2 : 0),
  maxFP = (c) => c.attrs.HT + (c.amulet === "fragmento" ? 2 : 0) - (c.flags && c.flags.frio_eterno ? 2 : 0);
const speed = (c) => (c.attrs.DX + c.attrs.HT) / 4;
const curWeapon = (c) => WEAPONS[c.weapon];
const canShield = (c) => c.shield && curWeapon(c).hands === 1;
function dodge(c) {
  let d = Math.floor(speed(c)) + 3;
  if (c.hp <= maxHP(c) / 3) d = Math.ceil(d / 2);
  return d + (canShield(c) ? 1 : 0) + (c.armor === "nevoa" ? 1 : 0) + HERO + (upA(c) >= 2 ? 1 : 0);
}
function weaponSkill(c) {
  const w = curWeapon(c);
  const lv = skillLevel(c, w.sk);
  return lv === null ? -99 : lv;
}
function parry(c) {
  const w = curWeapon(c);
  const ex = HERO + (upA(c) >= 2 ? 1 : 0);
  if (w.parry === null) {
    const b = skillLevel(c, "briga");
    return Math.floor(b / 2) + 3 + (canShield(c) ? 1 : 0) + ex;
  }
  return Math.floor(weaponSkill(c) / 2) + 3 + w.parry + (canShield(c) ? 1 : 0) + ex + (upW(c) >= 2 ? 1 : 0);
}
function block(c) {
  if (!canShield(c)) return null;
  return Math.floor(skillLevel(c, "escudo") / 2) + 3 + 1 + HERO + (upA(c) >= 2 ? 1 : 0);
}
function bestDefense(c) {
  const opts = [
    ["Esquiva", dodge(c)],
    ["Aparar", parry(c)],
  ];
  const b = block(c);
  if (b !== null) opts.push(["Bloqueio", b]);
  return opts.reduce((a, o) => (o[1] > a[1] ? o : a));
}
function weaponDmg(c, wkey) {
  const w = WEAPONS[wkey || c.weapon];
  const st = Math.max(6, Math.min(20, c.attrs.ST));
  const [n, m] = (w.base === "GdP" ? GDP : GEB)[st];
  const L = upW(c, wkey);
  return { n, mod: m + w.add + (L >= 1 ? 1 : 0) + (L >= 3 ? 1 : 0) };
}
function title(c) {
  let t = TITLES[0][1];
  for (const [x, n] of TITLES) if (c.earned >= x) t = n;
  return t;
}

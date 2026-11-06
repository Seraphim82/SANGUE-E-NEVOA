/**
 * Estado do jogo, salvamento no navegador e recompensas (pontos, itens, materiais).
 */
"use strict";

let S = null; // jogo atual
let CHECK = null; // ponto de retorno da cena (texto JSON)
let selTarget = 0;
let sheetOpen = false;
const SAVE_KEY = "sangue-e-nevoa-v1";
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(S));
  } catch (e) {}
}
function loadSave() {
  try {
    const t = localStorage.getItem(SAVE_KEY);
    return t ? JSON.parse(t) : null;
  } catch (e) {
    return null;
  }
}
function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {}
}

function newChar(name, ok) {
  const o = ORIGINS[ok];
  const c = {
    name,
    origin: ok,
    attrs: { ...o.attrs },
    skills: { ...o.skills },
    adv: o.adv.map((a) => ({ ...a })),
    weapons: [...o.weapons],
    weapon: o.weapons[0],
    armor: o.armor,
    shield: o.shield,
    inv: { ervas: o.ervas },
    coins: o.coins,
    outfits: [...new Set(["la", o.armor])],
    techs: [],
    sinais: 0,
    mat: { ferro: 0, couro: 0, tecido: 0, prata: 0, ...o.mat },
    up: {},
    amulet: null,
    unspent: 10,
    earned: 0,
    sangue: 0,
    visao: false,
    flags: {},
    visited: {},
    scene: "c1_inicio",
    banner: null,
    combat: null,
    dead: false,
    mode: "creating",
  };
  c.hp = maxHP(c);
  c.fp = maxFP(c);
  return c;
}
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2600);
}
function banner() {
  if (!S.banner) S.banner = { roll: null, lines: [] };
  return S.banner;
}
function gain(n, why) {
  S.unspent += n;
  S.earned += n;
  banner().lines.push({ t: `+${n} PP · ${why}`, cls: "" });
  toast(`+${n} pontos de personagem`);
  setTimeout(() => AUD.sting("moeda"), 900);
}
function note(t, cls) {
  banner().lines.push({ t, cls: cls || "gain" });
}
function hurt(dmgStr, why) {
  const d = rollDmg(parseDmg(dmgStr));
  const before = S.hp;
  S.hp = Math.max(1, S.hp - d.total);
  note(`−${before - S.hp} PV · ${why}`, "hurt");
}
function giveWeapon(k) {
  if (!S.weapons.includes(k)) {
    S.weapons.push(k);
    note(`Nova arma: ${WEAPONS[k].n}`);
  }
}
function giveItem(k, n) {
  S.inv[k] = (S.inv[k] || 0) + (n || 1);
  note(`Item: ${ITEMS[k].n}`);
  if (AMULETS[k] && !S.amulet) S.amulet = k;
}
const hasIron = () => S.weapons.some((w) => WEAPONS[w].iron);
const F = (k) => !!S.flags[k];

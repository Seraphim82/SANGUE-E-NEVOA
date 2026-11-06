/**
 * Estado do jogo, salvamento no navegador e recompensas (pontos, itens, materiais).
 */
"use strict";

let state = null; // jogo atual
let CHECK = null; // ponto de retorno da cena (texto JSON)
let selTarget = 0;
let sheetOpen = false;
const SAVE_KEY = "sangue-e-nevoa-v1";
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Armazenamento indisponível (modo privado ou cota cheia): o jogo segue sem salvar.
  }
}
function loadSave() {
  try {
    const t = localStorage.getItem(SAVE_KEY);
    return t ? sanitizeSave(JSON.parse(t)) : null;
  } catch {
    // Save ausente, corrompido ou armazenamento bloqueado: começa sem save.
    return null;
  }
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
  if (!state.banner) state.banner = { roll: null, lines: [] };
  return state.banner;
}
function gain(n, why) {
  state.unspent += n;
  state.earned += n;
  banner().lines.push({ t: `+${n} PP · ${why}`, cls: "" });
  toast(`+${n} pontos de personagem`);
  setTimeout(() => AUD.sting("moeda"), 900);
}
function note(t, cls) {
  banner().lines.push({ t, cls: cls || "gain" });
}
function hurt(dmgStr, why) {
  const d = rollDmg(parseDmg(dmgStr));
  const before = state.hp;
  state.hp = Math.max(1, state.hp - d.total);
  note(`−${before - state.hp} PV · ${why}`, "hurt");
}
function giveWeapon(k) {
  if (!state.weapons.includes(k)) {
    state.weapons.push(k);
    note(`Nova arma: ${WEAPONS[k].n}`);
  }
}
function giveItem(k, n) {
  state.inv[k] = (state.inv[k] || 0) + (n || 1);
  note(`Item: ${ITEMS[k].n}`);
  if (AMULETS[k] && !state.amulet) state.amulet = k;
}
const hasIron = () => state.weapons.some((w) => WEAPONS[w].iron);
const hasFlag = (k) => !!state.flags[k];

/**
 * Estado do jogo, salvamento no navegador e recompensas (pontos, itens, materiais).
 */
"use strict";

let state = null; // jogo atual
let CHECK = null; // ponto de retorno da cena (texto JSON)
let selTarget = 0;
let sheetOpen = false;
const SAVE_KEY = "sangue-e-nevoa-v1";
/** Espaços de jornada. O espaço 1 usa a chave antiga, então saves anteriores continuam valendo. */
const SAVE_SLOTS = 3;
/** Tamanho máximo aceito para um save importado (em caracteres). */
const IMPORT_MAX = 200000;
const slotKey = (n) => (n === 1 ? SAVE_KEY : `${SAVE_KEY}-${n}`);
let activeSlot = (() => {
  try {
    const n = Number(localStorage.getItem("sen-slot"));
    return Number.isInteger(n) && n >= 1 && n <= SAVE_SLOTS ? n : 1;
  } catch {
    // Sem armazenamento: usa o primeiro espaço.
    return 1;
  }
})();
function setSlot(n) {
  if (!Number.isInteger(n) || n < 1 || n > SAVE_SLOTS) return;
  activeSlot = n;
  try {
    localStorage.setItem("sen-slot", String(n));
  } catch {
    // Armazenamento indisponível: vale só nesta sessão.
  }
}
function save() {
  try {
    localStorage.setItem(slotKey(activeSlot), JSON.stringify(state));
    localStorage.setItem(`${slotKey(activeSlot)}-quando`, String(Date.now()));
  } catch {
    // Armazenamento indisponível (modo privado ou cota cheia): o jogo segue sem salvar.
  }
}
function loadSave(n = activeSlot) {
  try {
    const t = localStorage.getItem(slotKey(n));
    return t ? sanitizeSave(JSON.parse(t)) : null;
  } catch {
    // Save ausente, corrompido ou armazenamento bloqueado: começa sem save.
    return null;
  }
}
/** Resumo de um espaço para a tela de jornadas: herói, título, capítulo e quando foi salvo. */
function slotInfo(n) {
  const c = loadSave(n);
  if (!c) return null;
  let quando = 0;
  try {
    quando = Number(localStorage.getItem(`${slotKey(n)}-quando`)) || 0;
  } catch {
    // Sem data: mostra só o herói.
  }
  const cap = Number((/^c(\d)/.exec(c.scene) || [0, 1])[1]);
  const mesa = c.mesa ? c.mesa.heroes.length : 0;
  const nome = mesa ? c.mesa.heroes.map((h) => h.name).join(", ") : c.name;
  return { name: nome, title: title(c), cap, quando, dead: c.dead, fim: !!c.flags.fim_jogo, mesa };
}
function deleteSlot(n) {
  try {
    localStorage.removeItem(slotKey(n));
    localStorage.removeItem(`${slotKey(n)}-quando`);
  } catch {
    // Armazenamento indisponível: nada a apagar.
  }
}
/** Primeiro espaço vazio, ou 0 se todos estiverem ocupados. */
function emptySlot() {
  for (let n = 1; n <= SAVE_SLOTS; n++) if (!loadSave(n)) return n;
  return 0;
}

/** Converte texto em base64 de URL (UTF-8), para o código de exportação. */
function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(code) {
  const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
}

/** O conteúdo de exportação de um espaço: um JSON com a marca do jogo e o save validado. */
function exportSave(n) {
  const c = loadSave(n);
  if (!c) return null;
  return JSON.stringify({ jogo: "sangue-e-nevoa", versao: 1, save: { ...c, banner: null } });
}
const exportCode = (n) => {
  const json = exportSave(n);
  return json ? `SEN1.${toBase64Url(json)}` : null;
};

/**
 * Lê uma jornada importada (o conteúdo do arquivo ou o código). Devolve o herói validado
 * ou uma mensagem de erro. O conteúdo vem de fora, então passa pela mesma validação do save.
 */
function importSave(text) {
  const raw = String(text || "").trim();
  if (!raw) return { erro: "Cole o código ou escolha o arquivo da jornada." };
  if (raw.length > IMPORT_MAX) return { erro: "O arquivo é grande demais para ser uma jornada." };
  let dados;
  try {
    dados = JSON.parse(raw.startsWith("SEN1.") ? fromBase64Url(raw.slice(5)) : raw);
  } catch {
    return { erro: "Não reconheci esse código ou arquivo." };
  }
  if (!dados || typeof dados !== "object" || dados.jogo !== "sangue-e-nevoa" || !dados.save)
    return { erro: "Isso não é uma jornada de Sangue e Névoa." };
  const c = sanitizeSave(dados.save);
  if (!c) return { erro: "A jornada está corrompida ou incompleta." };
  return { save: c };
}

function newChar(name, ok) {
  const o = ORIGINS[ok];
  const c = {
    name,
    origin: ok,
    look: DEFAULT_LOOK,
    journey: [],
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
/**
 * Na Mesa, recompensas e danos da história valem para cada herói: `forAll` roda a mudança
 * em todos, uma vez só (a guarda evita repetir quando uma recompensa chama outra).
 */
let mesaGiving = false;
function forAll(fn) {
  if (typeof inMesa !== "function" || !inMesa() || mesaGiving) return fn();
  mesaGiving = true;
  try {
    forEachHero(fn);
  } finally {
    mesaGiving = false;
  }
}
function gain(n, why) {
  forAll(() => {
    state.unspent += n;
    state.earned += n;
  });
  banner().lines.push({ t: `+${n} PP · ${why}`, cls: "" });
  toast(`+${n} pontos de personagem`);
  setTimeout(() => AUD.sting("moeda"), 900);
}
function note(t, cls) {
  banner().lines.push({ t, cls: cls || "gain" });
}
function hurt(dmgStr, why) {
  const perdas = [];
  forAll(() => {
    const d = rollDmg(parseDmg(dmgStr));
    const before = state.hp;
    state.hp = Math.max(1, state.hp - d.total);
    perdas.push(before - state.hp);
  });
  note(`−${perdas.join(" / ")} PV · ${why}`, "hurt");
}
function giveWeapon(k) {
  let nova = false;
  forAll(() => {
    if (!state.weapons.includes(k)) {
      state.weapons.push(k);
      nova = true;
    }
  });
  if (nova) note(`Nova arma: ${WEAPONS[k].n}`);
}
function giveItem(k, n) {
  forAll(() => {
    state.inv[k] = (state.inv[k] || 0) + (n || 1);
    if (AMULETS[k] && !state.amulet) state.amulet = k;
  });
  note(`Item: ${ITEMS[k].n}`);
}
const hasIron = () => state.weapons.some((w) => WEAPONS[w].iron);
const hasFlag = (k) => !!state.flags[k];

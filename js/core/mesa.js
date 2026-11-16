/**
 * Modo Mesa local: de 2 a 4 heróis no mesmo aparelho, jogando a mesma história.
 *
 * É uma camada por cima do jogo de um herói. `state` continua sendo o herói ativo; os campos
 * pessoais dos outros heróis ficam em `state.mesa.heroes`, e `switchHero()` troca quem está
 * ativo. A história (cena, marcas, combate) é compartilhada. Todo código da Mesa fica atrás de
 * `inMesa()`: no jogo de um herói, nada muda.
 *
 * Regras (docs/MULTIPLAYER.md): escolhas por votação com voto de minerva do mestre (heroes[0]);
 * testes de dados valem se pelo menos metade dos heróis acertar; cada herói ganha os próprios
 * pontos e itens; no combate cada herói age na sua vez; ninguém morre de vez.
 */
"use strict";

/** Campos de cada herói. Todo o resto de `state` é compartilhado pela mesa. */
const PERSONAL_KEYS = [
  "name",
  "origin",
  "look",
  "attrs",
  "skills",
  "adv",
  "weapons",
  "weapon",
  "armor",
  "shield",
  "inv",
  "coins",
  "outfits",
  "techs",
  "sinais",
  "mat",
  "up",
  "amulet",
  "unspent",
  "earned",
  "sangue",
  "visao",
  "hp",
  "fp",
  "journey",
];
/** Campos do combate que pertencem a cada herói (choque, postura, usos por combate). */
const COMBAT_PERSONAL = ["shock", "allout", "totaldef", "feroz", "pen", "seer", "used"];
const MESA_MIN = 2;
const MESA_MAX = 4;

const inMesa = () => !!(state && state.mesa && Array.isArray(state.mesa.heroes));
const mesaSize = () => (inMesa() ? state.mesa.heroes.length : 1);

function pickPersonal(c) {
  const out = {};
  for (const k of PERSONAL_KEYS) out[k] = c[k];
  return out;
}

function combatDefaults(C) {
  return {
    shock: 0,
    allout: false,
    totaldef: false,
    feroz: false,
    pen: C.spec?.pen || 0,
    seer: false,
    used: {},
  };
}

/** Torna o herói `j` o herói ativo, guardando os campos pessoais do anterior. */
function switchHero(j) {
  if (!inMesa()) return;
  const m = state.mesa;
  if (!Number.isInteger(j) || j < 0 || j >= m.heroes.length || j === m.active) return;
  m.heroes[m.active] = pickPersonal(state);
  const C = state.combat;
  if (C) {
    C.per = C.per || {};
    const mine = {};
    for (const k of COMBAT_PERSONAL) mine[k] = C[k];
    C.per[m.active] = mine;
    Object.assign(C, combatDefaults(C), C.per[j] || {});
  }
  Object.assign(state, m.heroes[j]);
  m.active = j;
}

/** Roda `fn` com o herói `j` ativo e volta ao herói anterior. */
function withHero(j, fn) {
  if (!inMesa()) return fn();
  const antes = state.mesa.active;
  switchHero(j);
  try {
    return fn();
  } finally {
    switchHero(antes);
  }
}

/** Roda `fn(i)` para cada herói, cada um ativo na sua vez. */
function forEachHero(fn) {
  if (!inMesa()) return fn(0);
  for (let i = 0; i < state.mesa.heroes.length; i++) withHero(i, () => fn(i));
}

/** Nome de um herói da mesa (sem trocar o ativo). */
function mesaName(i) {
  if (!inMesa()) return state?.name || "";
  return i === state.mesa.active ? state.name : state.mesa.heroes[i]?.name || "";
}

/** Cria a mesa a partir de heróis recém-criados; o primeiro é o mestre. */
function createMesa(heroes) {
  const lider = heroes[0];
  state = lider;
  state.mode = "playing";
  state.mesa = { heroes: heroes.map(pickPersonal), active: 0, voter: 0, votes: {} };
  return state;
}

// ---------------------------------------------------------------- votação

/** Escolha pessoal: muda algo do herói e volta para a mesma cena (compras). Não tem votação. */
function isPersonalChoice(ch) {
  if (!ch || !ch.fx || ch.test || ch.fight || ch.act) return false;
  const destino = typeof ch.go === "function" ? null : ch.go;
  return destino === state.scene;
}

function resetVotes() {
  if (!inMesa()) return;
  state.mesa.votes = {};
  state.mesa.voter = 0;
}

/**
 * Registra o voto do herói da vez (pelo texto da escolha, que não muda entre heróis).
 * Devolve o texto escolhido pela mesa quando todos votaram (maioria; empate decide o voto do
 * mestre), ou `null` enquanto falta voto.
 */
function castVote(texto) {
  const m = state.mesa;
  m.votes[m.voter] = texto;
  const n = m.heroes.length;
  if (Object.keys(m.votes).length < n) {
    m.voter = [...Array(n).keys()].find((h) => m.votes[h] === undefined);
    return null;
  }
  const conta = {};
  for (const v of Object.values(m.votes)) conta[v] = (conta[v] || 0) + 1;
  const max = Math.max(...Object.values(conta));
  const empatados = Object.keys(conta).filter((k) => conta[k] === max);
  const venc = empatados.length === 1 ? empatados[0] : m.votes[0];
  resetVotes();
  return venc;
}

/** Quantos votos cada escolha tem agora. */
function voteCounts() {
  const out = {};
  if (!inMesa()) return out;
  for (const v of Object.values(state.mesa.votes)) out[v] = (out[v] || 0) + 1;
  return out;
}

// ---------------------------------------------------------------- testes em grupo

/**
 * Teste de dados da mesa: cada herói rola com a própria perícia; vale se pelo menos metade
 * acertar. Devolve { ok, rolls: [{ name, dice, sum, target, ok, label }] }.
 */
function groupTest(opts) {
  const rolls = [];
  forEachHero(() => {
    const b = bestOf(state, opts);
    const r = test(b.v);
    rolls.push({ name: state.name, dice: r.dice, sum: r.sum, target: b.v, ok: r.ok, label: b.n });
  });
  const acertos = rolls.filter((r) => r.ok).length;
  return { ok: acertos * 2 >= rolls.length, rolls, acertos };
}

// ---------------------------------------------------------------- combate

function mesaStartCombat(C) {
  C.per = {};
  C.acted = [];
  C.down = [];
  switchHero(0);
}

const heroDown = (C, i) => !!(C.down && C.down[i]);

/**
 * Chamado no começo da fase dos inimigos. Se ainda há herói de pé que não agiu nesta rodada,
 * passa a vez para ele e devolve true; quando todos agiram, devolve false.
 */
function mesaPassTurn(C) {
  const m = state.mesa;
  if (!C.acted.includes(m.active)) C.acted.push(m.active);
  for (let i = 0; i < m.heroes.length; i++) {
    if (!heroDown(C, i) && !C.acted.includes(i)) {
      switchHero(i);
      clog(`<div class="round">Vez de ${esc(state.name)}</div>`);
      return true;
    }
  }
  return false;
}

/** Heróis de pé, para os inimigos escolherem um alvo. */
function mesaStanding(C) {
  return [...Array(state.mesa.heroes.length).keys()].filter((i) => !heroDown(C, i));
}

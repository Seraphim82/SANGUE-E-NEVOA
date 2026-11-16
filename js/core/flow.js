/**
 * Fluxo entre cenas: escolhas, testes e transições.
 */
"use strict";

function go(id, keepBanner) {
  if (!keepBanner) state.banner = null;
  // Voltar à mesma cena (uma compra na loja, por exemplo) não leva a página de volta ao topo.
  const sameScene = state.scene === id;
  if (inMesa() && !sameScene) resetVotes();
  state.scene = id;
  const sc = SC[id];
  AUD.mood(trackFor(id));
  const opening = /^c(\d)_inicio$/.exec(id);
  if (opening && !state.visited[id]) {
    recordJourney(state, Number(opening[1]));
    if (sc.eyebrow) CINEMA.titleCard(sc.eyebrow, meta(id)[0]);
  }
  if (sc.enter && !state.visited[id]) {
    state.visited[id] = 1;
    sc.enter();
  }
  state.visited[id] = 1;
  if (id === "c6_epilogo" && !hasFlag("contou_fim")) {
    state.flags.contou_fim = 1;
    ACH.count("terminadas");
  }
  ACH.check();
  CHECK = JSON.stringify({ ...state, banner: null });
  save();
  render();
  if (!sameScene) scrollTo({ top: 0, behavior: "smooth" });
}
function runOutcome(o) {
  if (typeof o === "function") o = o();
  if (typeof o === "string") return go(o, true);
  startCombat(o);
  save();
  render();
  scrollTo({ top: 0, behavior: "smooth" });
}
function choose(i) {
  const sc = SC[state.scene];
  let ch = visibleChoices(sc)[i];
  if (!ch) return;
  // Mesa: as escolhas da história são votadas; compras e outras escolhas pessoais, não.
  if (inMesa() && !ch.act && !isPersonalChoice(ch)) {
    const venc = castVote(ch.t);
    if (venc === null) {
      save();
      render();
      return;
    }
    // A escolha da mesa é feita com o mestre como herói ativo.
    switchHero(0);
    ch = visibleChoices(sc).find((c) => c.t === venc) || ch;
  }
  state.banner = null;
  if (ch.act === "evolve") return openEvolve();
  if (ch.act === "newgame") return showTitle(true);
  if (ch.act === "filme") return CINEMA.finale(state.flags.final);
  if (ch.act === "carta") return openHeroCard();
  if (ch.fx) ch.fx();
  if (ch.test && inMesa()) {
    // Todos rolam; vale se pelo menos metade acertar.
    const opts = typeof ch.test.o === "function" ? ch.test.o() : ch.test.o;
    const g = groupTest(opts);
    AUD.sting("dado");
    setTimeout(() => AUD.sting(g.ok ? "sucesso" : "infortunio"), 220);
    banner().roll = { group: g.rolls, ok: g.ok, acertos: g.acertos };
    return runOutcome(g.ok ? ch.test.ok : ch.test.fail);
  }
  if (ch.test) {
    const opts = typeof ch.test.o === "function" ? ch.test.o() : ch.test.o;
    const b = bestOf(state, opts);
    const r = test(b.v);
    AUD.sting("dado");
    setTimeout(() => AUD.sting(r.ok ? "sucesso" : "infortunio"), 220);
    banner().roll = {
      dice: r.dice,
      sum: r.sum,
      target: b.v,
      ok: r.ok,
      crit: r.critOk ? "Sucesso crítico" : r.critFail ? "Falha crítica" : "",
      label: b.n,
      margin: r.margin,
    };
    return runOutcome(r.ok ? ch.test.ok : ch.test.fail);
  }
  if (ch.fight) {
    startCombat(typeof ch.fight === "function" ? ch.fight() : ch.fight);
    save();
    render();
    scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  go(typeof ch.go === "function" ? ch.go() : ch.go);
}
function visibleChoices(sc) {
  return sc.choices.filter((c) => !c.if || c.if());
}
function testHint(ch) {
  if (!ch.test) return ch.fight ? "Combate" : "";
  const opts = typeof ch.test.o === "function" ? ch.test.o() : ch.test.o;
  const b = bestOf(state, opts);
  return `${b.n} ${b.v < 0 ? "—" : b.v}`;
}

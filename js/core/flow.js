/**
 * Fluxo entre cenas: escolhas, testes e transições.
 */
"use strict";

function go(id, keepBanner) {
  if (!keepBanner) state.banner = null;
  state.scene = id;
  const sc = SC[id];
  AUD.mood(meta(id)[1]);
  if (sc.enter && !state.visited[id]) {
    state.visited[id] = 1;
    sc.enter();
  }
  state.visited[id] = 1;
  CHECK = JSON.stringify({ ...state, banner: null });
  save();
  render();
  scrollTo({ top: 0, behavior: "smooth" });
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
  const ch = visibleChoices(sc)[i];
  if (!ch) return;
  state.banner = null;
  if (ch.act === "evolve") return openEvolve();
  if (ch.act === "newgame") return showTitle(true);
  if (ch.fx) ch.fx();
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

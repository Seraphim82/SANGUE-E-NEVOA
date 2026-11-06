/**
 * Combate por turnos: ataques, defesas, técnicas, amuletos, magias e aliados.
 */
"use strict";

function startCombat(spec) {
  const C = {
    spec,
    round: 1,
    log: [],
    foes: spec.e.map((k, i) => {
      const f = FOES[k];
      const hp = spec.hp?.[i] ?? f.hp;
      return { k, ...f, max: f.hp, hp, blind: 0 };
    }),
    mist: 0,
    pen: spec.pen || 0,
    shock: 0,
    allout: false,
    totaldef: false,
    last: null,
    art: meta(state.scene)[0],
    used: {},
    rowan: 0,
    seer: false,
    feroz: false,
  };
  AUD.mood("bravura");
  ART.FX.hit = {};
  const cnt = {};
  C.foes.forEach((f) => {
    cnt[f.k] = (cnt[f.k] || 0) + 1;
  });
  const seen = {};
  C.foes.forEach((f) => {
    if (cnt[f.k] > 1) {
      seen[f.k] = (seen[f.k] || 0) + 1;
      f.n = f.n + " " + seen[f.k];
    }
  });
  if (spec.blindAll) C.foes.forEach((f) => (f.blind = Math.max(f.blind, 1)));
  state.combat = C;
  selTarget = 0;
  if (spec.intro) clog(`<i>${spec.intro}</i>`);
  if (spec.pre) {
    const d = rollDmg(parseDmg(spec.pre));
    state.hp -= d.total;
    clog(`<span class="bad">Você sofre ${d.total} de dano antes de reagir.</span>`);
  }
  if (spec.pen) clog(`<span class="r">Surpresa: −${-spec.pen} no seu primeiro ataque.</span>`);
  clog(`<div class="round">RODADA 1</div>`);
}
function clog(h) {
  state.combat.log.push(h);
}
const rtxt = (r) => `<span class="r">[3d6: ${r.dice.join("+")} = ${r.sum} contra ${r.target}]</span>`;
function aliveFoes() {
  return state.combat.foes.filter((f) => f.hp > 0);
}
function playerAttack(mode) {
  const C = state.combat;
  const f = C.foes[selTarget];
  if (!f || f.hp <= 0) return;
  const w = curWeapon(state);
  let tgt =
    weaponSkill(state) +
    C.pen -
    C.shock +
    (mode === "allout" ? 4 : 0) +
    (mode === "atordoar" ? -2 : 0) +
    (C.seer ? 3 : 0);
  const free = f.feinted || C.seer;
  f.feinted = false;
  C.seer = false;
  C.pen = 0;
  C.allout = mode === "allout";
  C.feroz = mode === "feroz";
  C.totaldef = false;
  const r = test(tgt);
  C.last = r;
  AUD.sting("dado");
  if (!r.ok) {
    AUD.sting("erro");
    clog(
      `Você ataca ${f.n} com ${w.n.toLowerCase()} e erra. ${rtxt(r)}${r.critFail ? ' <span class="bad">Falha crítica! Você perde o equilíbrio.</span>' : ""}`,
    );
    if (r.critFail) C.shock = 2;
    return enemyPhase();
  }
  if (!r.critOk && !free) {
    const d = test(f.def);
    if (d.ok) {
      AUD.sting("erro");
      clog(
        `Você acerta, mas ${f.n} se defende. ${rtxt(r)} <span class="r">defesa ${d.sum} contra ${f.def}</span>`,
      );
      return enemyPhase();
    }
  }
  const dm = weaponDmg(state);
  const roll = rollDmg(dm);
  let raw = roll.total + (f.fey && w.iron ? 2 : 0) + (mode === "feroz" ? 2 : 0);
  const effRD = Math.max(0, f.rd - (upW(state) >= 3 ? 2 : 0));
  let pen = Math.max(0, raw - effRD);
  let inj = pen > 0 ? Math.max(1, Math.floor(pen * DTYPE[w.type].m)) : 0;
  f.hp -= inj;
  ART.FX.hit[selTarget] = performance.now();
  AUD.sting("golpe");
  clog(
    `<span class="hit">${r.critOk ? "Acerto crítico! " : ""}Você atinge ${f.n}: ${fmtDmg(dm)} rolou ${roll.total}${f.fey && w.iron ? " (+2 ferro)" : ""}, RD ${f.rd}, <b>${inj} de dano</b> (${DTYPE[w.type].n}).</span> ${rtxt(r)}`,
  );
  if (mode === "atordoar" && inj > 0 && f.hp > 0) {
    f.stun = 1;
    clog(`<span class="ok">${f.n} cambaleia, atordoado.</span>`);
  }
  if (f.hp <= 0) clog(`<span class="ok">${f.n} cai.</span>`);
  enemyPhase();
}
const TECHS = {
  feroz: {
    n: "Ataque Feroz",
    pp: 2,
    desc: "+2 de dano neste ataque; −2 nas suas defesas até o próximo turno",
  },
  finta: {
    n: "Finta",
    pp: 2,
    desc: "Engana o inimigo: se der certo, seu próximo ataque contra ele não pode ser defendido",
  },
  atordoar: {
    n: "Golpe Atordoante",
    pp: 3,
    desc: "Ataque com −2; se ferir, o inimigo perde o próximo ataque",
  },
  folego: { n: "Fôlego das Highlands", pp: 2, desc: "Uma vez por combate: recupera 1d+1 PV e 2 PF" },
};
const AMU_ACT = {
  sorveira: { n: "Queimar a sorveira", desc: "Feéricos −3 nos ataques por 3 turnos" },
  crina: { n: "Chamar a água", desc: "Recupera todos os PF" },
  pedra: { n: "Olhar pela pedra", desc: "+3 no próximo ataque, e o alvo não se defende" },
  fragmento: {
    n: "Despertar a Pedra",
    desc: "Todos os inimigos −2 nos ataques por 3 turnos; feéricos não regeneram",
  },
};
function playerTech(k) {
  const C = state.combat;
  const f = C.foes[selTarget];
  if (k === "feroz" || k === "atordoar") return playerAttack(k);
  C.allout = false;
  C.totaldef = false;
  if (k === "finta") {
    const r = test(weaponSkill(state) - C.shock);
    C.last = r;
    AUD.sting("dado");
    if (r.ok) {
      const d = test(f.def);
      if (!d.ok || r.critOk) {
        f.feinted = true;
        clog(
          `<span class="ok">Você finge um golpe e ${f.n} morde a isca. O próximo ataque não poderá ser defendido.</span> ${rtxt(r)}`,
        );
      } else clog(`${f.n} não cai na finta. ${rtxt(r)}`);
    } else clog(`Sua finta sai desajeitada. ${rtxt(r)}`);
    return enemyPhase();
  }
  if (k === "folego") {
    if (C.used.folego) return;
    C.used.folego = 1;
    const d = rollDmg({ n: 1, mod: 1 });
    const b = state.hp;
    state.hp = Math.min(maxHP(state), state.hp + d.total);
    state.fp = Math.min(maxFP(state), state.fp + 2);
    AUD.sting("sucesso");
    clog(`<span class="ok">Você puxa o ar frio das Highlands: +${state.hp - b} PV e +2 PF.</span>`);
    return enemyPhase();
  }
}
function playerAmulet() {
  const C = state.combat;
  if (C.used.amu || !state.amulet) return;
  C.used.amu = 1;
  AUD.sting("magia");
  if (state.amulet === "sorveira") {
    C.rowan = 3;
    clog(
      '<span class="ok">A sorveira queima com chama vermelha. As criaturas feéricas recuam (−3 por 3 turnos).</span>',
    );
  } else if (state.amulet === "crina") {
    state.fp = maxFP(state);
    clog('<span class="ok">A trança de crina pinga água do rio, e o cansaço some. PF restaurados.</span>');
  } else if (state.amulet === "fragmento") {
    C.stone = 3;
    clog(
      '<span class="ok">O fragmento arde azul na sua mão, e o chão inteiro parece pesar sobre os inimigos (−2 por 3 turnos).</span>',
    );
  } else if (state.amulet === "pedra") {
    C.seer = true;
    clog(
      '<span class="ok">Pelo furo da pedra você vê a abertura na guarda do inimigo. Próximo ataque: +3 e sem defesa.</span>',
    );
  }
  save();
  render();
}
function addSinal() {
  state.sinais = (state.sinais || 0) + 1;
  clog(`<span class="bad">Falha crítica na magia! Um Sinal feérico marca você (${state.sinais}/3).</span>`);
  if (state.sinais >= 3 && !state.flags.cailleach) {
    state.flags.cailleach = 1;
    clog(
      '<span class="bad">A Velha do Inverno sentiu seu sangue. Seus descansos agora curam só a metade.</span>',
    );
  }
}
function playerTotalDef() {
  const C = state.combat;
  C.totaldef = true;
  C.allout = false;
  clog("Você assume uma <b>defesa total</b> (+2 nas defesas).");
  enemyPhase();
}
function playerCast(k) {
  const C = state.combat;
  const s = SK[k].spell;
  const lv = skillLevel(state, k);
  const cost = Math.max(0, s.fp - (lv >= 15 ? 1 : 0) - (k === "sp_nevoa" && state.armor === "nevoa" ? 1 : 0));
  if (state.fp < cost) {
    toast("Fadiga insuficiente");
    return;
  }
  state.fp -= cost;
  C.allout = false;
  C.totaldef = false;
  const r = test(lv - C.shock);
  C.last = r;
  if (!r.ok) {
    clog(`Você conjura ${SK[k].n}, mas a magia se dissipa. ${rtxt(r)}`);
    if (r.critFail) addSinal();
    return enemyPhase();
  }
  const f = C.foes[selTarget];
  AUD.sting("magia");
  if (k !== "sp_cura" && k !== "sp_nevoa") ART.FX.hit[selTarget] = performance.now();
  if (k === "sp_luz") {
    f.blind = 2;
    clog(
      `<span class="ok">Uma luz verde explode diante dos olhos de ${f.n}! (−3 nos ataques por 2 turnos)</span> ${rtxt(r)}`,
    );
  } else if (k === "sp_cura") {
    const d = rollDmg({ n: 1, mod: 1 });
    const b = state.hp;
    state.hp = Math.min(maxHP(state), state.hp + d.total);
    clog(`<span class="ok">Suas feridas se fecham: +${state.hp - b} PV.</span> ${rtxt(r)}`);
  } else if (k === "sp_nevoa") {
    C.mist = 3;
    clog(`<span class="ok">Uma névoa espessa sobe do chão. Os inimigos mal enxergam você.</span> ${rtxt(r)}`);
  } else if (k === "sp_espinhos") {
    const d = rollDmg({ n: 2, mod: 0 });
    const inj = Math.max(0, d.total - f.rd) * 2;
    f.hp -= inj;
    clog(`<span class="hit">Espinhos de sorveira atravessam ${f.n}: ${inj} de dano.</span> ${rtxt(r)}`);
  } else if (k === "sp_beltane") {
    const d = rollDmg({ n: 3, mod: 0 });
    const inj = Math.max(0, d.total - f.rd);
    f.hp -= inj;
    clog(`<span class="hit">Fogo azul envolve ${f.n}: ${inj} de dano.</span> ${rtxt(r)}`);
  } else if (k === "sp_tempestade") {
    let tot = 0;
    for (const g of aliveFoes()) {
      const d = rollDmg({ n: 2, mod: 0 });
      const inj = Math.max(0, d.total - g.rd);
      g.hp -= inj;
      tot += inj;
      if (g.hp <= 0) clog(`<span class="ok">${g.n} cai.</span>`);
    }
    clog(
      `<span class="hit">O céu escurece e o granizo despenca sobre os inimigos: ${tot} de dano no total.</span> ${rtxt(r)}`,
    );
  } else if (k === "sp_estacoes") {
    const d = rollDmg({ n: 2, mod: 0 });
    const b = state.hp;
    state.hp = Math.min(maxHP(state), state.hp + d.total);
    aliveFoes().forEach((g) => (g.blind = 2));
    clog(
      `<span class="ok">Você canta, e por um instante as quatro estações passam pelo campo. +${state.hp - b} PV; os inimigos ficam ofuscados.</span> ${rtxt(r)}`,
    );
  } else if (k === "sp_bride") {
    const d = rollDmg({ n: 2, mod: 2 });
    const b = state.hp;
    state.hp = Math.min(maxHP(state), state.hp + d.total);
    clog(`<span class="ok">Uma luz de primavera fecha suas feridas: +${state.hp - b} PV.</span> ${rtxt(r)}`);
  }
  if (f.hp <= 0 && k !== "sp_tempestade" && k !== "sp_estacoes") clog(`<span class="ok">${f.n} cai.</span>`);
  enemyPhase();
}
function playerHerbs() {
  const C = state.combat;
  if (!(state.inv.ervas > 0)) return;
  state.inv.ervas--;
  C.allout = false;
  C.totaldef = false;
  const r = healHerbs();
  clog(r);
  enemyPhase();
}
function healHerbs() {
  const b = bestOf(state, [
    ["primeiros", 0],
    ["herbalismo", 0],
  ]);
  const r = test(b.v);
  const before = state.hp;
  if (r.ok) {
    const d = rollDmg({ n: 1, mod: 2 });
    state.hp = Math.min(maxHP(state), state.hp + d.total);
  } else state.hp = Math.min(maxHP(state), state.hp + 1);
  return `${r.ok ? '<span class="ok">' : ""}Você aplica as ervas (${b.n}): +${state.hp - before} PV.${r.ok ? "</span>" : ""} ${rtxt(r)}`;
}
function playerFlee() {
  const C = state.combat;
  if (!C.spec.flee && !C.mist) {
    toast("Não há para onde fugir aqui");
    return;
  }
  if (C.mist) {
    clog("Você some na névoa.");
    return endCombat("flee");
  }
  const r = test(state.attrs.DX);
  if (r.ok) {
    clog(`Você foge! ${rtxt(r)}`);
    return endCombat("flee");
  }
  clog(`Você tenta fugir, mas é cercado. ${rtxt(r)}`);
  enemyPhase();
}
function enemyPhase() {
  const C = state.combat;
  if (!aliveFoes().length) return endCombat("win");
  for (const a of C.spec.allies || []) {
    const fs = aliveFoes();
    if (!fs.length) break;
    const f = C.foes[selTarget] && C.foes[selTarget].hp > 0 ? C.foes[selTarget] : fs[0];
    const r = test(a.skill);
    if (!r.ok) {
      clog(`${a.n} ataca ${f.n} e erra.`);
      continue;
    }
    if (test(f.def).ok) {
      clog(`${a.n} ataca, mas ${f.n} se defende.`);
      continue;
    }
    const d = rollDmg(parseDmg(a.dmg));
    const pen = Math.max(0, d.total + (a.fey && f.fey ? 2 : 0) - f.rd);
    const inj = pen > 0 ? Math.max(1, Math.floor(pen * DTYPE[a.type].m)) : 0;
    f.hp -= inj;
    clog(`<span class="ok">${a.n} acerta ${f.n}: ${inj} de dano.</span>`);
    if (f.hp <= 0) clog(`<span class="ok">${f.n} cai.</span>`);
  }
  if (!aliveFoes().length) return endCombat("win");
  C.shock = 0;
  let took = 0;
  for (const f of aliveFoes()) {
    if (state.hp <= 0) break;
    if (f.stun) {
      f.stun = 0;
      clog(`${f.n} ainda está atordoado e não ataca.`);
      continue;
    }
    let atk =
      f.atk -
      (f.blind > 0 ? 3 : 0) -
      (C.mist > 0 ? 2 : 0) -
      (f.fey && C.rowan > 0 ? 3 : 0) -
      (C.stone > 0 ? 2 : 0);
    const r = test(atk);
    if (!r.ok) {
      clog(`${f.n} ataca e erra. ${rtxt(r)}`);
      continue;
    }
    if (!r.critOk && !C.allout) {
      const [dn, dv0] = bestDefense(state);
      let dv =
        dv0 + (C.totaldef ? 2 : 0) + (f.fey && state.amulet === "sorveira" ? 2 : 0) - (C.feroz ? 2 : 0);
      const d = test(dv);
      if (d.ok) {
        clog(
          `${f.n} ataca, mas você usa ${dn.toLowerCase()} e evita o golpe. <span class="r">[defesa ${d.sum} contra ${dv}]</span>`,
        );
        continue;
      }
    }
    const roll = rollDmg(parseDmg(f.dmg));
    const rd = f.ignoreRD ? 0 : armorRD(state);
    const pen = Math.max(0, roll.total - rd);
    const inj = pen > 0 ? Math.max(1, Math.floor(pen * DTYPE[f.type].m)) : 0;
    state.hp -= inj;
    took += inj;
    if (inj > 0) {
      ART.FX.hurt = performance.now();
      AUD.sting("ferido");
    }
    clog(
      `<span class="bad">${r.critOk ? "Crítico! " : ""}${f.n} acerta você: ${inj} de dano.</span> ${rtxt(r)}`,
    );
    if (inj > 0 && f.chill && state.armor !== "peles") {
      state.fp = Math.max(0, state.fp - f.chill);
      clog(`<span class="bad">O frio da mordida congela seu fôlego: −${f.chill} PF.</span>`);
    }
    if (inj > 0 && f.drain) {
      state.fp = Math.max(0, state.fp - f.drain);
      clog(`<span class="bad">${f.n} bebe seu fôlego: −${f.drain} PF.</span>`);
    }
  }
  C.shock = Math.min(2, took);
  C.feroz = false;
  if (C.rowan > 0) C.rowan--;
  if (C.stone > 0) C.stone--;
  for (const f of C.foes) {
    if (f.blind > 0) f.blind--;
    if (f.regen && !(C.stone > 0) && f.hp > 0 && f.hp < f.max) {
      f.hp = Math.min(f.max, f.hp + f.regen);
      clog(
        `<span class="r">${f.n} regenera ${f.regen} PV ${f.k === "redcap" ? "com o sangue do gorro" : "no frio"}.</span>`,
      );
    }
  }
  if (C.mist > 0) C.mist--;
  C.allout = false;
  // início do turno do jogador: ferimentos graves
  if (C.spec.nonlethal && state.hp <= 0) {
    clog('<span class="bad">Você vai ao chão.</span>');
    return endCombat("lose");
  }
  if (state.hp <= -maxHP(state)) {
    const r = test(state.attrs.HT + (state.adv.some((a) => a.n.startsWith("Duro")) ? 1 : 0));
    if (!r.ok) {
      clog(`<span class="bad">Teste de HT para sobreviver falhou.</span> ${rtxt(r)}`);
      return die();
    }
    clog(`<span class="r">Você se recusa a morrer.</span> ${rtxt(r)}`);
  }
  if (state.hp <= 0) {
    const r = test(state.attrs.HT);
    if (!r.ok) {
      clog(`<span class="bad">Você perde os sentidos.</span> ${rtxt(r)}`);
      return endCombat("lose");
    }
    clog(`<span class="r">Teste de HT para continuar consciente: sucesso.</span> ${rtxt(r)}`);
  }
  C.round++;
  clog(`<div class="round">RODADA ${C.round}</div>`);
  if (C.foes[selTarget].hp <= 0) {
    const i = C.foes.findIndex((f) => f.hp > 0);
    if (i >= 0) selTarget = i;
  }
  render();
}
function endCombat(res) {
  const C = state.combat;
  const spec = C.spec;
  state.combat = null;
  state.banner = null;
  if (res === "win") {
    AUD.sting("vitoria");
    const xp = C.foes.reduce((a, f) => a + f.xp, 0);
    note(`Vitória sobre ${C.foes.map((f) => f.n).join(", ")}`);
    const lt = {};
    C.foes.forEach((f) => {
      for (const k in f.loot || {}) lt[k] = (lt[k] || 0) + f.loot[k];
    });
    if (lt.coins) {
      givePennies(lt.coins);
      delete lt.coins;
    }
    if (Object.keys(lt).length) giveMat(lt);
    gain(xp, "Combate vencido");
    go(spec.win, true);
  } else if (res === "flee") go(spec.flee || spec.win, true);
  else {
    AUD.sting("derrota");
    state.lastFoe = spec.e[0];
    state.hp = Math.max(state.hp, 1);
    go(spec.lose, true);
  }
}
function die() {
  AUD.sting("derrota");
  state.dead = true;
  state.combat = null;
  save();
  render();
}

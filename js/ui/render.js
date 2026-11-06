/**
 * Renderização da cena, do combate e da ficha lateral.
 */
"use strict";

const app = document.getElementById("app");
const md = (s) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
function render() {
  const playing = S && S.mode === "playing";
  document.getElementById("btnEvolve").hidden = !playing;
  document.getElementById("btnSheet").hidden = !playing;
  document.getElementById("barSub").textContent = playing ? `${title(S)} · ${S.earned} PP` : "Escócia · 1296";
  if (playing) {
    document.getElementById("ppBadge").textContent = S.unspent;
    document.getElementById("btnEvolve").disabled = !!S.combat;
  }
  if (!S) return;
  if (S.mode === "creating") return renderCreate();
  if (S.dead) return renderDeath();
  app.innerHTML = `<div class="main"><section class="story" id="story"></section><aside class="sheet" id="sheet" data-open="${sheetOpen}"></aside></div>`;
  renderSheet();
  if (S.combat) renderCombat();
  else renderScene();
}
function rollHTML(b) {
  if (!b || !b.roll) return "";
  const r = b.roll;
  return `<div class="roll ${r.ok ? "ok" : "fail"}"><div class="dice">${r.dice.map((d) => `<div class="die roll-anim">${d}</div>`).join("")}</div>
  <div><div class="verdict"><b>${r.crit || (r.ok ? "Sucesso" : "Falha")}</b> · ${esc(r.label)} ${r.target}</div>
  <div class="meta">Rolou ${r.sum} contra ${r.target}${r.ok ? `, margem de ${r.margin}` : `, faltaram ${-r.margin}`}</div></div></div>`;
}
function renderScene() {
  const sc = SC[S.scene];
  const el = document.getElementById("story");
  const b = S.banner;
  const lines =
    b && b.lines.length
      ? `<div class="rewards">${b.lines.map((l) => `<div class="reward ${l.cls}">${esc(l.t)}</div>`).join("")}</div>`
      : "";
  const ch = visibleChoices(sc);
  el.innerHTML = `${artBox}${rollHTML(b)}${lines}
   ${sc.eyebrow ? `<div class="eyebrow">${sc.eyebrow}</div>` : ""}
   <h1 class="scene-title">${sc.title}</h1>
   <div class="prose">${md(P(sc.text()))}</div>
   <div class="wind-hint"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h7"/></svg><span class="mouse">O vento das Terras Altas mostra o caminho: passe o cursor sobre uma escolha</span><span class="touch">O vento mostra o caminho: toque uma vez para ver, duas para seguir</span></div>
   <div class="choices" id="choices">${ch
     .map((c, i) => {
       const h = testHint(c);
       const extra = c.tag ? c.tag() : "";
       return `<button class="choice" data-i="${i}">
     <span class="choice-main"><span>${c.t}</span>${c.sub ? `<small class="note">${c.sub}</small>` : ""}${c.after ? `<small class="note">${c.after}</small>` : ""}</span>
     <span class="choice-side">${h ? `<span class="tag">${h}${extra ? " · " + extra : ""}</span>` : ""}<span class="arrow">→</span></span></button>`;
     })
     .join("")}</div>`;
  bindChoices(el);
  ART.show(meta(S.scene)[0], { visao: S.visao, flags: S.flags });
}
function renderCombat() {
  const C = S.combat;
  C.used = C.used || {};
  const el = document.getElementById("story");
  if (C.foes[selTarget].hp <= 0) {
    const i = C.foes.findIndex((f) => f.hp > 0);
    if (i >= 0) selTarget = i;
  }
  const w = curWeapon(S);
  const [dn, dv] = bestDefense(S);
  const spells = Object.keys(SK).filter((k) => SK[k].spell && S.skills[k]);
  el.innerHTML = `${artBox}${rollHTML(S.banner)}<div class="eyebrow">Combate · Rodada ${C.round}</div>
   <h1 class="scene-title">${C.foes
     .map((f) => f.n)
     .filter((v, i, a) => a.indexOf(v) === i)
     .join(" e ")}</h1>
   <div class="foes">${C.foes
     .map(
       (
         f,
         i,
       ) => `<button class="foe ${i === selTarget && f.hp > 0 ? "sel" : ""} ${f.hp <= 0 ? "dead" : ""}" data-i="${i}" ${f.hp <= 0 ? "disabled" : ""}>
     <div class="foe-top"><img class="foe-pic" src="img/portraits/${f.pic || f.k}.jpg" alt="" onerror="this.remove()"><div><div class="nm">${f.n}</div><div class="st">${f.desc}</div></div></div>
     <div class="meter"><div class="lbl"><span>PV</span><span>${Math.max(f.hp, 0)} / ${f.max}</span></div><div class="track"><div class="fill hp" style="width:${(Math.max(0, f.hp) / f.max) * 100}%"></div></div></div>
     <div class="chips"><span class="chip">Ataque ${f.atk}</span><span class="chip">Defesa ${f.def}</span><span class="chip">RD ${f.rd}</span>${f.fey ? '<span class="chip warn">Feérico</span>' : ""}${f.blind > 0 ? '<span class="chip good">Cego</span>' : ""}${f.hp <= 0 ? '<span class="chip">Caído</span>' : ""}</div>
   </button>`,
     )
     .join("")}</div>
   <div class="substatus"><span>PV <b>${S.hp}/${maxHP(S)}</b></span><span>PF <b>${S.fp}/${maxFP(S)}</b></span><span>${w.n}: <b>${weaponSkill(S)}</b></span>${(C.spec.allies || []).length ? `<span>Aliados: <b>${C.spec.allies.map((a) => a.n).join(", ")}</b></span>` : ""}<span>Melhor defesa: <b>${dn} ${dv}</b></span>${C.shock ? `<span style="color:var(--ember)">Choque −${C.shock}</span>` : ""}${C.pen ? `<span style="color:var(--ember)">Surpresa ${C.pen}</span>` : ""}${C.mist ? `<span style="color:var(--moss)">Névoa ${C.mist}</span>` : ""}</div>
   <div class="actions">
     <button class="btn primary" id="aAtk">Atacar<small>${w.n} · ${weaponSkill(S) + C.pen - C.shock} para acertar · ${fmtDmg(weaponDmg(S))} ${DTYPE[w.type].n}</small></button>
     <button class="btn" id="aAll">Ataque Total<small>+4 para acertar, sem defesa</small></button>
     <button class="btn" id="aDef">Defesa Total<small>+2 nas defesas</small></button>
     ${spells.map((k) => `<button class="btn" data-sp="${k}" ${S.fp < SK[k].spell.fp ? "disabled" : ""}>${SK[k].n}<small>${SK[k].spell.desc} · ${SK[k].spell.fp} PF · NH ${skillLevel(S, k)}</small></button>`).join("")}
     ${(S.techs || []).map((k) => `<button class="btn" data-tech="${k}" ${k === "folego" && C.used.folego ? "disabled" : ""}>${TECHS[k].n}<small>${TECHS[k].desc}</small></button>`).join("")}
     ${S.amulet && AMU_ACT[S.amulet] ? `<button class="btn" id="aAmu" ${C.used.amu ? "disabled" : ""}>${AMU_ACT[S.amulet].n}<small>${AMU_ACT[S.amulet].desc} · ação livre, 1 vez por combate</small></button>` : ""}
     <button class="btn" id="aHerb" ${S.inv.ervas > 0 ? "" : "disabled"}>Usar ervas<small>${S.inv.ervas || 0} restantes</small></button>
     ${C.mist ? `<button class="btn" id="aFlee">Sumir na névoa<small>Fuga automática</small></button>` : ""}
   </div>
   ${C.last ? `<div class="dice" style="margin-bottom:10px">${C.last.dice.map((d) => `<div class="die roll-anim">${d}</div>`).join("")}</div>` : ""}
   <div class="log" id="log">${C.log.slice().reverse().join("")}</div>`;
  el.querySelectorAll(".foe").forEach(
    (b) =>
      (b.onclick = () => {
        selTarget = +b.dataset.i;
        renderCombat();
      }),
  );
  el.querySelector("#aAtk").onclick = () => playerAttack("normal");
  el.querySelector("#aAll").onclick = () => playerAttack("allout");
  el.querySelector("#aDef").onclick = playerTotalDef;
  el.querySelector("#aHerb").onclick = playerHerbs;
  el.querySelectorAll("[data-tech]").forEach((b) => (b.onclick = () => playerTech(b.dataset.tech)));
  const am = el.querySelector("#aAmu");
  if (am) am.onclick = playerAmulet;
  const fl = el.querySelector("#aFlee");
  if (fl) fl.onclick = playerFlee;
  el.querySelectorAll("[data-sp]").forEach((b) => (b.onclick = () => playerCast(b.dataset.sp)));
  ART.showCombat(C.art || meta(S.scene)[0], () =>
    S && S.combat ? { foes: S.combat.foes, sel: selTarget } : null,
  );
  if (performance.now() - ART.FX.hurt < 120) {
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  }
  renderSheet();
}
function renderSheet() {
  const el = document.getElementById("sheet");
  if (!el) return;
  const c = S;
  const w = curWeapon(c);
  const [dn, dv] = bestDefense(c);
  const skills = Object.keys(c.skills)
    .filter((k) => c.skills[k] > 0)
    .sort((a, b) => SK[a].g.localeCompare(SK[b].g));
  el.innerHTML = `<div class="card">
    <h2>${esc(c.name)}</h2><div class="sub">${ORIGINS[c.origin].n} · ${title(c)}</div>
    <div class="meter"><div class="lbl"><span>Pontos de Vida</span><span>${c.hp} / ${maxHP(c)}</span></div><div class="track"><div class="fill hp" style="width:${(Math.max(0, c.hp) / maxHP(c)) * 100}%"></div></div></div>
    <div class="meter"><div class="lbl"><span>Fadiga</span><span>${c.fp} / ${maxFP(c)}</span></div><div class="track"><div class="fill fp" style="width:${(c.fp / maxFP(c)) * 100}%"></div></div></div>
    <div class="xpline"><span>${c.earned} PP acumulados</span><span>${c.unspent} para gastar</span></div>
  </div>
  <div class="card"><h3>Atributos</h3>
    <div class="attrs">${["ST", "DX", "IQ", "HT"].map((a) => `<div class="attr"><div class="k">${a}</div><div class="v">${c.attrs[a]}</div></div>`).join("")}</div>
    <dl class="kv" style="margin-top:10px">
      <dt>Velocidade</dt><dd>${speed(c).toFixed(2).replace(".", ",")}</dd>
      <dt>Vontade / Percepção</dt><dd>${c.attrs.IQ} / ${c.attrs.IQ}</dd>
      <dt>Esquiva</dt><dd>${dodge(c)}</dd>
      <dt>Aparar</dt><dd>${parry(c)}</dd>
      ${block(c) != null ? `<dt>Bloqueio</dt><dd>${block(c)}</dd>` : ""}
      <dt>Dano GdP / GeB</dt><dd>${(() => {
        const st = Math.max(6, Math.min(20, c.attrs.ST));
        return (
          fmtDmg({ n: GDP[st][0], mod: GDP[st][1] }) + " / " + fmtDmg({ n: GEB[st][0], mod: GEB[st][1] })
        );
      })()}</dd>
      <dt>Armadura</dt><dd>${ARMOR[c.armor].n} (RD ${armorRD(c)})</dd>
    </dl></div>
  <div class="card"><h3>Armas</h3><div class="list">${c.weapons
    .map((k) => {
      const x = WEAPONS[k];
      return `<div class="row"><span>${x.n}<br><span class="muted">${SK[x.sk].n} ${skillLevel(c, x.sk)} · ${fmtDmg(weaponDmg(c, k))} ${DTYPE[x.type].n}${x.iron ? " · ferro" : ""}</span></span>
      <button class="mini ${c.weapon === k ? "on" : ""}" data-w="${k}" ${c.weapon === k ? "disabled" : ""}>${c.weapon === k ? "Em mãos" : "Empunhar"}</button></div>`;
    })
    .join("")}
      ${c.shield ? `<div class="row"><span>Escudo de madeira<br><span class="muted">${canShield(c) ? "DB +1 em uso" : "Precisa de arma de uma mão"}</span></span></div>` : ""}
    </div></div>
  <div class="card"><h3>Perícias</h3><div class="list">${skills.map((k) => `<div class="row"><span>${SK[k].n} <span class="muted">${SK[k].a}/${SK[k].d}</span></span><span>${skillLevel(c, k)}</span></div>`).join("") || '<span class="muted">Nenhuma</span>'}</div></div>
  <div class="card"><h3>Vantagens e desvantagens</h3><div class="list">
    ${c.visao ? `<div class="row"><span>Segunda Visão</span><span class="muted">história</span></div>` : ""}
    <div class="row"><span>Sangue Antigo</span><span class="muted">${["latente", "nível 1 · Desperto", "nível 2 · Iniciado", "nível 3 · Druida", "nível 4 · Filho da Névoa"][c.sangue]}</span></div>
    ${c.adv.map((a) => `<div class="row"><span>${a.n}</span><span class="muted">${a.p}</span></div>`).join("")}
    ${c.sinais ? `<div class="row"><span>Sinais feéricos</span><span class="muted">${c.sinais}/3${c.flags.cailleach ? " · a Cailleach observa" : ""}</span></div>` : ""}
    ${(c.techs || []).map((k) => `<div class="row"><span>${TECHS[k].n}</span><span class="muted">técnica</span></div>`).join("")}
    <div class="row"><span>Pobre</span><span class="muted">−15</span></div>
    <div class="row"><span>Senso de Dever: Família</span><span class="muted">−5</span></div>
  </div></div>
  <div class="card"><h3>Bolsa</h3><div class="list">
    ${Object.keys(c.inv)
      .filter((k) => c.inv[k] > 0)
      .map(
        (k) =>
          `<div class="row"><span>${ITEMS[k].n}${c.inv[k] > 1 ? " ×" + c.inv[k] : ""}<br><span class="muted">${ITEMS[k].desc}</span></span>${k === "ervas" && !c.combat ? `<button class="mini" data-herb="1" ${c.hp >= maxHP(c) ? "disabled" : ""}>Usar</button>` : ""}</div>`,
      )
      .join("")}
    <div class="row"><span>Pennies de prata</span><span>${c.coins}</span></div>
  </div></div>`;
  el.querySelectorAll("[data-w]").forEach(
    (b) =>
      (b.onclick = () => {
        S.weapon = b.dataset.w;
        save();
        render();
      }),
  );
  const hb = el.querySelector("[data-herb]");
  if (hb)
    hb.onclick = () => {
      S.inv.ervas--;
      const t = healHerbs();
      S.banner = { roll: null, lines: [{ t: t.replace(/<[^>]+>/g, ""), cls: "gain" }] };
      save();
      render();
    };
}
function renderDeath() {
  app.innerHTML = `<section class="hero">${artBox}<div class="tag">Fim da linha</div><h1>A névoa te levou</h1>
  <p class="lede">${esc(S.name)} caiu e não se levantou mais. Na Escócia de 1296, a morte vem rápido.</p>
  <div class="cta"><button class="btn primary" id="retry">Voltar ao início da cena</button><button class="btn" id="ng">Nova jornada</button></div></section>`;
  ART.show("morte");
  AUD.mood("lamento");
  document.getElementById("retry").onclick = () => {
    if (CHECK) {
      S = migrate(JSON.parse(CHECK));
      save();
      render();
    }
  };
  document.getElementById("ng").onclick = () => showTitle(true);
}

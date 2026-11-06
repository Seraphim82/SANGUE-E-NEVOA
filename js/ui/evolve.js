/**
 * Tela de Aprendizados: gasto de pontos em atributos, perícias, magias e técnicas.
 */
"use strict";

let D = null;
function openEvolve(back) {
  if (S.combat) return;
  D = {
    back: typeof back === "string" ? back : null,
    techs: [...(S.techs || [])],
    attrs: { ...S.attrs },
    skills: { ...S.skills },
    spent: 0,
    base: { attrs: { ...S.attrs }, skills: { ...S.skills } },
  };
  renderEvolve();
}
function evoChar() {
  return { ...S, attrs: D.attrs, skills: D.skills };
}
function renderEvolve() {
  const ov = document.getElementById("overlay");
  ov.hidden = false;
  const left = S.unspent - D.spent;
  const c = evoChar();
  const creating = S.mode === "creating";
  const groups = {};
  for (const k in SK) {
    const s = SK[k];
    if (s.spell && s.spell.circle > S.sangue) continue;
    (groups[s.g] = groups[s.g] || []).push(k);
  }
  const attrRows = ["ST", "DX", "IQ", "HT"]
    .map((a) => {
      const cost = ATTR_COST[a];
      const up = D.attrs[a] > D.base.attrs[a];
      return `<div class="evo-row"><div class="nm">${ATTR_NAME[a]} (${a})<small>${a === "ST" ? "PV e dano" : a === "DX" ? "Base das armas e da agilidade" : a === "IQ" ? "Base do conhecimento e da magia" : "PF, resistência e fôlego"}</small></div>
    <button class="pm" data-a="${a}" data-d="-1" ${D.attrs[a] <= D.base.attrs[a] ? "disabled" : ""} aria-label="Reduzir ${a}">−</button>
    <div class="lv ${up ? "up" : ""}">${D.attrs[a]}</div>
    <div style="display:flex;align-items:center;gap:8px"><button class="pm" data-a="${a}" data-d="1" ${left < cost || D.attrs[a] >= 20 ? "disabled" : ""} aria-label="Aumentar ${a}">+</button><span class="cost">${cost} pts</span></div></div>`;
    })
    .join("");
  const skillRows = Object.entries(groups)
    .map(
      ([g, ks]) =>
        `<div class="evo-sec"><h3>${g}${g === "Magia" ? " · Sangue Antigo " + S.sangue : ""}</h3>${ks
          .map((k) => {
            const s = SK[k];
            const p = D.skills[k] || 0;
            const nxt = nextPts(p) - p;
            const lv = skillLevel(c, k);
            const up = p > (D.base.skills[k] || 0);
            return `<div class="evo-row"><div class="nm">${s.n}<small>${s.a}/${DIFF[s.d].n} · ${p} pts${s.spell ? " · " + s.spell.desc + " · " + s.spell.fp + " PF" : ""}${!p && !s.spell ? " · sem treino" : ""}</small></div>
     <button class="pm" data-s="${k}" data-d="-1" ${p <= (D.base.skills[k] || 0) ? "disabled" : ""} aria-label="Reduzir ${s.n}">−</button>
     <div class="lv ${up ? "up" : ""}">${lv == null ? "—" : lv}</div>
     <div style="display:flex;align-items:center;gap:8px"><button class="pm" data-s="${k}" data-d="1" ${left < nxt ? "disabled" : ""} aria-label="Melhorar ${s.n}">+</button><span class="cost">${nxt} pt${nxt > 1 ? "s" : ""}</span></div></div>`;
          })
          .join("")}</div>`,
    )
    .join("");
  ov.innerHTML = `<div class="panel-wrap"><div class="panel" role="dialog" aria-label="Evoluir personagem">
    <div class="eyebrow">${creating ? "Criação de personagem · 2 de 2" : "Aprendizados"}</div>
    <h2>${esc(S.name)}</h2>
    <div class="pts">${left} ponto${left === 1 ? "" : "s"} para gastar</div>
    <p class="note">${creating ? "Gaste os 10 pontos livres como quiser. Pode guardar alguns para depois." : "Pontos ganhos com experiência. Atributos: ST e HT custam 10, DX e IQ custam 20 por nível."}</p>
    <div class="evo-sec"><h3>Atributos</h3>${attrRows}</div>
    ${skillRows}
    ${
      creating
        ? ""
        : `<div class="evo-sec"><h3>Técnicas de combate</h3>${Object.entries(TECHS)
            .map(([k, t]) => {
              const has = D.techs.includes(k),
                base = (S.techs || []).includes(k);
              return `<div class="evo-row"><div class="nm">${t.n}<small>${t.desc}</small></div>
     <button class="pm" data-tk="${k}" data-d="-1" ${has && !base ? "" : "disabled"} aria-label="Desaprender ${t.n}">−</button>
     <div class="lv ${has && !base ? "up" : ""}">${has ? "✓" : "—"}</div>
     <div style="display:flex;align-items:center;gap:8px"><button class="pm" data-tk="${k}" data-d="1" ${has || left < t.pp ? "disabled" : ""} aria-label="Aprender ${t.n}">+</button><span class="cost">${t.pp} pts</span></div></div>`;
            })
            .join("")}</div>`
    }
    ${S.sangue < 1 ? `<p class="note" style="margin-top:14px">A magia ainda dorme no seu sangue. Ela vai despertar pela história.</p>` : ""}
    <div class="panel-foot">${creating ? `<button class="btn" id="eBack">Voltar</button>` : `<button class="btn" id="eCancel">${D.back ? "Voltar" : "Cancelar"}</button>`}<button class="btn primary" id="eOk">${creating ? "Começar a aventura" : "Confirmar"}</button></div>
  </div></div>`;
  ov.querySelectorAll("[data-a]").forEach(
    (b) =>
      (b.onclick = () => {
        const a = b.dataset.a,
          d = +b.dataset.d;
        D.attrs[a] += d;
        D.spent += d * ATTR_COST[a];
        renderEvolve();
      }),
  );
  ov.querySelectorAll("[data-s]").forEach(
    (b) =>
      (b.onclick = () => {
        const k = b.dataset.s,
          d = +b.dataset.d;
        const p = D.skills[k] || 0;
        if (d > 0) {
          const n = nextPts(p);
          D.spent += n - p;
          D.skills[k] = n;
        } else {
          const prev = p <= 1 ? 0 : p === 2 ? 1 : p === 4 ? 2 : p - 4;
          D.spent -= p - prev;
          if (prev) D.skills[k] = prev;
          else delete D.skills[k];
        }
        renderEvolve();
      }),
  );
  ov.querySelectorAll("[data-tk]").forEach(
    (b) =>
      (b.onclick = () => {
        const k = b.dataset.tk,
          d = +b.dataset.d;
        if (d > 0) {
          D.techs.push(k);
          D.spent += TECHS[k].pp;
        } else {
          D.techs = D.techs.filter((x) => x !== k);
          D.spent -= TECHS[k].pp;
        }
        renderEvolve();
      }),
  );
  const cancel = document.getElementById("eCancel");
  if (cancel)
    cancel.onclick = () => {
      const b = D.back;
      closeEvolve();
      if (b) openChar(b);
    };
  const back = document.getElementById("eBack");
  if (back)
    back.onclick = () => {
      closeEvolve();
      S = null;
      renderOriginPick();
    };
  document.getElementById("eOk").onclick = () => {
    const dST = D.attrs.ST - S.attrs.ST,
      dHT = D.attrs.HT - S.attrs.HT;
    S.attrs = D.attrs;
    S.skills = D.skills;
    S.techs = D.techs;
    S.unspent -= D.spent;
    S.hp += dST;
    S.fp += dHT;
    closeEvolve();
    if (S.mode === "creating") {
      S.mode = "playing";
      go("c1_inicio");
      toast("A aventura começa");
    } else {
      save();
      render();
      if (D && D.spent) toast("Evolução registrada");
      if (D.back) openChar(D.back);
    }
  };
  ov.scrollTop = 0;
}
function closeEvolve() {
  const ov = document.getElementById("overlay");
  ov.hidden = true;
  ov.innerHTML = "";
  if (DASH.raf) {
    cancelAnimationFrame(DASH.raf);
    DASH.raf = 0;
  }
}

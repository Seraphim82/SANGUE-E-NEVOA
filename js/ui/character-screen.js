/**
 * Tela de Personagem: vestimentas, armas, amuletos e forja.
 */
"use strict";

const MATS = { ferro: "Ferro", couro: "Couro", tecido: "Tecido", prata: "Prata" };
const MAT_COL = { ferro: "#9aa6ad", couro: "#a0703f", tecido: "#c9b98f", prata: "#dfe8ee" };
const UPCOST = [
  [4, 1],
  [8, 2],
  [14, 3],
];
const LV = ["Comum", "Reforçado", "Temperado", "Lendário"];
const WMAT = {
  arco_longo: "couro",
  lanca: "ferro",
  espada_guerra: "ferro",
  arco: "couro",
  machado: "ferro",
  faca: "ferro",
  martelo: "ferro",
  bordao: "couro",
  funda: "couro",
  espada: "ferro",
  pique: "ferro",
};
const AMULETS = {
  sorveira: { perk: "+2 nas defesas contra criaturas feéricas" },
  crina: { perk: "+2 em Natação" },
  pedra: { perk: "+1 em Vontade e em Saber Antigo" },
  fragmento: { perk: "+1 em Vontade e +2 PF máximos" },
};
const HINT = {
  arco_longo: "Caído na lama de Callendar.",
  lanca: "Vendida pelo intendente do exército de Wallace.",
  espada_guerra: "Um presente de Wallace a quem se destacar na ponte.",
  gibao_stirling: "Entregue a quem lutou na ponta da ponte.",
  peles: "Arrancada dos cães da Velha do Inverno.",
  arco: "Peça a quem atira melhor que Tam.",
  machado: "Preso à sela de um cavaleiro de três corvos.",
  fragmento: "Guardado sob uma colina antiga.",
  gibao: "Coisa de quem trabalha na forja.",
  tartan: "Um presente de quem luta pela terra.",
  couro: "Ganha-se no chão, com um bordão na mão.",
  malha: "Pertence a um sargento inglês.",
  nevoa: "Tecido numa cachoeira, ao amanhecer.",
  faca: "Ferro de forja.",
  martelo: "Ferramenta de ferreiro.",
  bordao: "Coisa de pastor.",
  funda: "Coisa de pastor.",
  espada: "Aço de um sargento inglês.",
  pique: "Arma de uma criatura das ruínas.",
  sorveira: "Peça a quem conhece os ritos.",
  crina: "Arrancada de um cavalo que não é cavalo.",
  pedra: "Escondida na lama do pântano.",
};
const SLOTS = [
  ["roupa", "Vestimentas"],
  ["arma", "Armas"],
  ["amuleto", "Amuletos"],
  ["evolucao", "Aprendizados"],
];
const DASH = { tab: "roupa", sel: {}, preview: null, raf: 0 };
function migrate(c) {
  if (!c) return c;
  c.outfits = c.outfits || [c.armor];
  if (!c.outfits.includes("la")) c.outfits.unshift("la");
  c.mat = c.mat || { ferro: 0, couro: 0, tecido: 0, prata: 0 };
  c.up = c.up || {};
  if (c.amulet === undefined) c.amulet = c.inv && c.inv.sorveira ? "sorveira" : null;
  c.techs = c.techs || [];
  c.sinais = c.sinais || 0;
  return c;
}
const upKey = (slot, k) => (slot === "arma" ? "w_" : "a_") + k;
const upLevel = (slot, k) => (S.up || {})[upKey(slot, k)] || 0;
const owned = (slot, k) =>
  slot === "roupa" ? S.outfits.includes(k) : slot === "arma" ? S.weapons.includes(k) : !!S.inv[k];
const equipped = (slot, k) =>
  slot === "roupa" ? S.armor === k : slot === "arma" ? S.weapon === k : S.amulet === k;
const catalog = (slot) =>
  slot === "roupa" ? Object.keys(ARMOR) : slot === "arma" ? Object.keys(WEAPONS) : Object.keys(AMULETS);
const matFor = (slot, k) => (slot === "roupa" ? ARMOR[k].mat : slot === "arma" ? WMAT[k] : null);
const LEGEND = {
  arco_longo: "Arco de Falkirk",
  lanca: "Lança da Muralha de Moray",
  espada_guerra: "Espada do Guardião",
  gibao_stirling: "Gibão da Cruz de Santo André",
  peles: "Manto do Lobo-Rei",
  arco: "Arco de Teixo de Ailsa",
  machado: "Machado dos Gallóglaigh",
  la: "Lã Encerada das Highlands",
  gibao: "Brigantina",
  tartan: "Tartan de Chefe de Clã",
  couro: "Couro de Javali Rebitado",
  malha: "Cota de Malha Escocesa",
  nevoa: "Manto de Brìde",
  faca: "Faca de Ferro Frio",
  martelo: "Martelo de Duncan",
  bordao: "Bordão de Freixo Antigo",
  funda: "Funda do Pastor de Gigantes",
  espada: "Espada de Kilbride",
  pique: "Pique Sangrento",
};
const UPFX = {
  arma: ["+1 de dano", "+1 em Aparar", "+1 de dano e ignora 2 de RD do alvo"],
  roupa: ["+1 de proteção (RD)", "+1 em todas as defesas", "+1 de RD e +2 PV máximos"],
};
function itemName(slot, k) {
  if (slot !== "amuleto" && LEGEND[k] && owned(slot, k) && upLevel(slot, k) >= 3) return LEGEND[k];
  return slot === "roupa" ? ARMOR[k].n : slot === "arma" ? WEAPONS[k].n : ITEMS[k].n;
}
function canUpgrade(slot, k) {
  const m = matFor(slot, k);
  if (!m || !owned(slot, k)) return false;
  const L = upLevel(slot, k);
  if (L >= 3) return false;
  const [p, q] = UPCOST[L];
  return S.coins >= p && (S.mat[m] || 0) >= q;
}
function doUpgrade(slot, k) {
  if (!canUpgrade(slot, k)) return;
  const L = upLevel(slot, k),
    [p, q] = UPCOST[L];
  S.coins -= p;
  S.mat[matFor(slot, k)] -= q;
  S.up[upKey(slot, k)] = L + 1;
  AUD.sting("golpe");
  setTimeout(() => AUD.sting("sucesso"), 260);
  toast(`${itemName(slot, k)}: ${LV[L + 1]}`);
  save();
  renderDash();
}
function equipItem(slot, k) {
  if (!owned(slot, k)) return;
  if (slot === "roupa") S.armor = k;
  else if (slot === "arma") S.weapon = k;
  else S.amulet = k;
  AUD.sting("moeda");
  save();
  renderDash();
  render();
}
function giveOutfit(k) {
  if (!S.outfits.includes(k)) {
    S.outfits.push(k);
    note(`Nova vestimenta: ${ARMOR[k].n} (vista em Personagem)`);
  }
}
function giveMat(o) {
  for (const k in o) {
    S.mat[k] = (S.mat[k] || 0) + o[k];
    note(`+${o[k]} ${MATS[k]}`);
  }
}
function givePennies(n) {
  S.coins += n;
  note(`+${n} pennies de prata`);
}
function figState() {
  const slot = DASH.tab,
    sel = DASH.sel[slot];
  const st = {
    look: ARMOR[S.armor].look,
    weapon: S.weapon,
    wl: upLevel("arma", S.weapon),
    amulet: S.amulet,
    shield: canShield(S),
    woad: S.sangue >= 1,
  };
  if (sel && owned(slot, sel)) {
    if (slot === "roupa") st.look = ARMOR[sel].look;
    if (slot === "arma") {
      st.weapon = sel;
      st.wl = upLevel("arma", sel);
      st.shield = S.shield && WEAPONS[sel].hands === 1;
    }
    if (slot === "amuleto") st.amulet = sel;
  }
  return st;
}
function startFig() {
  if (DASH.raf) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const step = (now) => {
    DASH.raf = 0;
    const cv = document.getElementById("figcv");
    if (!cv) return;
    const dpr = Math.min(2, devicePixelRatio || 1),
      w = Math.round(cv.clientWidth * dpr),
      h = Math.round((w * FIG.H) / FIG.W);
    if (w && (cv.width !== w || cv.height !== h)) {
      cv.width = w;
      cv.height = h;
    }
    const c = cv.getContext("2d");
    c.setTransform(w / FIG.W, 0, 0, h / FIG.H, 0, 0);
    FIG.draw(c, reduce ? 2 : now / 1000, figState());
    if (!reduce) DASH.raf = requestAnimationFrame(step);
  };
  DASH.raf = requestAnimationFrame(step);
}
function openChar(tab) {
  if (!S || S.combat || S.mode !== "playing") return;
  migrate(S);
  if (tab) DASH.tab = tab;
  if (DASH.tab === "evolucao") {
    openEvolve("roupa");
    return;
  }
  renderDash();
}
const ICON = {
  roupa: '<path d="M8 3l4 2 4-2 4 4-3 3v11H7V10L4 7z"/>',
  arma: '<path d="M14 3h7v7L9 22l-3-3 1-1-4-4 3-3 4 4z"/>',
  amuleto: '<path d="M7 3l5 7 5-7"/><circle cx="12" cy="15" r="5"/>',
};
function statsHTML(slot, k) {
  if (slot === "roupa") {
    const a = ARMOR[k],
      L = upLevel(slot, k),
      cur = armorRD(S);
    const rd = a.rd + L;
    const bon = Object.entries(a.bonus || {}).map(([s, v]) => `${v > 0 ? "+" : ""}${v} ${SK[s].n}`);
    return `<dl class="kv"><dt>Proteção (RD)</dt><dd>${rd}${S.armor !== k ? ` <span class="${rd > cur ? "up" : rd < cur ? "down" : "same"}">(atual ${cur})</span>` : ""}</dd>${bon.length ? `<dt>Bônus</dt><dd>${bon.join(", ")}</dd>` : ""}${a.perk ? `<dt>Especial</dt><dd>${a.perk}</dd>` : ""}<dt>Material de melhoria</dt><dd>${MATS[a.mat]}</dd></dl>`;
  }
  if (slot === "arma") {
    const w = WEAPONS[k],
      lv = skillLevel(S, w.sk);
    return `<dl class="kv"><dt>Perícia</dt><dd>${SK[w.sk].n} ${lv == null ? "—" : lv}</dd><dt>Dano</dt><dd>${fmtDmg(weaponDmg(S, k))} ${DTYPE[w.type].n}</dd><dt>Aparar</dt><dd>${w.parry === null ? "não apara" : (w.parry >= 0 ? "+" : "") + w.parry}</dd><dt>Mãos</dt><dd>${w.hands}</dd>${w.iron ? "<dt>Ferro</dt><dd>+2 de dano em feéricos</dd>" : ""}${WMAT[k] ? `<dt>Material de melhoria</dt><dd>${MATS[WMAT[k]]}</dd>` : ""}</dl>`;
  }
  return `<dl class="kv"><dt>Passivo</dt><dd>${AMULETS[k].perk}</dd><dt>Ativo em combate</dt><dd>${AMU_ACT[k].n}: ${AMU_ACT[k].desc}</dd></dl>`;
}
function renderDash() {
  const ov = document.getElementById("overlay");
  ov.hidden = false;
  const slot = DASH.tab,
    keys = catalog(slot);
  if (!DASH.sel[slot] || !keys.includes(DASH.sel[slot]))
    DASH.sel[slot] = keys.find((k) => equipped(slot, k)) || keys[0];
  const sel = DASH.sel[slot],
    own = owned(slot, sel),
    L = upLevel(slot, sel),
    m = matFor(slot, sel);
  const tiles = keys
    .map((k) => {
      const o = owned(slot, k),
        lv = upLevel(slot, k);
      return `<button class="tile ${k === sel ? "sel" : ""} ${o ? "" : "locked"}" data-k="${k}" aria-pressed="${k === sel}">
   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">${ICON[slot]}</svg>
   <span class="tn">${o ? itemName(slot, k) : "???"}</span>
   ${o && matFor(slot, k) ? `<span class="pips">${[1, 2, 3].map((i) => `<i class="pip ${lv >= i ? "on" : ""}"></i>`).join("")}</span>` : ""}
   ${equipped(slot, k) ? '<span class="eq" title="Equipado"></span>' : ""}</button>`;
    })
    .join("");
  let up = "";
  if (own && m) {
    if (L >= 3) up = `<div class="up-box"><b>Lendário.</b> Este item chegou ao máximo.</div>`;
    else {
      const [p, q] = UPCOST[L];
      const ok = canUpgrade(slot, sel);
      up = `<div class="up-box"><div class="lvl">Próximo nível: ${LV[L + 1]}</div><p>${UPFX[slot][L]}${L === 2 && LEGEND[sel] ? ` · o item se torna <b>${LEGEND[sel]}</b>` : ""}</p>
   <div class="cost-line"><span class="${S.coins >= p ? "" : "short"}">${p} pennies</span><span class="${(S.mat[m] || 0) >= q ? "" : "short"}">${q} ${MATS[m]}</span></div>
   <button class="btn primary" id="dUp" ${ok ? "" : "disabled"}>Melhorar na forja</button></div>`;
    }
  }
  const ev = S.unspent;
  ov.innerHTML = `<div class="dash" role="dialog" aria-label="Personagem">
  <header class="dash-head"><div class="dh-id"><div class="eyebrow">Personagem</div><h2>${esc(S.name)}</h2><div class="sub">${ORIGINS[S.origin].n} · ${title(S)} · ${S.earned} PP acumulados</div></div>
   <div class="purse"><span class="mchip"><i style="background:var(--gold)"></i>${S.coins} pennies</span>${Object.keys(
     MATS,
   )
     .map(
       (k) =>
         `<span class="mchip"><i style="background:${MAT_COL[k]}"></i>${S.mat[k] || 0} ${MATS[k]}</span>`,
     )
     .join("")}</div>
   <button class="btn" id="dClose">Voltar ao jogo</button></header>
  <nav class="dash-tabs" aria-label="Seções">${SLOTS.map(([k, n]) => `<button class="dash-tab ${k === slot ? "on" : ""}" data-t="${k}">${n}${k === "evolucao" && ev ? `<span class="badge">${ev}</span>` : ""}</button>`).join("")}</nav>
  <div class="dash-body">
   <div class="figure"><canvas id="figcv" aria-label="Retrato do personagem"></canvas>
    <div class="fig-stats"><span>PV <b>${S.hp}/${maxHP(S)}</b></span><span>RD <b>${armorRD(S)}</b></span><span>Esquiva <b>${dodge(S)}</b></span><span>Aparar <b>${parry(S)}</b></span><span>Dano <b>${fmtDmg(weaponDmg(S))}</b></span></div></div>
   <div class="dash-panel"><div class="tiles">${tiles}</div>
    <div class="detail">${
      own
        ? `<div class="lvl">${m ? LV[L] : "Amuleto"}${equipped(slot, sel) ? " · em uso" : ""}</div><h3>${itemName(slot, sel)}</h3>
     <blockquote>${slot === "roupa" ? ARMOR[sel].desc : slot === "arma" ? WEAPONS[sel].desc || "" : ITEMS[sel].desc}</blockquote>${statsHTML(slot, sel)}
     <div class="detail-actions"><button class="btn ${equipped(slot, sel) ? "" : "primary"}" id="dEq" ${equipped(slot, sel) ? "disabled" : ""}>${equipped(slot, sel) ? "Em uso" : slot === "roupa" ? "Vestir" : slot === "arma" ? "Empunhar" : "Usar"}</button></div>${up}`
        : `<div class="lvl">Ainda não encontrado</div><h3>???</h3><blockquote>${HINT[sel] || "Continue a jornada."}</blockquote>`
    }</div>
   </div></div></div>`;
  ov.querySelector("#dClose").onclick = closeEvolve;
  ov.querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => openChar(b.dataset.t)));
  ov.querySelectorAll(".tile").forEach(
    (b) =>
      (b.onclick = () => {
        DASH.sel[slot] = b.dataset.k;
        renderDash();
      }),
  );
  const eq = ov.querySelector("#dEq");
  if (eq) eq.onclick = () => equipItem(slot, sel);
  const u = ov.querySelector("#dUp");
  if (u) u.onclick = () => doUpgrade(slot, sel);
  DASH.raf && cancelAnimationFrame(DASH.raf);
  DASH.raf = 0;
  startFig();
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const ov = document.getElementById("overlay");
    if (!ov.hidden && S && S.mode === "playing") closeEvolve();
  }
});

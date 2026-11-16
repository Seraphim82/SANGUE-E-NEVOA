/**
 * Criação da Mesa local: de 2 a 4 heróis no mesmo aparelho.
 */
"use strict";

/** Se a jornada nova que está sendo criada é uma Mesa. */
let draftMesa = false;
/** Heróis em criação: nome, origem e aparência. */
let draftHerois = null;

function renderMesaCreate() {
  const origens = Object.keys(ORIGINS);
  const looks = Object.keys(HERO_LOOKS);
  if (!draftHerois)
    draftHerois = ["Rowan", "Ailsa", "Callum"].map((n, i) => ({
      nome: n,
      origem: origens[i % origens.length],
      look: looks[i % looks.length],
    }));
  const linha = (h, i) => `<div class="mesa-linha">
    <div class="slot-n">Herói ${i + 1}${i === 0 ? " · mestre (voto de minerva)" : ""}</div>
    <label class="field">Nome<input type="text" data-i="${i}" data-campo="nome" value="${esc(h.nome)}" maxlength="24" autocomplete="off"></label>
    <label class="field">Origem<select data-i="${i}" data-campo="origem">${origens.map((o) => `<option value="${o}" ${o === h.origem ? "selected" : ""}>${ORIGINS[o].n}</option>`).join("")}</select></label>
    <label class="field">Aparência<select data-i="${i}" data-campo="look">${looks.map((l) => `<option value="${l}" ${l === h.look ? "selected" : ""}>${HERO_LOOKS[l].n}</option>`).join("")}</select></label>
  </div>`;
  app.innerHTML = `<section class="hero" style="max-width:none">
   <div class="tag">Mesa · criação dos heróis</div>
   <h1 style="font-size:clamp(2rem,5vw,3rem)">Quem vai à jornada?</h1>
   <p class="note">Modo local: todos jogam no mesmo aparelho, passando a vez. As escolhas da história são votadas (empate: decide o mestre), os testes de dados valem se pelo menos metade acertar e cada herói ganha os próprios pontos. Cada um começa com 10 pontos livres para gastar em Personagem.</p>
   <div class="mesa-linhas">${draftHerois.map(linha).join("")}</div>
   <div class="cta"><button class="btn" id="mMais" ${draftHerois.length >= MESA_MAX ? "disabled" : ""}>+ herói</button><button class="btn" id="mMenos" ${draftHerois.length <= MESA_MIN ? "disabled" : ""}>− herói</button></div>
   <div class="cta"><button class="btn primary" id="mComecar">Começar a jornada</button><button class="btn" id="mVoltar">Voltar</button></div>
  </section>`;
  app.querySelectorAll("[data-campo]").forEach((el) => {
    el.addEventListener("input", () => {
      draftHerois[Number(el.dataset.i)][el.dataset.campo] = el.value;
    });
  });
  document.getElementById("mMais").onclick = () => {
    if (draftHerois.length < MESA_MAX)
      draftHerois.push({ nome: `Herói ${draftHerois.length + 1}`, origem: origens[0], look: looks[0] });
    renderMesaCreate();
  };
  document.getElementById("mMenos").onclick = () => {
    if (draftHerois.length > MESA_MIN) draftHerois.pop();
    renderMesaCreate();
  };
  document.getElementById("mVoltar").onclick = () => {
    draftHerois = null;
    showTitle();
  };
  document.getElementById("mComecar").onclick = () => {
    const herois = draftHerois.map((h, i) => {
      const origem = Object.hasOwn(ORIGINS, h.origem) ? h.origem : origens[0];
      const c = newChar(
        String(h.nome || "")
          .trim()
          .slice(0, 24) || `Herói ${i + 1}`,
        origem,
      );
      c.look = Object.hasOwn(HERO_LOOKS, h.look) ? h.look : DEFAULT_LOOK;
      c.mode = "playing";
      return migrate(c);
    });
    draftHerois = null;
    ACH.count("partidas");
    createMesa(herois);
    CHECK = JSON.stringify({ ...state, banner: null });
    go("c1_inicio");
  };
}

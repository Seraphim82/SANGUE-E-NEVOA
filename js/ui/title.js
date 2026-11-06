/**
 * Tela inicial e criação de personagem.
 */
"use strict";

let draftOrigin = "pastor";
function showTitle(fresh) {
  const saved = loadSave();
  S = null;
  document.getElementById("btnEvolve").hidden = true;
  document.getElementById("btnSheet").hidden = true;
  document.getElementById("barSub").textContent = "Escócia · 1296";
  app.innerHTML = `<section class="hero">${artBox}
   <div class="tag">Crônicas das Terras Altas</div>
   <h1>Sangue e Névoa</h1>
   <p class="lede">1296. O rei Eduardo levou a Pedra do Destino para Londres. Os padres dizem que foi um insulto. Os velhos sussurram que a Pedra era um selo, e que desde que ela partiu, as coisas antigas voltaram a andar pela Escócia.</p>
   <p>Você não é cavaleiro nem lorde. É gente comum de uma aldeia às margens do Clyde. Comece com quase nada e ganhe experiência, atributos e o poder que dorme no seu sangue.</p>
   <div class="cta"><button class="btn primary" id="bNew">Nova jornada</button>${saved && !fresh ? `<button class="btn" id="bCont">Continuar: ${esc(saved.name)}, ${title(saved)}</button>` : saved ? `<button class="btn" id="bCont">Continuar jornada salva</button>` : ""}</div>
   <p class="note">Sistema de 3d6: role igual ou abaixo do seu nível para ter sucesso. O progresso fica salvo neste navegador.</p>
  </section>`;
  ART.show("titulo");
  AUD.mood("tema");
  document.getElementById("bNew").onclick = renderOriginPick;
  const bc = document.getElementById("bCont");
  if (bc)
    bc.onclick = () => {
      S = migrate(saved);
      CHECK = JSON.stringify({ ...S, banner: null });
      render();
    };
}
function renderOriginPick() {
  app.innerHTML = `<section class="hero" style="max-width:none">
   <div class="tag">Criação de personagem · 1 de 2</div>
   <h1 style="font-size:clamp(2rem,5vw,3rem)">Quem é você?</h1>
   <label class="field" for="inName">Nome<input type="text" id="inName" value="Rowan" maxlength="24" autocomplete="off"></label>
   <div class="origins">${Object.entries(ORIGINS)
     .map(
       ([k, o]) => `<button class="origin ${k === draftOrigin ? "sel" : ""}" data-o="${k}">
     <h3>${o.n}</h3><p>${o.blurb}</p>
     <div class="stats">ST ${o.attrs.ST} · DX ${o.attrs.DX} · IQ ${o.attrs.IQ} · HT ${o.attrs.HT}</div>
     <p class="note">${Object.entries(o.skills)
       .map(([s, p]) => SK[s].n)
       .join(", ")}</p>
     <p class="note">${o.weapons
       .filter((w) => w !== "punhos")
       .map((w) => WEAPONS[w].n)
       .join(", ")}${o.shield ? ", escudo" : ""} · ${ARMOR[o.armor].n}</p>
   </button>`,
     )
     .join("")}</div>
   <p class="note">Todas as origens custam 60 de 70 pontos (50 iniciais + Pobre e Senso de Dever). Você recebe 10 pontos livres no próximo passo.</p>
   <div class="cta"><button class="btn primary" id="bNext">Distribuir pontos livres</button><button class="btn" id="bBack">Voltar</button></div>
  </section>`;
  app.querySelectorAll(".origin").forEach(
    (b) =>
      (b.onclick = () => {
        draftOrigin = b.dataset.o;
        app.querySelectorAll(".origin").forEach((x) => x.classList.toggle("sel", x === b));
      }),
  );
  document.getElementById("bBack").onclick = () => showTitle();
  document.getElementById("bNext").onclick = () => {
    const nm = (document.getElementById("inName").value || "").trim() || "Rowan";
    S = newChar(nm, draftOrigin);
    openEvolve();
  };
}
function renderCreate() {
  app.innerHTML = "";
  openEvolve();
}

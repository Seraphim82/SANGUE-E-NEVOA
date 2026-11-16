/**
 * Jornadas salvas: três espaços, exportar (arquivo ou código) e importar.
 */
"use strict";

/** Abre a tela de jornadas. Com `paraNova`, a pessoa escolhe onde começar uma jornada nova. */
function openSlots(paraNova = false, aviso = "") {
  const ov = document.getElementById("overlay");
  const cartoes = [];
  for (let n = 1; n <= SAVE_SLOTS; n++) {
    const i = slotInfo(n);
    const estado = !i
      ? "Vazio"
      : i.dead
        ? "Caiu na jornada"
        : i.fim
          ? "História concluída"
          : `Capítulo ${["", "I", "II", "III", "IV", "V", "VI"][i.cap] || "I"}`;
    cartoes.push(`<div class="slot ${i ? "" : "vazio"} ${n === activeSlot ? "ativo" : ""}" data-n="${n}">
      <div class="slot-n">Espaço ${n}${n === activeSlot && i ? " · atual" : ""}</div>
      ${i ? `<div class="slot-nome">${esc(i.name)}</div><div class="slot-sub">${i.mesa ? `Mesa · ${i.mesa} heróis` : esc(i.title)} · ${estado}</div>${i.quando ? `<div class="slot-sub">Salvo em ${new Date(i.quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</div>` : ""}` : `<div class="slot-sub">${estado}</div>`}
      <div class="slot-acoes">${
        paraNova
          ? `<button class="btn primary" data-acao="nova">${i ? "Substituir por uma nova" : "Começar aqui"}</button>`
          : i
            ? `<button class="btn primary" data-acao="jogar">Jogar</button><button class="btn" data-acao="exportar">Exportar</button><button class="btn" data-acao="apagar">Apagar</button>`
            : ""
      }</div></div>`);
  }
  ov.hidden = false;
  ov.innerHTML = `<div class="panel-wrap"><div class="panel" role="dialog" aria-label="Jornadas salvas">
   <div class="eyebrow">Sangue e Névoa</div>
   <h2>${paraNova ? "Onde começar a nova jornada?" : "Jornadas salvas"}</h2>
   ${aviso ? `<p class="note slot-aviso">${aviso}</p>` : ""}
   <div class="slots">${cartoes.join("")}</div>
   <div id="slotExtra"></div>
   ${
     paraNova
       ? ""
       : `<div class="evo-sec"><h3>Importar uma jornada</h3>
   <p class="note">Cole o código que você copiou em outro aparelho, ou escolha o arquivo da jornada. Ela vai para um espaço vazio.</p>
   <textarea id="impCode" rows="3" maxlength="${IMPORT_MAX}" placeholder="SEN1.…" autocomplete="off" spellcheck="false"></textarea>
   <div class="slot-acoes"><label class="btn file-btn">Escolher arquivo<input type="file" id="impFile" accept=".json,application/json,text/plain" hidden></label><button class="btn primary" id="impOk">Importar</button></div>
   <p class="note" id="impMsg" role="status"></p></div>`
   }
   <div class="panel-foot"><button class="btn" id="slotClose">Voltar</button></div>
  </div></div>`;
  ov.scrollTop = 0;
  const q = (s) => ov.querySelector(s);
  q("#slotClose").onclick = () => {
    closeEvolve();
    if (!state || state.mode !== "playing") showTitle();
  };
  ov.querySelectorAll(".slot").forEach((card) => {
    const n = Number(card.dataset.n);
    card.querySelectorAll("[data-acao]").forEach((b) => {
      b.onclick = () => slotAction(n, b.dataset.acao, b);
    });
  });
  const imp = q("#impOk");
  if (imp) {
    q("#impFile").onchange = (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      if (f.size > IMPORT_MAX) {
        q("#impMsg").textContent = "O arquivo é grande demais para ser uma jornada.";
        return;
      }
      f.text().then((t) => {
        q("#impCode").value = t;
        q("#impMsg").textContent = `Arquivo "${f.name}" carregado. Toque em Importar.`;
      });
    };
    imp.onclick = () => {
      const r = importSave(q("#impCode").value);
      if (r.erro) {
        q("#impMsg").textContent = r.erro;
        return;
      }
      const n = emptySlot();
      if (!n) {
        q("#impMsg").textContent = "Os três espaços estão ocupados. Apague uma jornada para importar esta.";
        return;
      }
      const atual = activeSlot;
      setSlot(n);
      const anterior = state;
      state = r.save;
      save();
      state = anterior;
      setSlot(atual);
      openSlots(false, `Jornada de ${esc(r.save.name)} importada para o espaço ${n}.`);
    };
  }
}

function slotAction(n, acao, botao) {
  if (acao === "nova") {
    deleteSlot(n);
    setSlot(n);
    closeEvolve();
    if (draftMesa) renderMesaCreate();
    else renderOriginPick();
    return;
  }
  if (acao === "jogar") {
    const c = loadSave(n);
    if (!c) return openSlots(false, "Essa jornada não pôde ser carregada.");
    setSlot(n);
    state = migrate(c);
    CHECK = JSON.stringify({ ...state, banner: null });
    closeEvolve();
    render();
    return;
  }
  if (acao === "apagar") {
    // Apagar pede um segundo toque, para ninguém perder uma jornada sem querer.
    if (botao.dataset.confirmar !== "1") {
      botao.dataset.confirmar = "1";
      botao.textContent = "Toque de novo para apagar";
      botao.classList.add("perigo");
      return;
    }
    deleteSlot(n);
    if (n === activeSlot && state) state = null;
    openSlots(false, `Espaço ${n} apagado.`);
    return;
  }
  if (acao === "exportar") {
    const codigo = exportCode(n);
    const json = exportSave(n);
    const i = slotInfo(n);
    if (!codigo || !json) return;
    const extra = document.getElementById("slotExtra");
    extra.innerHTML = `<div class="evo-sec"><h3>Exportar a jornada de ${esc(i.name)}</h3>
     <p class="note">Copie o código e cole no outro aparelho (pode mandar pelo WhatsApp para você mesmo), ou baixe o arquivo.</p>
     <textarea id="expCode" rows="3" readonly>${codigo}</textarea>
     <div class="slot-acoes"><button class="btn primary" id="expCopy">Copiar código</button><button class="btn" id="expFile">Baixar arquivo</button></div>
     <p class="note" id="expMsg" role="status"></p></div>`;
    extra.scrollIntoView({ block: "start", behavior: "smooth" });
    document.getElementById("expCopy").onclick = () => {
      const area = document.getElementById("expCode");
      const ok = () => (document.getElementById("expMsg").textContent = "Código copiado.");
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(codigo).then(ok, () => area.select());
      else area.select();
    };
    document.getElementById("expFile").onclick = () => {
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `sangue-e-nevoa-${
        String(i.name)
          .normalize("NFD")
          .replace(/[^\w-]+/g, "")
          .toLowerCase() || "jornada"
      }.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    };
  }
}

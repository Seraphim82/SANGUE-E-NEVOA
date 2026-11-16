/**
 * Tela de conquistas e estatísticas.
 */
"use strict";

/** Progresso das conquistas que somam números entre partidas. */
const ACH_PROGRESS = {
  feericos: (p) => [p.stats.feericos, 25],
  cem: (p) => [p.stats.inimigos, 100],
  estacoes: (p) => [p.finais.length, 4],
};

function openAchievements() {
  const ov = document.getElementById("overlay");
  const p = ACH.perfil;
  const total = Object.keys(ACHIEVEMENTS).length;
  const feitas = Object.keys(p.conquistas).length;
  const grupos = [...new Set(Object.values(ACHIEVEMENTS).map((a) => a.g))];
  const cartao = (k, a) => {
    const quando = p.conquistas[k];
    const prog = ACH_PROGRESS[k] && !quando ? ACH_PROGRESS[k](p) : null;
    return `<div class="ach ${quando ? "on" : ""}">
      <div class="ach-icon" aria-hidden="true">${quando ? "★" : "☆"}</div>
      <div><div class="ach-n">${a.n}</div><div class="ach-d">${a.d}</div>${
        prog
          ? `<div class="ach-prog"><i style="width:${Math.min(100, (prog[0] / prog[1]) * 100)}%"></i><span>${Math.min(prog[0], prog[1])} / ${prog[1]}</span></div>`
          : ""
      }${quando ? `<div class="ach-when">${new Date(quando).toLocaleDateString("pt-BR")}</div>` : ""}</div></div>`;
  };
  const s = p.stats;
  ov.hidden = false;
  ov.innerHTML = `<div class="panel-wrap"><div class="panel" role="dialog" aria-label="Conquistas">
   <div class="eyebrow">Sangue e Névoa</div>
   <h2>Conquistas</h2>
   <div class="pts">${feitas} de ${total}</div>
   <div class="ach-stats">
     <div><b>${s.partidas}</b><span>partidas</span></div>
     <div><b>${s.terminadas}</b><span>até o fim</span></div>
     <div><b>${p.finais.length}/4</b><span>finais vistos</span></div>
     <div><b>${s.inimigos}</b><span>inimigos derrotados</span></div>
     <div><b>${s.feericos}</b><span>criaturas feéricas</span></div>
     <div><b>${s.quedas}</b><span>vezes caído</span></div>
     <div><b>${s.mortes}</b><span>mortes</span></div>
   </div>
   ${grupos
     .map(
       (g) =>
         `<div class="evo-sec"><h3>${g}</h3><div class="ach-grid">${Object.entries(ACHIEVEMENTS)
           .filter(([, a]) => a.g === g)
           .map(([k, a]) => cartao(k, a))
           .join("")}</div></div>`,
     )
     .join("")}
   <div class="panel-foot"><button class="btn" id="achClose">Fechar</button></div>
  </div></div>`;
  ov.scrollTop = 0;
  document.getElementById("achClose").onclick = () => {
    closeEvolve();
    if (!state || state.mode !== "playing") showTitle();
  };
}

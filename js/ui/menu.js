/**
 * Menu do jogo.
 */
"use strict";

function openMenu() {
  const ov = document.getElementById("overlay");
  ov.hidden = false;
  ov.innerHTML = `<div class="panel-wrap"><div class="panel" role="dialog" aria-label="Menu">
   <h2>Menu</h2>
   <p class="note">O jogo salva sozinho a cada cena, neste navegador.</p>
   <div class="choices">
     ${state && state.mode === "playing" ? `<button class="choice" id="mRestart"><span>Reiniciar a cena atual</span><span class="arrow">→</span></button>` : ""}
     <button class="choice" id="mTitle"><span>Tela inicial</span><span class="arrow">→</span></button>
     <button class="choice" id="mRules"><span>Resumo das regras</span><span class="arrow">→</span></button>
     <div class="toggle-row"><span>Música</span><button class="mini ${AUD.pref.music ? "on" : ""}" id="tMusic">${AUD.pref.music ? "Ligada" : "Desligada"}</button></div>
     <div class="toggle-row"><span>Efeitos sonoros</span><button class="mini ${AUD.pref.sfx ? "on" : ""}" id="tSfx">${AUD.pref.sfx ? "Ligados" : "Desligados"}</button></div>
   </div>
   <div id="rules" hidden class="prose" style="margin-top:16px">
     <p><b>Teste:</b> role 3d6. Se o resultado for igual ou menor que o seu nível, é sucesso. 3 e 4 são sempre sucesso crítico; 17 e 18 são sempre falha crítica.</p>
     <p><b>Combate:</b> se você acertar, o inimigo tenta se defender. O dano da arma menos a RD do alvo é multiplicado pelo tipo: contusão ×1, corte ×1,5, perfuração ×2.</p>
     <p><b>Defesa:</b> o jogo usa automaticamente a sua melhor defesa: Esquiva, Aparar ou Bloqueio. Ataque Total dá +4 para acertar, mas tira a sua defesa. Defesa Total dá +2.</p>
     <p><b>Ferido:</b> com 0 PV ou menos, você faz um teste de HT a cada turno para não desmaiar. Abaixo de −PV, você pode morrer.</p>
     <p><b>Ferro:</b> armas de ferro causam +2 de dano em criaturas feéricas. O amuleto de sorveira dá +2 nas defesas contra elas.</p>
   </div>
   <div class="panel-foot"><button class="btn" id="mClose">Fechar</button></div>
  </div></div>`;
  const q = (id) => document.getElementById(id);
  q("mClose").onclick = closeEvolve;
  q("tMusic").onclick = () => {
    AUD.setMusic(!AUD.pref.music);
    syncSound();
    openMenu();
  };
  q("tSfx").onclick = () => {
    AUD.setSfx(!AUD.pref.sfx);
    openMenu();
  };
  q("mTitle").onclick = () => {
    closeEvolve();
    save();
    showTitle();
  };
  q("mRules").onclick = () => {
    q("rules").hidden = !q("rules").hidden;
  };
  const rs = q("mRestart");
  if (rs)
    rs.onclick = () => {
      if (CHECK) {
        state = migrate(JSON.parse(CHECK));
        save();
      }
      closeEvolve();
      render();
    };
}

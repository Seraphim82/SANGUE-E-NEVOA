/**
 * Dicas para quem joga pela primeira vez.
 *
 * Nasceram do primeiro retorno de um jogador: ele demorou a perceber que ganhava pontos para
 * gastar e só descobriu a forja depois do chefe do capítulo. Cada dica aparece uma vez (a marca
 * fica no save) e some quando a pessoa toca em "Entendi" ou abre a tela indicada.
 */
"use strict";

/** Itens em uso (arma e roupa) que a forja já pode melhorar com as moedas e materiais atuais. */
function forgeReady() {
  if (!state || state.mode !== "playing") return [];
  const out = [];
  if (canUpgrade("arma", state.weapon)) out.push({ slot: "arma", k: state.weapon });
  if (canUpgrade("roupa", state.armor)) out.push({ slot: "roupa", k: state.armor });
  return out;
}

/** A dica que ainda falta mostrar, se houver: primeiro a dos pontos, depois a da forja. */
function pendingTip() {
  if (!state || state.mode !== "playing" || state.combat || state.dead) return null;
  if (state.earned > 0 && state.unspent > 0 && !hasFlag("dica_pontos"))
    return {
      flag: "dica_pontos",
      title: "Você ganhou pontos de personagem",
      text: `Você tem <b>${state.unspent} pontos</b> para gastar. Em <b>Personagem → Aprendizados</b> você melhora atributos, aprende perícias, técnicas de combate e magias. Gaste antes das lutas difíceis.`,
      action: "Abrir Aprendizados",
      open: () => openChar("evolucao"),
    };
  // Logo na primeira cena a dica seria ruído: só depois do primeiro progresso.
  const ready = forgeReady();
  if (state.earned > 0 && ready.length && !hasFlag("dica_forja")) {
    const first = ready[0];
    return {
      flag: "dica_forja",
      title: "A forja pode melhorar o seu equipamento",
      text: `Você já tem moedas e materiais para melhorar <b>${itemName(first.slot, first.k)}</b>. Em <b>Personagem</b>, escolha o item e toque em <b>Melhorar na forja</b>: cada nível deixa a arma mais forte ou a roupa mais resistente.`,
      action: "Abrir a forja",
      open: () => openChar(first.slot),
    };
  }
  return null;
}

/** O quadro da dica pendente, para o topo da cena. */
function tipHTML() {
  const tip = pendingTip();
  if (!tip) return "";
  return `<div class="tip" role="note"><div class="tip-title">${tip.title}</div><p>${tip.text}</p>
   <div class="tip-actions"><button class="btn primary" id="tipOpen">${tip.action}</button><button class="btn" id="tipOk">Entendi</button></div></div>`;
}

function bindTip(el) {
  const tip = pendingTip();
  if (!tip) return;
  const done = () => {
    state.flags[tip.flag] = 1;
    save();
  };
  el.querySelector("#tipOk")?.addEventListener("click", () => {
    done();
    render();
  });
  el.querySelector("#tipOpen")?.addEventListener("click", () => {
    done();
    render();
    tip.open();
  });
}

/** Aviso nas escolhas que começam uma luta, quando ainda dá para se preparar. */
function fightHint(choice) {
  if (!choice.fight || !state) return "";
  const parts = [];
  if (state.unspent >= 3) parts.push(`${state.unspent} pontos para gastar`);
  const ready = forgeReady();
  if (ready.length) parts.push(`dá para melhorar ${itemName(ready[0].slot, ready[0].k)} na forja`);
  return parts.length ? `Antes de lutar: ${parts.join(" e ")}` : "";
}

/** O botão Personagem pulsa enquanto a dica dos pontos não foi vista e ganha uma marca quando a forja tem algo pronto. */
function updatePersonagemButton() {
  const btn = document.getElementById("btnEvolve");
  if (!btn || !state) return;
  btn.classList.toggle("pulse", state.unspent > 0 && state.earned > 0 && !hasFlag("dica_pontos"));
  btn.classList.toggle("forge-ready", forgeReady().length > 0);
}

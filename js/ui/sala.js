/**
 * Mesa online (beta): lista de privacidade, sala do mestre e entrada do jogador.
 *
 * Nesta fase a sala só conecta, autentica, aprova e remove jogadores. O jogo em conjunto
 * entra na fase seguinte.
 */
"use strict";

let SALA = null;
let JOGADOR = null;

/** O que será compartilhado. O mestre e cada jogador precisam ler e autorizar antes de seguir. */
const PRIVACIDADE = [
  "O nome, a aparência e a ficha do seu herói ficam visíveis para todos da mesa.",
  "A ligação é direta entre os aparelhos: o seu endereço de internet (IP) fica visível para os outros aparelhos da mesa.",
  "Para os aparelhos se acharem pela internet, o navegador consulta um servidor público do Google (STUN), que vê o seu endereço de internet, mas nada do jogo.",
  "Os códigos de convite e de resposta contêm o seu endereço de internet: mande sempre no privado, nunca num grupo grande.",
  "A contrassenha deve ir por outro caminho (outra conversa, ligação ou pessoalmente), nunca junto com o convite.",
  "Nada é enviado para servidores do jogo, porque eles não existem. A campanha fica só no aparelho do mestre.",
  "O mestre pode recusar ou remover qualquer jogador a qualquer momento.",
];

const ESTADO_LUGAR = {
  livre: "Vazio",
  convite: "Convite pronto, esperando a resposta",
  refazendo: "Preparando um convite novo…",
  autenticando: "Conferindo a contrassenha…",
  pendente: "Quer entrar",
  conectado: "Na mesa",
  desconectado: "Desconectou",
  queimado: "Convite queimado (tentativas erradas)",
};

function copiarTexto(texto, aviso) {
  const ok = () => toast(aviso || "Copiado.");
  if (navigator.clipboard?.writeText)
    navigator.clipboard
      .writeText(texto)
      .then(ok, () => toast("Não consegui copiar: selecione e copie à mão."));
  else toast("Selecione e copie à mão.");
}

function encerrarSala() {
  SALA?.encerrar();
  JOGADOR?.sair();
  SALA = null;
  JOGADOR = null;
}

/** Primeira tela: a lista de privacidade e a autorização obrigatória. */
function openMesaOnline() {
  encerrarSala();
  app.innerHTML = `<section class="hero sala">
   <div class="tag">Mesa online · beta</div>
   <h1 style="font-size:clamp(1.8rem,5vw,2.6rem)">Antes de começar</h1>
   <p>Tudo o que será compartilhado ao jogar numa mesa online:</p>
   <ul class="priv-lista">${PRIVACIDADE.map((p) => `<li>${p}</li>`).join("")}</ul>
   <label class="priv-ok"><input type="checkbox" id="privOk"> Li e autorizo</label>
   <div class="cta"><button class="btn primary" id="salaMestre" disabled>Criar mesa (sou o mestre)</button><button class="btn" id="salaJogador" disabled>Entrar numa mesa</button><button class="btn" id="salaVoltar">Voltar</button></div>
  </section>`;
  const ok = document.getElementById("privOk");
  const mestre = document.getElementById("salaMestre");
  const jogador = document.getElementById("salaJogador");
  ok.onchange = () => {
    mestre.disabled = !ok.checked;
    jogador.disabled = !ok.checked;
  };
  // A autorização é conferida também no clique, e não só pelo botão desativado.
  mestre.onclick = () => ok.checked && abrirSalaMestre();
  jogador.onclick = () => ok.checked && abrirEntrada(true);
  document.getElementById("salaVoltar").onclick = () => {
    encerrarSala();
    showTitle();
  };
}

// ---------------------------------------------------------------- mestre

function abrirSalaMestre() {
  SALA = criarSalaMestre(() => renderSalaMestre());
  renderSalaMestre();
}

function renderSalaMestre() {
  if (!SALA) return;
  // Guarda o que a pessoa está colando, para o redesenho não apagar.
  const rascunho = {};
  app.querySelectorAll("textarea[data-resp]").forEach((t) => (rascunho[t.dataset.resp] = t.value));
  const cartao = (L) => {
    const n = L.n;
    let corpo = "";
    if (["livre", "queimado", "desconectado"].includes(L.estado))
      corpo = `<button class="btn primary" data-acao="convite" data-n="${n}">Gerar convite com contrassenha</button>`;
    else if (L.estado === "convite")
      corpo = `<label class="field">Convite (mande no privado)<textarea readonly rows="3" data-conv="${n}">${esc(L.convite || "")}</textarea></label>
      <button class="btn" data-acao="copiar-convite" data-n="${n}">Copiar convite</button>
      <div class="senha-box"><div class="senha-rot">Contrassenha · mande por outro caminho</div><div class="senha" data-senha="${n}">${esc(L.senha || "")}</div>
      <button class="btn" data-acao="copiar-senha" data-n="${n}">Copiar contrassenha</button></div>
      <label class="field">Cole aqui a resposta do jogador<textarea rows="3" data-resp="${n}" maxlength="${CODIGO_MAX * 2}" spellcheck="false" autocomplete="off"></textarea></label>
      <button class="btn primary" data-acao="conectar" data-n="${n}">Conectar</button>`;
    else if (L.estado === "pendente")
      corpo = `<p class="pedido"><b>${esc(L.nome)}</b> quer entrar.${L.recupera ? " A ficha confere: é o mesmo jogador que já estava neste lugar." : L.fichaApresentada ? " Atenção: a ficha apresentada não é a deste lugar." : ""}</p>
      <button class="btn primary" data-acao="aprovar" data-n="${n}">Aprovar</button><button class="btn" data-acao="recusar" data-n="${n}">Recusar</button>`;
    else if (L.estado === "conectado")
      corpo = `<p><b>${esc(L.nome)}</b> está na mesa.${L.ping !== null ? ` Ping: ${L.ping} ms.` : ""}</p>
      <button class="btn" data-acao="ping" data-n="${n}">Testar ping</button><button class="btn perigo" data-acao="remover" data-n="${n}">Remover da mesa</button>`;
    return `<div class="slot lugar" data-lugar="${n}"><div class="slot-n">Lugar ${n}</div>
      <div class="slot-sub" data-estado="${n}">${ESTADO_LUGAR[L.estado] || ""}${L.falhas ? ` · ${L.falhas} tentativa(s) errada(s)` : ""}</div>
      ${L.ultimaFalha && L.estado !== "conectado" ? `<div class="slot-sub aviso">Último aviso: ${esc(L.ultimaFalha)}</div>` : ""}
      <div class="slot-acoes">${corpo}</div><p class="note" data-msg="${n}" role="status"></p></div>`;
  };
  app.innerHTML = `<section class="hero sala">
   <div class="tag">Mesa online · você é o mestre</div>
   <h1 style="font-size:clamp(1.8rem,5vw,2.6rem)">Sala de espera</h1>
   <p class="note">Gere um convite para cada amigo. O convite só pode ser usado uma vez. A contrassenha vai por outro caminho. Depois de conectar, você aprova quem entra.</p>
   <div class="slots">${Object.values(SALA.lugares).map(cartao).join("")}</div>
   <div class="cta"><button class="btn" id="salaFechar">Fechar a sala</button></div>
  </section>`;
  for (const [n, v] of Object.entries(rascunho)) {
    const t = app.querySelector(`textarea[data-resp="${n}"]`);
    if (t) t.value = v;
  }
  app.querySelectorAll("[data-acao]").forEach((b) => {
    const n = Number(b.dataset.n);
    b.onclick = () => acaoMestre(b.dataset.acao, n, b);
  });
  document.getElementById("salaFechar").onclick = () => {
    encerrarSala();
    showTitle();
  };
}

async function acaoMestre(acao, n, botao) {
  if (!SALA || !Number.isInteger(n) || !SALA.lugares[n]) return;
  const L = SALA.lugares[n];
  const msg = (t) => {
    const p = app.querySelector(`[data-msg="${n}"]`);
    if (p) p.textContent = t;
  };
  if (acao === "convite") {
    botao.disabled = true;
    msg("Preparando o convite…");
    await SALA.criarConvite(n);
  } else if (acao === "copiar-convite") copiarTexto(L.convite || "", "Convite copiado. Mande no privado.");
  else if (acao === "copiar-senha")
    copiarTexto(L.senha || "", "Contrassenha copiada. Mande por outro caminho.");
  else if (acao === "conectar") {
    const t = app.querySelector(`textarea[data-resp="${n}"]`);
    const erro = await SALA.receberResposta(n, t ? t.value : "");
    if (erro) msg(erro);
  } else if (acao === "aprovar") await SALA.aprovar(n);
  else if (acao === "recusar") SALA.recusar(n);
  else if (acao === "remover") SALA.remover(n);
  else if (acao === "ping") SALA.ping(n);
}

// ---------------------------------------------------------------- jogador

const ESTADO_JOGADOR = {
  inicio: "",
  esperando: "Resposta pronta. Mande para o mestre no privado e espere ele conectar.",
  autenticando: "Conectado. Conferindo a contrassenha…",
  aguardando: "Contrassenha confirmada. Esperando o mestre aprovar a sua entrada…",
  conectado: "Você está na mesa.",
  recusado: "Entrada recusada.",
  removido: "Você foi removido da mesa.",
  desconectado: "A conexão caiu. Peça um convite novo ao mestre.",
};

function abrirEntrada(autorizado) {
  if (autorizado !== true) return openMesaOnline();
  JOGADOR = criarJogador(() => renderEntrada());
  JOGADOR.autorizado = true;
  renderEntrada();
}

function renderEntrada() {
  if (!JOGADOR) return;
  const J = JOGADOR;
  const campos = {};
  app.querySelectorAll("[data-campo]").forEach((c) => (campos[c.dataset.campo] = c.value));
  const formulario = ["inicio", "recusado", "desconectado", "removido"].includes(J.estado);
  app.innerHTML = `<section class="hero sala">
   <div class="tag">Mesa online · entrar numa mesa</div>
   <h1 style="font-size:clamp(1.8rem,5vw,2.6rem)">Entrar na mesa</h1>
   ${
     formulario
       ? `<label class="field">Convite que o mestre mandou<textarea rows="3" data-campo="convite" id="jConvite" maxlength="${CODIGO_MAX * 2}" spellcheck="false" autocomplete="off"></textarea></label>
   <label class="field">Contrassenha (o mestre manda por outro caminho)<input type="text" data-campo="senha" id="jSenha" maxlength="80" autocomplete="off" spellcheck="false"></label>
   <label class="field">Seu nome na mesa<input type="text" data-campo="nome" id="jNome" maxlength="${MESA_NET.nomeMax}" autocomplete="off"></label>
   <div class="cta"><button class="btn primary" id="jGerar">Gerar a resposta</button></div>`
       : ""
   }
   ${J.resposta && J.estado === "esperando" ? `<label class="field">Resposta para o mestre (mande no privado)<textarea readonly rows="3" id="jResposta">${esc(J.resposta)}</textarea></label><button class="btn" id="jCopiar">Copiar resposta</button>` : ""}
   <p class="note sala-estado" id="jEstado" role="status">${esc(J.erro || ESTADO_JOGADOR[J.estado] || "")}${J.estado === "conectado" && J.recuperado ? " Você voltou para o mesmo lugar." : ""}${J.estado === "conectado" && J.pingMs !== null ? ` Ping: ${J.pingMs} ms.` : ""}</p>
   ${J.estado === "conectado" ? `<div class="cta"><button class="btn" id="jPing">Testar ping</button><button class="btn" id="jSair">Sair da mesa</button></div>` : ""}
   <div class="cta"><button class="btn" id="jVoltar">Voltar</button></div>
  </section>`;
  for (const [k, v] of Object.entries(campos)) {
    const c = app.querySelector(`[data-campo="${k}"]`);
    if (c) c.value = v;
  }
  const q = (id) => document.getElementById(id);
  if (q("jGerar"))
    q("jGerar").onclick = async () => {
      q("jGerar").disabled = true;
      q("jEstado").textContent = "Preparando a resposta…";
      const r = await J.responder(
        q("jConvite").value,
        q("jSenha").value,
        q("jNome").value,
        J.autorizado === true,
      );
      if (r.erro) {
        J.erro = r.erro;
        renderEntrada();
        return;
      }
      J.erro = "";
      J.resposta = r.resposta;
      renderEntrada();
    };
  if (q("jCopiar"))
    q("jCopiar").onclick = () => copiarTexto(J.resposta, "Resposta copiada. Mande para o mestre no privado.");
  if (q("jPing")) q("jPing").onclick = () => J.ping();
  if (q("jSair")) q("jSair").onclick = () => J.sair();
  q("jVoltar").onclick = () => {
    encerrarSala();
    showTitle();
  };
}

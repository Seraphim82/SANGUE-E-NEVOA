/**
 * Mesa online sem servidor: conexão direta (WebRTC) entre o aparelho do mestre e o de cada
 * jogador, com convite de uso único, contrassenha mandada por outro caminho e aprovação do mestre.
 *
 * Sinalização manual: o mestre gera um CONVITE (SENM1.…) por lugar; o jogador cola o convite,
 * digita a contrassenha e devolve uma RESPOSTA (SENR1.…). Nenhum servidor do jogo participa.
 *
 * Autenticação amarrada à conexão: depois que o canal cifrado (DTLS) abre, os dois lados provam
 * que conhecem a contrassenha com HMAC sobre uma transcrição que inclui as impressões digitais
 * DTLS dos dois aparelhos. Quem tem só o convite não entra; quem troca os códigos no meio da
 * conversa não consegue produzir a prova, porque as impressões digitais seriam outras.
 *
 * Toda mensagem recebida é suspeita: tamanho máximo, JSON válido, tipo conhecido para aquele
 * momento, campos conferidos e limite de mensagens por segundo e por minuto.
 */
"use strict";

const MESA_NET = {
  versao: 1,
  /** Lugares de jogadores além do mestre. */
  lugares: 3,
  /** Tamanho máximo de uma mensagem pela rede (caracteres). */
  msgMax: 16384,
  porSegundo: 20,
  porMinuto: 300,
  /** Estouros do limite de taxa até desconectar. */
  estourosMax: 3,
  /** Mensagens inválidas (JSON quebrado, tipo desconhecido, campos errados) até desconectar. */
  invalidasMax: 10,
  /** Tentativas falhas de contrassenha até queimar o convite do lugar. */
  falhasMax: 3,
  /** Tempo máximo esperando a coleta de endereços (ICE). */
  iceEsperaMs: 4000,
  /** Tempo máximo para a autenticação terminar depois que o canal abre. */
  authEsperaMs: 15000,
  sdpMax: 8000,
  nomeMax: 24,
};

/** Servidores de STUN: só o público do Google. Os testes usam uma lista vazia (loopback). */
function iceServers() {
  if (Array.isArray(window.__senTesteIce)) return window.__senTesteIce;
  return [{ urls: "stun:stun.l.google.com:19302" }];
}

const B64_16 = /^[A-Za-z0-9_-]{22}$/; // 16 bytes em base64url
const B64_32 = /^[A-Za-z0-9_-]{43}$/; // 32 bytes (HMAC-SHA-256)
const DIGITAL = /a=fingerprint:sha-256 ((?:[0-9A-F]{2}:){31}[0-9A-F]{2})/i;

/** A impressão digital DTLS de uma SDP, ou null. */
function digitalDaSdp(sdp) {
  const m = DIGITAL.exec(String(sdp || ""));
  return m ? m[1].toUpperCase() : null;
}

/** Confere uma SDP vinda de fora: texto curto, formato de SDP e com impressão digital. */
function sdpValida(sdp) {
  return (
    typeof sdp === "string" &&
    sdp.length <= MESA_NET.sdpMax &&
    sdp.startsWith("v=0") &&
    /\r?\nm=application /.test(sdp) &&
    !!digitalDaSdp(sdp)
  );
}

/** Nome de jogador vindo da rede: texto curto, sem caracteres de controle. */
function nomeValido(n) {
  return (
    typeof n === "string" &&
    n.trim().length >= 1 &&
    n.length <= MESA_NET.nomeMax &&
    ![...n].some((ch) => ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127)
  );
}

/**
 * Esquema de cada tipo de mensagem: os campos permitidos e como conferir cada um.
 * Mensagem com campo a mais, a menos ou de tipo errado é inválida.
 */
const ESQUEMAS = {
  desafio: { nM: (v) => B64_16.test(v) },
  prova: { nJ: (v) => B64_16.test(v), mac: (v) => B64_32.test(v) },
  "prova-mestre": { mac: (v) => B64_32.test(v) },
  entrar: { nome: nomeValido, ficha: (v) => v === null || B64_16.test(v) },
  aprovado: {
    ficha: (v) => B64_16.test(v),
    lugar: (v) => Number.isInteger(v) && v >= 1 && v <= MESA_NET.lugares,
    recuperado: (v) => typeof v === "boolean",
  },
  recusado: { motivo: (v) => typeof v === "string" && v.length <= 80 },
  removido: {},
  sair: {},
  ping: { id: (v) => Number.isInteger(v) && v >= 0 && v < 1e9 },
  pong: { id: (v) => Number.isInteger(v) && v >= 0 && v < 1e9 },
};

/** Lê e confere uma mensagem. Devolve o objeto ou null (e nunca lança). */
function lerMensagem(bruta, permitidos) {
  if (typeof bruta !== "string" || bruta.length > MESA_NET.msgMax) return null;
  let m;
  try {
    m = JSON.parse(bruta);
  } catch {
    return null;
  }
  if (!m || typeof m !== "object" || Array.isArray(m) || Object.getPrototypeOf(m) !== Object.prototype)
    return null;
  const t = m.t;
  if (typeof t !== "string" || !Object.hasOwn(ESQUEMAS, t) || !permitidos.includes(t)) return null;
  const esquema = ESQUEMAS[t];
  const chaves = Object.keys(m).filter((k) => k !== "t");
  if (chaves.length !== Object.keys(esquema).length) return null;
  for (const k of chaves) if (!Object.hasOwn(esquema, k) || !esquema[k](m[k])) return null;
  return m;
}

/** Limite de taxa por janela de um segundo e de um minuto. */
function novoLimite() {
  return { seg: [], min: [], estouros: 0, invalidas: 0 };
}
function dentroDoLimite(lim, agora = performance.now()) {
  lim.seg = lim.seg.filter((t) => agora - t < 1000);
  lim.min = lim.min.filter((t) => agora - t < 60000);
  if (lim.seg.length >= MESA_NET.porSegundo || lim.min.length >= MESA_NET.porMinuto) {
    lim.estouros++;
    return false;
  }
  lim.seg.push(agora);
  lim.min.push(agora);
  return true;
}

/** Espera a coleta de endereços (ICE) terminar, com tempo limite. */
function esperarIce(pc) {
  return new Promise((ok) => {
    if (pc.iceGatheringState === "complete") return ok();
    const fim = () => {
      clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", mudou);
      ok();
    };
    const mudou = () => pc.iceGatheringState === "complete" && fim();
    const timer = setTimeout(fim, MESA_NET.iceEsperaMs);
    pc.addEventListener("icegatheringstatechange", mudou);
  });
}

const transcricao = (mesaId, lugar, dM, dJ) => `SEN-MESA-1|${mesaId}|${lugar}|${dM}|${dJ}`;

// ---------------------------------------------------------------- mestre

/**
 * A sala do mestre. Guarda os lugares só em memória; no navegador ficam apenas a identidade da
 * mesa e o resumo (SHA-256) da ficha de cada jogador aprovado, para reconhecê-lo ao reconectar.
 */
function criarSalaMestre(aoMudar = () => {}) {
  const CHAVE_FICHAS = "sen-mesa-mestre";
  let guardado = { mesaId: NET.paraB64(NET.aleatorios(16)), fichas: {} };
  try {
    const g = JSON.parse(localStorage.getItem(CHAVE_FICHAS) || "null");
    if (g && typeof g === "object" && B64_16.test(g.mesaId) && g.fichas && typeof g.fichas === "object") {
      const fichas = {};
      for (let n = 1; n <= MESA_NET.lugares; n++) if (B64_32.test(g.fichas[n])) fichas[n] = g.fichas[n];
      guardado = { mesaId: g.mesaId, fichas };
    }
  } catch {
    // Nada guardado ou ilegível: mesa nova.
  }
  const persistir = () => {
    try {
      localStorage.setItem(CHAVE_FICHAS, JSON.stringify(guardado));
    } catch {
      // Sem armazenamento: a reconexão pelo mesmo lugar não vai funcionar depois de recarregar.
    }
  };
  persistir();

  const lugares = {};
  for (let n = 1; n <= MESA_NET.lugares; n++)
    lugares[n] = { n, estado: "livre", falhas: 0, respostas: new Set(), nome: "", ping: null };

  const avisar = () => aoMudar(sala);

  function fechar(L, estado) {
    clearTimeout(L.authTimer);
    try {
      L.dc?.close();
    } catch {
      // O canal já pode estar fechado.
    }
    try {
      L.pc?.close();
    } catch {
      // A conexão já pode estar fechada.
    }
    L.pc = null;
    L.dc = null;
    L.estado = estado;
    avisar();
  }

  function enviar(L, obj) {
    if (L.dc && L.dc.readyState === "open") L.dc.send(JSON.stringify(obj));
  }

  /** Prepara (ou refaz) a oferta de um lugar, mantendo a contrassenha e o sal do lugar. */
  async function prepararOferta(L) {
    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    const dc = pc.createDataChannel("mesa", { ordered: true });
    L.pc = pc;
    L.dc = dc;
    L.lim = novoLimite();
    L.autenticado = false;
    dc.onopen = () => iniciarAuth(L, pc);
    dc.onmessage = (e) => receber(L, pc, e.data);
    dc.onclose = () => {
      if (L.pc === pc && ["conectado", "pendente", "autenticando"].includes(L.estado))
        fechar(L, "desconectado");
    };
    await pc.setLocalDescription(await pc.createOffer());
    await esperarIce(pc);
    L.convite = await NET.empacotar("SENM1", {
      v: MESA_NET.versao,
      mesaId: guardado.mesaId,
      lugar: L.n,
      sal: NET.paraB64(L.sal),
      oferta: pc.localDescription.sdp,
    });
    L.estado = "convite";
    avisar();
  }

  /** Cria o convite de um lugar com uma contrassenha nova (só em memória). */
  async function criarConvite(n) {
    const L = lugares[n];
    if (!L || ["conectado", "pendente", "autenticando"].includes(L.estado)) return null;
    if (L.pc) fechar(L, "livre");
    L.senha = NET.novaContrassenha();
    L.sal = NET.aleatorios(16);
    L.chave = await NET.derivarChave(L.senha, L.sal);
    L.falhas = 0;
    L.respostas = new Set();
    L.nome = "";
    await prepararOferta(L);
    return { convite: L.convite, senha: L.senha };
  }

  /** Recebe a resposta de um jogador. Devolve uma mensagem de erro, ou "" se aceitou para autenticar. */
  async function receberResposta(n, codigo) {
    const L = lugares[n];
    if (!L) return "Lugar inválido.";
    if (L.estado === "queimado")
      return "Este convite foi queimado depois de tentativas erradas. Gere um convite novo.";
    if (L.estado !== "convite" || !L.pc) return "Este lugar não está esperando resposta.";
    let r;
    try {
      r = await NET.desempacotar("SENR1", codigo);
    } catch {
      return "Não reconheci essa resposta.";
    }
    const campos = Object.keys(r).sort().join(",");
    if (campos !== "lugar,mesaId,resposta,v" || r.v !== MESA_NET.versao)
      return "Resposta em formato inesperado.";
    if (r.mesaId !== guardado.mesaId || r.lugar !== n) return "Essa resposta é de outro convite.";
    if (!sdpValida(r.resposta)) return "Resposta adulterada.";
    const resumo = await NET.sha256(r.resposta);
    if (L.respostas.has(resumo)) return "Essa resposta já foi usada.";
    L.respostas.add(resumo);
    try {
      await L.pc.setRemoteDescription({ type: "answer", sdp: r.resposta });
    } catch {
      return "Resposta adulterada.";
    }
    L.estado = "autenticando";
    // Se o canal não abrir ou a prova não chegar a tempo, conta como tentativa falha.
    L.authTimer = setTimeout(() => !L.autenticado && falhou(L, "tempo esgotado"), MESA_NET.authEsperaMs);
    avisar();
    return "";
  }

  /** Uma tentativa falhou: fecha, conta e, no limite, queima o convite. */
  function falhou(L, motivo) {
    enviar(L, { t: "recusado", motivo });
    L.falhas++;
    L.ultimaFalha = motivo;
    if (L.falhas >= MESA_NET.falhasMax) {
      L.senha = null;
      L.chave = null;
      L.convite = null;
      fechar(L, "queimado");
      return;
    }
    fechar(L, "refazendo");
    // Mesma contrassenha, oferta nova: o convite antigo não serve mais (cada oferta aceita uma resposta).
    prepararOferta(L).catch(() => fechar(L, "livre"));
  }

  async function iniciarAuth(L, pc) {
    if (L.pc !== pc) return;
    L.nM = NET.paraB64(NET.aleatorios(16));
    L.permitidos = ["prova"];
    enviar(L, { t: "desafio", nM: L.nM });
  }

  async function receber(L, pc, bruta) {
    if (L.pc !== pc) return;
    if (!dentroDoLimite(L.lim)) {
      if (L.lim.estouros >= MESA_NET.estourosMax) remover(L.n, "enxurrada de mensagens");
      return;
    }
    const m = lerMensagem(bruta, L.permitidos || []);
    if (!m) {
      L.lim.invalidas++;
      if (L.lim.invalidas >= MESA_NET.invalidasMax || !L.autenticado) {
        if (!L.autenticado) return falhou(L, "mensagem inválida");
        remover(L.n, "mensagens inválidas");
      }
      return;
    }
    if (m.t === "prova") {
      const dM = digitalDaSdp(pc.localDescription?.sdp);
      const dJ = digitalDaSdp(pc.remoteDescription?.sdp);
      if (!dM || !dJ || !L.chave) return falhou(L, "conexão inválida");
      const tr = transcricao(guardado.mesaId, L.n, dM, dJ);
      const esperado = await NET.hmac(L.chave, `${tr}|J|${L.nM}|${m.nJ}`);
      let recebido;
      try {
        recebido = NET.deB64(m.mac);
      } catch {
        return falhou(L, "prova inválida");
      }
      if (!NET.iguais(esperado, recebido)) return falhou(L, "contrassenha errada");
      // Uso único: daqui em diante este convite e esta contrassenha não servem para mais ninguém.
      L.autenticado = true;
      clearTimeout(L.authTimer);
      const minha = await NET.hmac(L.chave, `${tr}|M|${L.nM}|${m.nJ}`);
      L.senha = null;
      L.chave = null;
      L.convite = null;
      L.permitidos = ["entrar"];
      enviar(L, { t: "prova-mestre", mac: NET.paraB64(minha) });
      avisar();
      return;
    }
    if (m.t === "entrar") {
      L.nome = m.nome.trim();
      L.fichaApresentada = m.ficha;
      L.estado = "pendente";
      L.recupera = false;
      if (m.ficha && guardado.fichas[L.n]) L.recupera = (await NET.sha256(m.ficha)) === guardado.fichas[L.n];
      L.permitidos = ["sair", "ping", "pong"];
      avisar();
      return;
    }
    if (m.t === "ping") return enviar(L, { t: "pong", id: m.id });
    if (m.t === "pong") {
      if (L.pingId === m.id) L.ping = Math.round(performance.now() - L.pingInicio);
      avisar();
      return;
    }
    if (m.t === "sair") fechar(L, "livre");
  }

  /** O mestre aprova a entrada: gera a ficha de lugar (ou reconhece a ficha do mesmo jogador). */
  async function aprovar(n) {
    const L = lugares[n];
    if (!L || L.estado !== "pendente") return;
    let ficha;
    if (L.recupera) ficha = L.fichaApresentada;
    else {
      ficha = NET.paraB64(NET.aleatorios(16));
      guardado.fichas[n] = await NET.sha256(ficha);
      persistir();
    }
    enviar(L, { t: "aprovado", ficha, lugar: n, recuperado: !!L.recupera });
    L.estado = "conectado";
    avisar();
  }

  function recusar(n) {
    const L = lugares[n];
    if (!L || L.estado !== "pendente") return;
    enviar(L, { t: "recusado", motivo: "o mestre recusou" });
    fechar(L, "livre");
  }

  /** Banimento: fecha a conexão e revoga a ficha do lugar. */
  function remover(n, motivo = "removido pelo mestre") {
    const L = lugares[n];
    if (!L) return;
    enviar(L, { t: "removido" });
    delete guardado.fichas[n];
    persistir();
    L.ultimaFalha = motivo;
    L.senha = null;
    L.chave = null;
    L.convite = null;
    fechar(L, "livre");
  }

  function ping(n) {
    const L = lugares[n];
    if (!L || L.estado !== "conectado") return;
    L.pingId = Math.floor(Math.random() * 1e8);
    L.pingInicio = performance.now();
    enviar(L, { t: "ping", id: L.pingId });
  }

  function encerrar() {
    for (let n = 1; n <= MESA_NET.lugares; n++) if (lugares[n].pc) fechar(lugares[n], "livre");
  }

  const sala = {
    get mesaId() {
      return guardado.mesaId;
    },
    lugares,
    criarConvite,
    receberResposta,
    aprovar,
    recusar,
    remover,
    ping,
    encerrar,
  };
  return sala;
}

// ---------------------------------------------------------------- jogador

const CHAVE_FICHA_JOGADOR = "sen-mesa-ficha";

/** A ficha guardada pelo jogador para uma mesa e um lugar, ou null. */
function fichaGuardada(mesaId, lugar) {
  try {
    const g = JSON.parse(localStorage.getItem(CHAVE_FICHA_JOGADOR) || "null");
    if (g && g.mesaId === mesaId && g.lugar === lugar && B64_16.test(g.ficha)) return g.ficha;
  } catch {
    // Nada guardado ou ilegível.
  }
  return null;
}

/**
 * O lado do jogador. Recebe o convite, a contrassenha e o nome, e devolve a resposta para o
 * mestre. Só funciona com `autorizado` verdadeiro (a lista de privacidade foi aceita).
 */
function criarJogador(aoMudar = () => {}) {
  const J = { estado: "inicio", erro: "", pingMs: null };
  const avisar = () => aoMudar(J);
  let pc = null;
  let dc = null;
  let lim = novoLimite();
  let chave = null;
  let convite = null;
  let nM = null;
  let nJ = null;
  let nome = "";
  let authTimer = 0;
  let permitidos = [];

  function fechar(estado, erro = "") {
    clearTimeout(authTimer);
    try {
      dc?.close();
    } catch {
      // Já fechado.
    }
    try {
      pc?.close();
    } catch {
      // Já fechada.
    }
    pc = null;
    dc = null;
    chave = null;
    J.estado = estado;
    J.erro = erro;
    avisar();
  }

  const enviar = (obj) => dc && dc.readyState === "open" && dc.send(JSON.stringify(obj));

  /** Gera a resposta para o mestre. Devolve { resposta } ou { erro }. */
  async function responder(codigoConvite, senha, nomeJogador, autorizado) {
    if (autorizado !== true) return { erro: "É preciso ler e autorizar a lista de privacidade." };
    if (!nomeValido(String(nomeJogador || "").trim())) return { erro: "Escolha um nome de 1 a 24 letras." };
    if (!NET.normalizarSenha(senha)) return { erro: "Digite a contrassenha que o mestre mandou." };
    let c;
    try {
      c = await NET.desempacotar("SENM1", codigoConvite);
    } catch {
      return { erro: "Não reconheci esse convite." };
    }
    const campos = Object.keys(c).sort().join(",");
    if (
      campos !== "lugar,mesaId,oferta,sal,v" ||
      c.v !== MESA_NET.versao ||
      !B64_16.test(c.mesaId) ||
      !Number.isInteger(c.lugar) ||
      c.lugar < 1 ||
      c.lugar > MESA_NET.lugares ||
      !B64_16.test(c.sal) ||
      !sdpValida(c.oferta)
    )
      return { erro: "Convite adulterado ou de outra versão." };
    if (pc) fechar("inicio");
    convite = c;
    nome = String(nomeJogador).trim();
    chave = await NET.derivarChave(senha, NET.deB64(c.sal));
    pc = new RTCPeerConnection({ iceServers: iceServers() });
    lim = novoLimite();
    permitidos = ["desafio", "recusado"];
    const meu = pc;
    pc.ondatachannel = (e) => {
      if (pc !== meu || e.channel.label !== "mesa") return;
      dc = e.channel;
      dc.onmessage = (ev) => receber(meu, ev.data);
      dc.onclose = () => {
        if (pc === meu && J.estado !== "recusado" && J.estado !== "removido") fechar("desconectado");
      };
    };
    try {
      await pc.setRemoteDescription({ type: "offer", sdp: c.oferta });
      await pc.setLocalDescription(await pc.createAnswer());
    } catch {
      fechar("inicio");
      return { erro: "Convite adulterado." };
    }
    await esperarIce(pc);
    const resposta = await NET.empacotar("SENR1", {
      v: MESA_NET.versao,
      mesaId: c.mesaId,
      lugar: c.lugar,
      resposta: pc.localDescription.sdp,
    });
    J.estado = "esperando";
    J.lugar = c.lugar;
    J.mesaId = c.mesaId;
    authTimer = setTimeout(
      () =>
        J.estado === "esperando" && fechar("inicio", "O mestre não conectou a tempo. Peça um convite novo."),
      10 * 60 * 1000,
    );
    avisar();
    return { resposta };
  }

  async function receber(meu, bruta) {
    if (pc !== meu) return;
    // Avisos de encerramento (recusado, removido) passam mesmo acima do limite: perdê-los faria
    // o jogador achar que a conexão caiu, quando na verdade foi recusado ou removido.
    const controle = lerMensagem(
      bruta,
      ["recusado", "removido"].filter((t) => permitidos.includes(t)),
    );
    if (!controle && !dentroDoLimite(lim)) {
      if (lim.estouros >= MESA_NET.estourosMax) fechar("recusado", "O mestre mandou mensagens demais.");
      return;
    }
    const m = lerMensagem(bruta, permitidos);
    if (!m) {
      lim.invalidas++;
      if (lim.invalidas >= MESA_NET.invalidasMax || J.estado !== "conectado")
        fechar("recusado", "Mensagem inválida do outro lado.");
      return;
    }
    if (m.t === "recusado")
      return fechar(
        "recusado",
        m.motivo === "contrassenha errada" ? "Contrassenha errada." : "O mestre recusou a entrada.",
      );
    if (m.t === "removido") return fechar("removido", "O mestre removeu você da mesa.");
    if (m.t === "desafio") {
      const dM = digitalDaSdp(pc.remoteDescription?.sdp);
      const dJ = digitalDaSdp(pc.localDescription?.sdp);
      if (!dM || !dJ || !chave) return fechar("recusado", "Conexão inválida.");
      nM = m.nM;
      nJ = NET.paraB64(NET.aleatorios(16));
      const tr = transcricao(convite.mesaId, convite.lugar, dM, dJ);
      const mac = await NET.hmac(chave, `${tr}|J|${nM}|${nJ}`);
      J.estado = "autenticando";
      permitidos = ["prova-mestre", "recusado"];
      authTimer = setTimeout(
        () => J.estado === "autenticando" && fechar("recusado", "O mestre não confirmou a contrassenha."),
        MESA_NET.authEsperaMs,
      );
      enviar({ t: "prova", nJ, mac: NET.paraB64(mac) });
      avisar();
      return;
    }
    if (m.t === "prova-mestre") {
      const dM = digitalDaSdp(pc.remoteDescription?.sdp);
      const dJ = digitalDaSdp(pc.localDescription?.sdp);
      const tr = transcricao(convite.mesaId, convite.lugar, dM, dJ);
      const esperado = await NET.hmac(chave, `${tr}|M|${nM}|${nJ}`);
      let recebido;
      try {
        recebido = NET.deB64(m.mac);
      } catch {
        return fechar("recusado", "O outro lado não provou a contrassenha.");
      }
      // Se o mestre não prova a mesma contrassenha, quem está do outro lado não é o mestre.
      if (!NET.iguais(esperado, recebido))
        return fechar("recusado", "O outro lado não provou a contrassenha.");
      clearTimeout(authTimer);
      chave = null;
      permitidos = ["aprovado", "recusado", "removido"];
      J.estado = "aguardando";
      enviar({ t: "entrar", nome, ficha: fichaGuardada(convite.mesaId, convite.lugar) });
      avisar();
      return;
    }
    if (m.t === "aprovado") {
      if (m.lugar !== convite.lugar) return fechar("recusado", "Lugar inesperado.");
      try {
        localStorage.setItem(
          CHAVE_FICHA_JOGADOR,
          JSON.stringify({ mesaId: convite.mesaId, lugar: m.lugar, ficha: m.ficha }),
        );
      } catch {
        // Sem armazenamento: a reconexão vai pedir aprovação de novo.
      }
      J.recuperado = m.recuperado;
      J.estado = "conectado";
      permitidos = ["removido", "ping", "pong"];
      avisar();
      return;
    }
    if (m.t === "ping") return enviar({ t: "pong", id: m.id });
    if (m.t === "pong") {
      if (J.pingId === m.id) J.pingMs = Math.round(performance.now() - J.pingInicio);
      avisar();
    }
  }

  function ping() {
    if (J.estado !== "conectado") return;
    J.pingId = Math.floor(Math.random() * 1e8);
    J.pingInicio = performance.now();
    enviar({ t: "ping", id: J.pingId });
  }

  function sair() {
    enviar({ t: "sair" });
    fechar("inicio");
  }

  /** Só para os testes: manda texto cru pelo canal, como um jogador mal-intencionado faria. */
  function _enviarCru(texto) {
    if (dc && dc.readyState === "open") dc.send(texto);
  }

  Object.assign(J, { responder, ping, sair, _enviarCru });
  return J;
}

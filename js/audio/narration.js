/**
 * Narração das cenas.
 *
 * Cada parágrafo de cena tem um áudio próprio, gravado antes (tools/gerar_narracao.py) e
 * guardado em audio/narracao/<chave>.mp3. A chave é um resumo (hash) do texto exato do
 * parágrafo, então as frases que mudam conforme as escolhas são só parágrafos a mais. Ao
 * entrar numa cena, o narrador toca em sequência os parágrafos que têm áudio; o que não tiver
 * fica em silêncio. Tocar numa escolha interrompe a narração, e a música abaixa enquanto ele fala.
 *
 * O nome do herói muda a cada partida, então o narrador não o diz: `narrationText()` troca o
 * nome por um marcador e reescreve as frases para contorná-lo.
 */
"use strict";

/** Marcador que ocupa o lugar do nome do herói no texto narrado. */
const NAME_MARK = "§NOME§";

/**
 * O texto de uma cena dividido nos parágrafos que o narrador lê, sem marcação. Recebe o
 * texto já montado (com NAME_MARK no lugar do nome) e o título da cena.
 */
function narrationParagraphs(title, text) {
  const plain = String(text)
    .replace(/<li>/g, "\n\n")
    .replace(/<\/li>/g, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1");
  const out = [];
  if (title) out.push(`${String(title).trim()}.`);
  for (const p of plain.split(/\n\s*\n/)) {
    let t = p.replace(/\s+/g, " ").trim();
    if (!t) continue;
    // Números que mudam a cada partida (moedas, pontos) ficam na tela, não na voz:
    // senão cada partida pediria um áudio novo.
    t = t
      .replace(/,? com \d+ pontos de experiência( acumulados)?/g, "")
      .replace(/ ?Você tem \d+ pennies\./g, "")
      .trim();
    if (!t) continue;
    t = t
      .replace(/, §NOME§([,.!?])/g, "$1")
      .replace(/§NOME§, /g, "")
      .replace(/se chama §NOME§/g, "leva o seu nome")
      .replace(/§NOME§/g, "você");
    out.push(t);
  }
  return out;
}

/** Resumo de 16 caracteres do texto (duas passadas de FNV-1a), igual no jogo e nas ferramentas. */
function narrationKey(text) {
  const pass = (seed) => {
    let h = seed >>> 0;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  };
  return pass(2166136261) + pass(3735928559);
}

/** Os parágrafos de uma cena como o narrador os lê agora, sem o nome do herói. */
function sceneNarration(id) {
  const sc = SC[id];
  if (!sc || !state) return [];
  const realName = state.name;
  let text;
  try {
    state.name = NAME_MARK;
    text = typeof sc.text === "function" ? sc.text() : String(sc.text || "");
  } catch {
    // Uma cena que não monta o texto agora simplesmente não é narrada.
    text = "";
  } finally {
    state.name = realName;
  }
  return narrationParagraphs(sc.title, text);
}

const NARRATOR = (() => {
  const PREF_KEY = "sen-narracao";
  let on = loadPref();
  let queue = [];
  let el = null;
  let lastScene = null;
  let waitTimer = 0;

  function loadPref() {
    try {
      const v = JSON.parse(localStorage.getItem(PREF_KEY) || "null");
      if (v && typeof v.on === "boolean") return v.on;
    } catch {
      // Preferência ausente ou ilegível: narração ligada.
    }
    return true;
  }

  function setOn(v) {
    on = !!v;
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({ on }));
    } catch {
      // Armazenamento indisponível: vale só nesta sessão.
    }
    if (!on) stop();
  }

  function stop() {
    clearTimeout(waitTimer);
    queue = [];
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
    AUD.narrating(false);
  }

  function playNext() {
    const key = queue.shift();
    if (!key) {
      AUD.narrating(false);
      return;
    }
    if (!el) {
      el = new Audio();
      el.addEventListener("ended", playNext);
      // Um parágrafo que não carregar é pulado: a narração segue no próximo.
      el.addEventListener("error", () => {
        if (el.getAttribute("src")) playNext();
      });
    }
    el.src = `audio/narracao/${key}.mp3`;
    AUD.narrating(true);
    el.play().catch(() => {
      // O navegador ainda não liberou o som: sem narração nesta cena.
      AUD.narrating(false);
    });
  }

  /** Narra a cena `id` do começo. Espera o fim de um filme (abertura de capítulo, trailer). */
  function scene(id) {
    stop();
    lastScene = id;
    if (!on) return;
    const keys = sceneNarration(id)
      .map(narrationKey)
      .filter((k) => NARRATION_CLIPS.has(k));
    if (!keys.length) return;
    const start = () => {
      if (lastScene !== id) return;
      if (typeof CINEMA !== "undefined" && CINEMA.isPlaying()) {
        waitTimer = setTimeout(start, 400);
        return;
      }
      queue = keys;
      playNext();
    };
    start();
  }

  /** Diz uma frase solta (o trailer do final), se ela tiver áudio gravado. */
  function say(text) {
    if (!on) return;
    const key = narrationKey(text);
    if (!NARRATION_CLIPS.has(key)) return;
    stop();
    queue = [key];
    playNext();
  }

  /** Chamado a cada desenho de cena: só começa a narrar quando a cena é outra. */
  function onScene(id) {
    if (id !== lastScene) scene(id);
  }

  function reset() {
    stop();
    lastScene = null;
  }

  return {
    scene,
    say,
    onScene,
    stop,
    reset,
    setOn,
    get on() {
      return on;
    },
    isSpeaking: () => !!(el && !el.paused && el.getAttribute("src")),
  };
})();

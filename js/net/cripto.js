/**
 * Criptografia da Mesa online, só com a WebCrypto do navegador (nenhuma biblioteca externa).
 *
 * - Contrassenha: 4 palavras sorteadas de 256 (32 bits) + 2 dígitos, com getRandomValues.
 * - Chave: PBKDF2-SHA-256 (310 000 iterações) da contrassenha normalizada, com sal aleatório
 *   de 16 bytes que viaja no convite. A contrassenha nunca viaja.
 * - Provas: HMAC-SHA-256, conferidas em tempo constante.
 * - Códigos: JSON comprimido (deflate-raw) em base64url, com tamanho máximo conferido antes
 *   e depois de descomprimir.
 */
"use strict";

/** Palavras da contrassenha: português sem acentos, fáceis de ditar por telefone. */
const PALAVRAS_SENHA = Object.freeze([
  "lobo",
  "urso",
  "corvo",
  "falcao",
  "cervo",
  "raposa",
  "javali",
  "lince",
  "cavalo",
  "touro",
  "bode",
  "carneiro",
  "ovelha",
  "lebre",
  "coelho",
  "texugo",
  "lontra",
  "salmao",
  "truta",
  "enguia",
  "garca",
  "cisne",
  "pato",
  "ganso",
  "coruja",
  "gaviao",
  "aguia",
  "pardal",
  "melro",
  "tordo",
  "grilo",
  "abelha",
  "vespa",
  "besouro",
  "aranha",
  "cobra",
  "sapo",
  "tritao",
  "cardo",
  "urze",
  "musgo",
  "samambaia",
  "junco",
  "salgueiro",
  "carvalho",
  "freixo",
  "pinheiro",
  "betula",
  "sorveira",
  "azevinho",
  "hera",
  "trevo",
  "papoula",
  "malva",
  "cevada",
  "aveia",
  "centeio",
  "trigo",
  "linho",
  "nabo",
  "couve",
  "cebola",
  "alho",
  "pedra",
  "rocha",
  "seixo",
  "areia",
  "barro",
  "turfa",
  "lama",
  "neve",
  "gelo",
  "geada",
  "orvalho",
  "chuva",
  "nevoa",
  "nuvem",
  "vento",
  "trovao",
  "raio",
  "sol",
  "lua",
  "estrela",
  "cometa",
  "aurora",
  "ocaso",
  "noite",
  "tarde",
  "manha",
  "inverno",
  "outono",
  "verao",
  "primavera",
  "estio",
  "degelo",
  "rio",
  "lago",
  "riacho",
  "fonte",
  "poco",
  "cascata",
  "vale",
  "colina",
  "monte",
  "serra",
  "pico",
  "fiorde",
  "ilha",
  "costa",
  "praia",
  "baia",
  "penhasco",
  "gruta",
  "caverna",
  "floresta",
  "bosque",
  "clareira",
  "campo",
  "prado",
  "pantano",
  "charco",
  "trilha",
  "estrada",
  "ponte",
  "vau",
  "muralha",
  "torre",
  "castelo",
  "aldeia",
  "cabana",
  "celeiro",
  "moinho",
  "forja",
  "bigorna",
  "martelo",
  "machado",
  "espada",
  "lanca",
  "escudo",
  "arco",
  "flecha",
  "funda",
  "elmo",
  "bordao",
  "cajado",
  "tocha",
  "lanterna",
  "vela",
  "fogueira",
  "brasa",
  "cinza",
  "fumaca",
  "chama",
  "faisca",
  "carvao",
  "ferro",
  "prata",
  "ouro",
  "cobre",
  "estanho",
  "bronze",
  "joia",
  "anel",
  "colar",
  "broche",
  "coroa",
  "cetro",
  "manto",
  "capa",
  "capuz",
  "bota",
  "luva",
  "cinto",
  "bolsa",
  "odre",
  "pao",
  "queijo",
  "mel",
  "leite",
  "cerveja",
  "hidromel",
  "sopa",
  "caldo",
  "peixe",
  "carne",
  "ovo",
  "maca",
  "pera",
  "ameixa",
  "amora",
  "morango",
  "harpa",
  "flauta",
  "gaita",
  "tambor",
  "sino",
  "trompa",
  "canto",
  "verso",
  "lenda",
  "conto",
  "runa",
  "selo",
  "mapa",
  "chave",
  "porta",
  "janela",
  "mesa",
  "banco",
  "cadeira",
  "cama",
  "tear",
  "roca",
  "fuso",
  "agulha",
  "linha",
  "corda",
  "rede",
  "barco",
  "remo",
  "ancora",
  "leme",
  "mastro",
  "onda",
  "mare",
  "espuma",
  "sal",
  "concha",
  "perola",
  "coral",
  "alga",
  "baleia",
  "foca",
  "lagosta",
  "caranguejo",
  "polvo",
  "lula",
  "arenque",
  "bravo",
  "leal",
  "firme",
  "calmo",
  "sabio",
  "forte",
  "veloz",
  "astuto",
  "gentil",
  "nobre",
  "justo",
  "humilde",
  "ousado",
  "sereno",
  "alegre",
  "rubro",
  "abeto",
  "cedro",
]);

const PBKDF2_ITERACOES = 310000;
/** Tamanho máximo de um código (convite ou resposta), comprimido e descomprimido. */
const CODIGO_MAX = 8192;

const NET = (() => {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  function aleatorios(n) {
    return crypto.getRandomValues(new Uint8Array(n));
  }

  /** Número aleatório sem viés entre 0 e max-1. */
  function sorteio(max) {
    const limite = Math.floor(0x100000000 / max) * max;
    const u = new Uint32Array(1);
    do crypto.getRandomValues(u);
    while (u[0] >= limite);
    return u[0] % max;
  }

  /** Contrassenha nova: quatro palavras e dois dígitos, por exemplo "lobo-cardo-nevoa-ponte-71". */
  function novaContrassenha() {
    const palavras = Array.from({ length: 4 }, () => PALAVRAS_SENHA[sorteio(PALAVRAS_SENHA.length)]);
    return `${palavras.join("-")}-${String(sorteio(100)).padStart(2, "0")}`;
  }

  /** Normaliza o que a pessoa digitou: minúsculas, sem acentos e com hífens entre as partes. */
  function normalizarSenha(s) {
    return String(s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim()
      .split(/[\s\-_.,;]+/)
      .filter(Boolean)
      .join("-");
  }

  function paraB64(bytes) {
    let bin = "";
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function deB64(s) {
    if (typeof s !== "string" || !/^[A-Za-z0-9_-]*$/.test(s)) throw new Error("base64url inválido");
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  }

  /** Lê um fluxo até o fim, parando se passar do limite (proteção contra "bomba" de compressão). */
  async function lerTudo(stream, limite) {
    const reader = stream.getReader();
    const partes = [];
    let total = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > limite) {
        reader.cancel().catch(() => {});
        throw new Error("código grande demais");
      }
      partes.push(value);
    }
    const out = new Uint8Array(total);
    let pos = 0;
    for (const p of partes) {
      out.set(p, pos);
      pos += p.length;
    }
    return out;
  }

  // Sem CompressionStream (navegadores antigos), os códigos saem sem compressão: o prefixo
  // indica qual dos dois formatos foi usado ("z" comprimido, "j" puro).
  const comprime = typeof CompressionStream === "function";

  /** Transforma um objeto em código: PREFIXO.<formato><base64url>. */
  async function empacotar(prefixo, obj) {
    const bytes = enc.encode(JSON.stringify(obj));
    if (bytes.length > CODIGO_MAX) throw new Error("código grande demais");
    if (!comprime) return `${prefixo}.j${paraB64(bytes)}`;
    const z = await lerTudo(
      new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw")),
      CODIGO_MAX * 2,
    );
    return `${prefixo}.z${paraB64(z)}`;
  }

  /** Lê um código com o prefixo esperado. Devolve o objeto ou lança erro (nunca trava). */
  async function desempacotar(prefixo, codigo) {
    const t = String(codigo || "").trim();
    if (t.length > CODIGO_MAX * 2) throw new Error("código grande demais");
    if (!t.startsWith(`${prefixo}.`)) throw new Error("código de outro tipo");
    const formato = t.charAt(prefixo.length + 1);
    const corpo = deB64(t.slice(prefixo.length + 2));
    let bytes;
    if (formato === "j") bytes = corpo;
    else if (formato === "z" && typeof DecompressionStream === "function")
      bytes = await lerTudo(
        new Blob([corpo]).stream().pipeThrough(new DecompressionStream("deflate-raw")),
        CODIGO_MAX,
      );
    else throw new Error("formato desconhecido");
    if (bytes.length > CODIGO_MAX) throw new Error("código grande demais");
    const obj = JSON.parse(dec.decode(bytes));
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw new Error("conteúdo inválido");
    return obj;
  }

  /** Chave HMAC derivada da contrassenha e do sal do convite. */
  async function derivarChave(senha, sal) {
    const base = await crypto.subtle.importKey("raw", enc.encode(normalizarSenha(senha)), "PBKDF2", false, [
      "deriveKey",
    ]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: PBKDF2_ITERACOES },
      base,
      { name: "HMAC", hash: "SHA-256", length: 256 },
      false,
      ["sign"],
    );
  }

  async function hmac(chave, texto) {
    return new Uint8Array(await crypto.subtle.sign("HMAC", chave, enc.encode(texto)));
  }

  /** Compara dois vetores de bytes sem sair antes da hora (tempo constante). */
  function iguais(a, b) {
    if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array) || a.length !== b.length) return false;
    let d = 0;
    for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
    return d === 0;
  }

  async function sha256(texto) {
    return paraB64(await crypto.subtle.digest("SHA-256", enc.encode(texto)));
  }

  return {
    aleatorios,
    novaContrassenha,
    normalizarSenha,
    paraB64,
    deB64,
    empacotar,
    desempacotar,
    derivarChave,
    hmac,
    iguais,
    sha256,
    comprime,
  };
})();

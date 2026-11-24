/**
 * Testes de segurança: injeção de HTML/scripts (XSS), poluição de protótipo, saves
 * adulterados, política de segurança de conteúdo (CSP), tráfego de rede e varredura
 * do código-fonte em busca de segredos e padrões perigosos.
 *
 * Uso: npm run test:security
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { abrirJogo, comecarJogo, executar, servirJogo, verificar, RAIZ, SAVE_KEY } from "./lib/harness.mjs";

const PAYLOADS_XSS = [
  `<img src=x onerror="window.__xss=1">`,
  `"><svg onload="window.__xss=1">`,
  `</title><script>window.__xss=1</script>`,
  `<a href="javascript:window.__xss=1">x</a>`,
  "${window.__xss=1}",
];

/** Telas que mostram o nome do herói: cenas, ficha, Personagem, Aprendizados, morte e epílogo. */
async function exibirNomeEmTodaParte(page, nome) {
  await page.evaluate((n) => {
    state = newChar("Teste", "pastor");
    state.mode = "playing";
    migrate(state);
    state.name = n; // grava direto no estado, sem passar pela validação, para testar o escape
    for (const cena of ["c1_inicio", "c1_derrota_final", "c3_cabeca_ferido", "c4_noite"]) {
      state.combat = null;
      go(cena);
    }
    state.flags.final = "primavera";
    go("c6_epilogo");
    openChar("roupa");
    closeEvolve();
    openEvolve();
    closeEvolve();
    state.dead = true;
    render();
    state.dead = false;
    showTitle();
  }, nome);
}

function semInjecao(page) {
  return page.evaluate(() => ({
    executou: window.__xss === 1,
    elementos: document.querySelectorAll('img[src="x"], svg[onload], a[href^="javascript:"]').length,
  }));
}

const casos = [
  [
    `XSS pelo nome do herói (${PAYLOADS_XSS.length} ataques)`,
    async (browser) => {
      const { page, context, erros } = await abrirJogo(browser);
      await comecarJogo(page);
      for (const payload of PAYLOADS_XSS) {
        await exibirNomeEmTodaParte(page, payload);
        await page.waitForTimeout(150);
        const r = await semInjecao(page);
        verificar(!r.executou, `o ataque executou: ${payload}`);
        verificar(!r.elementos, `o ataque injetou elementos: ${payload}`);
      }
      await context.close();
      verificar(!erros.length, `erro de execução: ${erros[0]}`);
      return "todo nome é exibido como texto";
    },
  ],
  [
    "XSS por save adulterado (nome, inimigo e marcas da história)",
    async (browser) => {
      const save = {
        name: `<img src=x onerror="window.__xss=1">`,
        origin: "pastor",
        attrs: { ST: 10, DX: 12, IQ: 10, HT: 11 },
        weapons: ["bordao"],
        weapon: "bordao",
        armor: "la",
        mode: "playing",
        scene: "c1_inicio",
        flags: { "<img src=x onerror=window.__xss=1>": 1, rumores: `<svg onload="window.__xss=1">` },
        combat: {
          foes: [{ k: "recruta", n: `Recruta inglês<img src=x onerror="window.__xss=1">`, hp: 5 }],
          spec: {
            win: "c1_visao",
            lose: "c1_desmaio",
            allies: [{ n: "<b>x</b>", skill: 99, dmg: "99d", type: "imp" }],
          },
          log: [`<img src=x onerror="window.__xss=1">`],
        },
        hp: 13,
        fp: 11,
      };
      const { page, context, erros } = await abrirJogo(browser, {
        antes: `localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(save))});`,
      });
      await page.click("#bCont");
      await page.waitForTimeout(400);
      const r = await semInjecao(page);
      const aliados = await page.evaluate(() => (state.combat ? state.combat.spec.allies.length : 0));
      await context.close();
      verificar(!erros.length, `erro de execução: ${erros[0]}`);
      verificar(!r.executou && !r.elementos, "o save adulterado injetou HTML");
      verificar(aliados === 0, "um aliado falso foi aceito");
      return "HTML descartado, aliado falso recusado";
    },
  ],
  [
    "Poluição de protótipo pelo save e pelas preferências de áudio",
    async (browser) => {
      const saveMalicioso =
        '{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},' +
        '"name":"P","origin":"pastor","mode":"playing","scene":"c1_inicio",' +
        '"skills":{"__proto__":{"polluted":true},"bordao":2},"flags":{"__proto__":{"polluted":true}},' +
        '"inv":{"__proto__":{"polluted":true}},"up":{"__proto__":1},"hp":13,"fp":11}';
      const prefMaliciosa = '{"__proto__":{"polluted":true},"music":false}';
      const { page, context, erros } = await abrirJogo(browser, {
        antes:
          `localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(saveMalicioso)});` +
          `localStorage.setItem("sen-audio", ${JSON.stringify(prefMaliciosa)});`,
      });
      await page.click("#bCont");
      await page.click(".choice[data-i='0']");
      await page.waitForTimeout(500);
      const r = await page.evaluate(() => ({
        global: {}.polluted === true,
        estado: state.polluted === true || state.skills.polluted === true || state.flags.polluted === true,
        audio: Object.getPrototypeOf(AUD.pref) !== Object.prototype || AUD.pref.polluted === true,
      }));
      await context.close();
      verificar(!erros.length, `erro de execução: ${erros[0]}`);
      verificar(!r.global, "Object.prototype foi poluído");
      verificar(!r.estado, "o estado do jogo herdou propriedades injetadas");
      verificar(!r.audio, "as preferências de áudio tiveram o protótipo trocado");
      return "nenhuma propriedade injetada";
    },
  ],
  [
    "CSP bloqueia scripts injetados e código montado a partir de texto",
    async (browser) => {
      const { page, context } = await abrirJogo(browser);
      const r = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const violacoes = [];
            document.addEventListener("securitypolicyviolation", (e) => violacoes.push(e.violatedDirective));
            const s = document.createElement("script");
            s.textContent = "window.__inline = 1";
            document.body.append(s);
            // setTimeout com texto equivale a eval e também é bloqueado pela CSP.
            setTimeout("window.__textoExecutado = 1", 0);
            setTimeout(() => {
              const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || "";
              resolve({
                inline: window.__inline === 1,
                texto: window.__textoExecutado === 1,
                violacoes,
                csp,
              });
            }, 200);
          }),
      );
      await context.close();
      verificar(
        r.csp.includes("script-src 'self'") && !r.csp.includes("unsafe-eval"),
        "a CSP não restringe scripts",
      );
      verificar(!r.inline, "um script inline injetado executou");
      verificar(!r.texto, "código montado a partir de texto executou");
      return `bloqueados, ${r.violacoes.length} violações registradas (${[...new Set(r.violacoes)].join(", ")})`;
    },
  ],
  [
    "Tráfego de rede: só arquivos locais e fontes do Google",
    async (browser) => {
      const externos = new Set();
      const permitidos = /^(file:|data:|blob:|https:\/\/fonts\.(googleapis|gstatic)\.com\/)/;
      const { page, context, erros } = await abrirJogo(browser, {
        rotas: (ctx) =>
          ctx.on("request", (req) => {
            if (!permitidos.test(req.url())) externos.add(req.url());
          }),
      });
      await comecarJogo(page);
      await page.click("#btnSound");
      for (let i = 0; i < 6; i++) {
        const alvo = await page.$(".choice, #aAtk");
        if (alvo) await alvo.click({ force: true });
        await page.waitForTimeout(500);
      }
      await context.close();
      verificar(!erros.length, `erro de execução: ${erros[0]}`);
      verificar(!externos.size, `acessos não previstos: ${[...externos].join(", ")}`);
      return "nenhum acesso fora do previsto";
    },
  ],
  [
    "Varredura do código: segredos, eval e URLs inseguras",
    async () => {
      const ignorar = new Set(["node_modules", ".git", "img", "screenshots"]);
      const arquivos = [];
      const percorrer = (dir) => {
        for (const nome of readdirSync(dir)) {
          if (ignorar.has(nome)) continue;
          const p = path.join(dir, nome);
          if (statSync(p).isDirectory()) percorrer(p);
          else if (/\.(js|mjs|py|html|css|json|md)$/.test(nome) && nome !== "package-lock.json")
            arquivos.push(p);
        }
      };
      percorrer(RAIZ);
      const regras = [
        ["chave do Google", /AIza[0-9A-Za-z_-]{35}/],
        ["chave da OpenAI ou Anthropic", /\bsk-(ant-)?[A-Za-z0-9_-]{20,}/],
        ["token do GitHub", /\bgh[pousr]_[A-Za-z0-9]{36}/],
        ["chave privada", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
        ["chave escrita no código", /x-goog-api-key["']?\s*:\s*["'][A-Za-z0-9_-]{20,}["']/],
        // Dados pessoais: nenhum e-mail fora dos endereços genéricos de exemplo e de robôs.
        [
          "e-mail pessoal",
          /\b[A-Za-z0-9._%+-]+@(?!example\.com|anthropic\.com|users\.noreply\.github\.com)[A-Za-z0-9.-]+\.[a-z]{2,}\b/,
        ],
      ];
      const regrasDoJogo = [
        ["eval ou new Function", /\beval\s*\(|new Function\s*\(/],
        ["document.write", /document\.write\s*\(/],
        ["URL http insegura", /["'`]http:\/\//],
        ["manipulador de evento inline", /\son(error|load|click|mouseover)\s*=\s*["']/],
      ];
      const achados = [];
      for (const arquivo of arquivos) {
        const texto = readFileSync(arquivo, "utf8");
        const rel = path.relative(RAIZ, arquivo);
        for (const [nome, re] of regras) if (re.test(texto)) achados.push(`${nome} em ${rel}`);
        if (/^(js\/|index\.html)/.test(rel)) {
          for (const [nome, re] of regrasDoJogo) if (re.test(texto)) achados.push(`${nome} em ${rel}`);
        }
      }
      verificar(!achados.length, achados.join("; "));
      return `${arquivos.length} arquivos verificados`;
    },
  ],
];

casos.push(
  [
    "Histórico do Git sem chaves, tokens nem e-mails pessoais",
    async () => {
      if (!existsSync(path.join(RAIZ, ".git"))) return "sem repositório Git: pulado";
      const historico = execFileSync("git", ["log", "-p", "--all", "--no-color"], {
        cwd: RAIZ,
        maxBuffer: 512 * 1024 * 1024,
      }).toString();
      const autores = execFileSync("git", ["log", "--all", "--format=%ae%n%ce"], { cwd: RAIZ }).toString();
      const achados = [];
      if (/AIza[0-9A-Za-z_-]{35}/.test(historico)) achados.push("chave do Google");
      if (/\bgh[pousr]_[A-Za-z0-9]{36}/.test(historico)) achados.push("token do GitHub");
      if (/\bsk-(ant-)?[A-Za-z0-9_-]{20,}/.test(historico)) achados.push("chave de API");
      if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(historico)) achados.push("chave privada");
      const emails = new Set(autores.split("\n").filter(Boolean));
      // O noreply do github.com é o endereço genérico do próprio GitHub: assina o commit de merge
      // que o CI testa num pull request e as edições feitas pelo site. Não é e-mail de ninguém.
      for (const e of emails)
        if (
          !/^noreply@github\.com$/.test(e) &&
          !/@(example\.com|anthropic\.com|users\.noreply\.github\.com)$/.test(e)
        )
          achados.push(`autor ${e}`);
      verificar(!achados.length, `encontrado no histórico: ${achados.join(", ")}`);
      return `${historico.split("\ncommit ").length} commits verificados`;
    },
  ],
  [
    "CSP completa: cada diretiva no valor mais restrito que o jogo aceita",
    async (browser) => {
      const { page, context } = await abrirJogo(browser);
      const csp = await page.evaluate(
        () => document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || "",
      );
      await context.close();
      const dir = Object.fromEntries(
        csp
          .split(";")
          .map((d) => d.trim().split(/\s+/))
          .filter((d) => d[0])
          .map(([k, ...v]) => [k, v.join(" ")]),
      );
      const esperado = {
        "default-src": "'self'",
        "script-src": "'self'",
        "connect-src": "'none'",
        "object-src": "'none'",
        "base-uri": "'none'",
        "form-action": "'none'",
        "media-src": "'self'",
        "font-src": "https://fonts.gstatic.com",
      };
      const erradas = Object.entries(esperado)
        .filter(([k, v]) => dir[k] !== v)
        .map(([k, v]) => `${k} = "${dir[k]}" (esperado "${v}")`);
      if (/\*|https?:(?!\/\/fonts\.)/.test(dir["img-src"] || ""))
        erradas.push(`img-src aberto demais: ${dir["img-src"]}`);
      if (/unsafe-eval|unsafe-inline/.test(dir["script-src"] || ""))
        erradas.push("script-src aceita código inseguro");
      verificar(!erradas.length, erradas.join("; "));
      return `${Object.keys(dir).length} diretivas`;
    },
  ],
  [
    "Rede pelo servidor HTTP, com música e cinema: nada sai do site além das fontes",
    async (browser) => {
      const servidor = await servirJogo();
      const context = await browser.newContext();
      const externos = new Set();
      const origem = new URL(servidor.url).origin;
      context.on("request", (r) => {
        const u = r.url();
        if (!u.startsWith(origem) && !/^(data:|blob:|https:\/\/fonts\.(googleapis|gstatic)\.com\/)/.test(u))
          externos.add(u);
      });
      await context.addInitScript(() =>
        localStorage.setItem("sen-audio", JSON.stringify({ music: true, sfx: true })),
      );
      const page = await context.newPage();
      const erros = [];
      page.on("pageerror", (e) => erros.push(e.message));
      await page.goto(servidor.url);
      await comecarJogo(page);
      await page.evaluate(() => {
        CINEMA.stop();
        for (const id of ["c1_taverna_ok", "c1_visao", "c1_pantano_ok", "c3_intendente"]) go(id);
        runOutcome({ e: ["kelpie"], win: "c1_inicio", lose: "c1_inicio" });
      });
      await page.click("#aAtk");
      await page.waitForTimeout(1500);
      await context.close();
      await servidor.fechar();
      verificar(!erros.length, `erro de execução: ${erros[0]}`);
      verificar(!externos.size, `acessos fora do site: ${[...externos].slice(0, 5).join(", ")}`);
      verificar(!servidor.falhas.length, `arquivos pedidos que não existem: ${servidor.falhas.join(", ")}`);
      return "só o próprio site e as fontes";
    },
  ],
  [
    "Aparência e galeria adulteradas no save não fazem o jogo buscar arquivos fora das pastas dele",
    async (browser) => {
      const servidor = await servirJogo();
      const context = await browser.newContext();
      const pedidos = [];
      const origem = new URL(servidor.url).origin;
      // Só os pedidos ao próprio site importam aqui; as fontes do Google têm teste próprio.
      context.on("request", (r) => {
        const u = new URL(r.url());
        if (u.origin === origem) pedidos.push(u.pathname);
      });
      const save = {
        name: "X",
        origin: "pastor",
        mode: "playing",
        scene: "c1_inicio",
        look: "../../../etc/passwd",
        armor: "la",
        journey: [
          { ch: 1, armor: '"><img src=x onerror="window.__xss=1">', weapon: "funda" },
          { ch: 2, armor: "la", weapon: "../index", amulet: "../../x" },
          { ch: 3, armor: "la", weapon: "funda", amulet: "<svg onload=window.__xss=1>" },
        ],
      };
      await context.addInitScript(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, JSON.stringify(save)]);
      const page = await context.newPage();
      await page.goto(servidor.url);
      await page.click("#bCont");
      await page.evaluate(() => openChar("roupa"));
      await page.waitForTimeout(800);
      const r = await page.evaluate(() => ({
        xss: window.__xss === 1,
        look: state.look,
        journey: state.journey.length,
      }));
      await context.close();
      await servidor.fechar();
      const permitido =
        /^\/(index\.html|css\/|js\/|img\/(scenes|portraits|heroes|action|items)\/[a-z0-9_]+\.jpg$|img\/favicon\.png$|audio\/[a-z_]+\.mp3$|audio\/narracao\/[0-9a-f]{16}\.mp3$)/;
      const estranhos = pedidos.filter((p) => p.startsWith("/") && p !== "/" && !permitido.test(p));
      verificar(!r.xss, "um campo do save executou código");
      verificar(r.look === "ruivo", `aparência adulterada aceita: ${r.look}`);
      verificar(r.journey === 1, `a galeria aceitou ${r.journey} registros adulterados`);
      verificar(!estranhos.length, `pedidos fora das pastas do jogo: ${estranhos.slice(0, 5).join(", ")}`);
      return "nada fora das pastas do jogo";
    },
  ],
);

process.exit((await executar("Testes de segurança", casos)) ? 1 : 0);

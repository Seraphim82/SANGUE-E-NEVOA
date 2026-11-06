/**
 * Testes de segurança: injeção de HTML/scripts (XSS), poluição de protótipo, saves
 * adulterados, política de segurança de conteúdo (CSP), tráfego de rede e varredura
 * do código-fonte em busca de segredos e padrões perigosos.
 *
 * Uso: npm run test:security
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { abrirJogo, comecarJogo, executar, verificar, RAIZ, SAVE_KEY } from "./lib/harness.mjs";

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

process.exit((await executar("Testes de segurança", casos)) ? 1 : 0);

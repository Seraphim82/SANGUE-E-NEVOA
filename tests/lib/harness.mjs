/**
 * Utilitários compartilhados pelos testes: abre o jogo num navegador sem tela,
 * coleta erros de execução e oferece um jeito simples de declarar casos de teste.
 */
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const URL_JOGO = pathToFileURL(path.join(RAIZ, "index.html")).href;
export const SAVE_KEY = "sangue-e-nevoa-v1";

/**
 * Inicia o Chromium do Playwright. Defina CHROMIUM_PATH para usar um Chromium já
 * instalado no sistema em vez do baixado por `npx playwright install chromium`.
 */
export function abrirNavegador(args = []) {
  const opcoes = { args };
  if (process.env.CHROMIUM_PATH) opcoes.executablePath = process.env.CHROMIUM_PATH;
  return chromium.launch(opcoes);
}

/** Chave da preferência do modo cinema no localStorage. */
export const CINEMA_KEY = "sen-cinema";

/**
 * Abre o jogo. `antes` roda no navegador antes de qualquer script do jogo.
 * O cinema fica desligado, porque a camada dele cobre a página e bloquearia os cliques
 * dos testes; passe `cinema: true` para testá-lo.
 */
export async function abrirJogo(browser, { antes, rotas, viewport, cinema = false } = {}) {
  const context = await browser.newContext({ viewport: viewport || { width: 1280, height: 860 } });
  if (rotas) await rotas(context);
  const page = await context.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  if (!cinema)
    await page.addInitScript((key) => {
      try {
        localStorage.setItem(key, JSON.stringify({ mode: "desligado" }));
        localStorage.setItem("sen-narracao", JSON.stringify({ on: false }));
      } catch {
        // Sem armazenamento, o teste segue com o padrão.
      }
    }, CINEMA_KEY);
  if (antes) await page.addInitScript(antes);
  await page.goto(URL_JOGO);
  await page.waitForTimeout(300);
  return { page, context, erros };
}

/** Executa uma lista de casos e imprime o resultado. Retorna o número de falhas. */
export async function executar(titulo, casos) {
  const browser = await abrirNavegador();
  let falhas = 0;
  console.log(`\n${titulo}\n${"-".repeat(titulo.length)}`);
  for (const [nome, fn] of casos) {
    const inicio = Date.now();
    try {
      const detalhe = await fn(browser);
      console.log(`  ✓ ${nome}${detalhe ? ` · ${detalhe}` : ""} (${Date.now() - inicio} ms)`);
    } catch (e) {
      falhas++;
      console.log(`  ✗ ${nome}\n      ${String(e.message).split("\n")[0]}`);
    }
  }
  await browser.close();
  return falhas;
}

export function verificar(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

/** Cria um herói e entra no Capítulo I usando a própria interface. */
export async function comecarJogo(page) {
  await page.click("#bNew");
  await page.click("#bNext");
  await page.click("#eOk");
  await page.waitForTimeout(200);
}

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".ico": "image/x-icon",
};

/**
 * Serve o jogo por HTTP, como o GitHub Pages, para os testes enxergarem arquivos que
 * faltam (404) e o áudio passar pela Web Audio. Devolve { url, fechar, falhas }, onde
 * `falhas` lista os caminhos pedidos que não existem.
 */
export async function servirJogo() {
  const http = await import("node:http");
  const fs = await import("node:fs");
  const falhas = [];
  const servidor = http.createServer((req, res) => {
    const caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const arquivo = path.normalize(path.join(RAIZ, caminho === "/" ? "/index.html" : caminho));
    // Nunca serve nada fora da pasta do jogo.
    if (!arquivo.startsWith(RAIZ + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(arquivo, (erro, dados) => {
      if (erro) {
        if (!caminho.endsWith("favicon.ico")) falhas.push(caminho);
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { "Content-Type": TIPOS[path.extname(arquivo)] || "application/octet-stream" });
      res.end(dados);
    });
  });
  await new Promise((ok) => servidor.listen(0, "127.0.0.1", ok));
  const url = `http://127.0.0.1:${servidor.address().port}/index.html`;
  return { url, falhas, fechar: () => new Promise((ok) => servidor.close(ok)) };
}

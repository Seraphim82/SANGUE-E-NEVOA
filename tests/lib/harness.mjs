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

/** Abre o jogo. `antes` roda no navegador antes de qualquer script do jogo. */
export async function abrirJogo(browser, { antes, rotas, viewport } = {}) {
  const context = await browser.newContext({ viewport: viewport || { width: 1280, height: 860 } });
  if (rotas) await rotas(context);
  const page = await context.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
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

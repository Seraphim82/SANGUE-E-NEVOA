# Arquitetura

## Visão geral

O jogo é uma página estática. O `index.html` carrega os scripts na ordem abaixo, e todos compartilham o escopo global do navegador. A ordem importa: cada arquivo só usa, durante o carregamento, o que foi definido antes dele.

| Ordem | Pasta | Responsabilidade |
|---|---|---|
| 1 | `js/art/scenes.js` | Objeto `ART`: desenha o fundo da cena num `<canvas>` (pintura ou ilustração procedural), as animações e os inimigos em combate |
| 2 | `js/audio/soundtrack.js` | Objeto `AUD`: trilha sonora em cinco climas, vinhetas e efeitos |
| 3 | `js/data/` | Tabelas de regras (`SK`, `GDP`, `GEB`, `DTYPE`), equipamento (`WEAPONS`, `ARMOR`, `ITEMS`), origens (`ORIGINS`), inimigos (`FOES`) e títulos (`TITLES`) |
| 4 | `js/core/mechanics.js`, `state.js` | Dados e testes de 3d6, nível de perícia, atributos derivados; estado `S`, salvamento e recompensas |
| 5 | `js/story/` | As cenas de cada capítulo, adicionadas ao objeto `SC`, e a tabela `META` com a imagem e a música de cada cena |
| 6 | `js/core/combat.js`, `flow.js` | Combate por turnos; navegação entre cenas (`go`, `choose`) |
| 7 | `js/ui/`, `js/art/figure.js` | Renderização das telas |
| 8 | `js/main.js` | Liga os botões e inicia o jogo |

## Estado do jogo

Tudo o que muda durante uma partida está no objeto `S`: atributos, perícias, equipamento, inventário, `flags` (as escolhas da história), a cena atual e, durante uma luta, `S.combat`. Ele é salvo no `localStorage` a cada cena. A função `migrate()` completa campos ausentes de jogos salvos em versões antigas.

## Como acrescentar uma cena

As cenas ficam em `js/story/chapterN.js`:

```js
c2_exemplo: {
  eyebrow: "Março de 1297",          // linha pequena acima do título (opcional)
  title: "Título da cena",
  enter() { gain(2, "Motivo"); },     // roda uma única vez, na primeira visita
  text: () => `Texto da cena. **Negrito** e *itálico* funcionam.`,
  choices: [
    { t: "Ir para outra cena", go: "c2_outra" },
    { t: "Só aparece com uma flag", if: () => F("ailsa"), go: "c2_outra" },
    { t: "Teste de perícia",
      test: { o: [["furtividade", 0], ["DX", -2]], ok: "c2_sucesso", fail: "c2_falha" } },
    { t: "Combate",
      fight: { e: ["soldado", "soldado"], allies: [ALLY.tam], win: "c2_vitoria", lose: "c2_derrota" } },
  ],
},
```

- `test.o` lista as opções de teste; o jogo usa a melhor que o herói tiver. Use função (`o: () => [...]`) quando o modificador depende do estado.
- `ok`, `fail`, `go` e `fight` também aceitam funções, para caminhos que dependem de escolhas anteriores.
- Opções de `fight`: `e` (inimigos), `hp` (vida inicial de cada um), `allies`, `pen` (penalidade no primeiro ataque), `pre` (dano antes da luta), `blindAll`, `nonlethal`, `intro`, `win`, `lose`, `flee`.
- Toda cena precisa de uma linha em `js/story/scene-meta.js` com a imagem e o clima musical (`tema`, `suspense`, `bravura`, `mistico` ou `lamento`).

## Como acrescentar um inimigo

1. Acrescente a entrada em `FOES` (`js/data/foes.js`), com PV, ataque, dano, tipo de dano, defesa, RD, experiência e, se quiser, `loot`, `fey`, `chill`, `drain`, `regen` ou `ignoreRD`.
2. Ponha o retrato em `img/portraits/<chave>.jpg` e a chave na lista de retratos em `js/art/scenes.js`.
3. Para gerar o retrato com o Gemini, acrescente o prompt em `tools/prompts.py` e rode `python3 tools/gerar_imagens.py retrato:<chave>`.

## Imagens

Cada cena aponta para uma chave de imagem em `META`. Se `img/scenes/<chave>.jpg` existir, ela vira o fundo; senão, o jogo usa uma ilustração procedural (ou a de `FALLBACK`, em `js/art/scenes.js`). Em combate, cenas cuja pintura já mostra o inimigo usam a versão procedural, para não duplicar a figura.

## Testes

`npm test` roda `tests/playthrough.mjs`, que abre o `index.html` num navegador sem tela, valida o grafo de cenas com várias combinações de flags e joga partidas completas. Rode sempre depois de mexer na história.

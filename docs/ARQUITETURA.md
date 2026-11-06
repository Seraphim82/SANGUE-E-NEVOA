# Arquitetura

## Visão geral

O jogo é uma página estática. O `index.html` carrega os scripts na ordem abaixo, e todos compartilham o escopo global do navegador. A ordem importa: cada arquivo só usa, durante o carregamento, o que foi definido antes dele.

| Ordem | Pasta | Responsabilidade |
|---|---|---|
| 1 | `js/art/scenes.js` | Objeto `ART`: desenha o fundo da cena num `<canvas>` (pintura ou ilustração procedural), as animações e os inimigos em combate |
| 2 | `js/audio/soundtrack.js` | Objeto `AUD`: trilha sonora em cinco climas, vinhetas e efeitos |
| 3 | `js/data/` | Tabelas de regras (`SK`, `GDP`, `GEB`, `DTYPE`), equipamento (`WEAPONS`, `ARMOR`, `ITEMS`), origens (`ORIGINS`), inimigos (`FOES`) e títulos (`TITLES`) |
| 4 | `js/core/mechanics.js`, `state.js`, `save-validation.js` | Dados e testes de 3d6, nível de perícia, atributos derivados; estado `state`, salvamento, validação de save e recompensas |
| 5 | `js/story/` | As cenas de cada capítulo, adicionadas ao objeto `SC`, e a tabela `META` com a imagem e a música de cada cena |
| 6 | `js/core/combat.js`, `flow.js` | Combate por turnos; navegação entre cenas (`go`, `choose`) |
| 7 | `js/ui/`, `js/art/figure.js` | Renderização das telas |
| 8 | `js/main.js` | Liga os botões e inicia o jogo |

## Estado do jogo

Tudo o que muda durante uma partida está no objeto `state`: atributos, perícias, equipamento, inventário, `flags` (as escolhas da história), a cena atual e, durante uma luta, `state.combat`. Ele é salvo no `localStorage` a cada cena.

Ao carregar, o save passa por `sanitizeSave()` (`js/core/save-validation.js`), que o trata como dado não confiável: aceita só chaves que existem nas tabelas do jogo, limita números a faixas plausíveis, completa campos ausentes e reconstrói o combate a partir do bestiário. **Todo campo novo no estado precisa de validação ali.** A função `migrate()` completa campos ausentes durante o jogo.

### Marcas da história

`state.flags` guarda as escolhas. Leia com `hasFlag("nome")`. Algumas marcas são só registro de progresso (`cap1` a `cap6`, `capN_fim`, `ailsa_salva`, `mairi_morta`, `fim_jogo` e outras) e não são lidas por nenhuma cena hoje; ficam no save para capítulos futuros.

## Glossário de nomes

| Nome | O que é |
|---|---|
| `state` | Estado do jogo atual (herói, cena, combate) |
| `hasFlag(k)` | Diz se a marca da história `k` está ativa |
| `heroName()` | Nome do herói, já com escape de HTML |
| `toParagraphs(t)` | Converte o texto da cena em parágrafos HTML |
| `draft` | Rascunho da tela de Aprendizados, antes de confirmar |
| `SC` | Todas as cenas, por identificador |
| `META` | Imagem e clima musical de cada cena |
| `FOES`, `WEAPONS`, `ARMOR`, `ITEMS`, `SK` | Bestiário, armas, vestimentas, itens e perícias |
| `ALLY` | Aliados que lutam junto nos combates |
| `ART`, `AUD`, `WIND` | Ilustrações, áudio e vento guia |

As letras `"F"`, `"M"`, `"D"` e `"MD"` nas perícias são as dificuldades do sistema de regras (Fácil, Média, Difícil, Muito Difícil).

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
    { t: "Só aparece com uma marca", if: () => hasFlag("ailsa"), go: "c2_outra" },
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

## Segurança

- Todo texto vindo do jogador ou do save passa por `esc()` antes de ir para a página. Use `heroName()` para o nome do herói.
- A CSP do `index.html` bloqueia scripts inline, `eval` e conexões externas. Não use `onclick="..."` e afins: ligue eventos com `addEventListener`.
- Não guarde HTML no save. O histórico de combate, por exemplo, não é restaurado.

## Globais e lint

Como os scripts compartilham o escopo global, `tools/globais.mjs` lê o `index.html`, percorre os scripts na ordem e gera `tools/globais.json` com todos os nomes declarados no nível superior. O ESLint usa essa lista para apontar nomes indefinidos, e o gerador falha se um nome for declarado em dois arquivos. `npm run lint` faz as duas coisas.

## Testes

| Arquivo | O que verifica |
|---|---|
| `tests/playthrough.mjs` | Grafo da história com várias combinações de marcas; partidas completas com um jogador automático que evolui o personagem |
| `tests/sabotage.mjs` | 18 cenários de falha: saves corrompidos e adulterados, armazenamento bloqueado, imagens fora do ar, sem áudio, cliques em rajada, redimensionamento |
| `tests/security.mjs` | XSS pelo nome e pelo save, poluição de protótipo, CSP, tráfego de rede e varredura do código |
| `tests/stress.mjs` | Volume de partidas, sessão longa e memória, desempenho da animação, combate em massa, limite de partículas |

Rode `npm test` sempre depois de mexer no código, e `npm run test:stress` se a mudança tocar em combate, animação ou desempenho.

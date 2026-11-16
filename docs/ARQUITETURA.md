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

## Modo cinema

`js/art/cinema.js` encena o combate sem tocar na lógica. Cada botão de ação passa pela função `film()` de `js/ui/render.js`: ela chama `CINEMA.begin()`, roda a ação normalmente e chama `CINEMA.end()`. Enquanto a ação roda, `js/core/combat.js` registra tomadas com `CINEMA.shot({...})` (ataque do herói, de aliado ou do inimigo, magia, cura, defesa, finta, amuleto, fuga, fim do combate). A lógica e a página terminam na hora; o cinema só desenha por cima, numa camada de tela cheia.

- Os sons do combate ficam guardados (`AUD.hold()` e `AUD.release()`) e tocam no momento do golpe na cena.
- `montage()` transforma as tomadas numa lista de planos, como um editor de filme. Um ataque do herói que acerta vira três planos: o rosto dele em fúria (`heroi_furia_<aparência>_<roupa>`), o close da arma no golpe (`arma_golpe_<arma>`) e o inimigo atingido (`inimigo_atingido_<retrato>`), seguido da queda (`inimigo_queda_<retrato>`) se ele morrer. O golpe do inimigo usa `inimigo_ataque_<retrato>` e depois `heroi_dor_...`, o close da arma aparando (`arma_aparo_<arma>`), o escudo (`escudo`) ou o rosto do herói esquivando.
- Cada plano tem duração, zoom e deslocamento da câmera, clarão, tremor, câmera lenta, tom de cor e eventos marcados no tempo (sons, faíscas, números de dano). Os cortes rápidos chegam com borrão de movimento.
- Os planos ficam em `img/action/` e só são carregados os listados em `ACTION_SHOTS` (`js/data/action-shots.js`, gerado por `tools/listar_planos.mjs`). `CINEMA.preload()` começa a baixá-los quando o combate começa. Se um plano faltar, o cinema usa outro plano ou os retratos pintados sobre a cena.
- `CINEMA.shot()` sem gravação em andamento não faz nada, então chamar as funções de combate direto (como fazem os testes de stress) não abre filme nenhum.
- Um clique, toque ou tecla para o filme. Com "reduzir movimento" no sistema ou com o modo desligado no menu (`sen-cinema` no `localStorage`), nada é encenado. Um limite de 25 segundos e um `try/catch` no quadro garantem que a camada nunca prenda o jogador.
- `CINEMA.finale(final)` toca o trailer do final: 13 quadros de 4,6 s com fusão, montados por `finaleSlides()` a partir das marcas da história. A cena `c6_creditos` o toca ao entrar, e a ação de escolha `act: "filme"` o repete. Ele roda mesmo com as cenas de luta desligadas; com "reduzir movimento", os quadros ficam parados.
- `CINEMA.titleCard()` abre os capítulos. `go()` chama essa função ao entrar pela primeira vez numa cena `cN_inicio`, e também registra o herói na galeria da jornada (`recordJourney()`).

## Modo Mesa

`js/core/mesa.js` é uma camada por cima do jogo de um herói: `state` continua sendo o herói ativo, e `state.mesa = { heroes, active, voter, votes }` guarda os campos pessoais (`PERSONAL_KEYS`) dos outros heróis. `switchHero(j)` troca o herói ativo, inclusive os campos pessoais do combate (`COMBAT_PERSONAL`, guardados em `C.per`). `withHero` e `forEachHero` rodam código com outro herói ativo; `forAll`, em `js/core/state.js`, faz recompensas e danos da história valerem para todos. A cena, as marcas e o combate são compartilhados.

- `choose()` registra votos pelo texto da escolha (`castVote`) e só executa quando todos votaram; o empate vale o voto do mestre (herói 0). Escolhas pessoais (`isPersonalChoice`: têm `fx` e voltam para a mesma cena) não são votadas.
- Testes de escolhas usam `groupTest`: cada herói rola com a própria perícia; vale se pelo menos metade acertar.
- No combate, `enemyPhase()` desvia para `mesaEnemyPhase()`: passa a vez (`mesaPassTurn`) até todos agirem; depois aliados, um ataque de cada inimigo (`foeStrike`) num herói de pé ao acaso, e o teste de HT de cada um. Quem falha fica em `C.down`; só se todos caírem a luta é perdida. Ninguém morre de vez.
- `sanitizeMesa()` valida a mesa do save: 2 a 4 heróis, cada um pela mesma `sanitizeSave`; qualquer problema descarta a mesa e o jogo segue com o herói ativo.
- Todo código da Mesa fica atrás de `inMesa()`: o jogo de um herói não muda.

## Narração

`js/audio/narration.js` divide o texto da cena em parágrafos (`narrationParagraphs()`), com o nome do herói trocado por um marcador e contornado, e números que mudam a cada partida (moedas, pontos) tirados da voz. Cada parágrafo tem uma chave (`narrationKey()`, dois FNV-1a de 32 bits) e um MP3 em `audio/narracao/<chave>.mp3`. Só as chaves listadas em `NARRATION_CLIPS` são pedidas. `NARRATOR.onScene()` toca a cena em sequência quando ela muda; `AUD.narrating()` abaixa a trilha, que continua tocando. As ferramentas `coletar_narracao.mjs`, `gerar_narracao.py` e `listar_narracao.mjs` usam essas mesmas funções, rodando o jogo no navegador.

## Conquistas e jornadas salvas

`js/core/achievements.js` define `ACHIEVEMENTS` (nome, descrição, grupo e condição) e o perfil `sen-perfil`, separado do save e validado ao ler. `ACH.check()` roda a cada cena e no fim dos combates; `ACH.count()` soma estatísticas com teto.

`js/core/state.js` tem três espaços de jornada (`SAVE_SLOTS`); o espaço 1 usa a chave antiga. `exportCode()` gera `SEN1.<base64url do JSON>`; `importSave()` aceita o código ou o arquivo, recusa conteúdo acima de `IMPORT_MAX` e passa o save por `sanitizeSave()`. A tela fica em `js/ui/slots.js`.

## Dicas para novatos

`js/ui/tips.js` mostra no topo da cena uma dica por vez: primeiro a dos pontos (quando a pessoa já ganhou pontos e tem algum para gastar), depois a da forja (quando a arma ou a roupa em uso pode ser melhorada). Cada dica grava uma marca em `state.flags` (`dica_pontos`, `dica_forja`) e não volta. `fightHint()` acrescenta um aviso às escolhas com `fight` quando há 3 pontos ou mais para gastar ou uma melhoria pronta, e `updatePersonagemButton()` faz o botão Personagem pulsar ou ganhar a marca da forja.

## Trilha sonora

`js/audio/soundtrack.js` toca as 12 faixas de `audio/` e faz a fusão entre elas. `trackFor(id)`, em `js/story/scene-meta.js`, escolhe a faixa de cada cena pelo clima e pela ilustração: tavernas, aldeias, estradas, lugares assombrados, magia, lamento, vitória e finais. O combate escolhe entre `combate` e `combate_feerico` pelos inimigos.

- No site, a faixa passa pela Web Audio API, que faz a fusão. Aberto do disco (`file://`), o navegador não deixa a Web Audio ler o arquivo, e a fusão é feita pelo volume do elemento de áudio.
- Se uma faixa não carregar, toca a música gerada em tempo real no clima mais próximo.
- A CSP do `index.html` libera áudio só do próprio site (`media-src 'self'`).

## Aparência e galeria da jornada

`js/data/appearance.js` define as aparências (`HERO_LOOKS`), os retratos pintados disponíveis (`HERO_PORTRAITS`) e a galeria. `state.look` e `state.journey` são validados em `sanitizeSave()`: aparência desconhecida volta ao padrão, e a galeria aceita só um registro por capítulo, com roupa, arma e amuleto que existem.

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
| `tests/rigor.mjs` | O jogo servido por HTTP e jogado por toques num iPhone emulado: toda escolha de toda cena responde a um toque, partidas inteiras até o epílogo, tela do personagem, cinema com todos os inimigos, toque que atravessa o cinema, telas de 320 px, 3.000 saves corrompidos, arquivos faltando |
| `tests/cinema.mjs` | Cinema abre, fecha e pode ser pulado; todas as ações e magias encenadas sem erro; modos do menu; movimento reduzido; cartela de capítulo; aparência e galeria, inclusive adulteradas no save |
| `tests/stress.mjs` | Volume de partidas, sessão longa e memória, desempenho da animação, combate em massa, limite de partículas |

Rode `npm test` sempre depois de mexer no código, e `npm run test:stress` se a mudança tocar em combate, animação ou desempenho.

# Relatório de qualidade · Sangue e Névoa

Este relatório documenta a revisão de código e os testes de sabotagem, stress e segurança feitos antes da publicação do projeto: o que foi testado, o que falhou, o que foi corrigido e o que continua em aberto.

## Resumo

| Área | Resultado |
|---|---|
| Análise estática (ESLint) | 26 problemas encontrados, 26 corrigidos. Zero pendências. |
| Código morto e bugs de lógica | 3 funções sem uso removidas, 1 bug narrativo e 1 sobrescrita de `valueOf` global corrigidos |
| Legibilidade | 1.022 usos de variáveis de uma letra renomeados (`S`, `F`, `N`, `P`, `D`) |
| Testes de história | 221 cenas válidas e alcançáveis; partidas completas do Capítulo I ao epílogo sem travamentos |
| Testes de sabotagem | 18 casos. **8 falhavam** antes das correções; hoje 18 de 18 passam |
| Testes de stress | 5 casos. 1 bug encontrado (limite de partículas) e corrigido; hoje 5 de 5 passam |
| Testes de segurança | 6 casos, 6 de 6 passam. 8 problemas de segurança encontrados na revisão e corrigidos |
| Dependências (`npm audit`) | 4 alertas moderados corrigidos. Zero vulnerabilidades |
| Ferramentas em Python (Bandit) | 2 alertas médios e 2 baixos corrigidos. Nenhum problema restante |
| Integração contínua | GitHub Actions roda formatação, lint, testes, auditoria e stress a cada envio |

Todos os testes podem ser reproduzidos com os comandos da seção [Como reproduzir](#como-reproduzir).

---

## 1. Revisão de código (clean code)

### 1.1 Análise estática com ESLint

O ESLint foi configurado com as regras recomendadas mais `eqeqeq` (comparação estrita), `no-eval`, `no-implied-eval` e `no-new-func`. Como os scripts do jogo compartilham o escopo global, a lista de nomes globais é **gerada automaticamente** a partir das declarações de cada arquivo (`tools/globais.mjs`). Isso permite ao ESLint apontar nomes indefinidos entre arquivos, e o próprio gerador falha se um nome global for declarado em dois arquivos.

| Problema | Ocorrências | Correção |
|---|---|---|
| Comparação frouxa (`==`, `!=`) | 8 | Trocada por `=== null` ou pelo operador `??`, deixando explícito o caso tratado |
| Bloco `catch` vazio com variável sem uso | 7 blocos (15 alertas) | `catch` sem variável e com um comentário explicando por que é seguro ignorar o erro |
| Variável declarada e nunca usada | 3 | Removida |
| **Total** | **26** | **Zero pendências** |

### 1.2 Problemas que a análise estática não pega

Uma varredura própria cruzou as declarações globais com todos os usos, e as marcas da história (`flags`) gravadas com as lidas.

| Achado | Tipo | Correção |
|---|---|---|
| Função global chamada `valueOf` sobrescrevia `window.valueOf`, método que todo objeto JavaScript herda | Bug latente | Renomeada para `statValue` |
| `clearSave`, `spentPoints` e `vespDone` nunca eram chamadas | Código morto | Removidas |
| A marca `c4_tam_visto` era lida no Capítulo IV, mas nunca definida. Quem via Tam morrer lia, logo depois, "mais tarde você vai saber que Tam morreu" | Bug narrativo | A marca agora é definida na cena da morte de Tam |
| 25 marcas são gravadas e nunca lidas (por exemplo, `cap3_fim`, `ailsa_salva`) | Intencional | Mantidas como registro de progresso para capítulos futuros; documentado em `docs/ARQUITETURA.md` |

### 1.3 Nomes

O protótipo usava variáveis globais de uma letra. Elas foram renomeadas para nomes que dizem o que são:

| Antes | Depois | Ocorrências |
|---|---|---|
| `S` | `state` (estado do jogo) | 748 |
| `F(...)` | `hasFlag(...)` | 226 |
| `D` | `draft` (rascunho da tela de Aprendizados) | 40 |
| `N()` | `heroName()` | 6 |
| `P(...)` | `toParagraphs(...)` | 2 |

As letras `"F"`, `"M"`, `"D"` e `"MD"` das dificuldades de perícia são termos do sistema de regras (Fácil, Média, Difícil, Muito Difícil) e foram mantidas. O ESLint rodou depois da renomeação e apontou 7 usos com espalhamento (`...S`) que a regra de troca não cobria; todos foram corrigidos.

### 1.4 Organização

- Validação de save em módulo próprio (`js/core/save-validation.js`), com uma função pequena para cada parte do save.
- Constantes nomeadas no lugar de números mágicos nos trechos novos (`SAVE_LIMITS`, `MAX_PARTICLES`).
- Formatação padronizada com Prettier, verificada na integração contínua.
- Cada arquivo começa com um comentário dizendo o que ele faz.

---

## 2. Testes de sabotagem

**Objetivo:** quebrar o ambiente de propósito e verificar se o jogo continua jogável, sem erros de execução.
**Arquivo:** `tests/sabotage.mjs` · **Comando:** `npm run test:sabotage`

| # | Sabotagem | Antes | Depois |
|---|---|---|---|
| 1 | Armazenamento do navegador bloqueado (modo privado) | ✓ | ✓ jogo segue sem salvar |
| 2 | Save com JSON inválido | ✓ | ✓ descartado |
| 3 | Save vazio (`{}`) | ✗ travava | ✓ descartado |
| 4 | Save com tipo errado (lista) | ✗ travava | ✓ descartado |
| 5 | Save com tipo errado (texto) | ✗ travava | ✓ descartado |
| 6 | Save nulo | ✓ | ✓ descartado |
| 7 | Save com cena inexistente | ✗ travava | ✓ volta ao início do capítulo |
| 8 | Save com arma, armadura e amuleto inexistentes | ✗ travava | ✓ itens inválidos descartados |
| 9 | Save com números absurdos (texto, nulo, ±infinito) | ✓ mas com valores inválidos | ✓ valores limitados a faixas plausíveis |
| 10 | Save de versão antiga, sem os campos novos | ✗ travava | ✓ campos completados |
| 11 | Save com combate corrompido | ✗ travava | ✓ volta à cena anterior à luta |
| 12 | Save com origem inexistente | ✗ travava | ✓ descartado |
| 13 | Todas as imagens fora do ar | ✓ | ✓ ilustrações procedurais assumem |
| 14 | Navegador sem Web Audio | ✓ | ✓ jogo segue em silêncio |
| 15 | 200 cliques em rajada nas escolhas e no combate | ✓ | ✓ |
| 16 | Duplo clique em todos os botões de combate | ✓ | ✓ |
| 17 | Janela redimensionada 100 vezes durante a animação | ✓ | ✓ |
| 18 | Telas sobrepostas abertas e fechadas 15 vezes seguidas | ✓ | ✓ nenhuma fica presa |

**Causa das 8 falhas:** o save era lido com `JSON.parse` e usado sem nenhuma validação.

**Correção:** `sanitizeSave()` trata o save como dado não confiável. Ela aceita só chaves que existem nas tabelas do jogo (com `Object.hasOwn`, o que também barra chaves como `__proto__`), limita números a faixas plausíveis, completa campos ausentes e reconstrói o combate a partir do bestiário. Quando o save não tem como ser aproveitado, ele é descartado e o jogador começa de novo.

---

## 3. Testes de stress

**Objetivo:** medir o comportamento sob volume, em sessões longas e no limite de desempenho.
**Arquivo:** `tests/stress.mjs` · **Comando:** `npm run test:stress` (200 partidas) ou `node tests/stress.mjs 500`

| Teste | Critério | Resultado |
|---|---|---|
| Partidas completas com escolhas aleatórias | Nenhuma travada; save abaixo de 200 KB | 500 partidas: zero travadas; maior save de 3,2 KB; cerca de 550 ms por partida |
| Sessão longa: 3.000 trocas de cena com a tela desenhada | Memória cresce menos de 25 MB | 4,1 → 4,8 MB; sem vazamento |
| Desempenho da animação nas 6 cenas mais pesadas | Quadro médio abaixo de 25 ms; menos de 5% de quadros lentos | 16,7 ms por quadro (60 fps, o teto do navegador); 0% de quadros lentos |
| 3.000 combates contra grupos aleatórios, com técnicas, magias e amuletos | Nenhum estado inválido (vida ou fadiga não numérica) | Zero estados inválidos; 4,7 rodadas por luta em média |
| 500 passagens rápidas do cursor sobre as escolhas | No máximo 75 partículas de vento | **Antes: 77 (bug).** Depois: 75 |

**Bug encontrado:** o vento guia checava o limite de 75 partículas antes de criar um lote de 3 a 6 de uma vez, então o total ultrapassava o teto. Agora o lote é cortado para nunca passar de `MAX_PARTICLES`.

**Observação de equilíbrio:** o robô dos testes de stress nunca gasta pontos nem melhora itens, de propósito, para medir o pior caso. Nessas condições, cerca de 23% das partidas terminam em morte e a maioria dos finais é o "sacrifício da Dama" (derrota na batalha final). No teste de história, em que o robô evolui o personagem como um jogador faria, não houve mortes. Isso indica que a progressão é necessária, como deve ser, mas convém ouvir jogadores reais antes de mexer nos números.

---

## 4. Testes de segurança

**Arquivo:** `tests/security.mjs` · **Comando:** `npm run test:security`

### 4.1 Modelo de ameaças

O jogo é uma página estática, sem servidor, sem contas e sem envio de dados. As superfícies de ataque são:

- **Entrada do jogador:** o nome do herói, exibido em várias telas.
- **Armazenamento local:** o save e as preferências de áudio podem ser editados por qualquer pessoa com acesso ao navegador, ou por uma extensão maliciosa.
- **Recursos externos:** as fontes do Google.
- **Ferramentas de desenvolvimento:** os scripts em Python que usam a chave da API do Gemini.

### 4.2 Testes automatizados

| # | Ataque | Resultado |
|---|---|---|
| 1 | XSS pelo nome do herói: 5 cargas diferentes (`<img onerror>`, `<svg onload>`, `</title><script>`, `javascript:`, `${...}`), exibidas em cenas, ficha, Personagem, Aprendizados, tela de morte, epílogo e tela inicial | ✓ todo nome é exibido como texto |
| 2 | XSS por save adulterado: HTML no nome, no nome do inimigo, nas marcas da história e no histórico de combate, e um aliado falso com dano `99d` | ✓ HTML descartado, aliado falso recusado |
| 3 | Poluição de protótipo com `__proto__` e `constructor` no save e nas preferências de áudio | ✓ nenhuma propriedade injetada |
| 4 | Script injetado na página e código montado a partir de texto (`setTimeout` com texto, equivalente a `eval`) | ✓ ambos bloqueados pela CSP, com 2 violações registradas |
| 5 | Tráfego de rede durante o jogo, com música ligada | ✓ só arquivos locais e fontes do Google |
| 6 | Varredura do código: chaves do Google, OpenAI, Anthropic e GitHub, chaves privadas, chaves escritas no código, `eval`, `document.write`, URLs `http://` e manipuladores de evento inline | ✓ 47 arquivos, nenhum achado |

### 4.3 Problemas encontrados e corrigidos

| # | Problema | Severidade | Correção |
|---|---|---|---|
| 1 | Save usado sem validação: um save adulterado podia travar o jogo ou introduzir valores inválidos | Média | `sanitizeSave()` (seção 2) |
| 2 | Preferências de áudio copiadas com `Object.assign`: uma chave `__proto__` no armazenamento trocava o protótipo do objeto | Média | Só os campos `music` e `sfx` são copiados, e apenas se forem booleanos |
| 3 | O nome do inimigo salvo era aceito se *começasse* com o nome real, o que permitia anexar HTML depois dele (encontrado na revisão do próprio validador) | Média | Só o nome do bestiário, seguido opcionalmente do número ("Cão de caça 2") |
| 4 | Sem Política de Segurança de Conteúdo (CSP) | Média | CSP declarada no `index.html` (ver abaixo) |
| 5 | Um manipulador de evento inline (`onerror="..."`) impedia uma CSP rígida | Baixa | Trocado por `addEventListener` |
| 6 | O histórico de combate, salvo em HTML, era restaurado do save | Baixa | Nunca é restaurado; o combate recomeça com o histórico vazio |
| 7 | Ferramentas em Python: o nome do modelo, vindo da linha de comando ou do ambiente, entrava no caminho da URL da API sem validação | Baixa | Nome validado (`[\w.-]+`), URL conferida antes da chamada |
| 8 | Ferramentas em Python: proteção feita com `assert`, que some quando o Python roda otimizado (`-O`) | Baixa | Trocada por uma checagem que sempre roda |

### 4.4 Política de Segurança de Conteúdo

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com;
img-src 'self' data: blob:;
media-src 'none'; connect-src 'none'; object-src 'none';
base-uri 'none'; form-action 'none'
```

Também é enviado `referrer: no-referrer`. A CSP funciona tanto no GitHub Pages quanto com a página aberta direto do disco, o que foi verificado pelos testes.

### 4.5 Dependências e ferramentas

- **`npm audit`:** 4 alertas moderados, todos de uma falha de negação de serviço na biblioteca `minimatch` usada pelo ESLint ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)). A correção automática sugerida rebaixaria para o ESLint 9, que está descontinuado. Em vez disso, a versão corrigida da `minimatch` (11.0.5) foi forçada com `overrides` no `package.json`, e o ESLint foi testado com ela. Resultado: zero vulnerabilidades. As dependências são só de desenvolvimento; nenhuma vai para o jogo publicado.
- **Bandit** (análise de segurança de Python) nas ferramentas: 2 alertas médios (B310, `urlopen` aceita qualquer esquema de URL) e 2 baixos (B101, uso de `assert`). Corrigidos conforme os itens 7 e 8 acima. Resultado: nenhum problema.
- A chave da API do Gemini é lida da variável de ambiente `GEMINI_API_KEY` e nunca é gravada em arquivo nem exibida.

---

## 5. Limitações conhecidas e recomendações

| Item | Situação | Recomendação |
|---|---|---|
| Proteção contra *clickjacking* (`frame-ancestors`) | Não pode ser declarada numa tag `<meta>`, e o GitHub Pages não permite cabeçalhos HTTP próprios | Se o jogo for hospedado num servidor próprio, enviar `Content-Security-Policy: frame-ancestors 'none'` como cabeçalho. O risco é baixo: o jogo não tem ações sensíveis |
| `style-src 'unsafe-inline'` | Necessário para os atributos `style` das barras de vida | Trocar os atributos `style` por variáveis CSS definidas via JavaScript, se quiser remover a exceção |
| Fontes do Google | O navegador de quem joga se conecta aos servidores do Google | Hospedar as fontes no próprio repositório (todas têm licença SIL OFL) |
| Saves | Ficam só no navegador de quem joga, e somem se os dados do site forem apagados | Uma opção de exportar e importar o save (que passaria pela mesma `sanitizeSave()`) |
| Equilíbrio | Sem evoluir o personagem, cerca de 23% das partidas terminam em morte | Ajustar com base em partidas de jogadores reais |
| Imagem `aldeia` | A pintura ainda mostra lanternas alaranjadas parecidas com abóboras; em 1296 as lanternas eram de nabo | Gerar de novo: `python3 tools/gerar_imagens.py aldeia` |
| Versão hospedada no Claude | O link de jogo criado durante o desenvolvimento usa a versão anterior a esta revisão | Usar o GitHub Pages como versão oficial |

---

## 6. Integração contínua

O arquivo `.github/workflows/ci.yml` roda a cada envio para a branch `main` e a cada pull request:

1. Instala as dependências (`npm ci`) e o Chromium do Playwright.
2. Verifica a formatação (`npm run format:check`).
3. Roda lint e os testes de história, sabotagem e segurança (`npm test`).
4. Audita as dependências (`npm audit --audit-level=moderate`).
5. Roda o stress com 100 partidas.

---

## Como reproduzir

```bash
npm install
```

```bash
npx playwright install chromium
```

```bash
npm test
```

```bash
npm run test:stress
```

Para usar um Chromium já instalado no sistema em vez de baixar um, defina `CHROMIUM_PATH` com o caminho do executável.

```bash
pip install bandit && python3 -m bandit -r tools
```

# Histórico de versões

## 1.2.0 · Modo cinema e aparência do herói

### Novidades
- **Modo cinema no combate:** depois de cada ação, a luta é encenada em tela cheia. Faixas de cinema, câmera que acompanha e aproxima, golpes por tipo de arma (corte, impacto, perfuração, pedra de funda e flecha), magias com efeitos próprios, faíscas, números de dano, tremor e câmera lenta no acerto crítico. Os dados rolados aparecem na faixa de baixo, com a legenda da ação.
- **Movimentos com molas amortecidas:** avanço, golpe, recuo, esquiva e queda são suaves e contínuos, com inclinação pela velocidade e respiração lenta.
- **Abertura de capítulo** com cartela de título sobre a pintura, e **fusão** entre as pinturas das cenas. O texto entra parágrafo a parágrafo.
- **Aparência do herói** escolhida na criação (quatro opções). A figura muda de cabelo, pele e barba.
- **Galeria da jornada** na tela do personagem: como o herói estava no começo de cada capítulo.
- Opção **Cenas de luta** no menu: completas, rápidas ou desligadas. Um toque ou tecla pula a cena.
- **32 retratos pintados do herói** (4 aparências em 8 roupas), com o mesmo rosto em todas as roupas. Aparecem na criação, no cinema, na tela do personagem (aba de roupas) e na galeria da jornada. Gerados com `heroi:<aparência>_<roupa>` em `tools/gerar_imagens.py`.

### Segurança e testes
- `look` e `journey` do save validados em `sanitizeSave()`.
- 11 testes novos em `tests/cinema.mjs`, incluídos no `npm test`.

## 1.1.0 · Revisão de qualidade e segurança

### Segurança
- Política de Segurança de Conteúdo (CSP) e `referrer: no-referrer` no `index.html`.
- Saves validados campo a campo antes do uso (`js/core/save-validation.js`).
- Corrigida a poluição de protótipo pelas preferências de áudio.
- Nome de inimigo vindo do save não aceita mais texto extra.
- Histórico de combate não é mais restaurado do save.
- Manipulador de evento inline trocado por `addEventListener`.
- Ferramentas em Python validam o nome do modelo e a URL da API.
- Dependência `minimatch` forçada para a versão corrigida (GHSA-g3hv-75wg-m249).

### Correções
- Save vazio, de tipo errado, de versão antiga, com cena, item, origem ou combate inválidos não trava mais o jogo.
- Capítulo IV: quem via Tam morrer não lê mais que "vai saber depois" da morte dele.
- O vento guia não passa mais do limite de 75 partículas.
- A função global `valueOf` não sobrescreve mais `window.valueOf` (renomeada para `statValue`).

### Código
- ESLint 10 configurado, com lista de globais gerada automaticamente; 26 problemas corrigidos.
- Variáveis globais de uma letra renomeadas (`state`, `hasFlag`, `heroName`, `toParagraphs`, `draft`).
- Código morto removido (`clearSave`, `spentPoints`, `vespDone`).

### Testes e automação
- Testes de sabotagem (18 casos), stress (5 casos) e segurança (6 casos).
- Integração contínua no GitHub Actions.
- Relatório completo em `docs/RELATORIO-DE-QUALIDADE.md`.

## 1.0.0 · Primeira versão pública

- Seis capítulos, 221 cenas e quatro finais, de 1296 a 1314.
- Regras inspiradas em GURPS, combate por turnos, magia em quatro círculos, forja e técnicas.
- 117 pinturas (97 cenas e 20 retratos) e trilha sonora gerada no navegador.

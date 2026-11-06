# Histórico de versões

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

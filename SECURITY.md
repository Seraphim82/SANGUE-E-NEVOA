# Política de segurança

## Versões cobertas

Só a versão mais recente da branch `main` recebe correções de segurança.

## Como relatar uma vulnerabilidade

Não abra uma issue pública. Use a aba **Security → Report a vulnerability** do repositório no GitHub, que cria um relato privado. Inclua:

- o que você encontrou e onde (arquivo e linha, se souber);
- como reproduzir;
- qual o impacto que você imagina.

A resposta vem em até 7 dias. Se a falha for confirmada, a correção é publicada e o relato é creditado a você, se quiser.

## O que o projeto já faz

- **Sem servidor e sem dados pessoais:** o jogo é uma página estática. Nada é enviado para fora do navegador de quem joga.
- **Política de Segurança de Conteúdo (CSP):** só scripts do próprio site; nenhum script inline, `eval`, plugin, formulário ou conexão de rede além das fontes do Google.
- **Todo texto exibido passa por escape de HTML**, inclusive o nome do herói.
- **Saves tratados como dados não confiáveis:** validados campo a campo por `sanitizeSave()` antes do uso, com proteção contra poluição de protótipo.
- **Nenhum segredo no repositório:** a chave da API do Gemini, usada só pelas ferramentas de desenvolvimento, vem da variável de ambiente `GEMINI_API_KEY`.
- **Testes automatizados de segurança** (`npm run test:security`) e auditoria de dependências na integração contínua.

Detalhes, testes e limitações conhecidas: [docs/RELATORIO-DE-QUALIDADE.md](docs/RELATORIO-DE-QUALIDADE.md).

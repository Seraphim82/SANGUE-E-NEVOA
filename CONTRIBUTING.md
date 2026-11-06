# Como contribuir

Obrigado pelo interesse em Sangue e Névoa. Este guia explica como preparar o ambiente, as convenções do código e o que conferir antes de enviar uma mudança.

## Preparando o ambiente

Requer Node.js 20 ou mais novo.

```bash
npm install
```

```bash
npx playwright install chromium
```

Para jogar enquanto desenvolve, abra o `index.html` no navegador ou rode `npm start`.

## Convenções

- **Scripts comuns, não módulos ES.** O jogo precisa abrir direto do disco (`file://`), onde módulos ES não funcionam. Os arquivos compartilham o escopo global e são carregados na ordem do `index.html`. Ao criar um arquivo novo, acrescente a tag `<script>` no lugar certo da ordem.
- **Um nome global por arquivo.** `npm run lint` falha se o mesmo nome for declarado em dois arquivos.
- **Nomes que dizem o que são.** Variáveis de uma letra só para usos locais e curtos (`c` para o contexto do canvas, `i` para índices).
- **Comparações estritas** (`===`) e nada de `eval`, `new Function`, `document.write` nem manipuladores de evento inline (`onclick="..."`). A CSP do jogo bloqueia esses recursos.
- **Todo texto vindo do jogador ou do save passa por `esc()`** antes de ir para a página.
- **Dados do save não são confiáveis.** Campo novo no estado do jogo precisa de validação em `js/core/save-validation.js`.
- **Comentários explicam o porquê**, não o quê. Um `catch` vazio precisa de um comentário dizendo por que é seguro ignorar o erro.
- **Textos do jogo em português do Brasil**, sem marcar gênero do herói: ele pode ser homem ou mulher.
- **Fatos históricos e lendas:** quando uma cena usa uma lenda, o texto avisa o jogador.

Como acrescentar cenas, inimigos e imagens: [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Antes de enviar

```bash
npm run format
```

```bash
npm test
```

`npm test` roda lint, o teste de história, os testes de sabotagem e os de segurança. Se a mudança mexe em combate, desempenho ou animação, rode também `npm run test:stress`.

No pull request, descreva o que mudou e por quê, e como você testou. Se a mudança altera regras ou números de equilíbrio, atualize o [Livro do Jogador](docs/livro-do-jogador.md).

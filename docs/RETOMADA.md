# Retomada do projeto Sangue e Névoa

Ponto de parada em 17/11/2026. Este documento resume onde o projeto está, o que está guardado em cada lugar e por onde continuar.

## Situação em uma tabela

| Item | Situação | Onde está |
|---|---|---|
| Jogo publicado (versão 1.5.0) | No ar | branch `main` e https://seraphim82.github.io/SANGUE-E-NEVOA/ |
| Narração (voz Algenib) | Gerando sozinha, 50 falas por dia (54 de 937 prontas) | branch `narracao` |
| Conquistas e estatísticas | Pronto e testado | `narracao` em diante |
| Jornadas salvas (3 espaços, exportar e importar) | Pronto e testado | `narracao` em diante |
| Carta do Herói (carta rara dourada) | Pronto e testado | `multiplayer` em diante |
| Fase 2: Mesa local (2 a 4 heróis no mesmo aparelho) | Pronto e testado | `mesa-local` em diante |
| Bateria de ataques da Mesa | Pronto, 1 falha encontrada e corrigida | `seguranca-mesa` em diante |
| Fase 3: sala online segura (sem servidor) | Pronto e testado | `conexao` |
| Fase 4: jogo da Mesa pela rede | **Próximo passo** | — |
| Fase 5: revisão final e teste fechado com amigos | A fazer | — |

**Nada além da versão 1.5.0 foi publicado.** Decisão do dono do projeto: publicar tudo junto (versão 1.6.0) só quando a narração terminar, depois de aprovação.

## Branches no GitHub (cada uma contém a anterior)

```
main (1.5.0, publicado)
 └─ narracao        narração parcial, conquistas, jornadas salvas, trailer narrado
     └─ multiplayer     Carta do Herói, docs/MULTIPLAYER.md
         └─ mesa-local      Modo Mesa local
             └─ seguranca-mesa  ataques da Mesa, votos só com escolhas reais
                 └─ conexao         sala online segura, 5 opções de contrassenha  ← mais recente
```

A rotina diária grava só em `narracao` (arquivos de `audio/narracao/` e `js/data/narration-index.js`). Antes de publicar, é preciso juntar o trabalho: trazer a narração mais recente de `narracao` para `conexao` (ou para a branch final) e então fazer o merge na `main`.

## Rotina diária da narração

- Tarefa agendada: **"Narração diária de Sangue e Névoa"**, todo dia às 1h23 no horário da Califórnia (6h23 em Brasília). Primeira execução: 17/11/2026.
- Abre uma sessão nova, gera até 50 falas com `gemini-2.5-pro-preview-tts` e a voz Algenib (limite diário da conta), confere, faz commit e envia para `narracao`. Manda notificação no celular com o resumo.
- Quando terminar (cerca de 18 dias), roda os testes, desliga a si mesma e pergunta se pode publicar a 1.6.0.
- Se os créditos do Gemini acabarem, para e avisa.
- Total: 937 falas (921 parágrafos de cena + 16 frases do trailer do final). Lista em `tools/narracao.json`.

## Decisões tomadas pelo dono do projeto

- Narração: voz Algenib do modelo Pro (aceito o limite de 50 por dia). Trilha sonora continua por baixo da narração.
- Multiplayer sem servidor, com segurança e preservação de dados acima de tudo.
- Convite individual de uso único; contrassenha de **5 palavras + 2 dígitos** enviada por outro caminho; o mestre escolhe 1 entre **5 opções** sorteadas; contrassenha escondida na tela; aviso de tentativa errada; selo "✓ contrassenha confirmada" no pedido de entrada.
- Mestre aprova, recusa e bane. Lista de privacidade com "Li e autorizo" obrigatória.
- Mantém o STUN público do Google. **Sem servidor TURN.**
- Escolhas por votação, com voto de minerva do mestre. Testes de dados em grupo: vale se pelo menos metade acertar. Pontos individuais para cada herói. Ninguém morre de vez na Mesa.
- Publicar só depois de tudo pronto e aprovado.

## Próximo passo: fase 4 (jogo da Mesa pela rede)

Juntar a fase 2 (regras da Mesa) com a fase 3 (conexão segura):

- O aparelho do mestre é a única autoridade: roda o jogo, rola os dados e salva a campanha a cada passo.
- Os jogadores enviam só intenções (votar numa escolha, ação de combate, gastar pontos, comprar, equipar), conferidas pelo mestre contra o que é permitido naquele momento.
- O mestre envia a cada jogador o estado necessário para desenhar a tela, já validado; o jogador nunca recebe HTML.
- Reconexão com convite novo + contrassenha + ficha de lugar, recuperando o mesmo herói.
- Fim da campanha: a sala é apagada e cada jogador recebe a sua Carta do Herói.
- Testes: partidas entre vários contextos do navegador, trapaças (votar fora da vez, ação de outro herói, dados falsos), quedas de conexão no meio do combate e reconexão.

Depois, a fase 5: revisão final de segurança e teste fechado com os amigos antes de liberar.

## Como rodar os testes

```bash
npm test
```

```bash
npm run test:rigor
```

```bash
node tests/stress.mjs 100
```

Neste ambiente, use `CHROMIUM_PATH=/opt/pw-browsers/chromium-1243/chrome-linux64/chrome`. A bateria rigorosa precisa de uns 40 minutos de limite. Rode um teste pesado por vez (a memória é limitada).

Últimos resultados (branch `conexao`): suíte completa 88/88, conexão 20/20, rigorosa 18/18, stress 5/5.

## Observações

- Nenhum dado pessoal do dono do projeto está no repositório nem no histórico do Git (verificado por teste automático).
- A chave do Gemini fica só no segredo de rede do ambiente, nunca em arquivos.
- O GitHub avisou que o endereço do repositório agora é `Seraphim82/SANGUE-E-NEVOA` (com maiúsculas); os envios continuam funcionando.

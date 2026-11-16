# Mesa de Sangue e Névoa: projeto do multiplayer

Este documento registra as decisões do modo multiplayer **antes** da implementação. Segurança e preservação dos dados dos jogadores têm prioridade sobre qualquer conveniência. Mudanças nestas regras precisam ser discutidas e registradas aqui.

## Princípios

1. **Sem servidor do jogo.** Nada de contas, cadastro ou banco de dados. Os aparelhos se conectam direto (WebRTC), com criptografia obrigatória (DTLS).
2. **O aparelho do mestre é a única autoridade.** Só ele rola dados, aplica regras e guarda a campanha. Os outros jogadores enviam apenas intenções, conferidas contra o que é permitido naquele momento.
3. **Toda mensagem recebida é suspeita.** Tamanho máximo, tipos conhecidos, campos validados, limite de mensagens por segundo, nenhum texto da rede vira HTML.
4. **Nada é compartilhado sem autorização.** Antes de criar ou entrar numa mesa, o jogo lista tudo o que será compartilhado; o mestre e cada jogador precisam autorizar.
5. **Nenhum dado se perde.** A campanha é salva no aparelho do mestre a cada passo; quedas de conexão não apagam nada.

## Convites

- O mestre gera **um convite por jogador**. Cada convite tem um lugar na mesa e só pode ser usado **uma vez**: o primeiro que completar a entrada ocupa o lugar e o convite expira. Para voltar depois de uma queda, o mestre gera um convite novo.
- Cada convite tem uma **contrassenha aleatória** gerada pelo jogo (palavras sorteadas), que o mestre envia **por outro caminho** (outra conversa, ligação ou pessoalmente). A contrassenha nunca viaja no convite.
- Os códigos de convite e de resposta contêm os dados de conexão (incluindo o endereço de internet). Devem ser enviados **no privado**.

## Autenticação

- A contrassenha é transformada numa chave (PBKDF2 com sal aleatório do convite). Depois que a conexão cifrada abre, os dois lados trocam provas (HMAC) **amarradas às impressões digitais DTLS da própria conexão**. Assim:
  - quem tem só o convite, sem a contrassenha, não entra;
  - quem tentar se colocar no meio da conexão (trocando os códigos) não consegue produzir a prova, e a entrada é recusada.
- Depois de provada a contrassenha, o mestre ainda **aprova** a entrada vendo o nome do jogador.
- Cada jogador recebe uma **chave de lugar** secreta, guardada no aparelho dele, para recuperar o mesmo herói ao reconectar com um convite novo. Ninguém mais consegue assumir aquele herói.
- O mestre pode **banir** um jogador a qualquer momento: a conexão é fechada e a chave de lugar é revogada.

## Privacidade (lista mostrada antes de autorizar)

- Nome do herói, aparência, ficha e equipamento de cada jogador são vistos pelos outros da mesa.
- A ligação direta revela o **endereço de internet (IP)** de cada aparelho aos outros da mesa.
- Para atravessar roteadores, o navegador consulta um servidor público de STUN (do Google), que vê o endereço de internet, mas nada do jogo.
- Nada é enviado a servidores do jogo, porque eles não existem. A campanha fica só no aparelho do mestre.

## Regras de grupo

- **Escolhas da história:** votação. Em caso de empate, decide o mestre (voto de minerva).
- **Testes de dados nas escolhas:** todos os heróis rolam com a própria perícia; a ação vale se **pelo menos metade** acertar (2 jogadores: 1; 3: 2; 4: 2).
- **Recompensas:** cada herói ganha os próprios pontos de personagem.
- **Combate:** cada herói age na sua vez; os inimigos escolhem alvos entre os heróis de pé. Quem cai fica fora até o fim da luta; a luta só é perdida se todos caírem. **Ninguém morre de vez na Mesa**, para preservar o progresso de todos.
- **Compras e escolhas pessoais** (que só mudam o próprio herói e voltam para a mesma cena) não são votadas: valem para o herói ativo.
- **Recompensas e danos da história** valem para cada herói.

## Fim da campanha

A sala é apagada do aparelho do mestre. Cada jogador recebe a sua **Carta do Herói**, uma imagem gerada no próprio aparelho.

## Fases

1. ✅ Carta do Herói (também no jogo sozinho).
2. ✅ Modo Mesa local: 2 a 4 heróis no mesmo aparelho, votação e turnos (`js/core/mesa.js`, `tests/mesa.mjs`).
3. Camada de conexão segura e bateria de ataques.
4. Mesa online: reconexão, banimento, encerramento.
5. Revisão final de segurança e teste fechado.

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
3. ✅ Camada de conexão segura e bateria de ataques (`js/net/`, `js/ui/sala.js`, `tests/conexao.mjs`). Nesta fase a sala conecta, autentica, aprova e remove jogadores; o jogo em conjunto pela rede é a fase 4.
4. Mesa online: reconexão, banimento, encerramento.
5. Revisão final de segurança e teste fechado.

## Protocolo da conexão (fase 3)

### Códigos

| Código | Quem gera | Conteúdo |
|---|---|---|
| `SENM1.…` (convite) | Mestre, um por lugar | `{v, mesaId, lugar, sal, oferta}`: versão, identidade da mesa (16 bytes), lugar (1 a 3), sal da contrassenha (16 bytes) e a oferta WebRTC (SDP). **A contrassenha não vai no convite.** |
| `SENR1.…` (resposta) | Jogador | `{v, mesaId, lugar, resposta}`: a resposta WebRTC (SDP). |

Os códigos são JSON comprimido (`deflate-raw`, ou sem compressão em navegadores sem `CompressionStream`) em base64url. Antes de qualquer uso, o jogo confere o prefixo, o tamanho (no máximo 8 KB descomprimido, com a descompressão interrompida ao passar do limite), os campos exatos e o formato da SDP (com impressão digital DTLS).

### Contrassenha

Cinco palavras sorteadas de uma lista de 256 (sem acentos, fáceis de ditar) e dois dígitos: cerca de 46,6 bits, gerados com `crypto.getRandomValues`.

**Cinco opções para o mestre.** Ao gerar o convite de um lugar, o jogo sorteia cinco contrassenhas diferentes e o mestre escolhe uma (por exemplo, a mais fácil de ditar). Só a escolhida vale: a chave do lugar é derivada só dela, e as outras quatro são apagadas da memória na hora. Antes da escolha, o lugar não aceita resposta. Depois da escolha, a contrassenha fica escondida na tela do mestre ("•••••"); ela só entra na página, por `textContent`, quando o mestre toca em "Mostrar", e sai de novo em "Esconder". Assim, quem olhar a tela ao lado ou vir um print não a descobre.

**Avisos ao mestre.** Cada tentativa que falha aparece na tela: "Alguém tentou entrar no lugar N com a contrassenha errada (tentativa X de 3)". Na terceira, o convite é queimado e a tela avisa. Um pedido de entrada só chega ao mestre depois que a prova da contrassenha deu certo, e aparece com o selo "✓ contrassenha confirmada" ao lado de Aprovar e Recusar. É normalizada (minúsculas, sem acentos, partes separadas por hífen), então pode ser ditada ou digitada com espaços. A chave é derivada com **PBKDF2-SHA-256, 310 000 iterações**, com o sal do convite. A contrassenha e a chave ficam só na memória e são apagadas assim que o jogador é autenticado ou o convite é queimado.

### Autenticação

Quando o canal cifrado (DTLS) abre:

1. Mestre → jogador: `desafio {nM}` (16 bytes aleatórios).
2. Jogador → mestre: `prova {nJ, mac}`, com `mac = HMAC(chave, T|J|nM|nJ)`.
3. Mestre confere em tempo constante e responde `prova-mestre {mac}`, com `mac = HMAC(chave, T|M|nM|nJ)`.
4. Jogador confere a prova do mestre. Só então manda `entrar {nome, ficha}`.

`T = "SEN-MESA-1|mesaId|lugar|digitalMestre|digitalJogador"`, com as impressões digitais DTLS tiradas das SDPs local e remota de cada lado. Se alguém trocar o convite ou a resposta no caminho, cada lado vê outras impressões digitais, e as provas não conferem.

### Uso único, tentativas e fichas

- Um lugar aceita uma única autenticação. Depois dela, o convite, a contrassenha e a chave são descartados; outra resposta para o mesmo convite é recusada, e uma resposta já usada (replay) também.
- Uma tentativa com a contrassenha errada fecha a conexão e conta como falha. O mestre recebe uma oferta nova com a mesma contrassenha. Na **terceira falha, o convite é queimado** e a contrassenha apagada: só um convite novo, com contrassenha nova, abre o lugar.
- Na aprovação, o jogador recebe uma **ficha de lugar** de 128 bits, guardada no aparelho dele. O mestre guarda só o SHA-256 dela. Para reconectar, o jogador precisa de convite novo, contrassenha nova e a ficha certa; o mestre vê se a ficha confere antes de aprovar.
- **Banimento:** o mestre remove o jogador, a conexão fecha e o resumo da ficha é apagado (a ficha antiga não reconhece mais aquele jogador).

### Mensagens

Tipos conhecidos, cada um com esquema próprio (campos exatos, formatos conferidos): `desafio`, `prova`, `prova-mestre`, `entrar`, `aprovado`, `recusado`, `removido`, `sair`, `ping`, `pong`. Cada lado só aceita os tipos esperados naquele momento. Mensagens acima de 16 KB, JSON quebrado, tipo desconhecido ou campo a mais são descartadas e contadas; 10 inválidas desconectam. Limite de **20 mensagens por segundo e 300 por minuto**; 3 estouros desconectam. Os avisos `recusado` e `removido` passam mesmo acima do limite, para o jogador saber por que saiu. Nenhum texto da rede vira HTML sem escape.

### O que fica guardado no navegador

- Mestre (`sen-mesa-mestre`): a identidade da mesa e o SHA-256 da ficha de cada lugar aprovado.
- Jogador (`sen-mesa-ficha`): identidade da mesa, lugar e a ficha.
- Contrassenhas, chaves, convites e respostas: só na memória.

### CSP

A CSP do jogo continua com `connect-src 'none'`: o WebRTC não passa por essa diretiva, e a consulta ao STUN é feita pelo próprio navegador. Nenhum `fetch`, WebSocket ou formulário é permitido.

## Modelo de ameaças (fase 3)

| Ameaça | Proteção |
|---|---|
| Alguém pega um convite (por exemplo, num grupo) | Sem a contrassenha, não passa da prova; 3 tentativas queimam o convite |
| Alguém intercepta e troca o convite ou a resposta ("homem no meio") | As provas incluem as impressões digitais DTLS dos dois lados: trocar os códigos muda as digitais, e as provas não conferem |
| Um mestre falso tenta enganar o jogador | O jogador exige a prova do mestre antes de mandar o nome |
| Reusar uma resposta antiga (replay) | Cada oferta aceita uma resposta; as respostas já vistas são recusadas |
| Adivinhar a contrassenha | ~46,6 bits (5 palavras + 2 dígitos), PBKDF2 com 310 000 iterações, e no máximo 3 tentativas por convite |
| Alguém olhando a tela do mestre | A contrassenha escolhida fica escondida até "Mostrar"; as quatro opções descartadas somem da memória |
| Código adulterado, gigante ou "bomba" de compressão | Prefixo, tamanho, campos e SDP conferidos; a descompressão para no limite |
| Nome com HTML ou código | Validado (tamanho, sem caracteres de controle) e exibido com escape |
| Enxurrada de mensagens, mensagens gigantes ou malformadas | Limite de taxa, tamanho e esquema por tipo; insistir desconecta |
| Tomar o lugar de outro jogador ao reconectar | Ficha de 128 bits; o mestre guarda só o resumo e vê se ela confere |
| Vazamento da contrassenha | Nunca vai no convite nem no armazenamento; apagada da memória depois do uso |

### Limitações conhecidas

- **IP visível:** a ligação direta revela o endereço de internet de cada aparelho aos outros da mesa. O jogo avisa e pede autorização.
- **Redes que bloqueiam conexão direta** (algumas redes 4G e corporativas, com NAT simétrico) podem impedir a conexão, porque não há servidor de retransmissão (TURN). Nesses casos, o plano B é compartilhar a tela numa chamada.
- **Recarregar a página do mestre** fecha a sala. As fichas continuam valendo, então os jogadores voltam com convites novos.
- **Gancho de teste:** `window.__senTesteIce` troca os servidores de STUN nos testes. Só pode ser usado por código que já roda na própria página.

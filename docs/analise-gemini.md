# Análise do Gemini (gemini-3.1-pro-preview)

Como um game designer sênior analisando seu projeto sob a ótica de GURPS, game feel digital e design narrativo, vejo um esqueleto promissor, mas que precisa de ajustes matemáticos e estruturais urgentes para funcionar bem, especialmente para um único jogador (solo/digital). 

Aqui está minha análise crítica e detalhada.

---

### 1. Impressão Geral (Pontos Fortes e Fracos)

**Pontos Fortes:**
*   **Forte identidade temática:** A fusão da Primeira Guerra de Independência Escocesa (1296) com o folclore sombrio (Cailleach, Redcaps) é excelente. A regra de "Ferro causa +2 de dano em fadas" integra perfeitamente mecânica e lore.
*   **Design de UI/UX Digital:** A ideia de progressão visual (roupas, amuletos) e o "vento guia" para escolhas mostram uma ótima compreensão de imersão em text adventures modernos.

**Pontos Fracos:**
*   **Curva de letalidade punitiva:** Basear-se em GURPS para um jogo solo sem adaptar a economia de ações ou a resiliência do PC resultará em "save-scumming" (recarregar o jogo constantemente).
*   **Falta de agência real em momentos-chave:** Algumas escolhas no Capítulo I parecem armadilhas de game over imediato ou incentivam metagaming grotesco (como na Cena 6).

---

### 2. Regras e Equilíbrio

O sistema GURPS-lite que você montou é funcional, mas os números criam um ambiente hostil demais para um personagem iniciante de 70 pontos.

**O que eu mudaria (Números Específicos):**
*   **Defesas e Acerto:** Com DX 11 (Ferreiro) e perícia 11, o Aparar é 8 (11/2 = 5,5 + 3). A Esquiva é 8. Isso significa uma chance de defesa de apenas ~25%. Em combates x1, quem ganhar a iniciativa e acertar o primeiro golpe vence. **Mudança:** Dê a todos os personagens um "Bônus de Herói" de +1 em todas as defesas ativas ou aumente a Esquiva base para (Velocidade Básica + 4).
*   **Dano vs. PV:** Uma espada larga (Ingleses) causa 1d+1 corte. Uma rolagem média (4) + 1 = 5. Multiplicado por 1,5 (corte) = 7 de dano (arredondado para baixo). Isso tira 70% da vida de um Pastor (10 PV) em um único golpe, ativando penalidades de choque severas (−4) que garantem a morte no turno seguinte. **Mudança:** Reduza o multiplicador de Corte para x1 no Capítulo I, ou dê aos personagens +3 PV iniciais gratuitos (não atrelados à ST) para sobreviverem ao *early game*.
*   **Choque (Shock Penalty):** A penalidade de −1 por PV perdido até −4 é letal em jogos solo. **Mudança:** Limite a penalidade de choque máxima a −2.
*   **Economia de Melhorias (Digital):** A cota de malha custa 150 pennies. Um camponês começa com ~8. Isso é inalcançável a curto prazo. **Mudança:** Crie estágios intermediários (ex: Couro Fervido com anéis de aço, RD 3, 60 pennies). Para a forja digital, defina os bônus: *Reforçado* (+1 Dano ou +1 RD contra contusão), *Temperado* (+1 Aparar/Defesa), *Lendário* (Ganha propriedade mágica, ex: ignora 1 ponto de RD inimiga).

---

### 3. Narrativa e Ambientação

A coerência histórica está ótima. O roubo da Pedra do Destino por Eduardo I ocorreu em 1296, criando o pano de fundo perfeito.

**Ritmo e Falhas do Capítulo I:**
*   **Cena 4 (O Kelpie):** Enfrentar o Kelpie em combate direto (PV 22, 2d-1 dano) é suicídio para o PC. O jogo precisa *telegrafar* melhor que lutar é má ideia. O teste de "Saber Antigo" para usar o ferro é excelente, mas deve haver pistas na Cena 1 (Mairi ou Duncan) sobre cavalos d'água odiarem ferro.
*   **Cena 6 (O Barrete Vermelho - Crítica Severa):** A opção *"Deixar o Barrete terminar o serviço e depois enfrentá-lo com PV cheios"* é péssimo design. O Barrete tem PV 16 e dano 2d-1. Se o PC lutar contra ele com PV cheios, o PC morre. Se o PC usar *Saber Antigo*, o monstro foge, deixa a arma, e o PC ainda pode matar o Sargento ferido para pegar a espada? Isso recompensa um comportamento psicopata e metagaming.
    *   **Solução:** O Barrete deve estar prestes a matar Blackwood. Se o PC intervir com ferro ou fé (Saber Antigo), o Barrete recua para as sombras, rindo, dizendo que "a velha do inverno manda lembranças". Blackwood, salvo, entrega sua espada (ou um salvo-conduto) como dívida de honra e foge.

---

### 4. Bestiário

*   **Criaturas Fortes Demais (OP):** O *Barrete Vermelho* e o *Kelpie* são chefes de meio de campanha, não de Capítulo I. Suas estatísticas de dano (2d-1) dão "hit-kill" em personagens de 10 PV. Eles devem ser tratados como *puzzles narrativos*, não encontros de combate padrão.
*   **Criaturas Fracas:** Os *Cães de Caça* estão bem balanceados, mas o *Bandoleiro* (PV 11, Defesa 8) é quase idêntico ao recruta.
*   **Novas Criaturas do Folclore Escocês:**
    *   **Baobhan Sìth (Vampiras Feéricas):** Mulheres deslumbrantes que dançam nas florestas. Sugam sangue, mas têm cascos de cervo no lugar dos pés (Percepção para notar). Fraqueza: Ferro. Ótimo para encontros sociais/furtivos.
    *   **Bodach:** Um espírito rastejante que entra pelas chaminés para assustar (ou matar) quem dorme. Pode ser um inimigo de acampamento.
    *   **Ghillie Dhu:** Um espírito guardião das bétulas, coberto de folhas e musgo. Pode ser um aliado instável se o PC respeitar a floresta (Sobrevivência/Herbalismo).

---

### 5. Progressão do Personagem

Para um jogo de múltiplos capítulos, apenas subir perícias (ex: Espada 12 para 13) é entediante. O jogador precisa de **progressão horizontal** (novas opções táticas).

*   **O que falta:**
    *   **Técnicas de Combate (Perks):** Custam 2 a 3 PP. Ex: *Ataque Feroz* (Troca -2 de Esquiva por +2 de Dano no turno); *Defesa com Escudo* (Permite bloquear ataques de projéteis com bônus).
    *   **Amuletos Ativos:** Amuletos não devem dar apenas +bônus passivo. O *Amuleto de Sorveira* poderia ter uma carga ativável: "Queime a sorveira para cancelar automaticamente uma magia feérica lançada contra você". A *Trança de Kelpie* pode permitir respirar debaixo d'água por 1 cena.
    *   **Consequências do Sangue Antigo:** A regra dos "Três Sinais" é fantástica. Mas o que acontece no terceiro? O jogador precisa saber. (Sugestão: No 3º Sinal, a Cailleach envia um Lobo de Inverno ou um Sluagh que interrompe o próximo descanso do PC, impedindo a cura de PV/PF).

---

### 6. Sugestões Concretas para o Capítulo II: "O Martelo e a Pedra"

Neste capítulo, o PC já é um "Fugitivo" (10-24 PP).
*   **Premissa:** A Dama Branca revelou que a Pedra do Destino roubada por Eduardo I (O Martelo dos Escoceses) é falsa. A verdadeira foi escondida pelos monges de Scone nas Highlands.
*   **O Conflito:** O PC precisa chegar ao monastério em ruínas de Scone ou a um vale escondido. Ele é caçado em duas frentes:
    1.  *Patrulhas Inglesas* (buscando rebeldes e o garoto Callum, se ele tiver sido resgatado).
    2.  *Os Lobos de Inverno da Cailleach* (a Deusa Anciã também quer a Pedra para congelar a Escócia para sempre).
*   **Cena Chave:** Uma escolha de rota. Ir pelas estradas (enfrentar ingleses, rolar Diplomacia/Furtividade) ou pelos pântanos (enfrentar Baobhan Sìth ou Sluagh, rolar Sobrevivência/Saber Antigo).
*   **O Retorno de Blackwood:** Se poupado no Cap. I, Blackwood comanda um bloqueio inglês. Ele deixa o PC passar em silêncio, "quitando a dívida". Se Blackwood morreu, o bloqueio é comandado por um Cavaleiro Inglês impiedoso (combate duríssimo).

---

### 7. As 5 Melhorias Mais Importantes (Em Ordem de Prioridade)

1.  **Revisão da Letalidade (Matemática):** Aumente a Defesa Ativa base dos PCs e limite a penalidade de Choque a -2. Um jogo digital solo onde você morre em um turno por causa de um golpe de sorte do inimigo causa frustração imediata.
2.  **Redesign da Cena 6 (O Barrete Vermelho):** Remova as opções de metagaming. Transforme o encontro em um puzzle de sobrevivência/Saber Antigo. Monstros de 16 PV e 2d de dano não podem ser lutados de frente no Capítulo I.
3.  **Adição de Habilidades Ativas/Técnicas:** Crie mecânicas que permitam ao jogador fazer mais do que "Atacar" ou "Ataque Total". Adicione manobras simples desbloqueáveis por PP (ex: *Finta, Desarmar*) para dar profundidade tática ao combate por turnos digital.
4.  **Clarificação da Mecânica de Magia (Os Sinais):** Especifique mecanicamente o que ocorre ao acumular 3 Sinais. A ameaça da Cailleach deve ser uma penalidade tangível no jogo (ex: emboscada noturna, debuff de frio).
5.  **Sistema de Forja Digital e Amuletos:** Defina exatamente o que os upgrades *Reforçado, Temperado e Lendário* fazem nas estatísticas (RD, Dano, Bônus de Aparar) e transforme os amuletos em itens de "uso ativo" (com cooldown por capítulo) em vez de apenas bônus passivos.

/**
 * Capítulo V · A Traição (1305).
 */
"use strict";

Object.assign(SC, {
  c5_inicio: {
    eyebrow: "Capítulo V · A Traição",
    title: "Sete anos",
    enter() {
      S.hp = maxHP(S);
      S.fp = maxFP(S);
      S.flags.cap5 = 1;
      gain(10, "Sete anos de guerra");
    },
    text: () => `Inverno de 1305. Sete anos se passaram desde Falkirk.

Wallace foi à França e a Roma pedir ajuda. Voltou de mãos vazias. Enquanto isso, a Escócia caiu pedaço por pedaço: John Comyn se rendeu ao rei Eduardo, o castelo de Stirling caiu depois de um cerco de três meses, e os nobres, um a um, juraram lealdade à Inglaterra.

Só Wallace não jurou. Agora ele é o homem mais caçado da Escócia, e o rei ofereceu terras e ouro a quem o entregar.

Você ainda está com ele. ${F("callum_ferido") ? "Callum, com vinte anos e a perna que manca desde Falkirk, também." : "Callum, com vinte anos e a mira mais certeira do bando, também."} ${F("tam_morto") ? "Tam está enterrado em Falkirk." : "Tam, com a barba ficando grisalha, também."} ${F("ailsa") ? (F("ailsa_morta") ? "Ailsa está enterrada em Falkirk." : "Ailsa também, mais calada do que nunca.") : ""}

São só vinte homens agora, escondidos nas florestas. Sete anos de guerra deixaram você mais forte e mais cansado.`,
    choices: [{ t: "Ir até a fogueira de Wallace", go: "c5_floresta" }],
  },
  c5_floresta: {
    title: "Um recado de Menteith",
    text: () => `Wallace está mais magro, e o cabelo dele ficou branco nas têmporas. Ele segura um pedaço de pergaminho.

“Sir John Menteith mandou recado. É o xerife de Dumbarton. Diz que tem uma casa segura em Robroyston, perto de Glasgow, onde podemos passar o inverno.” Ele dobra o pergaminho. “Menteith é escocês. Lutou do nosso lado, uma vez.”

Mas Menteith também jurou lealdade ao rei Eduardo, como todos os outros. ${F("viu_rei") ? "Você se lembra da carta dos condes antes de Falkirk. Os escoceses que mudam de lado são os mais perigosos." : ""}`,
    choices: [
      { t: "Pedir tempo para investigar Menteith antes", go: "c5_glasgow" },
      { t: "Confiar e ir na frente preparar a casa", go: "c5_robroyston_cedo" },
    ],
  },
  c5_glasgow: {
    title: "Glasgow",
    text: () => `Glasgow é uma cidade pequena, de ruas de lama, agrupada em volta da grande catedral. Soldados ingleses patrulham o mercado, e todo mundo fala baixo.

Dizem que Menteith tem um criado que vive bêbado nas tavernas perto do rio. E que o próprio Menteith dorme no castelo de Dumbarton, sobre a rocha, à beira do Clyde.`,
    choices: [
      {
        t: "Procurar o criado de Menteith nas tavernas",
        test: {
          o: [
            ["diplomacia", 0],
            ["IQ", -1],
          ],
          ok: "c5_criado",
          fail: () => ({
            e: ["guarda", "guarda"],
            allies: comCallum(),
            win: "c5_dumbarton",
            lose: "c5_dumbarton",
            intro: "O criado grita por ajuda, e dois homens de Menteith saem da taverna.",
          }),
        },
      },
      { t: "Entrar no castelo de Dumbarton à noite", go: "c5_dumbarton" },
    ],
  },
  c5_criado: {
    title: "O pão virado",
    enter() {
      S.flags.sabe_traicao = 1;
      gain(3, "A traição descoberta");
    },
    text: () => `O criado se chama Jack, e depois da quarta caneca ele chora no seu ombro.

“Sir John prometeu terras para mim. Terras! Eu só preciso dar o sinal. Quando Wallace estiver dormindo na casa de Robroyston, eu viro o pão de cabeça para baixo na mesa, e os homens entram.” Ele soluça. “Eu não queria. Ele é um homem bom.”

*Os velhos poetas contam essa história do pão virado. Talvez seja verdade.*

O dia marcado é **3 de agosto**. Faltam dois dias.`,
    choices: [{ t: "Correr para avisar Wallace", go: "c5_corrida" }],
  },
  c5_dumbarton: {
    title: "O castelo de Dumbarton",
    text: () =>
      `O castelo de Dumbarton fica no alto de uma rocha negra que sobe do rio Clyde como um dente. De noite, só as tochas das muralhas aparecem.`,
    choices: [
      {
        t: "Escalar a rocha pelo lado do rio",
        test: {
          o: [
            ["escalada", 0],
            ["DX", -2],
          ],
          ok: "c5_carta",
          fail: () => ({
            e: ["guarda", "guarda"],
            allies: comCallum(),
            win: "c5_carta",
            lose: "c5_preso",
            intro: "Uma pedra se solta e cai no rio. As tochas se viram para você.",
          }),
        },
      },
      {
        t: "Entrar disfarçado de soldado inglês",
        if: () => S.armor === "malha",
        test: {
          o: [
            ["diplomacia", 3],
            ["IQ", 1],
          ],
          ok: "c5_carta",
          fail: "c5_preso",
        },
      },
    ],
  },
  c5_carta: {
    title: "O selo do rei",
    enter() {
      S.flags.sabe_traicao = 1;
      gain(4, "A prova da traição");
    },
    text: () => `No quarto de Menteith, enquanto ele ronca, você encontra a carta na mesa. Tem o selo de cera vermelha com os três leões do rei Eduardo.

*Ao nosso fiel John de Menteith: entregai-nos William Wallace, e tereis terras no valor de cem libras por ano.*

Embaixo, na letra de Menteith: *Robroyston, na noite de 3 de agosto*. Faltam dois dias.`,
    choices: [{ t: "Fugir e correr para avisar Wallace", go: "c5_corrida" }],
  },
  c5_preso: {
    title: "A cela sobre o Clyde",
    enter() {
      S.hp = Math.max(S.hp, 3);
    },
    text: () => `Você acorda numa cela sobre o Clyde. Pela janela gradeada, vê o rio correr lá embaixo.

${F("kelpie_divida") && !F("kelpie_usado") ? "O rio Clyde. O rio do kelpie. Você sussurra o nome da água negra, *Abhainn Dubh*, e as grades da janela se enchem de algas e ferrugem até quebrarem. Lá embaixo, uma cabeça negra de cavalo espera na água. “Agora estamos quites”, diz o kelpie, quando você cai no rio." : F("callum_junto") || F("callum_arqueiro") || F("callum_mensageiro") ? "Na segunda noite, uma pedra de funda acerta o guarda na nuca. Callum abre a porta com a chave do homem desmaiado. “Achou que eu ia deixar você aqui?”" : "Na segunda noite, uma névoa branca entra pela grade e abre a fechadura. A Dama não esqueceu de você."}

No caminho de fuga, você ouve dois soldados rindo: “Robroyston. Daqui a dois dias. O homem mais procurado da Escócia, e vai ser pego dormindo.”`,
    choices: [
      {
        t: "Correr para avisar Wallace",
        fx() {
          S.flags.sabe_traicao = 1;
          if (F("kelpie_divida") && !F("kelpie_usado")) S.flags.kelpie_usado = 1;
        },
        go: "c5_corrida",
      },
    ],
  },
  c5_corrida: {
    eyebrow: "3 de agosto de 1305",
    title: "Corrida na noite",
    text: () => `Você corre a noite inteira. ${F("callum_ferido") ? "Callum tenta acompanhar, mancando, até você mandá-lo buscar ajuda no acampamento." : "Callum corre ao seu lado."}

Quando a casa de Robroyston aparece no escuro, já é tarde. Há tochas em volta dela. Muitas tochas. Os homens de Menteith cercam a casa em silêncio.`,
    choices: [
      {
        t: "Atacar os homens de Menteith",
        fight: () => ({
          e: ["guarda", "guarda", "guarda"],
          allies: comCallum(),
          win: "c5_janela",
          lose: "c5_janela_ferido",
          intro: "Você ataca por trás, e o cerco se vira contra você.",
        }),
      },
      {
        t: "Entrar pela janela dos fundos para avisar Wallace",
        test: {
          o: [
            ["furtividade", 0],
            ["DX", -2],
          ],
          ok: "c5_janela",
          fail: () => ({
            e: ["guarda", "guarda"],
            allies: comCallum(),
            win: "c5_janela",
            lose: "c5_janela_ferido",
          }),
        },
      },
    ],
  },
  c5_robroyston_cedo: {
    eyebrow: "3 de agosto de 1305",
    title: "A casa de Robroyston",
    text: () => `A casa de Robroyston é pequena e quente. Wallace dorme pela primeira vez em semanas numa cama de verdade. Um criado chamado Jack serve o jantar e, sem motivo, vira o pão de cabeça para baixo na mesa.

Pouco depois, você ouve passos lá fora. Muitos passos. A porta explode.`,
    choices: [
      {
        t: "Lutar",
        fight: () => ({
          e: ["guarda", "guarda"],
          allies: comCallum(),
          win: "c5_janela",
          lose: "c5_janela_ferido",
          intro: "Os homens de Menteith entram pela porta.",
        }),
      },
    ],
  },
  c5_janela: {
    title: "“Sabia que um dia ia ser assim”",
    enter() {
      gain(3, "Robroyston");
    },
    text: () => `Você chega até Wallace no quarto. Ele já está de pé, de espada na mão, calmo como quem esperava visita.

Lá fora, são sessenta homens. Vocês são três. Ele olha pela janela, depois para você.

“Sabia que um dia ia ser assim. Se eu fugir agora, eles me caçam até o fim do ano, e queimam cada aldeia no caminho.” Ele tira do dedo um anel de ferro simples e põe na sua mão. “Leva isto a Robert Bruce, conde de Carrick. Diz a ele: *agora é contigo*. E vive, ${N()}. Isso é uma ordem.”

Ele abre a porta da frente e sai, sozinho, de espada na mão, para o meio das tochas.`,
    choices: [{ t: "Obedecer e fugir pela janela", go: "c5_estrada" }],
  },
  c5_janela_ferido: {
    title: "Vai!",
    enter() {
      S.hp = Math.max(S.hp, 3);
    },
    text: () => `Você cai, cercado. Então a porta da casa se abre e Wallace sai, de espada na mão, sozinho. Todos os homens de Menteith se viram para ele.

No meio da confusão, ele joga algo na sua direção. Um anel de ferro simples cai na lama ao seu lado. “Leva a Bruce!”, ele grita. “Diz a ele: agora é contigo! Vai!”

Você se arrasta para a escuridão.`,
    choices: [{ t: "Fugir", go: "c5_estrada" }],
  },
  c5_estrada: {
    title: "A estrada do sul",
    text: () => `Wallace é levado para o sul acorrentado numa carroça, cercado por cavaleiros. Primeiro para Carlisle, depois para Londres.

Você segue o comboio de longe por dois dias. Na estrada, no meio das colinas, os guardas se distraem por um momento.`,
    choices: [
      {
        t: "Tentar resgatar Wallace",
        tag: () => "Perigoso",
        fight: () => ({
          e: ["cavaleiro_montado", "soldado"],
          allies: comCallum(),
          win: "c5_recusa",
          lose: "c5_resgate_mal",
        }),
      },
      { t: "Seguir o comboio até Londres", go: "c5_londres" },
    ],
  },
  c5_recusa: {
    title: "A última ordem",
    enter() {
      S.flags.tentou_resgate = 1;
      gain(4, "A tentativa de resgate");
    },
    text: () => `Você derruba o cavaleiro da escolta e chega até a carroça. Quebra a corrente com o machado, com a espada, com as mãos.

Wallace segura seu pulso. “Não.”

Você não entende. Ele explica, devagar, como quem fala com uma criança: “Se eu fugir, o rei queima a Escócia inteira procurando por mim. Se eu morrer em Londres, a Escócia lembra. Os homens esquecem um fugitivo. Não esquecem um mártir.”

Ele empurra você para longe. “Vai antes que voltem. Leva o anel a Bruce.”`,
    choices: [{ t: "Seguir o comboio de longe, até Londres", go: "c5_londres" }],
  },
  c5_resgate_mal: {
    title: "Na lama da estrada",
    enter() {
      S.hp = Math.max(S.hp, 3);
    },
    text: () =>
      `Os guardas derrubam você na lama, e o comboio segue. Da carroça, Wallace olha para trás e balança a cabeça, quase sorrindo, como quem diz: *eu mandei você viver*.`,
    choices: [{ t: "Seguir o comboio de longe, até Londres", go: "c5_londres" }],
  },
  c5_londres: {
    eyebrow: "Agosto de 1305",
    title: "Névoa sobre o Tâmisa",
    text: () => `Londres é a maior cidade que você já viu, cheia de fumaça, sinos e gente. Na noite antes do julgamento, a névoa sobe do Tâmisa, e as pedras da margem ficam brancas de geada. Em agosto.

A Cailleach está de pé sobre a água congelada.

“Amanhã eles vão julgá-lo e matá-lo no mesmo dia, de um jeito que nem os lobos matam.” A voz dela é quase triste. “Eu posso levá-lo daqui. Um sopro de inverno, e ele sai andando de Westminster, e ninguém vê. Só preciso de uma coisa: a Pedra.”`,
    choices: [
      { t: "Aceitar: a Pedra pela vida de Wallace", go: "c5_pacto_wallace" },
      { t: "Recusar: “Ele não ia querer.”", go: "c5_recusa_velha" },
    ],
  },
  c5_pacto_wallace: {
    title: "O que o inverno pode fazer",
    enter() {
      S.flags.pacto_wallace = 1;
      S.flags.pacto_cailleach = 1;
      S.sinais = Math.max(S.sinais || 0, 3);
      S.flags.cailleach = 1;
      gain(1, "Pacto");
    },
    text: () => `Você aceita. A Velha segura sua mão, e o frio sobe até o coração.

Mas antes do amanhecer ela volta, e pela primeira vez parece cansada. “Não consigo, criança. Ele não quer sair. Ofereci a porta, e ele não quis.” Ela olha para você com o olho único. “O que posso fazer é tirar a dor dele. Quando chegar a hora, o frio vai chegar antes da faca, e ele não vai sentir nada.”

“E o nosso trato?”

“O trato continua. A Pedra é minha.”`,
    choices: [{ t: "Ir a Westminster", go: "c5_westminster" }],
  },
  c5_recusa_velha: {
    title: "Ele não ia querer",
    enter() {
      S.flags.recusou_londres = 1;
      gain(3, "Fidelidade a Wallace");
    },
    text: () => `“Ele não ia querer. Ele já escolheu.”

A Velha fica em silêncio por muito tempo. “Os homens são estranhos. Morrem por ideias.” A geada recua das pedras. “Talvez seja por isso que nunca consegui congelar vocês de vez.”`,
    choices: [{ t: "Ir a Westminster", go: "c5_westminster" }],
  },
  c5_westminster: {
    eyebrow: "23 de agosto de 1305",
    title: "O salão de Westminster",
    text: () => `O grande salão de Westminster está lotado de nobres, juízes e curiosos. Você se esconde no fundo, com o capuz sobre o rosto.

Trazem Wallace acorrentado. Puseram uma coroa de louros na cabeça dele, de deboche, porque diziam que um dia ele quis ser rei em Westminster. Ele não deixa que a coroa o faça baixar a cabeça.

Os juízes leem as acusações: traição, assassinato, incêndio, sacrilégio. Ele não tem direito a falar. Fala assim mesmo, uma única vez:

“Não posso ser traidor do rei Eduardo, porque nunca fui súdito dele.”

O salão fica em silêncio. A sentença é dada ali mesmo, e cumprida na mesma tarde.`,
    choices: [{ t: "Seguir a multidão até Smithfield", go: "c5_smithfield" }],
  },
  c5_smithfield: {
    title: "Smithfield",
    enter() {
      S.flags.wallace_morto = 1;
    },
    text: () => `Você não vai contar o que viu em Smithfield. Ninguém que estava lá conta.

Só isto: no meio da multidão que gritava, havia uma pessoa de capuz que não gritava. E por um instante, antes do fim, Wallace olhou para a multidão, e você tem certeza de que ele viu você.

${F("pacto_wallace") ? "Uma névoa fria desceu sobre o lugar, só por um instante, e o rosto dele ficou calmo. A Velha cumpriu a parte dela." : "Uma névoa branca subiu do chão, só por um instante, e você sentiu a mão da Dama no seu ombro. *Ele não está sozinho*, disse a névoa."}

William Wallace morreu em 23 de agosto de 1305. Tinha uns trinta e cinco anos.`,
    choices: [{ t: "Voltar para a Escócia", go: "c5_bruce" }],
  },
  c5_bruce: {
    eyebrow: "Outono de 1305",
    title: "Agora é contigo",
    text: () => `Você encontra Robert Bruce, conde de Carrick, num castelo da família dele, perto da fronteira. Ele tem trinta e um anos, uma barba curta e escura, e o olhar de quem pensa três jogadas à frente.

Você põe o anel de ferro na mão dele e repete as palavras: *agora é contigo*.

Bruce olha para o anel por muito tempo. Ele jurou lealdade ao rei Eduardo, como todos os nobres. Ele já trocou de lado mais de uma vez. Mas agora, com o anel na mão, alguma coisa muda no rosto dele.

“Então será comigo”, diz ele, baixinho. Depois, mais alto: “Fica. Vou precisar de gente que não muda de lado.”`,
    choices: [{ t: "Ficar com Bruce", go: "c5_fim" }],
  },
  c5_fim: {
    eyebrow: "Fim do Capítulo V",
    title: "O anel de ferro",
    enter() {
      S.flags.cap5_fim = 1;
      S.hp = maxHP(S);
      S.fp = maxFP(S);
      gain(6, "Fim do Capítulo V");
    },
    text: () => {
      const l = [];
      if (F("sabe_traicao")) l.push("Você descobriu a traição de Menteith, mas Wallace escolheu não fugir.");
      if (F("tentou_resgate"))
        l.push("Você chegou até a carroça de Wallace na estrada, e ele recusou a fuga.");
      if (F("pacto_wallace"))
        l.push(
          "Você ofereceu a Pedra à Cailleach pela vida de Wallace. Ela tirou a dor dele, e o trato continua.",
        );
      if (F("recusou_londres")) l.push("Você recusou a oferta da Cailleach em Londres.");
      l.push("Robert Bruce recebeu o anel de Wallace.");
      return `Em fevereiro de 1306, numa igreja de Dumfries, Robert Bruce e John Comyn discutem diante do altar. Bruce puxa o punhal. Comyn morre ali mesmo, nos degraus da igreja.

Não há mais volta. Bruce vai ser rei, ou vai morrer.

<ul class="end-list">${l.map((x) => `<li>${x}</li>`).join("")}</ul>

Seu título agora é **${title(S)}**, com ${S.earned} pontos de experiência acumulados.`;
    },
    choices: [
      { t: "Começar o Capítulo VI, o capítulo final", go: "c6_inicio" },
      { t: "Gastar meus pontos", act: "evolve" },
    ],
  },
});

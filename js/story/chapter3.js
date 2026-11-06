/**
 * Capítulo III · A Ponte de Stirling (1297).
 */
"use strict";

ALLY.lanceiros = { n: "Lanceiros de Moray", skill: 13, dmg: "1d+2", type: "imp" };
ALLY.fergus = { n: "Fergus Mór", skill: 13, dmg: "1d+2", type: "cr" };
const vespDone = () =>
  F("c3_carp") && F("c3_rio") && (F("c3_rel") || !(F("sabe_plano") || F("sabe_vau") || F("vau_bloqueado")));
Object.assign(SC, {
  c3_inicio: {
    eyebrow: "Capítulo III · A Ponte de Stirling",
    title: "Para a floresta de Selkirk",
    enter() {
      S.hp = maxHP(S);
      S.fp = maxFP(S);
      S.flags.cap3 = 1;
      note("Descanso de primavera: PV e PF restaurados");
    },
    text: () => `Junho de 1297. Depois de Lanark, a Escócia acorda. Lavradores largam o arado, pastores trocam o cajado pela lança, e todos os caminhos parecem levar à floresta de Selkirk, onde William Wallace junta o seu exército.

Tam reúne o bando dos Rochedos de Cartland. ${F("sangue_frio") ? "Ele ainda não olha nos seus olhos, mas diz: “Wallace precisa de todo braço que segure uma lança. Até o teu.”" : "Ele dá um tapa nas suas costas. “Acabou o tempo de se esconder em cavernas.”"}

Callum, que já tem doze anos e acerta corvos com a funda, planta-se na sua frente com os braços cruzados. “Eu vou também. Não sou mais criança.”`,
    choices: [
      {
        t: "Deixar Callum vir como mensageiro do exército",
        fx() {
          S.flags.callum_junto = 1;
        },
        go: "c3_floresta",
      },
      {
        t: "Mandar Callum ficar em Cartland",
        fx() {
          S.flags.callum_casa = 1;
        },
        go: "c3_floresta",
      },
    ],
  },
  c3_floresta: {
    title: "O acampamento de Wallace",
    text: () => `${F("callum_junto") ? "Callum anda ao seu lado o caminho todo, orgulhoso como um cavaleiro." : "Callum ficou na boca da caverna, chorando de raiva, até vocês sumirem no vale."}

A floresta de Selkirk está cheia de gente: centenas de homens entre os carvalhos, fumaça de cem fogueiras, ferreiros improvisados batendo pontas de lança. Chegam notícias do norte: Andrew Moray também se levantou e expulsou os ingleses de quase todos os castelos além do Forth.

E então você o vê. **William Wallace** é mais alto que qualquer homem que você já conheceu, mas fala baixo, quase com cansaço. Ele olha cada recém-chegado como quem pesa um saco de grãos.

“Cada um que chega me mostra uma coisa”, diz ele. “O que sabe fazer. Mostra a tua.”`,
    choices: [
      {
        t: "Atirar com o arco num alvo a cem passos",
        if: () => S.weapons.includes("arco"),
        test: { o: [["arco", 0]], ok: "c3_prova_arco", fail: "c3_prova_falha" },
      },
      {
        t: "Lutar com Fergus Mór, o campeão do acampamento",
        fight: {
          e: ["fergus"],
          nonlethal: true,
          win: "c3_prova_luta",
          lose: "c3_prova_falha",
          intro:
            "Fergus Mór entra na roda rindo, com um bordão de carvalho. “Até alguém cair, e prometo não te quebrar muito.”",
        },
      },
      {
        t: "Contar a ele o que você viu sob a colina de Dunsinane",
        test: {
          o: [
            ["diplomacia", 0],
            ["saber", 0],
          ],
          ok: "c3_prova_palavra",
          fail: "c3_prova_falha",
        },
      },
    ],
  },
  c3_prova_arco: {
    title: "Cem passos",
    enter() {
      S.flags.wallace_respeito = 1;
      gain(2, "Prova de Wallace");
    },
    text: () => `A flecha acerta o alvo de palha um palmo abaixo do centro. ${F("ailsa") ? "Ailsa assobia, o que é o maior elogio que ela sabe fazer." : "Alguns homens assobiam."}

Wallace concorda com a cabeça. “Arqueiros eu tenho poucos. Ficas comigo.”`,
    choices: [{ t: "Ouvir o que Wallace tem a dizer", go: "c3_wallace" }],
  },
  c3_prova_luta: {
    title: "Fergus no chão",
    enter() {
      S.flags.wallace_respeito = 1;
      S.flags.fergus_amigo = 1;
      gain(2, "Prova de Wallace");
    },
    text: () => `Fergus Mór cai de costas na grama, e o acampamento inteiro ri. Ele ri mais alto que todos. “Por São Columba! Ninguém me derrubava desde a Páscoa.”

Wallace estende a mão para ajudar Fergus a levantar e olha para você. “Ficas comigo.”`,
    choices: [{ t: "Ouvir o que Wallace tem a dizer", go: "c3_wallace" }],
  },
  c3_prova_palavra: {
    title: "A Pedra e o povo",
    enter() {
      S.flags.wallace_respeito = 1;
      S.flags.wallace_sabe = 1;
      gain(3, "Prova de Wallace");
    },
    text: () => `Você conta sobre a tampa da fossa, a câmara sob a colina, a Velha do Inverno. Os homens em volta fazem o sinal da cruz. Wallace não ri.

“Minha mãe acreditava nessas coisas”, diz ele, por fim. “Guarda o segredo da Pedra. Um dia um rei vai precisar dela.” Ele olha para os homens ao redor, lavradores com lanças feitas em casa. “Mas o reino não é uma pedra. É essa gente. Ficas comigo.”`,
    choices: [{ t: "Ouvir o que Wallace tem a dizer", go: "c3_wallace" }],
  },
  c3_prova_falha: {
    title: "Ninguém nasce soldado",
    text: () => `Não dá certo, e alguns homens riem. Wallace levanta a mão, e o riso para.

“Não importa. Ninguém aqui nasceu soldado. Eu também não.” Ele aponta para a fogueira. “Come, dorme, e amanhã aprende. Ficas.”`,
    choices: [{ t: "Ouvir o que Wallace tem a dizer", go: "c3_wallace" }],
  },
  c3_wallace: {
    title: "Batedores",
    enter() {
      if (F("wallace_respeito")) givePennies(10);
    },
    text: () => `À noite, Wallace chama você e ${F("ailsa") ? "Ailsa" : "mais dois batedores"} para perto do fogo dele.

“O conde de Surrey e o tesoureiro Cressingham vêm do sul com o maior exército que a Escócia já viu. Cavaleiros, arqueiros galeses, milhares de homens. Vão marchar até Stirling, porque quem tem a ponte de Stirling tem a Escócia.”

“Preciso de olhos. Quero saber quando chegam, e se existe outro jeito de atravessar o Forth além da ponte.” ${F("wallace_respeito") ? "Ele joga uma bolsa de pennies para você. “Para o caminho.”" : ""}`,
    choices: [
      { t: "Falar com o intendente do exército antes de partir", go: "c3_intendente" },
      { t: "Partir em missão", go: "c3_missao" },
    ],
  },
  c3_intendente: {
    title: "O intendente",
    text: () => `O intendente é um padre de Glasgow que trocou o breviário por uma lista de suprimentos. Ele conta cada penny duas vezes.

“O exército não tem dinheiro, então não dou nada. Mas vendo barato.” Você tem **${S.coins} pennies**.`,
    choices: [
      {
        t: "Comprar uma lança do schiltron",
        sub: "18 pennies · GdP+3 perfuração, duas mãos",
        if: () => !S.weapons.includes("lanca") && S.coins >= 18,
        fx() {
          S.coins -= 18;
          S.weapons.push("lanca");
          toast("Lança do schiltron comprada");
        },
        go: "c3_intendente",
      },
      {
        t: "Comprar 2 maços de ervas",
        sub: "4 pennies",
        if: () => S.coins >= 4,
        fx() {
          S.coins -= 4;
          S.inv.ervas = (S.inv.ervas || 0) + 2;
          toast("+2 maços de ervas");
        },
        go: "c3_intendente",
      },
      {
        t: "Comprar 2 barras de ferro",
        sub: "5 pennies",
        if: () => S.coins >= 5,
        fx() {
          S.coins -= 5;
          S.mat.ferro = (S.mat.ferro || 0) + 2;
          toast("+2 Ferro");
        },
        go: "c3_intendente",
      },
      {
        t: "Comprar 2 peças de couro",
        sub: "5 pennies",
        if: () => S.coins >= 5,
        fx() {
          S.coins -= 5;
          S.mat.couro = (S.mat.couro || 0) + 2;
          toast("+2 Couro");
        },
        go: "c3_intendente",
      },
      {
        t: "Comprar 2 rolos de tecido",
        sub: "3 pennies",
        if: () => S.coins >= 3,
        fx() {
          S.coins -= 3;
          S.mat.tecido = (S.mat.tecido || 0) + 2;
          toast("+2 Tecido");
        },
        go: "c3_intendente",
      },
      {
        t: "Comprar 1 lingote de prata",
        sub: "10 pennies",
        if: () => S.coins >= 10,
        fx() {
          S.coins -= 10;
          S.mat.prata = (S.mat.prata || 0) + 1;
          toast("+1 Prata");
        },
        go: "c3_intendente",
      },
      {
        t: "Comprar um escudo de madeira",
        sub: "7 pennies",
        if: () => !S.shield && S.coins >= 7,
        fx() {
          S.coins -= 7;
          S.shield = true;
          toast("Escudo comprado");
        },
        go: "c3_intendente",
      },
      { t: "Partir em missão", go: "c3_missao" },
    ],
  },
  c3_missao: {
    eyebrow: "Agosto de 1297",
    title: "O exército do sul",
    text: () => `Vocês cavalgam três dias para o norte e encontram o exército inglês acampado na planície ao sul de Stirling. É uma cidade de tendas: estandartes vermelhos e dourados, fumaça de mil fogueiras, cavalos de guerra cobertos de malha.

Do outro lado do rio, no alto, o castelo de Stirling. Entre os dois, a ponte de madeira, tão estreita que só passam dois cavaleiros lado a lado.

À noite, a maior tenda do acampamento brilha por dentro. Lá os senhores ingleses discutem como vão atravessar.`,
    choices: [
      {
        t: "Entrar disfarçado de soldado inglês",
        if: () => S.armor === "malha",
        tag: () => "+3 cota inglesa",
        test: {
          o: [
            ["diplomacia", 3],
            ["IQ", 1],
          ],
          ok: "c3_conselho",
          fail: "c3_pego",
        },
      },
      {
        t: "Esgueirar-se entre as tendas até a tenda do conselho",
        tag: () => (S.armor === "malha" ? "−2 cota barulhenta" : ""),
        test: {
          o: () => [["furtividade", S.armor === "malha" ? -2 : 0]],
          ok: "c3_conselho",
          fail: "c3_pego",
        },
      },
      {
        t: "Esperar fora do acampamento e capturar um soldado para interrogar",
        fight: () => ({ e: ["soldado"], allies: comAilsa(), win: "c3_interrogatorio", lose: "c3_pego" }),
      },
    ],
  },
  c3_conselho: {
    title: "O conselho de guerra",
    enter() {
      S.flags.sabe_plano = 1;
      gain(3, "Espionagem");
    },
    text: () => `Você se agacha atrás da lona e escuta.

Um cavaleiro de sotaque escocês fala alto: **Sir Richard Lundie**, que já lutou do lado dos escoceses e trocou de lado. “Pela ponte é loucura, milorde. Passam dois de cada vez. Deem-me quinhentos cavaleiros e eu atravesso pelo vau, rio acima, e caio nas costas deles.”

Outra voz, gorda e impaciente: o tesoureiro **Hugh de Cressingham**. “E gastar o dinheiro do rei mandando cavalaria passear? Não. Atravessamos pela ponte, como homens, e acabamos com isso.”

O velho conde de Surrey boceja e concorda com o tesoureiro. Você sai dali sabendo duas coisas: o ataque será pela ponte, e existe um **vau rio acima** que alguém ainda pode tentar usar.`,
    choices: [{ t: "Ir até o vau antes que alguém mude de ideia", go: "c3_drip" }],
  },
  c3_interrogatorio: {
    title: "Um soldado assustado",
    enter() {
      S.flags.sabe_vau = 1;
      gain(1, "Interrogatório");
    },
    text: () => `O soldado é um rapaz de Cumberland que só quer voltar para casa. Ele fala tudo de uma vez: “Vamos atravessar pela ponte. Mas Sir Richard Lundie quer mandar cavalaria por um vau, rio acima. Eu não sei qual. Juro!”

Você o deixa amarrado a uma árvore, com a boca tapada e a vida inteira pela frente.`,
    choices: [{ t: "Procurar o vau", go: "c3_drip" }],
  },
  c3_pego: {
    title: "Mãos no seu ombro",
    text: () => `Uma mão agarra seu ombro por trás.

${F("bw_divida") ? "É **Blackwood**. Ele arrasta você para trás de uma carroça antes que alguém veja e fala entre os dentes: “Tu de novo. A dívida estava paga, escocês.” Ele olha em volta. “Atravessamos pela ponte daqui a dois dias. Lundie quer usar o vau de cima, e o tesoureiro é avarento demais para deixar. Agora some. E se nos virmos naquela ponte, não te conheço.”" : !F("hale_morto") ? "Você se vira e encontra um escudo branco com três corvos. **Sir Osric Hale** sorri devagar. “O rosto da ponte de Stirling. E do monge. Hoje não foges.”" : "Dois soldados ingleses gritam e puxam as espadas."}`,
    choices: [
      {
        t: "Fugir na escuridão",
        if: () => F("bw_divida"),
        fx() {
          S.flags.sabe_plano = 1;
          S.flags.bw_stirling = 1;
        },
        go: "c3_drip",
      },
      {
        t: "Lutar contra Sir Osric Hale",
        if: () => !F("bw_divida") && !F("hale_morto"),
        fight: () => ({
          e: ["cavaleiro"],
          hp: [15],
          allies: comAilsa(),
          win: "c3_hale_fim",
          lose: "c3_fuga_ferida",
        }),
      },
      {
        t: "Lutar para escapar",
        if: () => !F("bw_divida") && F("hale_morto"),
        fight: () => ({
          e: ["soldado", "soldado"],
          allies: comAilsa(),
          win: "c3_drip",
          lose: "c3_fuga_ferida",
        }),
      },
    ],
  },
  c3_hale_fim: {
    title: "O último corvo",
    enter() {
      S.flags.hale_morto = 1;
      S.flags.sabe_vau = 1;
      S.shield = true;
      gain(4, "Sir Osric Hale vencido");
    },
    text: () => `Sir Osric Hale cai entre as tendas, e desta vez não se levanta. Antes que o acampamento acorde, você pega o escudo branco dele e corre.

Na bolsa do cavaleiro há um bilhete de Sir Richard Lundie: *quinhentos cavaleiros pelo vau, se o tesoureiro deixar*.`,
    choices: [{ t: "Procurar o vau", go: "c3_drip" }],
  },
  c3_fuga_ferida: {
    title: "Sangue na relva",
    enter() {
      S.hp = Math.max(S.hp, 3);
    },
    text: () =>
      `Você escapa por pouco, sangrando, deitado na lama de uma vala enquanto os ingleses passam com tochas. Não descobriu o plano deles, mas ouviu falar de um vau rio acima.`,
    choices: [{ t: "Procurar o vau", go: "c3_drip" }],
  },
  c3_drip: {
    title: "O vau rio acima",
    text: () => `O vau é um trecho raso do Forth, entre juncos e salgueiros, a algumas milhas da ponte. A água bate no joelho. Um exército de cavalaria passaria por aqui em uma hora.

${F("sabe_plano") || F("sabe_vau") ? "Se Lundie convencer o conde, é por aqui que os cavaleiros vão cair nas costas de Wallace." : "Mesmo sem saber o que os ingleses planejam, um vau desses perto de uma batalha é perigoso."}`,
    choices: [
      {
        t: "Fincar estacas afiadas sob a água",
        test: {
          o: [
            ["sobrevivencia", 0],
            ["ferraria", 0],
            ["ST", -2],
          ],
          ok: "c3_vau_ok",
          fail: "c3_vau_falha",
        },
      },
      {
        t: "Esconder-se e emboscar os batedores ingleses",
        fight: () => ({
          e: ["soldado", "arqueiro"],
          allies: comAilsa(),
          win: "c3_vau_emboscada",
          lose: "c3_vau_falha",
          intro: "Ao amanhecer, dois batedores ingleses aparecem para medir a profundidade do vau.",
        }),
      },
      { t: "Deixar o vau e voltar logo para Wallace", go: "c3_vespera" },
    ],
  },
  c3_vau_ok: {
    title: "Dentes sob a água",
    enter() {
      S.flags.vau_bloqueado = 1;
      gain(3, "O vau bloqueado");
    },
    text: () =>
      `Vocês passam a noite com água pela cintura, fincando estacas de salgueiro afiadas no leito do rio, inclinadas para o sul. De cima, ninguém vê nada. Um cavalo que tentar atravessar vai quebrar as pernas.`,
    choices: [{ t: "Voltar para Wallace", go: "c3_vespera" }],
  },
  c3_vau_emboscada: {
    title: "Batedores que não voltam",
    enter() {
      S.flags.vau_bloqueado = 1;
      gain(2, "Emboscada no vau");
    },
    text: () =>
      `Os batedores ingleses não voltam para contar que o vau é raso. Sem notícia, Lundie não vai ter como convencer ninguém.`,
    choices: [{ t: "Voltar para Wallace", go: "c3_vespera" }],
  },
  c3_vau_falha: {
    title: "Água fria",
    enter() {
      hurt("1d-1", "Correnteza e pedras");
    },
    text: () =>
      `O trabalho não dá certo. A correnteza leva as estacas, e você corta as mãos nas pedras. O vau continua aberto.`,
    choices: [{ t: "Voltar para Wallace", go: "c3_vespera" }],
  },
  c3_vespera: {
    eyebrow: "10 de setembro de 1297",
    title: "A véspera, no Abbey Craig",
    enter() {
      S.hp = maxHP(S);
      S.fp = maxFP(S);
      note("Descanso no acampamento: PV e PF restaurados");
    },
    text: () => `O exército escocês está no alto do Abbey Craig, um penhasco coberto de árvores. Lá embaixo, o Forth faz uma curva larga, e a ponte de madeira atravessa o rio como uma linha de costura. Do outro lado, as fogueiras inglesas cobrem a planície até onde a vista alcança.

Andrew Moray chegou do norte com os homens dele. É jovem, de sorriso fácil, e Wallace o trata como irmão. Os dois dividem o comando.

${F("callum_junto") ? "Callum corre de um lado para o outro levando recados entre os capitães, feliz como nunca." : ""} Ninguém dorme muito esta noite.`,
    choices: [
      {
        t: "Contar a Wallace e Moray o que você descobriu",
        if: () => (F("sabe_plano") || F("sabe_vau") || F("vau_bloqueado")) && !F("c3_rel"),
        go: "c3_relatorio",
      },
      {
        t: "Falar com o carpinteiro que anda rondando a ponte",
        if: () => !F("c3_carp"),
        go: "c3_carpinteiro",
      },
      {
        t: "Descer até a beira do rio, onde a névoa parece chamar você",
        if: () => !F("c3_rio"),
        go: "c3_rio",
      },
      { t: "Dormir antes da batalha", go: "c3_manha" },
    ],
  },
  c3_relatorio: {
    title: "O relatório",
    enter() {
      S.flags.c3_rel = 1;
      gain(F("sabe_plano") ? 3 : 2, "Informação valiosa");
    },
    text: () => `Wallace escuta tudo sem interromper. Moray assobia baixinho quando você fala do vau${F("vau_bloqueado") ? " e ri alto quando você conta das estacas" : ""}.

“Então eles vêm pela ponte, de dois em dois”, diz Wallace, devagar. “Deixamos atravessar. Não todos. Só o suficiente.” Ele olha para Moray. “Quando metade estiver do nosso lado, descemos e tomamos a ponta da ponte. Quem atravessou não volta. Quem ficou não chega.”

Moray sorri. “E o rio faz o resto.”`,
    choices: [{ t: "Voltar para o acampamento", go: "c3_vespera" }],
  },
  c3_carpinteiro: {
    title: "O carpinteiro",
    enter() {
      S.flags.c3_carp = 1;
    },
    text: () => `O carpinteiro é um homem baixo, de mãos enormes, que se apresenta só como John. Ele fala depressa, olhando para a ponte.

“A trave principal da ponte, a do meio. Se eu serrar quase até o fim e segurar com um pino de carvalho, ela aguenta homem a pé. Mas na hora certa, alguém puxa o pino… e a ponte cai com quem estiver em cima.” Ele cospe. “Preciso de alguém que vigie enquanto eu trabalho. E que tenha coragem de puxar o pino amanhã.”

*Os velhos poetas contam essa história. Ninguém sabe se aconteceu mesmo.*`,
    choices: [
      {
        t: "Ajudar John a serrar a trave esta noite",
        test: {
          o: [
            ["ferraria", 0],
            ["furtividade", 0],
            ["escalada", 0],
          ],
          ok: "c3_serrada",
          fail: () => ({
            e: ["soldado"],
            allies: comAilsa(),
            win: "c3_serrada",
            lose: "c3_serrada_falha",
            intro: "Um sentinela inglês ouve o barulho da serra e desce até a margem com uma tocha.",
          }),
        },
      },
      { t: "Recusar: é arriscado demais", go: "c3_vespera" },
    ],
  },
  c3_serrada: {
    title: "Um pino de carvalho",
    enter() {
      S.flags.ponte_serrada = 1;
      gain(3, "A ponte serrada");
    },
    text: () => `Vocês trabalham até a madrugada debaixo da ponte, num bote, com a serra enrolada em panos para abafar o som. Quando terminam, a trave do meio está presa só por um pino de carvalho do tamanho do seu braço.

John amarra uma corda ao pino e esconde a ponta entre os juncos. “Amanhã, quando a ponte estiver cheia, tu puxas. Eu já serrei. Minha parte acabou.”`,
    choices: [{ t: "Voltar para o acampamento", go: "c3_vespera" }],
  },
  c3_serrada_falha: {
    title: "Trabalho perdido",
    enter() {
      S.hp = Math.max(S.hp, 3);
    },
    text: () =>
      `O sentinela dá o alarme, e vocês fogem pelo rio antes de terminar. A ponte fica inteira. John some na noite, xingando.`,
    choices: [{ t: "Voltar para o acampamento", go: "c3_vespera" }],
  },
  c3_rio: {
    title: "A Velha no rio",
    enter() {
      S.flags.c3_rio = 1;
    },
    text: () => `A névoa sobre o Forth é fria demais para setembro. Quando você chega à margem, a água para de correr.

A Cailleach está de pé sobre o rio, e onde ela pisa a água vira gelo. ${F("cailleach_verdade") ? "Ela inclina a cabeça, quase com carinho. “A criança que me perguntou o que eu queria.”" : "O olho único dela brilha como uma estrela de inverno."}

“Amanhã muitos dos teus vão morrer nesta ponte. Eu posso evitar. Congelo o rio sob os ingleses, e os cavalos deles caem no gelo como pedras.” Ela sorri. “Em troca, quando a guerra acabar, tu me levas até a Pedra e a quebras com as tuas mãos.”`,
    choices: [
      { t: "Aceitar o pacto da Cailleach", tag: () => "Pacto", go: "c3_pacto" },
      {
        t: "Chamar o kelpie no lugar dela",
        if: () => F("kelpie_divida") && !F("kelpie_usado"),
        go: "c3_kelpie_forth",
      },
      { t: "Recusar", go: "c3_recusa" },
    ],
  },
  c3_pacto: {
    title: "Um aperto de mão gelado",
    enter() {
      S.flags.pacto_cailleach = 1;
      S.sinais = Math.max(S.sinais || 0, 3);
      S.flags.cailleach = 1;
      gain(1, "Pacto");
    },
    text: () => `Você aperta a mão da Velha. O frio sobe pelo braço até o coração e fica lá, como uma pedra.

“Amanhã, quando a ponte estiver cheia, olha para o rio”, diz ela, e some.

Na pele do seu pulso surgem três marcas brancas, como queimaduras de gelo. **Os três Sinais.** Seus descansos nunca mais serão completos. A Dama Branca, você sente, está chorando em algum lugar.`,
    choices: [{ t: "Voltar para o acampamento", go: "c3_vespera" }],
  },
  c3_kelpie_forth: {
    title: "A água negra responde",
    enter() {
      S.flags.kelpie_usado = 1;
      S.flags.kelpie_batalha = 1;
      gain(2, "O favor do kelpie");
    },
    text: () => `“Não quero o teu gelo, Velha.” Você se ajoelha e diz para a água: *Abhainn Dubh*.

A Cailleach franze a testa e some na névoa. O Forth volta a correr. Do fundo sobe uma cabeça de cavalo negro, com algas na crina.

“Este rio não é meu, filho dos homens. Mas os cavalos-d'água do Forth são meus primos.” Ele sorri com dentes de peixe. “Amanhã, os ingleses que caírem na água não vão subir de novo. E aí estaremos quites.”`,
    choices: [{ t: "Voltar para o acampamento", go: "c3_vespera" }],
  },
  c3_recusa: {
    title: "Sozinhos, como os homens gostam",
    enter() {
      S.flags.recusou_pacto = 1;
      gain(F("cailleach_verdade") ? 3 : 2, "Recusar a Velha");
    },
    text: () => `“Não. Amanhã a Escócia luta com as próprias mãos.”

${F("cailleach_verdade") ? "A Velha sorri, e pela primeira vez o sorriso parece verdadeiro. “Esperava isso de ti. Talvez sejas mesmo digna da Pedra.”" : "“Então lutem sozinhos, como os homens gostam”, diz a Velha, e a névoa engole a voz dela."}

Quando ela some, a água volta a correr. Na margem, entre os juncos, uma luz branca pisca uma vez, como se alguém agradecesse.`,
    choices: [{ t: "Voltar para o acampamento", go: "c3_vespera" }],
  },
  c3_manha: {
    eyebrow: "11 de setembro de 1297",
    title: "A ponte de Stirling",
    text: () => `De manhã, dois frades dominicanos atravessam a ponte com uma bandeira branca. Trazem a oferta do conde: rendição e perdão.

Wallace responde em voz alta, para que o exército inteiro ouça: “Digam ao vosso senhor que não estamos aqui para fazer a paz, mas para lutar, defender-nos e libertar o nosso reino. Que venham, e vão ver.”

Os frades voltam. E os ingleses começam a atravessar. Dois cavaleiros lado a lado, depois mais dois, depois mais dois. As lanças brilham ao sol. Wallace não se mexe. Moray morde os lábios. Meia manhã passa assim.

Quando metade do exército inglês está do lado de cá, Wallace levanta a lança.`,
    choices: [
      { t: "Descer com os lanceiros de Moray para tomar a ponta da ponte", go: "c3_carga" },
      {
        t: "Ficar com os arqueiros no alto do penhasco",
        if: () => S.weapons.includes("arco"),
        go: "c3_arqueiros",
      },
      { t: "Correr até a corda escondida entre os juncos", if: () => F("ponte_serrada"), go: "c3_pino" },
    ],
  },
  c3_carga: {
    title: "A carga",
    text: () => `Milhares de escoceses descem o Abbey Craig gritando, numa onda de lanças. Você corre no meio deles, com os homens de Moray dos dois lados, direto para a ponta da ponte.

Os ingleses que já atravessaram tentam formar fileira. Tarde demais. Na sua frente, um arqueiro galês e um homem-de-armas levantam as armas.`,
    choices: [
      {
        t: "Lutar pela ponta da ponte",
        fight: () => ({
          e: ["soldado", "arqueiro"],
          allies: [ALLY.lanceiros, ...comAilsa()],
          win: "c3_cabeca",
          lose: "c3_cabeca_ferido",
        }),
      },
    ],
  },
  c3_arqueiros: {
    title: "Flechas do alto",
    text: () =>
      `Do alto do penhasco, a ponte parece um formigueiro. Você e os outros arqueiros atiram sem parar sobre os cavaleiros que tentam voltar e os que tentam passar.`,
    choices: [
      {
        t: "Mirar nos cavaleiros que comandam a travessia",
        test: { o: [["arco", 0]], ok: "c3_arqueiros_ok", fail: "c3_arqueiros_mal" },
      },
    ],
  },
  c3_arqueiros_ok: {
    title: "Um estandarte cai",
    enter() {
      gain(3, "Tiro certeiro");
    },
    text: () => `Sua flecha acerta o porta-estandarte de um cavaleiro no meio da ponte, e a bandeira cai no rio. Os ingleses que vêm atrás hesitam. É tudo o que os lanceiros de Moray precisavam.

Lá embaixo, a batalha chegou à ponta da ponte. Você larga o arco e desce correndo.`,
    choices: [{ t: "Descer para a batalha", go: "c3_cabeca" }],
  },
  c3_arqueiros_mal: {
    title: "Flechas perdidas",
    text: () =>
      `O vento do rio desvia suas flechas. Lá embaixo, a batalha chegou à ponta da ponte, e alguém grita que precisam de todo homem lá. Você desce correndo.`,
    choices: [{ t: "Descer para a batalha", go: "c3_cabeca" }],
  },
  c3_pino: {
    title: "A corda nos juncos",
    text: () =>
      `Você corre pela margem, abaixado entre os juncos, enquanto a batalha explode acima. A corda está onde John deixou. A ponte está cheia: cavaleiros, cavalos, homens a pé, todos se empurrando.`,
    choices: [
      {
        t: "Puxar o pino com toda a força",
        test: {
          o: [
            ["ST", 1],
            ["HT", 0],
          ],
          ok: "c3_ponte_cai",
          fail: () => ({
            e: ["soldado"],
            allies: comAilsa(),
            win: "c3_ponte_cai",
            lose: "c3_cabeca_ferido",
            intro: "O pino emperra. Um soldado inglês vê você na margem e desce com a espada.",
          }),
        },
      },
    ],
  },
  c3_ponte_cai: {
    title: "A ponte cai",
    enter() {
      S.flags.ponte_caiu = 1;
      gain(4, "A ponte de Stirling");
    },
    text: () => `O pino sai com um estalo que você sente nos dentes. Por um instante, nada acontece.

Então a trave do meio geme, se curva e se parte. A ponte de Stirling cai no Forth com tudo o que estava em cima: cavaleiros, cavalos, estandartes, gritos. O exército inglês fica cortado ao meio.`,
    choices: [{ t: "Correr para a ponta da ponte", go: "c3_cabeca" }],
  },
  c3_cabeca_ferido: {
    title: "Pisoteado",
    enter() {
      S.hp = Math.max(S.hp, Math.ceil(maxHP(S) / 2));
    },
    text: () =>
      `Você cai, e a batalha passa por cima de você. Fergus Mór arranca você da lama pelo cinto. “Ainda não, ${N()}! Ainda tem inglês para todo mundo!”`,
    choices: [{ t: "Voltar à luta", go: "c3_cabeca" }],
  },
  c3_cabeca: {
    title: "A ponta da ponte",
    enter() {
      gain(2, "A ponta da ponte");
    },
    text: () => `Os lanceiros escoceses fecham a ponta da ponte numa muralha de lanças. Os ingleses que atravessaram estão presos entre o rio e o exército de Wallace. O tesoureiro Cressingham cai do cavalo no meio deles e não se levanta mais.

${F("pacto_cailleach") ? "Então o rio congela. Num instante, o Forth vira uma placa branca, e os cavalos que fogem pela margem escorregam e quebram o gelo. Os gritos são terríveis. Os escoceses comemoram. Você não consegue comemorar." : F("kelpie_batalha") ? "Os cavaleiros que caem no rio não sobem de novo. Por um instante, entre a espuma, você vê crinas negras e algas, e cavalos que não são cavalos puxando armaduras para o fundo." : "Os que tentam fugir se jogam no rio, e o peso da malha os leva para o fundo."}

${!F("vau_bloqueado") ? "Uma trompa soa rio acima. Cavaleiros ingleses atravessaram pelo vau e vêm pelo flanco!" : ""}`,
    choices: [
      {
        t: "Seguir em frente",
        go: () => (F("bw_stirling") || F("bw_divida") ? "c3_bw_ponte" : "c3_campeao"),
      },
    ],
  },
  c3_bw_ponte: {
    title: "Um rosto conhecido na água",
    text: () => `Na beira do rio, agarrado a uma estaca da ponte, um homem de barba grisalha luta para não afundar com a cota de malha. É **Blackwood**.

Ele vê você. Não pede nada.`,
    choices: [
      {
        t: "Estender a lança e puxá-lo para fora",
        fx() {
          S.flags.bw_salvo = 1;
        },
        go: "c3_bw_salvo",
      },
      {
        t: "Deixá-lo com o rio",
        fx() {
          S.flags.bw_afogado = 1;
        },
        go: "c3_bw_deixado",
      },
    ],
  },
  c3_bw_salvo: {
    title: "Pela terceira vez",
    enter() {
      gain(3, "Misericórdia na batalha");
    },
    text: () => `Você o puxa para a margem. Blackwood tosse água e lama por um bom tempo antes de conseguir falar.

“Três vezes.” Ele ri, um riso rouco. “Três vezes, escocês. Vou para casa. Juro por Deus, vou para Yorkshire criar ovelhas.” Ele se levanta e some entre os juncos, sem espada e sem bandeira.`,
    choices: [{ t: "Voltar para a batalha", go: "c3_campeao" }],
  },
  c3_bw_deixado: {
    title: "O rio decide",
    text: () => `Você vira as costas. Quando olha de novo, a estaca está vazia.

Ninguém vai saber. Você vai.`,
    choices: [{ t: "Voltar para a batalha", go: "c3_campeao" }],
  },
  c3_campeao: {
    title: "O campeão do conde",
    text: () => `No meio da confusão, um cavaleiro abre caminho a golpes de espada em direção a Wallace. ${F("hale_morto") ? "O escudo é verde, com um galho de espinhos dourado: **Sir Gerard Thorne**, campeão do conde de Surrey, que dizem nunca ter perdido um duelo." : "O escudo é branco, com três corvos negros. **Sir Osric Hale**, mais uma vez, e desta vez sem nada a perder."}

Ele vê você no caminho dele.${!F("vau_bloqueado") ? " Atrás dele, um cavaleiro montado que veio pelo vau baixa a lança." : ""}`,
    choices: [
      {
        t: "Enfrentar o campeão",
        fight: () => ({
          e: [
            F("hale_morto") ? "gerard" : "osric_final",
            ...(!F("vau_bloqueado") ? ["cavaleiro_montado"] : []),
          ],
          allies: [ALLY.lanceiros, ...(F("fergus_amigo") ? [ALLY.fergus] : []), ...comAilsa()],
          win: "c3_vitoria",
          lose: "c3_campeao_mal",
        }),
      },
    ],
  },
  c3_campeao_mal: {
    title: "Wallace",
    enter() {
      S.hp = Math.max(S.hp, 3);
    },
    text: () => `A espada do campeão desce sobre você, e para no meio do caminho. Uma lança enorme atravessa o escudo dele.

Wallace puxa a lança de volta sem dizer nada e segue em frente. Você fica sentado na lama, vivo, olhando as costas do homem mais alto da Escócia.`,
    choices: [{ t: "Levantar-se", go: "c3_moray" }],
  },
  c3_vitoria: {
    title: "O campeão cai",
    enter() {
      if (!F("hale_morto")) S.flags.hale_morto = 1;
      S.flags.campeao_vencido = 1;
      gain(5, "O campeão do conde");
    },
    text: () => `O campeão cai de joelhos na lama da ponte. Os escoceses ao redor gritam o seu nome, e por um momento a batalha parece parar para ouvir.

Wallace passa a cavalo, olha para você e levanta a lança em saudação. Não diz nada. Não precisa.`,
    choices: [{ t: "Procurar Moray", go: "c3_moray" }],
  },
  c3_moray: {
    title: "Andrew Moray",
    text: () => `No fim da tarde, a batalha acabou. O exército inglês fugiu para o sul, e a ponte ${F("ponte_caiu") ? "está no fundo do rio" : "está queimando"}.

Você encontra Andrew Moray sentado contra uma pedra, pálido, com a mão apertando o lado do corpo. O sangue escorre entre os dedos. Ele sorri para você. “Ganhamos, não ganhamos?”`,
    choices: [
      {
        t: "Tratar o ferimento dele",
        test: {
          o: [
            ["primeiros", 0],
            ["herbalismo", 0],
          ],
          ok: "c3_moray_ok",
          fail: "c3_moray_mal",
        },
      },
      { t: "Chamar os curandeiros do exército", go: "c3_moray_mal" },
    ],
  },
  c3_moray_ok: {
    title: "O sangue para",
    enter() {
      S.flags.moray_ajudado = 1;
      gain(3, "Cuidar de Moray");
    },
    text: () => `Você limpa a ferida, aperta, costura com linha de linho como Mairi ensinava. O sangue para.

Moray segura seu pulso com força. “Obrigado. Se eu viver para ver a Escócia livre, vou lembrar de ti.” Os curandeiros chegam e o levam numa padiola. Os olhos dele já estão fechando de cansaço.`,
    choices: [{ t: "Ver o pôr do sol sobre o Forth", go: "c3_dama" }],
  },
  c3_moray_mal: {
    title: "Mãos vermelhas",
    text: () => `O sangue não para. Os curandeiros chegam e o levam numa padiola, e você fica com as mãos vermelhas e o coração apertado.

Moray ainda acena antes de sumir entre os homens. “Ganhamos”, diz ele. “Ganhamos.”`,
    choices: [{ t: "Ver o pôr do sol sobre o Forth", go: "c3_dama" }],
  },
  c3_dama: {
    eyebrow: "A noite depois da batalha",
    title: "A Dama na névoa",
    enter() {
      S.sangue = Math.max(S.sangue, 3);
      gain(6, "Fim do Capítulo III");
    },
    text: () => `À noite, quando o acampamento finalmente dorme, a névoa sobe do Forth, e a Dama Branca está ali, ao lado da ponte destruída.

${F("pacto_cailleach") ? "Ela não sorri. “Fizeste um pacto com a minha irmã de inverno. Ganhaste uma batalha e perdeste um pedaço de ti. Um dia ela vai cobrar, e eu não poderei impedir.”" : "Ela sorri. “Lutaste com as tuas mãos e com o teu povo. A Velha vai lembrar disso. Eu também.”"}

Ela toca seu peito, onde bate o coração, e o Sangue Antigo sobe como uma maré. **O Sangue Antigo chegou ao nível 3: Druida.** Escolha uma magia do terceiro círculo.`,
    choices: [
      {
        t: "Chamado da Tempestade",
        sub: "Granizo cai sobre todos os inimigos: 2d em cada · 5 PF",
        fx() {
          if (!S.skills.sp_tempestade) S.skills.sp_tempestade = 2;
        },
        go: "c3_fim",
      },
      {
        t: "Bênção de Brìde",
        sub: "Cura 2d+2 PV e remove o frio · 4 PF",
        fx() {
          if (!S.skills.sp_bride) S.skills.sp_bride = 2;
        },
        go: "c3_fim",
      },
    ],
  },
  c3_fim: {
    eyebrow: "Fim do Capítulo III · Outono de 1297",
    title: "Guardiões da Escócia",
    enter() {
      S.flags.cap3_fim = 1;
      S.hp = maxHP(S);
      S.fp = maxFP(S);
      if (F("wallace_respeito") || F("campeao_vencido")) {
        giveWeapon("espada_guerra");
      }
      giveOutfit("gibao_stirling");
    },
    text: () => {
      const l = [];
      l.push(
        F("ponte_caiu")
          ? "Você puxou o pino, e a ponte de Stirling caiu no Forth."
          : "A ponte de Stirling foi destruída depois da batalha.",
      );
      if (F("vau_bloqueado")) l.push("O vau rio acima estava bloqueado, e o flanco escocês ficou seguro.");
      else l.push("Os cavaleiros ingleses vieram pelo vau, e muitos escoceses morreram no flanco.");
      if (F("pacto_cailleach")) l.push("Você fez um pacto com a Cailleach. Ela vai cobrar.");
      if (F("kelpie_batalha"))
        l.push("Os cavalos-d'água do Forth lutaram por você. O favor do kelpie está pago.");
      if (F("bw_salvo"))
        l.push("Você salvou Blackwood pela terceira vez. Ele foi criar ovelhas em Yorkshire.");
      if (F("bw_afogado")) l.push("Você deixou Blackwood se afogar no Forth.");
      if (F("moray_ajudado")) l.push("Você estancou o sangue de Andrew Moray.");
      if (F("callum_junto")) l.push("Callum levou recados durante toda a batalha e voltou sem um arranhão.");
      return `A vitória de Stirling corre a Escócia inteira. Pela primeira vez, um exército de lavradores e pastores derrotou a cavalaria do rei da Inglaterra.

Wallace e Moray passam a assinar cartas como *comandantes do exército do reino da Escócia*. Wallace manda chamar você e ${F("wallace_respeito") || F("campeao_vencido") ? "põe na sua mão uma espada de guerra, de bom aço escocês. “Ganhaste isto na ponte.”" : "agradece em poucas palavras."} O intendente entrega a todos os que lutaram na ponta da ponte um gibão acolchoado azul com a cruz de Santo André costurada no peito.

Mas Moray não melhora. Em novembro, morre das feridas da ponte. E no sul, o rei Eduardo volta da guerra na Flandres, furioso, juntando o maior exército da sua vida.

Seu título agora é **${title(S)}**, com ${S.earned} pontos de experiência acumulados.

<ul class="end-list">${l.map((x) => `<li>${x}</li>`).join("")}</ul>

**Capítulo IV: Falkirk** começa agora.`;
    },
    choices: [
      { t: "Começar o Capítulo IV", go: "c4_inicio" },
      { t: "Gastar meus pontos", act: "evolve" },
      { t: "Começar uma nova jornada", act: "newgame" },
    ],
  },
});

/**
 * Capítulo IV · Falkirk (1298).
 */
"use strict";

ALLY.callum = { n: "Callum", skill: 12, dmg: "1d", type: "cr" };
ALLY.nobres = { n: "Cavaleiros escoceses", skill: 13, dmg: "1d+2", type: "cut" };
ALLY.bruce = { n: "Homens de Bruce", skill: 13, dmg: "1d+2", type: "cut" };
const comCallum = () => (hasFlag("callum_arqueiro") || hasFlag("callum_junto") ? [ALLY.callum] : []);
Object.assign(SC, {
  c4_inicio: {
    eyebrow: "Capítulo IV · Falkirk",
    title: "Sir William, Guardião",
    enter() {
      state.hp = maxHP(state);
      state.fp = maxFP(state);
      state.flags.cap4 = 1;
      note("Descanso de inverno: PV e PF restaurados");
    },
    text: () =>
      hasFlag("c4_act")
        ? `O acampamento na floresta de Selkirk se prepara para o verão. O que mais você quer fazer antes de partir?`
        : `Março de 1298. Numa pequena igreja de pedra na floresta de Selkirk, diante de bispos e de alguns poucos nobres, William Wallace se ajoelha e se levanta como **Sir William Wallace, Guardião do Reino da Escócia**. É a primeira vez que um homem sem título governa o reino em nome de um rei preso.

Andrew Moray não está ali para ver. Morreu em novembro, das feridas da ponte.

O inverno trouxe outras notícias: o rei Eduardo voltou da Flandres e jurou esmagar a Escócia pessoalmente. No verão, ele vem.

${hasFlag("ailsa") ? "Callum, que já tem treze anos e quase a sua altura, pede para treinar arco com Ailsa. " : "Callum, que já tem treze anos e quase a sua altura, quer lutar de verdade desta vez. "}Tam passa os dias ensinando lavradores a formar o **schiltron**, o anel de lanças que nenhum cavalo atravessa.`,
    choices: [
      { t: "Treinar no schiltron com Tam", if: () => !hasFlag("c4_schil"), go: "c4_schiltron" },
      {
        t: "Deixar Callum treinar arco com os arqueiros de Selkirk",
        if: () => !hasFlag("callum_arqueiro") && !hasFlag("callum_mensageiro"),
        fx() {
          state.flags.callum_arqueiro = 1;
          state.flags.c4_act = 1;
          toast("Callum vai lutar com os arqueiros");
        },
        go: "c4_inicio",
      },
      {
        t: "Manter Callum como mensageiro, longe da linha de frente",
        if: () => !hasFlag("callum_arqueiro") && !hasFlag("callum_mensageiro"),
        fx() {
          state.flags.callum_mensageiro = 1;
          state.flags.c4_act = 1;
          toast("Callum vai levar recados");
        },
        go: "c4_inicio",
      },
      { t: "Visitar o ferreiro do exército", go: "c4_ferreiro" },
      { t: "Partir para o verão", go: "c4_terra" },
    ],
  },
  c4_schiltron: {
    title: "O anel de lanças",
    enter() {
      state.flags.c4_schil = 1;
      state.flags.c4_act = 1;
      if (!state.weapons.includes("lanca")) giveWeapon("lanca");
      if ((state.skills.lanca || 0) < 4) {
        state.skills.lanca = 4;
        note("Perícia Lança treinada");
      }
      gain(2, "Treino do schiltron");
    },
    text: () => `Durante semanas, você treina com Tam no campo lamacento: quinhentos homens fecham um anel, ajoelham, cravam a ponta da lança no chão e apontam para fora, como um ouriço de ferro.

“O cavalo não é burro”, grita Tam. “Ele não corre para cima de mil lanças. Só os cavaleiros é que são burros.” Os homens riem. Você aprende a segurar a linha.`,
    choices: [{ t: "Voltar ao acampamento", go: "c4_inicio" }],
  },
  c4_ferreiro: {
    title: "O ferreiro do exército",
    enter() {
      state.flags.c4_act = 1;
    },
    text: () =>
      `O ferreiro do exército trabalha dia e noite, transformando foices em pontas de lança. Ele vende o que sobra. Você tem **${state.coins} pennies**.`,
    choices: [
      {
        t: "Comprar 2 maços de ervas",
        sub: "4 pennies",
        if: () => state.coins >= 4,
        fx() {
          state.coins -= 4;
          state.inv.ervas = (state.inv.ervas || 0) + 2;
          toast("+2 maços de ervas");
        },
        go: "c4_ferreiro",
      },
      {
        t: "Comprar 2 barras de ferro",
        sub: "5 pennies",
        if: () => state.coins >= 5,
        fx() {
          state.coins -= 5;
          state.mat.ferro = (state.mat.ferro || 0) + 2;
          toast("+2 Ferro");
        },
        go: "c4_ferreiro",
      },
      {
        t: "Comprar 2 peças de couro",
        sub: "5 pennies",
        if: () => state.coins >= 5,
        fx() {
          state.coins -= 5;
          state.mat.couro = (state.mat.couro || 0) + 2;
          toast("+2 Couro");
        },
        go: "c4_ferreiro",
      },
      {
        t: "Comprar 2 rolos de tecido",
        sub: "3 pennies",
        if: () => state.coins >= 3,
        fx() {
          state.coins -= 3;
          state.mat.tecido = (state.mat.tecido || 0) + 2;
          toast("+2 Tecido");
        },
        go: "c4_ferreiro",
      },
      {
        t: "Comprar 1 lingote de prata",
        sub: "9 pennies",
        if: () => state.coins >= 9,
        fx() {
          state.coins -= 9;
          state.mat.prata = (state.mat.prata || 0) + 1;
          toast("+1 Prata");
        },
        go: "c4_ferreiro",
      },
      {
        t: "Comprar um escudo de madeira",
        sub: "7 pennies",
        if: () => !state.shield && state.coins >= 7,
        fx() {
          state.coins -= 7;
          state.shield = true;
          toast("Escudo comprado");
        },
        go: "c4_ferreiro",
      },
      { t: "Voltar ao acampamento", go: "c4_inicio" },
    ],
  },
  c4_terra: {
    eyebrow: "Julho de 1298",
    title: "Terra queimada",
    text: () => `O exército de Eduardo atravessa a fronteira: dois mil cavaleiros, milhares de arqueiros galeses e ingleses. Wallace não pode enfrentá-lo em campo aberto. A ordem dele é simples e terrível: **queimar tudo**. Cada campo, cada celeiro, cada vaca que o inglês possa comer.

Num vale perto de Linlithgow, um lavrador chamado Hob se ajoelha na frente do seu trigo maduro. “É tudo o que temos. Meus filhos vão passar fome no inverno.”`,
    choices: [
      { t: "Queimar o campo, como Wallace mandou", go: "c4_queimou" },
      {
        t: "Poupar o campo e ajudar Hob a esconder o grão",
        test: {
          o: [
            ["diplomacia", 0],
            ["sobrevivencia", 0],
          ],
          ok: "c4_poupou",
          fail: "c4_queimou_mal",
        },
      },
    ],
  },
  c4_queimou: {
    title: "Fumaça preta",
    enter() {
      state.flags.queimou = 1;
      gain(1, "A ordem cumprida");
    },
    text: () => `Você ateia fogo ao trigo. Hob não diz nada. Só fica olhando a fumaça subir, com os filhos agarrados à sua perna.

Nas semanas seguintes, o exército inglês avança por uma terra sem comida. Os soldados de Eduardo começam a passar fome. A ordem de Wallace está funcionando, e você nunca vai esquecer o rosto de Hob.`,
    choices: [{ t: "Seguir com o exército", go: "c4_mensageiro" }],
  },
  c4_poupou: {
    title: "Grão debaixo da terra",
    enter() {
      state.flags.poupou = 1;
      state.inv.ervas = (state.inv.ervas || 0) + 2;
      note("+2 maços de ervas");
      gain(3, "Misericórdia com Hob");
    },
    text: () => `Você ajuda Hob a cavar um buraco no bosque e esconder os sacos de grão. Depois queima só a palha, para que a fumaça engane quem olhar de longe.

Hob segura suas mãos. “Que Deus te pague. Eu pago como posso.” Ele lhe dá ervas secas da mulher dele e uma informação: “Ontem passou por aqui um cavaleiro com as cores do conde de Dunbar. Ia para o sul, para o lado dos ingleses.”`,
    choices: [{ t: "Seguir com o exército", go: "c4_mensageiro" }],
  },
  c4_queimou_mal: {
    title: "O sargento",
    enter() {
      state.flags.queimou = 1;
    },
    text: () =>
      `Um sargento de Wallace vê você hesitar e ateia fogo ao campo ele mesmo. “Ordens são ordens.” Hob grita. Você fica olhando o trigo queimar, sem poder fazer nada.`,
    choices: [{ t: "Seguir com o exército", go: "c4_mensageiro" }],
  },
  c4_mensageiro: {
    title: "Um cavaleiro na noite",
    text: () => `O exército inglês está quase recuando de fome. Wallace sorri pela primeira vez em semanas.

Mas numa noite, perto de Falkirk, você vê um cavaleiro sair do acampamento de um nobre escocês e galopar para o sul, levando notícias para os condes de Dunbar e de Angus, escoceses que lutam do lado do rei inglês. ${hasFlag("poupou") ? "É o mesmo cavaleiro de que Hob falou." : ""}`,
    choices: [
      {
        t: "Interceptar o cavaleiro",
        fight: () => ({
          e: ["guarda", "guarda"],
          allies: comAilsa(),
          win: "c4_carta",
          lose: "c4_carta_perdida",
          intro: "O mensageiro tem escolta: dois homens de armas escoceses, a serviço do nobre traidor.",
        }),
      },
      {
        t: "Segui-lo em silêncio até o acampamento inglês",
        test: {
          o: [
            ["furtividade", 0],
            ["sobrevivencia", -1],
          ],
          ok: "c4_rei",
          fail: () => ({
            e: ["guarda", "guarda"],
            allies: comAilsa(),
            win: "c4_carta",
            lose: "c4_carta_perdida",
            intro: "Um galho estala, e a escolta se vira.",
          }),
        },
      },
    ],
  },
  c4_carta: {
    title: "A carta dos condes",
    enter() {
      state.flags.aviso_wallace = 1;
      gain(3, "A traição descoberta");
    },
    text: () => `Na bolsa do mensageiro há uma carta selada para os condes, que vão levá-la ao rei Eduardo. Ela diz onde Wallace está acampado: **na floresta perto de Falkirk**. E diz que os escoceses pretendem atacar o exército inglês de surpresa quando ele recuar.

Você leva a carta a Wallace. Ele lê duas vezes e fecha os olhos. “Então ele sabe. Não vai recuar. Vai vir direto para cá.” Ele se levanta. “Pelo menos agora sabemos. Vou pôr os arqueiros de Selkirk perto do bosque, onde os cavalos não chegam tão fácil.”`,
    choices: [{ t: "Preparar-se para a batalha", go: "c4_noite" }],
  },
  c4_rei: {
    title: "O rei e o cavalo",
    enter() {
      state.flags.viu_rei = 1;
      state.flags.aviso_wallace = 1;
      gain(3, "Espião no acampamento do rei");
    },
    text: () => `Você segue o cavaleiro até o acampamento inglês, perto de Linlithgow, e vê a carta passar de mão em mão até a grande tenda dos leões dourados.

Uma hora depois, o acampamento inteiro se agita. O rei Eduardo, um velho alto de sessenta anos, monta a cavalo para marchar à noite contra Falkirk. O cavalo se assusta, empina e acerta o rei com um coice nas costelas. O rei cai, se levanta sozinho, sobe de novo no cavalo e dá a ordem de marcha mesmo assim.

Você volta correndo para avisar Wallace. Ele ouve tudo em silêncio. “Um velho de costelas quebradas que não desiste.” Ele balança a cabeça. “Vou pôr os arqueiros perto do bosque.”`,
    choices: [{ t: "Preparar-se para a batalha", go: "c4_noite" }],
  },
  c4_carta_perdida: {
    title: "Tarde demais",
    enter() {
      state.hp = Math.max(state.hp, 3);
    },
    text: () =>
      `O mensageiro escapa na escuridão. Quando você chega ao acampamento, sangrando, já é tarde: ninguém sabe o que a carta dizia, mas todos imaginam.`,
    choices: [{ t: "Preparar-se para a batalha", go: "c4_noite" }],
  },
  c4_noite: {
    eyebrow: "21 de julho de 1298",
    title: "Neve em julho",
    text: () =>
      hasFlag("pacto_cailleach")
        ? `Na noite antes da batalha começa a nevar. Em julho.

Os soldados olham para o céu e fazem o sinal da cruz. Você sabe quem veio. A Cailleach sai entre as tendas, e a neve não toca nela.

“Amanhã os teus perdem, criança. Eu sei, porque o inverno vê longe. Por isso venho cobrar antes que morras: leva-me à Pedra. Agora.”`
        : `Na noite antes da batalha, a névoa sobe do pântano na frente do acampamento, e a Dama Branca aparece ao lado da sua fogueira.

“Amanhã o rei vence”, diz ela, sem rodeios. “Isso já está escrito, e não podes apagar. Mas podes escolher quem salvar.” Ela olha para ${hasFlag("ailsa") ? "Ailsa, que dorme abraçada ao arco," : "os arqueiros de Selkirk"} e depois para Tam, que ronca perto do fogo. “Escolhe bem.”`,
    choices: [
      {
        t: "Pedir mais tempo: “Depois da guerra, como combinamos.”",
        if: () => hasFlag("pacto_cailleach"),
        test: {
          o: [
            ["diplomacia", 0],
            ["Vontade", 0],
          ],
          ok: "c4_adiou",
          fail: "c4_cobrou",
        },
      },
      {
        t: "Romper o pacto: “Nunca vou quebrar a Pedra.”",
        if: () => hasFlag("pacto_cailleach"),
        go: "c4_rompeu",
      },
      { t: "Agradecer à Dama e tentar dormir", if: () => !hasFlag("pacto_cailleach"), go: "c4_manha" },
    ],
  },
  c4_adiou: {
    title: "Um acordo é um acordo",
    enter() {
      state.flags.adiou = 1;
      gain(2, "Palavras com a Velha");
    },
    text: () => `A Velha olha para você por muito tempo. “Depois da guerra, então. Mas lembra: as guerras dos homens nunca acabam. Eu tenho paciência. Eu sou o inverno. Volto todo ano.”

A neve para.`,
    choices: [{ t: "Tentar dormir", go: "c4_manha" }],
  },
  c4_cobrou: {
    title: "O preço do calor",
    enter() {
      state.flags.frio_eterno = 1;
      state.fp = Math.min(state.fp, maxFP(state));
      note("−2 PF máximos para sempre · O frio da Cailleach", "hurt");
    },
    text: () => `“Não.” A Velha toca seu peito com um dedo de gelo. “Então pego um pedaço agora, como garantia.”

O frio entra e fica. Você vai sentir aquele frio pelo resto da vida, nas noites de inverno e nas de verão. **Você perdeu 2 PF máximos para sempre.**

“Depois da guerra”, diz ela, e some.`,
    choices: [{ t: "Tentar dormir", go: "c4_manha" }],
  },
  c4_rompeu: {
    title: "Um pacto rompido",
    enter() {
      state.flags.quebrou_pacto = 1;
      gain(2, "Coragem diante da Velha");
    },
    text: () => `“Nunca vou quebrar a Pedra.” As palavras saem antes que você pense.

A Velha não grita. Ela sorri, e é pior. “Então amanhã meus cães caçam ao lado dos ingleses. E depois de amanhã também. E todos os dias, até a Pedra quebrar ou tu morreres.”

Ela some na neve. Ao longe, lobos uivam.`,
    choices: [{ t: "Tentar dormir", go: "c4_manha" }],
  },
  c4_manha: {
    eyebrow: "22 de julho de 1298",
    title: "Falkirk",
    text: () => `De manhã, o exército escocês está formado numa encosta, atrás de um pântano. Quatro grandes schiltrons, anéis de lanças com mil homens cada. Entre eles, os arqueiros de Selkirk, sob o comando de Sir John Stewart. Atrás, a cavalaria dos nobres.

Do outro lado do campo chega o exército inglês, o maior que você já viu. No meio dele, montado apesar das costelas quebradas, o rei Eduardo.

Wallace passa a cavalo na frente dos schiltrons e grita: “Eu vos trouxe ao baile. Agora dançai, se puderdes!”

Onde você vai lutar?`,
    choices: [
      { t: "No schiltron de Tam", go: "c4_schiltron_luta" },
      { t: "Com os arqueiros de Selkirk", go: "c4_arqueiros_luta" },
      { t: "Com a cavalaria dos nobres", go: "c4_cavalaria" },
    ],
  },
  c4_cavalaria: {
    title: "Os nobres",
    text: () => `A cavalaria inglesa contorna o pântano e avança. Você está entre os cavaleiros dos nobres escoceses, de malha brilhante e cavalos caros.

E eles viram as rédeas. Sem lutar. Um a um, os senhores da Escócia fogem do campo, deixando os lanceiros e os arqueiros sozinhos.`,
    choices: [
      {
        t: "Gritar para que fiquem e lutem",
        test: {
          o: [
            ["diplomacia", 0],
            ["Vontade", -2],
          ],
          ok: "c4_cavalaria_ok",
          fail: "c4_cavalaria_mal",
        },
      },
      { t: "Ir sozinho socorrer os arqueiros", go: "c4_arqueiros_carga" },
    ],
  },
  c4_cavalaria_ok: {
    title: "Alguns ficam",
    enter() {
      state.flags.nobres_ficaram = 1;
      gain(3, "Uma voz no campo");
    },
    text: () => `“Covardes! Lá estão os vossos homens!” Sua voz corta o barulho da batalha. A maioria foge assim mesmo. Mas um punhado de cavaleiros mais jovens para, olha para trás, e dá a volta.

“Para os arqueiros!”, grita um deles. Vocês galopam juntos.`,
    choices: [{ t: "Socorrer os arqueiros", go: "c4_arqueiros_carga" }],
  },
  c4_cavalaria_mal: {
    title: "Ninguém fica",
    text: () =>
      `Ninguém ouve você. Em poucos minutos, a cavalaria escocesa some do campo. Lá embaixo, os arqueiros de Selkirk estão sozinhos diante dos cavaleiros ingleses.`,
    choices: [{ t: "Ir sozinho socorrer os arqueiros", go: "c4_arqueiros_carga" }],
  },
  c4_arqueiros_luta: {
    title: "Os arqueiros de Selkirk",
    text: () => `Você se posiciona entre os arqueiros de Selkirk${hasFlag("ailsa") ? ", ao lado de Ailsa" : ""}${hasFlag("callum_arqueiro") ? ". Callum está duas fileiras atrás, com as mãos tremendo no arco" : ""}. ${hasFlag("aviso_wallace") ? "Graças ao aviso, Wallace pôs vocês perto do bosque." : "Vocês estão no meio do campo aberto, entre os schiltrons."}

A cavalaria inglesa cai sobre os arqueiros como uma onda. Sir John Stewart cai do cavalo e morre lutando a pé. Um cavaleiro vem direto para você.`,
    choices: [
      {
        t: "Defender os arqueiros",
        fight: () => ({
          e: ["cavaleiro_montado", "soldado"],
          allies: [...comAilsa(), ...(hasFlag("callum_arqueiro") ? [ALLY.callum] : [])],
          blindAll: hasFlag("aviso_wallace") ? 1 : 0,
          win: "c4_arqueiros_salvos",
          lose: "c4_arqueiros_perdidos",
          intro: hasFlag("aviso_wallace")
            ? "As árvores atrapalham a carga dos cavaleiros."
            : "Não há onde se esconder.",
        }),
      },
    ],
  },
  c4_arqueiros_carga: {
    title: "Para os arqueiros",
    text: () =>
      `Você chega aos arqueiros de Selkirk no momento em que a cavalaria inglesa os atropela. Sir John Stewart já está caído. ${hasFlag("ailsa") ? "Ailsa atira sem parar, de pé no meio dos mortos." : ""}`,
    choices: [
      {
        t: "Atacar os cavaleiros",
        fight: () => ({
          e: ["cavaleiro_montado", "soldado"],
          allies: [
            ...comAilsa(),
            ...(hasFlag("nobres_ficaram") ? [ALLY.nobres] : []),
            ...(hasFlag("callum_arqueiro") ? [ALLY.callum] : []),
          ],
          win: "c4_arqueiros_salvos",
          lose: "c4_arqueiros_perdidos",
        }),
      },
    ],
  },
  c4_arqueiros_salvos: {
    title: "Para o bosque",
    enter() {
      if (hasFlag("ailsa")) state.flags.ailsa_salva = 1;
      gain(3, "Os arqueiros salvos");
    },
    text: () => `Os cavaleiros recuam por um instante, e é o bastante. Você grita, e os arqueiros que sobraram correm para o bosque${hasFlag("ailsa") ? ", com Ailsa por último, cobrindo a retirada" : ""}${hasFlag("callum_arqueiro") ? ". Callum passa por você correndo, vivo, com um corte no braço e os olhos arregalados" : ""}.

Dos arqueiros de Selkirk, sobraram poucos. Mas sobraram.`,
    choices: [{ t: "Voltar para os schiltrons", go: "c4_flechas" }],
  },
  c4_arqueiros_perdidos: {
    title: "O campo dos arqueiros",
    enter() {
      state.hp = Math.max(state.hp, 3);
      if (hasFlag("ailsa")) state.flags.ailsa_morta = 1;
      if (hasFlag("callum_arqueiro")) state.flags.callum_ferido = 1;
    },
    text: () => `Você cai, e quando consegue se levantar a carga já passou. O campo dos arqueiros é só silêncio.

${hasFlag("ailsa") ? "Você encontra Ailsa caída com o arco ainda na mão, e uma flecha ainda na corda. Ela nunca desperdiçou uma flecha." : ""} ${hasFlag("callum_arqueiro") ? "Callum está vivo, ferido na perna, escondido embaixo do corpo de um cavalo. Ele não chora. Não consegue." : ""}`,
    choices: [{ t: "Voltar para os schiltrons", go: "c4_flechas" }],
  },
  c4_schiltron_luta: {
    title: "O schiltron de Tam",
    text: () => `Você entra no anel de lanças de Tam e se ajoelha com a lança cravada no chão. A cavalaria inglesa vem a galope, a terra treme, e se arrebenta contra as pontas. Cavalos gritam. Cavaleiros caem.

“Segurem!”, ruge Tam. “Segurem!” Dois cavaleiros conseguem abrir caminho até você.`,
    choices: [
      {
        t: "Segurar a linha",
        fight: () => ({
          e: ["cavaleiro_montado", "cavaleiro_montado"],
          hp: [14, 14],
          allies: [ALLY.lanceiros, ALLY.tam],
          win: "c4_schiltron_firme",
          lose: "c4_schiltron_ferido",
          intro: "Os lanceiros do schiltron lutam ao seu lado.",
        }),
      },
    ],
  },
  c4_schiltron_firme: {
    title: "A muralha aguenta",
    enter() {
      if (hasFlag("ailsa") && !hasFlag("aviso_wallace")) state.flags.ailsa_morta = 1;
      else if (hasFlag("ailsa")) state.flags.ailsa_salva = 1;
      gain(3, "O schiltron aguenta");
    },
    text: () => `O schiltron aguenta. Os cavaleiros ingleses recuam, deixando os mortos na frente das lanças.

Mas lá longe, no campo dos arqueiros, você vê a carga atropelar os homens de Selkirk. ${hasFlag("ailsa") ? (hasFlag("aviso_wallace") ? "Graças ao aviso, eles estavam perto do bosque, e você vê Ailsa e alguns outros correrem para as árvores." : "Eles estavam em campo aberto. Você procura Ailsa no meio deles e não encontra.") : ""}`,
    choices: [{ t: "Olhar para o céu", go: "c4_flechas" }],
  },
  c4_schiltron_ferido: {
    title: "Ferido no anel",
    enter() {
      state.hp = Math.max(state.hp, 3);
      if (hasFlag("ailsa") && !hasFlag("aviso_wallace")) state.flags.ailsa_morta = 1;
      else if (hasFlag("ailsa")) state.flags.ailsa_salva = 1;
    },
    text: () =>
      `Uma lança inglesa atravessa sua guarda, e você cai dentro do anel. Tam fecha o buraco com o próprio corpo e arrasta você para o centro. O schiltron aguenta, por enquanto.`,
    choices: [{ t: "Levantar-se", go: "c4_flechas" }],
  },
  c4_flechas: {
    title: "O céu escurece",
    text: () => `Então o rei Eduardo faz o que ninguém esperava. Para a cavalaria e manda avançar os arqueiros e os besteiros.

O céu escurece. Milhares de flechas caem sobre os schiltrons, que não podem se mover nem se abrigar. Os homens caem um a um, e os anéis de lanças começam a ter buracos.`,
    choices: [
      {
        t: "Erguer o escudo e aguentar",
        tag: () => (state.shield ? "escudo" : ""),
        test: {
          o: () => [
            ["escudo", state.shield ? 2 : -10],
            ["HT", -1],
            ["DX", -2],
          ],
          ok: "c4_flechas_ok",
          fail: "c4_flechas_mal",
        },
      },
    ],
  },
  c4_flechas_ok: {
    title: "Debaixo da chuva",
    enter() {
      gain(1, "Debaixo das flechas");
    },
    text: () =>
      `Você se encolhe embaixo ${state.shield ? "do escudo" : "do corpo de um cavalo morto"}, e as flechas batem como granizo. Quando a chuva para, você ainda está de pé. Muitos outros não estão.`,
    choices: [{ t: "Ver o schiltron romper", go: "c4_rompe" }],
  },
  c4_flechas_mal: {
    title: "Flechas",
    enter() {
      hurt("2d", "A chuva de flechas");
    },
    text: () =>
      `Uma flecha atravessa seu ombro, outra a sua coxa. Você cai de joelhos, mas continua segurando a lança.`,
    choices: [{ t: "Ver o schiltron romper", go: "c4_rompe" }],
  },
  c4_rompe: {
    title: "O anel se rompe",
    text: () => `Com os anéis cheios de buracos, a cavalaria inglesa volta, e desta vez entra. Os schiltrons se desmancham. É o fim da batalha.

No meio da confusão, você vê duas coisas: **Tam** cercado por três cavaleiros, ainda girando o bordão, e **Wallace** recuando para o bosque de Callendar com os últimos homens, perseguido por um cavaleiro de manto branco com uma cruz vermelha.`,
    choices: [
      {
        t: "Abrir caminho até Tam",
        fight: () => ({
          e: ["soldado", "soldado"],
          allies: comCallum(),
          win: "c4_tam_salvo",
          lose: "c4_tam_morto",
          intro: "Você corre para Tam, abrindo caminho entre os ingleses.",
        }),
      },
      {
        t: "Cobrir a retirada de Wallace",
        fx() {
          if (hasFlag("fergus_amigo")) state.flags.tam_ferido = 1;
          else state.flags.tam_morto = 1;
        },
        go: "c4_templario",
      },
    ],
  },
  c4_tam_salvo: {
    title: "Tam",
    enter() {
      state.flags.tam_salvo = 1;
      gain(3, "Tam salvo");
    },
    text: () => `Você chega até Tam no momento em que o bordão dele se parte. Juntos, de costas um para o outro, vocês abrem caminho até o bosque.

“Sempre achei que ia morrer numa batalha”, ofega Tam, com sangue na barba. “Não hoje, pelo jeito.”`,
    choices: [{ t: "Correr para o bosque de Callendar", go: "c4_templario" }],
  },
  c4_tam_morto: {
    title: "O bordão partido",
    enter() {
      state.flags.c4_tam_visto = 1;
      state.flags.tam_morto = 1;
      state.hp = Math.max(state.hp, 3);
    },
    text: () => `Você não chega a tempo. Quando abre caminho até o lugar, só encontra o bordão de freixo partido ao meio, e Tam caído ao lado dele, com o sorriso perigoso ainda no rosto.

Você pega metade do bordão e corre para o bosque.`,
    choices: [{ t: "Correr para o bosque de Callendar", go: "c4_templario" }],
  },
  c4_templario: {
    title: "O Mestre do Templo",
    text: () =>
      `${hasFlag("tam_morto") && !hasFlag("tam_salvo") && !hasFlag("c4_tam_visto") ? "Você não olha para trás. Mais tarde vai saber que Tam morreu cercado, girando o bordão até o fim.\n\n" : ""}${hasFlag("tam_ferido") ? "Mais tarde você vai saber que Fergus Mór arrancou Tam do meio dos cavaleiros, ferido mas vivo.\n\n" : ""}No bosque de Callendar, entre o lodo e as raízes, o cavaleiro de manto branco alcança vocês. É o **irmão Brian de Jay, Mestre dos Templários na Inglaterra**, e ele não faz prisioneiros.${hasFlag("quebrou_pacto") ? "\n\nE entre as árvores, olhos azuis de gelo. Os lobos da Velha cumprem a promessa." : ""}`,
    choices: [
      {
        t: "Enfrentar o Templário",
        fight: () => ({
          e: ["templario", ...(hasFlag("quebrou_pacto") ? ["lobo_inverno"] : [])],
          allies: [
            ...(hasFlag("tam_salvo") ? [ALLY.tam] : []),
            ...(hasFlag("fergus_amigo") ? [ALLY.fergus] : []),
            ...comCallum(),
          ],
          win: "c4_bosque",
          lose: "c4_bosque_ferido",
        }),
      },
    ],
  },
  c4_bosque: {
    title: "O lodo de Callendar",
    enter() {
      giveWeapon("arco_longo");
      giveMat({ ferro: 2, prata: 1 });
      gain(5, "O Mestre do Templo");
    },
    text: () => `O cavalo do Templário afunda no lodo do bosque, e ele cai. Não se levanta mais.

Wallace passa por você, olha o corpo e diz apenas: “Ele lutou bem.” Depois some entre as árvores com os últimos homens. No chão, perto de um arqueiro galês caído, há um arco longo de olmo, mais alto que você.`,
    choices: [{ t: "Fugir com os sobreviventes", go: "c4_renuncia" }],
  },
  c4_bosque_ferido: {
    title: "Entre as raízes",
    enter() {
      state.hp = Math.max(state.hp, 3);
      giveWeapon("arco_longo");
    },
    text: () => `O Templário derruba você entre as raízes e ergue a espada. Então o cavalo dele afunda no lodo, e ele cai junto. Antes que se levante, homens de Wallace o cercam.

Você se arrasta para longe e, no caminho, pega um arco longo galês abandonado na lama.`,
    choices: [{ t: "Fugir com os sobreviventes", go: "c4_renuncia" }],
  },
  c4_renuncia: {
    eyebrow: "Fim do Capítulo IV · Outono de 1298",
    title: "A espada no altar",
    enter() {
      state.flags.cap4_fim = 1;
      state.hp = maxHP(state);
      state.fp = maxFP(state);
      gain(6, "Fim do Capítulo IV");
    },
    text: () => {
      const l = [];
      if (hasFlag("ailsa"))
        l.push(
          hasFlag("ailsa_morta")
            ? "Ailsa morreu em Falkirk, entre os arqueiros de Selkirk."
            : "Ailsa sobreviveu a Falkirk.",
        );
      l.push(
        hasFlag("tam_salvo")
          ? "Você salvou Tam no meio dos schiltrons."
          : hasFlag("tam_ferido")
            ? "Fergus Mór salvou Tam, ferido."
            : "Tam morreu em Falkirk, girando o bordão até o fim.",
      );
      l.push(
        hasFlag("callum_ferido")
          ? "Callum foi ferido na perna e vai mancar pelo resto da vida."
          : "Callum saiu de Falkirk sem ferimentos graves.",
      );
      l.push(
        hasFlag("poupou")
          ? "Hob e os filhos passaram o inverno com o grão que você ajudou a esconder."
          : "O campo de Hob virou cinza.",
      );
      if (hasFlag("quebrou_pacto")) l.push("Você rompeu o pacto com a Cailleach. Os lobos dela caçam você.");
      else if (hasFlag("adiou")) l.push("A Cailleach aceitou esperar até o fim da guerra.");
      else if (hasFlag("frio_eterno")) l.push("A Cailleach levou um pedaço do seu calor como garantia.");
      return `Falkirk foi uma matança. Milhares de escoceses morreram na encosta e no pântano. Wallace escapou, mas a vitória de Stirling parece ter acontecido há cem anos.

Em dezembro, numa igreja fria, Wallace deposita a espada no altar e renuncia ao título de Guardião. Dois nobres assumem no lugar dele: **Robert Bruce**, conde de Carrick, e **John Comyn**, que se odeiam.

“Vou para a França”, diz Wallace, depois. “Pedir ajuda ao rei francês e ao papa. Se a Escócia não se salva com lanças, talvez se salve com cartas.” Ele olha para você. “Cuida do teu irmão.”

<ul class="end-list">${l.map((x) => `<li>${x}</li>`).join("")}</ul>

Seu título agora é **${title(state)}**, com ${state.earned} pontos de experiência acumulados.`;
    },
    choices: [
      { t: "Começar o Capítulo V", go: "c5_inicio" },
      { t: "Gastar meus pontos", act: "evolve" },
    ],
  },
});

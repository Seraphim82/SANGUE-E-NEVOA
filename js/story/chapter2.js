/**
 * Capítulo II · O Martelo e a Pedra (1297).
 */
"use strict";

const ALLY = {
  tam: { n: "Tam", skill: 13, dmg: "1d+2", type: "cr" },
  ailsa: { n: "Ailsa", skill: 14, dmg: "1d+1", type: "imp" },
  aodh: { n: "Irmão Aodh", skill: 12, dmg: "1d", type: "cr", fey: true },
};
const comAilsa = () => (F("ailsa") ? [ALLY.ailsa] : []);
Object.assign(SC, {
  c2_inicio: {
    eyebrow: "Capítulo II · O Martelo e a Pedra",
    title: "Inverno nos Rochedos",
    enter() {
      S.hp = maxHP(S);
      S.fp = maxFP(S);
      S.flags.cap2 = 1;
      S.flags.c2_act = 0;
      if (!F("sangue_frio")) S.flags.ailsa = 1;
      note("Descanso de inverno: PV e PF restaurados");
    },
    text: () =>
      S.flags.c2_act
        ? `A noite cai sobre o acampamento. A neve não para. ${S.flags.c2_act >= 2 ? "Você está cansado, mas ainda há tempo para mais uma coisa." : "O que mais você quer fazer antes de dormir?"}`
        : `Janeiro de 1297. A neve cobre os Rochedos de Cartland até os joelhos, e a cachoeira na frente da caverna virou uma cortina de gelo.

Callum passou o inverno aprendendo a usar a funda com os rebeldes e já acerta um corvo a vinte passos. ${F("mairi_viva") ? "Mairi cuida dos doentes com ervas secas e reza baixinho para santos que a Igreja nunca conheceu." : "Às vezes, à noite, você ainda sente cheiro de fumaça e pensa em Mairi."}

${F("sangue_frio") ? "Tam mal fala com você desde a torre. Quando fala, é curto: “Tu vais sozinho para o norte. Não mando a Ailsa com quem mata homem ferido.”" : "Tam senta ao seu lado perto do fogo. “Ailsa vai contigo quando a neve derreter. Ela atira melhor que eu e reclama menos.”"}

Um pastor que desceu de Perth trouxe notícias: um velho monge de Scone vive escondido na **colina de Dunsinane**, além do rio Tay, e fala sozinho com as pedras. ${F("bw_divida") ? "Você se lembra das palavras de Blackwood: “Os monges riam.”" : "Você se lembra das palavras da Dama: “A Pedra que eles levaram não é a verdadeira.”"}

Até o degelo, o acampamento é seu lar.`,
    choices: [
      { t: "Treinar arco com Ailsa", if: () => F("ailsa") && !F("c2_arco"), go: "c2_treino_arco" },
      {
        t: "Ouvir Mairi falar da Velha do Inverno",
        if: () => F("mairi_viva") && !F("c2_mairi"),
        go: "c2_mairi_cailleach",
      },
      {
        t: "Ouvir os velhos falarem da Velha do Inverno",
        if: () => !F("mairi_viva") && !F("c2_mairi"),
        go: "c2_mairi_cailleach",
      },
      { t: "Negociar com Wat, o mascate que subiu de Lanark", go: "c2_mercador" },
      { t: "Dormir", go: "c2_lobos" },
    ],
  },
  c2_treino_arco: {
    title: "Teixo e corda de linho",
    enter() {
      S.flags.c2_arco = 1;
      S.flags.c2_act++;
      giveWeapon("arco");
      if ((S.skills.arco || 0) < 2) S.skills.arco = 2;
      note("Perícia Arco treinada");
      gain(1, "Treino com Ailsa");
    },
    text: () => `Ailsa põe um arco curto de teixo na sua mão. “Não puxes com o braço. Puxa com as costas, e solta quando o coração bater.”

Depois de uma semana atirando em fardos de palha na neve, você acerta três em cada cinco. Ailsa dá de ombros. “Para quem começou ontem, está bom. Fica com o arco. Eu faço outro.”`,
    choices: [{ t: "Voltar ao fogo", go: "c2_inicio" }],
  },
  c2_mairi_cailleach: {
    title: "A Velha do Inverno",
    enter() {
      S.flags.c2_mairi = 1;
      S.flags.c2_act++;
      S.flags.cailleach_saber = 1;
      S.inv.ervas = (S.inv.ervas || 0) + 2;
      note("+2 maços de ervas");
      if (!S.inv.sorveira) giveItem("sorveira");
      gain(2, "Saber sobre a Cailleach");
    },
    text: () => `${F("mairi_viva") ? "Mairi" : "A velha Morag, avó de um dos rebeldes,"} fala baixo, olhando para o gelo na entrada da caverna.

“Ela tem muitos nomes. Cailleach. Beira. A Velha. Tem a pele azul de frio e um olho só, e onde bate o cajado de azevinho a terra congela. No Samhain ela acorda, e em Beltane volta a ser pedra.”

“Os lobos dela odeiam fogo e sorveira. E ela odeia a Pedra, porque foi a Pedra que a prendeu, no tempo dos pictos. Enquanto a Pedra dormir em solo escocês, o inverno tem fim. Se a Pedra acordar nas mãos erradas…”

Ela não termina a frase. Põe ervas secas na sua mão. “Leva. E não confies em nada que dança no pântano.”`,
    choices: [{ t: "Voltar ao fogo", go: "c2_inicio" }],
  },
  c2_mercador: {
    title: "Wat, o mascate",
    enter() {
      S.flags.c2_act++;
    },
    text: () => `Wat é magro, desdentado e carrega nas costas uma loja inteira. Ele espalha a mercadoria numa manta perto do fogo.

“Ervas, linho, ferro bom de Lanark. Pago nada, vendo caro, que a guerra é cara para todo mundo.”

Você tem **${S.coins} pennies**.`,
    choices: [
      {
        t: "Comprar 2 maços de ervas",
        sub: "5 pennies",
        if: () => S.coins >= 5,
        fx() {
          S.coins -= 5;
          S.inv.ervas = (S.inv.ervas || 0) + 2;
          toast("+2 maços de ervas");
        },
        go: "c2_mercador",
      },
      {
        t: "Comprar 2 barras de ferro",
        sub: "6 pennies · material de forja",
        if: () => S.coins >= 6,
        fx() {
          S.coins -= 6;
          S.mat.ferro = (S.mat.ferro || 0) + 2;
          toast("+2 Ferro");
        },
        go: "c2_mercador",
      },
      {
        t: "Comprar 2 peças de couro",
        sub: "6 pennies · material de forja",
        if: () => S.coins >= 6,
        fx() {
          S.coins -= 6;
          S.mat.couro = (S.mat.couro || 0) + 2;
          toast("+2 Couro");
        },
        go: "c2_mercador",
      },
      {
        t: "Comprar 2 rolos de tecido",
        sub: "4 pennies · material de forja",
        if: () => S.coins >= 4,
        fx() {
          S.coins -= 4;
          S.mat.tecido = (S.mat.tecido || 0) + 2;
          toast("+2 Tecido");
        },
        go: "c2_mercador",
      },
      {
        t: "Comprar um escudo de madeira",
        sub: "8 pennies · Bloqueio e +1 nas defesas com arma de uma mão",
        if: () => !S.shield && S.coins >= 8,
        fx() {
          S.coins -= 8;
          S.shield = true;
          toast("Escudo de madeira comprado");
        },
        go: "c2_mercador",
      },
      {
        t: "Comprar um arco curto",
        sub: "15 pennies",
        if: () => !S.weapons.includes("arco") && S.coins >= 15,
        fx() {
          S.coins -= 15;
          S.weapons.push("arco");
          toast("Arco curto comprado");
        },
        go: "c2_mercador",
      },
      { t: "Voltar ao fogo", go: "c2_inicio" },
    ],
  },
  c2_lobos: {
    title: "Uivos na nevasca",
    text: () => `No meio da noite, o vento para de uma vez. O silêncio acorda você antes do uivo.

Da nevasca saem ${F("cailleach") ? "três" : "dois"} lobos brancos do tamanho de bezerros, com olhos de gelo azul. Onde pisam, a neve não afunda. O fogo do acampamento encolhe como se tivesse medo.

“Lobos da Velha!”, grita Tam, já com o bordão na mão. “Ao fogo! Todos ao fogo!”${F("cailleach") ? "\n\nVocê sabe por que eles vieram. Os três Sinais na sua pele ardem de frio." : ""}`,
    choices: [
      {
        t: "Lutar ao lado de Tam",
        fight: () => ({
          e: F("cailleach")
            ? ["lobo_inverno", "lobo_inverno", "lobo_inverno"]
            : ["lobo_inverno", "lobo_inverno"],
          allies: [ALLY.tam],
          win: "c2_lobos_ok",
          lose: "c2_lobos_mal",
          intro: "Tam luta ao seu lado com o bordão em chamas.",
        }),
      },
      {
        t: "Pegar um tição da fogueira antes de atacar",
        sub: "Os lobos temem o fogo: −2 no ataque deles na primeira rodada",
        fight: () => ({
          e: F("cailleach")
            ? ["lobo_inverno", "lobo_inverno", "lobo_inverno"]
            : ["lobo_inverno", "lobo_inverno"],
          allies: [ALLY.tam],
          blindAll: 1,
          win: "c2_lobos_ok",
          lose: "c2_lobos_mal",
          intro: "Você agita o tição em brasa, e os lobos recuam um passo, ofuscados.",
        }),
      },
    ],
  },
  c2_lobos_ok: {
    title: "Neve e silêncio",
    enter() {
      giveOutfit("peles");
      gain(2, "Os lobos da Velha");
    },
    text: () => `O último lobo cai e se desfaz num monte de neve fina, como se nunca tivesse sido carne. Só ficam as peles, brancas e frias, que não derretem perto do fogo.

Tam limpa o suor congelado da testa. “A Velha sabe de ti, ${N()}. Mandou os cães dela para ver do que és feito.” Ele joga uma das peles sobre você. “Agora usa isso contra ela.”`,
    choices: [{ t: "Esperar o degelo", go: "c2_partida" }],
  },
  c2_lobos_mal: {
    title: "O fogo de Tam",
    enter() {
      S.hp = Math.max(S.hp, Math.ceil(maxHP(S) / 3));
    },
    text: () => `Os dentes de gelo fecham no seu ombro, e o frio entra até os ossos. Então Tam joga um balde de gordura na fogueira, e uma coluna de fogo sobe até o teto da caverna.

Os lobos ganem e somem na nevasca. Quando você acorda, alguém pôs pedras quentes nos seus pés. Ninguém morreu. Desta vez.`,
    choices: [{ t: "Esperar o degelo", go: "c2_partida" }],
  },
  c2_partida: {
    eyebrow: "Fevereiro de 1297",
    title: "Dois caminhos para o norte",
    enter() {
      S.hp = maxHP(S);
      S.fp = maxFP(S);
    },
    text: () => `A neve vira lama, e é hora de partir. Callum fica com ${F("mairi_viva") ? "Mairi e " : ""}os rebeldes, e chora com raiva por não poder ir. ${F("ailsa") ? "Ailsa ajeita a aljava no ombro. “Até Dunsinane são seis dias. Se não morrermos antes.”" : "Você parte sozinho, com o vento nas costas."}

Entre Cartland e o rio Tay há dois caminhos:

**A estrada de Stirling**, mais curta, que atravessa o rio Forth pela ponte de madeira aos pés do castelo. A ponte é guardada pelos ingleses.

**O pântano de Flanders Moss**, uma imensidão de turfa e água parada onde nem os ingleses entram. Os pastores dizem que lá dançam mulheres que não deviam dançar, e que ao entardecer os mortos sem paz atravessam o céu.`,
    choices: [
      { t: "Ir pela estrada de Stirling", go: "c2_ponte" },
      { t: "Atravessar o pântano de Flanders Moss", go: "c2_musgo" },
    ],
  },
  c2_ponte: {
    title: "A ponte de Stirling",
    text: () => `O castelo de Stirling se ergue sobre a rocha como um punho fechado. Lá embaixo, a ponte de madeira sobre o Forth é estreita, e só passam dois cavalos por vez. Uma fila de camponeses espera, de cabeça baixa, enquanto soldados ingleses revistam carroças.

${F("bw_divida") ? "Você reconhece a barba grisalha antes de ver o rosto. **Blackwood** comanda o posto. Ele ainda manca." : "No comando está um cavaleiro de escudo branco com três corvos negros, **Sir Osric Hale**, que olha cada rosto como quem procura um em especial."}`,
    choices: [
      { t: "Ir direto até Blackwood", if: () => F("bw_divida"), go: "c2_ponte_bw" },
      {
        t: "Passar disfarçado entre os camponeses",
        if: () => !F("bw_divida"),
        tag: () => (S.armor === "malha" ? "+3 cota inglesa" : S.armor === "tartan" ? "−2 tartan" : ""),
        test: {
          o: () => {
            const m = S.armor === "malha" ? 3 : S.armor === "tartan" ? -2 : 0;
            return [
              ["diplomacia", m],
              ["IQ", m - 2],
            ];
          },
          ok: "c2_ponte_ok",
          fail: () => ({
            e: ["soldado", "soldado"],
            allies: comAilsa(),
            win: "c2_ponte_luta",
            lose: "c2_ponte_preso",
            intro: "Um soldado agarra seu braço. “Esse aí não é camponês!”",
          }),
        },
      },
      {
        t: "Subornar o soldado da ponte",
        sub: "15 pennies",
        if: () => !F("bw_divida") && S.coins >= 15,
        fx() {
          S.coins -= 15;
        },
        go: "c2_ponte_ok",
      },
      {
        t: "Atravessar o rio a nado, longe da ponte",
        test: {
          o: [
            ["natacao", 0],
            ["HT", -2],
          ],
          ok: "c2_tay",
          fail: "c2_forth_mal",
        },
      },
      {
        t: "Atacar Sir Osric Hale",
        if: () => !F("bw_divida"),
        tag: () => "Perigoso",
        fight: () => ({
          e: ["cavaleiro", "soldado"],
          allies: comAilsa(),
          win: "c2_ponte_vitoria",
          lose: "c2_ponte_preso",
        }),
      },
    ],
  },
  c2_ponte_bw: {
    title: "A dívida do sargento",
    enter() {
      S.flags.aviso_hale = 1;
      gain(3, "A dívida paga");
    },
    text: () => `Blackwood vê você e fica parado por um longo momento. Depois grita para os soldados: “Este eu conheço. É pastor de Lanark. Deixem passar.”

Quando você passa por ele, Blackwood fala sem mexer a boca: “Agora estamos quites, escocês. E ouve: um cavaleiro chamado Osric Hale atravessou esta ponte há três dias. Vai para Dunsinane, caçar um monge. Se vais para lá também… chega antes dele.”`,
    choices: [{ t: "Seguir para o norte", go: "c2_tay" }],
  },
  c2_ponte_ok: {
    title: "Do outro lado do Forth",
    enter() {
      S.flags.aviso_hale = 1;
      gain(2, "Passagem discreta");
    },
    text: () => `Você passa com a cabeça baixa entre os carneiros de um velho pastor. Ninguém olha duas vezes.

Do outro lado, ouve dois soldados conversando: “Sir Osric parte amanhã para Dunsinane. Diz que um monge de Scone esconde lá alguma coisa do rei.”`,
    choices: [{ t: "Seguir para o norte, depressa", go: "c2_tay" }],
  },
  c2_ponte_luta: {
    title: "Fuga pela ponte",
    enter() {
      S.flags.aviso_hale = 1;
      gain(1, "Fuga");
    },
    text: () => `Os soldados caem, e você corre pela ponte antes que os outros cheguem. ${F("ailsa") ? "As flechas de Ailsa seguram os ingleses do outro lado." : ""}

Lá atrás, Sir Osric Hale não corre. Ele só olha para você, como quem guarda um rosto na memória.`,
    choices: [{ t: "Fugir para o norte", go: "c2_tay" }],
  },
  c2_ponte_vitoria: {
    title: "Os três corvos caem",
    enter() {
      S.flags.hale_morto = 1;
      giveWeapon("machado");
      gain(3, "Sir Osric Hale vencido");
    },
    text: () => `Sir Osric cai do cavalo na lama do Forth. Os soldados ingleses recuam para o castelo, gritando por reforços.

Você pega o machado dinamarquês que estava preso à sela dele, uma arma de duas mãos, de lâmina larga, das que os mercenários das ilhas usam. Na bolsa do cavaleiro, uma carta com o selo do rei: *encontrar o monge de Dunsinane e trazer o que ele esconde*.`,
    choices: [{ t: "Fugir para o norte antes dos reforços", go: "c2_tay" }],
  },
  c2_ponte_preso: {
    title: "Uma cela em Stirling",
    enter() {
      S.hp = Math.max(S.hp, 3);
      S.flags.aviso_hale = 1;
    },
    text: () => `Você acorda numa cela úmida sob o castelo, com o gosto de sangue na boca.

${F("ailsa") ? "Na segunda noite, uma corda desce pela grade da janela. Lá em cima, Ailsa sussurra: “Rápido. Matei um guarda, e logo vão sentir falta dele.”" : "Na segunda noite, uma névoa branca entra pela grade e se enrola na fechadura. A porta range e se abre sozinha. Você não pergunta nada a ninguém."}

No caminho de fuga, ouve um soldado: “Sir Osric já partiu para Dunsinane.”`,
    choices: [{ t: "Fugir para o norte", go: "c2_tay" }],
  },
  c2_forth_mal: {
    title: "Água de degelo",
    enter() {
      hurt("1d", "Correnteza gelada");
    },
    text: () =>
      `A água de degelo é tão fria que seu coração quase para. A correnteza arrasta você por cem passos antes de você agarrar uma raiz na outra margem. Você chega ao norte tremendo e ferido, mas chega.`,
    choices: [{ t: "Seguir para o norte", go: "c2_tay" }],
  },
  c2_musgo: {
    title: "As dançarinas do pântano",
    text: () => `O pântano não tem fim. Durante dois dias você salta de tufo em tufo de urze, com a água negra esperando cada passo errado.

No segundo entardecer, você ouve música. Numa ilha de urze, três mulheres de vestido verde dançam em roda. São bonitas de doer, pálidas como a lua, e quando veem você sorriem todas ao mesmo tempo.

“Viajante cansado”, diz a mais alta. “Dança conosco. Só uma dança, e esqueces o frio.”${F("cailleach_saber") ? "\n\nVocê se lembra do aviso: *não confies em nada que dança no pântano*." : ""}`,
    choices: [
      {
        t: "Olhar com atenção para os pés delas antes de responder",
        tag: () => (S.amulet === "pedra" ? "+2 pedra de víbora" : ""),
        test: {
          o: () => [["Per", (S.amulet === "pedra" ? 2 : 0) + (F("cailleach_saber") ? 1 : 0)]],
          ok: "c2_baobhan_cascos",
          fail: "c2_baobhan_danca",
        },
      },
      {
        t: "Recusar com cortesia",
        test: {
          o: [
            ["diplomacia", 0],
            ["IQ", -2],
          ],
          ok: "c2_baobhan_recusa",
          fail: () => ({
            e: ["baobhan", "baobhan"],
            allies: comAilsa(),
            win: "c2_sluagh",
            lose: "c2_baobhan_mal",
            intro: "Os sorrisos viram dentes.",
          }),
        },
      },
      { t: "Aceitar a dança", go: "c2_baobhan_danca" },
    ],
  },
  c2_baobhan_cascos: {
    title: "Cascos de cervo",
    enter() {
      gain(2, "Olhos atentos");
    },
    text: () => `Quando a mais alta gira, a saia levanta um palmo. No lugar dos pés, ela tem **cascos de cervo**.

São Baobhan Sìth, as que bebem o sangue de quem dança com elas até o amanhecer. Elas percebem que você viu, e a música para.`,
    choices: [
      {
        t: "Erguer o ferro e avançar contra elas",
        if: () => hasIron(),
        fight: () => ({
          e: ["baobhan", "baobhan"],
          hp: [8, 8],
          allies: comAilsa(),
          win: "c2_sluagh",
          lose: "c2_baobhan_mal",
          intro: "Elas recuam diante do ferro. Duas ficam para lutar; a terceira some na névoa.",
        }),
      },
      {
        t: "Lutar contra elas",
        if: () => !hasIron(),
        fight: () => ({
          e: ["baobhan", "baobhan"],
          allies: comAilsa(),
          win: "c2_sluagh",
          lose: "c2_baobhan_mal",
        }),
      },
      {
        t: "Recuar devagar pela turfa, sem dar as costas",
        test: {
          o: [
            ["sobrevivencia", 0],
            ["furtividade", 0],
          ],
          ok: "c2_sluagh",
          fail: () => ({
            e: ["baobhan", "baobhan"],
            allies: comAilsa(),
            win: "c2_sluagh",
            lose: "c2_baobhan_mal",
          }),
        },
      },
    ],
  },
  c2_baobhan_danca: {
    title: "Só uma dança",
    enter() {
      S.fp = 0;
      hurt("1d", "Sangue bebido");
    },
    text: () => `Você dança. A música entra pela sua cabeça e expulsa o cansaço, o frio, o medo, o nome do seu irmão.

Você só acorda quando dentes frios encostam no seu pescoço. ${F("ailsa") ? "Uma flecha de Ailsa passa a um dedo da sua orelha e acerta o ombro da criatura." : "A sorveira no seu pulso arde, e a criatura solta você com um grito."} Você está fraco, sem fôlego, e as três já mostram as presas.`,
    choices: [
      {
        t: "Lutar",
        fight: () => ({
          e: ["baobhan", "baobhan"],
          pen: -2,
          allies: comAilsa(),
          win: "c2_sluagh",
          lose: "c2_baobhan_mal",
        }),
      },
    ],
  },
  c2_baobhan_recusa: {
    title: "Uma recusa bem feita",
    enter() {
      gain(3, "Cortesia com o Povo Encantado");
    },
    text: () => `Você faz uma reverência como a que Mairi ensinava para as noites de Samhain. “A senhora me honra, mas tenho um caminho a seguir antes do amanhecer.”

As três param. A mais alta inclina a cabeça, curiosa. “Educado. Raro.” Ela se aproxima e sussurra: “Por isso, um presente: os lobos da Velha esperam em Dunsinane. E o céu do oeste vai escurecer logo. Deita-te quando ouvires asas.”`,
    choices: [{ t: "Seguir em frente", go: "c2_sluagh" }],
  },
  c2_baobhan_mal: {
    title: "Madrugada no pântano",
    enter() {
      S.hp = Math.max(S.hp, 3);
    },
    text: () =>
      `Você acorda ao amanhecer, sozinho na urze, com duas marcas roxas no pescoço. As dançarinas sumiram com a luz. Você se levanta e segue, mais leve do que devia estar.`,
    choices: [{ t: "Seguir em frente", go: "c2_sluagh" }],
  },
  c2_sluagh: {
    title: "Asas no oeste",
    text: () => `No terceiro entardecer, o céu do oeste escurece como se viesse tempestade. Mas não é nuvem. É um bando, centenas de vultos cinzentos com rostos de fumaça, voando contra o vento.

O **Sluagh**, a hoste dos mortos sem paz. Eles procuram os vivos ao cair da noite para levar mais um consigo.`,
    choices: [
      {
        t: "Deitar de bruços na turfa e prender a respiração",
        test: {
          o: [
            ["furtividade", 0],
            ["HT", -1],
          ],
          ok: "c2_sluagh_ok",
          fail: () => ({
            e: ["sluagh", "sluagh", "sluagh"],
            allies: comAilsa(),
            win: "c2_tay",
            lose: "c2_sluagh_mal",
            intro: "Um deles mergulha. Depois outro.",
          }),
        },
      },
      {
        t: "Acender um fogo e enfrentá-los",
        fight: () => ({
          e: ["sluagh", "sluagh", "sluagh"],
          allies: comAilsa(),
          win: "c2_tay",
          lose: "c2_sluagh_mal",
          intro: "O fogo assusta os mortos, mas três descem mesmo assim.",
        }),
      },
    ],
  },
  c2_sluagh_ok: {
    title: "O céu passa",
    enter() {
      gain(2, "Escondido dos mortos");
    },
    text: () => `Você enfia o rosto na turfa fria e não respira. As asas passam tão baixo que o vento delas levanta seu cabelo. Uma voz sussurra seu nome, depois outra. Você não responde.

Quando levanta a cabeça, o céu está limpo e as primeiras estrelas aparecem. Ao longe, brilha o rio Tay.`,
    choices: [{ t: "Descer até o rio", go: "c2_tay" }],
  },
  c2_sluagh_mal: {
    title: "Frio por dentro",
    enter() {
      S.hp = Math.max(S.hp, 3);
      S.fp = Math.max(0, S.fp - 2);
    },
    text: () =>
      `Mãos de fumaça atravessam seu peito e levam um pouco de calor que nunca mais volta inteiro. Mas o sol nasce, e os mortos fogem com a noite. Você se arrasta até o rio Tay.`,
    choices: [{ t: "Descer até o rio", go: "c2_tay" }],
  },
  c2_tay: {
    eyebrow: "Março de 1297",
    title: "O rio Tay",
    text: () => `O Tay é o rio mais largo da Escócia, e agora, com o degelo, corre marrom e furioso. Do outro lado ficam Perth e, mais além, a colina de Dunsinane.

Um barqueiro velho cochila ao lado de um bote. ${F("kelpie_divida") ? "\n\nE você sente na mão uma umidade que não vem do rio. A trança da crina do kelpie pinga, como se lembrasse de uma promessa." : ""}`,
    choices: [
      {
        t: "Chamar o nome da água negra: Abhainn Dubh",
        if: () => F("kelpie_divida") && !F("kelpie_usado"),
        go: "c2_tay_kelpie",
      },
      {
        t: "Pagar o barqueiro",
        sub: "5 pennies",
        if: () => S.coins >= 5,
        fx() {
          S.coins -= 5;
        },
        go: "c2_tay_barco",
      },
      {
        t: "Atravessar a nado",
        tag: () => (S.amulet === "crina" ? "+2 crina" : ""),
        test: {
          o: [
            ["natacao", 0],
            ["HT", -2],
          ],
          ok: "c2_dunsinane",
          fail: "c2_tay_mal",
        },
      },
    ],
  },
  c2_tay_kelpie: {
    title: "O favor do kelpie",
    enter() {
      S.flags.kelpie_usado = 1;
      S.hp = maxHP(S);
      gain(2, "Favor cobrado");
    },
    text: () => `Você diz o nome baixinho, e o rio fica imóvel por um instante. Então um cavalo negro sobe da água, sem molhar a crina.

“Uma vez só, filho dos homens”, diz o kelpie. Ele carrega você ${F("ailsa") ? "e Ailsa, que reza a viagem inteira, " : ""}até a outra margem, e no caminho a água fria cura suas feridas.

Antes de afundar, ele fala sem olhar para trás: “O Lobo-Rei da Velha espera na colina. É maior que eu. Não lutes com ele no escuro.”`,
    choices: [{ t: "Subir até Dunsinane", go: "c2_dunsinane" }],
  },
  c2_tay_barco: {
    title: "O barqueiro",
    enter() {
      gain(1, "Travessia");
    },
    text: () =>
      `O barqueiro rema sem dizer uma palavra. No meio do rio, ele finalmente fala: “Muita gente quer ir a Dunsinane este mês. Ontem levei um cavaleiro inglês até a margem de baixo. Ele não pagou.”`,
    choices: [{ t: "Subir até Dunsinane", go: "c2_dunsinane" }],
  },
  c2_tay_mal: {
    title: "Água marrom",
    enter() {
      hurt("1d", "A correnteza do Tay");
    },
    text: () =>
      `O Tay arrasta você como uma folha. Você bate em troncos e pedras antes de alcançar a margem norte, mas alcança.`,
    choices: [{ t: "Subir até Dunsinane", go: "c2_dunsinane" }],
  },
  c2_dunsinane: {
    title: "A colina de Dunsinane",
    text: () => `No alto da colina ainda se veem os muros de terra de um forte antigo, mais velho que qualquer rei escocês. Perto do topo há uma cabana de pedra, com fumaça saindo do teto.

Um velho de hábito marrom e cabeça raspada espera na porta, apoiado num báculo de madeira. Ele não parece surpreso.

“Sou o irmão Aodh, de Scone. Faz um ano que espero alguém. Ou os ingleses, ou… outra coisa.” Ele aperta os olhos. “Qual dos dois és tu?”`,
    choices: [
      { t: "Contar o que Blackwood disse sobre os monges que riam", if: () => F("bw_divida"), go: "c2_aodh" },
      { t: "Mostrar a marca que a Dama deixou na sua testa", go: "c2_aodh" },
      {
        t: "Responder em latim de igreja e em gaélico antigo",
        test: { o: [["saber", 0]], ok: "c2_aodh_saber", fail: "c2_aodh" },
      },
    ],
  },
  c2_aodh_saber: {
    title: "Palavras antigas",
    enter() {
      gain(2, "Gaélico antigo");
      S.flags.aodh_amigo = 1;
    },
    text: () => `Você responde com as palavras que Mairi usava nos ritos, e o velho monge arregala os olhos. Depois ri, um riso de criança.

“Faz trinta anos que ninguém fala comigo assim. Entra, entra. A sopa é ruim, mas é quente.”`,
    choices: [{ t: "Entrar na cabana", go: "c2_aodh" }],
  },
  c2_aodh: {
    title: "A tampa da fossa",
    enter() {
      gain(2, "O segredo de Scone");
    },
    text: () => `Dentro da cabana, Aodh põe turfa no fogo e conta a história devagar, como quem a ensaiou muitas vezes.

“Quando os homens do rei Eduardo chegaram a Scone, o abade os recebeu com toda a cerimônia. Levou-os à capela e mostrou a pedra da coroação. Eles a puseram numa carroça e foram embora felizes.” Aodh sorri. “Era a tampa da fossa do mosteiro. Arenito vermelho, bem lavado.”

“Por isso os monges riam”, você diz.

“Riamos até chorar.” O sorriso some. “A verdadeira Pedra é negra, entalhada, e caiu do céu no tempo dos pictos. Nós a trouxemos para cá, para debaixo desta colina, onde os mortos que a guardavam ainda guardam. Ela é um selo, criança. Prende a Velha do Inverno. Se a Pedra acordar nas mãos de um rei inglês… ou quebrar nas mãos da Velha… a Escócia não vê outra primavera.”`,
    choices: [
      {
        t: "Pedir que ele mostre o caminho até a Pedra",
        go: () => (F("hale_morto") ? "c2_betulas" : "c2_cerco"),
      },
    ],
  },
  c2_cerco: {
    title: "Os três corvos",
    text: () => `Antes que Aodh se levante, uma trompa soa colina abaixo. Pela janela você vê tochas subindo a encosta e um escudo branco com três corvos negros.

“Sir Osric Hale”, diz o monge, sem medo na voz. “O rei quer a pedra verdadeira. Ele não sabe o que ela é.” Uma flecha incendiária acerta o telhado de palha.`,
    choices: [
      { t: "Fugir com o monge pelo bosque de bétulas", go: "c2_betulas" },
      {
        t: "Sair e enfrentar Sir Osric Hale",
        tag: () => "Perigoso",
        fight: () => ({
          e: ["cavaleiro", "soldado"],
          allies: [...comAilsa(), ALLY.aodh],
          win: "c2_hale_vencido",
          lose: "c2_betulas_ferido",
          intro: "O irmão Aodh ergue o báculo ao seu lado. “Deus perdoa. Eu também, às vezes.”",
        }),
      },
    ],
  },
  c2_hale_vencido: {
    title: "Os corvos no chão",
    enter() {
      S.flags.hale_morto = 1;
      giveWeapon("machado");
      gain(3, "Sir Osric Hale vencido");
    },
    text: () => `Sir Osric Hale cai de joelhos diante da cabana em chamas. Os soldados que sobraram fogem colina abaixo.

Você pega o machado dinamarquês da sela do cavaleiro. Aodh faz o sinal da cruz sobre o corpo e depois aponta para as árvores. “Agora, depressa. A fumaça vai chamar coisas piores que ingleses.”`,
    choices: [{ t: "Seguir o monge até o bosque", go: "c2_betulas" }],
  },
  c2_betulas_ferido: {
    title: "Fuga entre as árvores",
    enter() {
      S.hp = Math.max(S.hp, 4);
    },
    text: () =>
      `Você cai, e o monge arrasta você para dentro do bosque com uma força que um velho não devia ter. Atrás de vocês, os ingleses gritam e perdem o rastro na névoa.`,
    choices: [{ t: "Seguir o monge", go: "c2_betulas" }],
  },
  c2_betulas: {
    title: "O guardião das bétulas",
    text: () => `O bosque de bétulas é branco e silencioso, e a névoa sobe do chão como fumaça. Aodh para de repente.

Entre os troncos, alguém observa: uma figura alta feita de folhas, musgo e galhos, com olhos verdes e tímidos. Um **Ghillie Dhu**, o guardião das bétulas.

“Ele conhece um caminho para o túmulo que os mortos não guardam”, sussurra o monge. “Mas só mostra a quem respeita a floresta.”`,
    choices: [
      {
        t: "Ajoelhar, oferecer ervas e pedir passagem",
        test: {
          o: [
            ["herbalismo", 0],
            ["sobrevivencia", 0],
            ["saber", -1],
          ],
          ok: "c2_ghillie_guia",
          fail: "c2_ghillie_some",
        },
      },
      { t: "Ignorá-lo e seguir pelo caminho do monge", go: "c2_tumulo" },
    ],
  },
  c2_ghillie_guia: {
    title: "O caminho escondido",
    enter() {
      S.flags.ghillie = 1;
      S.inv.ervas = (S.inv.ervas || 0) + 2;
      note("+2 maços de ervas");
      gain(3, "Amizade do Ghillie Dhu");
    },
    text: () => `O Ghillie Dhu se aproxima devagar, aceita as ervas e cheira cada uma. Depois toca seu rosto com dedos de folha e aponta para um ponto entre duas bétulas tortas.

Por ali, um túnel de raízes desce colina adentro, até a parte de trás do túmulo. Antes de sumir, ele deixa na sua mão um punhado de folhas de bétula que cheiram a chuva.`,
    choices: [{ t: "Descer pelo túnel de raízes", go: "c2_tumulo" }],
  },
  c2_ghillie_some: {
    title: "Ofensa sem querer",
    enter() {
      hurt("1d-2", "Espinheiros");
    },
    text: () =>
      `Você pisa num broto sem perceber, e o Ghillie Dhu some como se nunca tivesse existido. De repente o bosque está cheio de espinheiros que não estavam ali antes, e vocês levam uma hora para sair dele, arranhados e atrasados.`,
    choices: [{ t: "Seguir até o túmulo", go: "c2_tumulo" }],
  },
  c2_tumulo: {
    title: "O sono dos pictos",
    text: () => `A entrada do túmulo é uma boca de pedra na encosta, ladeada por pedras entalhadas com símbolos que ninguém mais sabe ler: um crescente cortado por uma flecha quebrada, uma fera de focinho longo.

${F("ghillie") ? "Graças ao túnel do Ghillie Dhu, vocês chegam pelos fundos. Mas mesmo ali, algo se mexe na escuridão." : "Quando vocês se aproximam, a terra treme."} Um guerreiro sai do escuro. A pele é cinzenta, coberta de espirais azuis, e os olhos são dois buracos vazios. Na mão, um machado de pedra.

Ele fala numa língua que só Aodh entende. O monge traduz, pálido: “Ele pergunta: *quem desce ao sono da Pedra?*”`,
    choices: [
      {
        t: "“Um rei, que vem buscar o que é seu.”",
        fight: () => ({
          e: ["morto_picto", "morto_picto"],
          allies: [ALLY.aodh],
          win: "c2_camara",
          lose: "c2_tumulo_mal",
          intro: "Resposta errada. Outro morto se levanta atrás do primeiro.",
        }),
      },
      {
        t: "“Um guerreiro, com ferro na mão.”",
        fight: () => ({
          e: ["morto_picto"],
          allies: [ALLY.aodh],
          win: "c2_camara",
          lose: "c2_tumulo_mal",
          intro: "O morto ergue o machado. Para ele, guerreiro é só mais um inimigo.",
        }),
      },
      { t: "“Ninguém. Só um servo da terra, que guarda o que dorme.”", go: "c2_tumulo_certo" },
    ],
  },
  c2_tumulo_certo: {
    title: "A resposta certa",
    enter() {
      gain(4, "O enigma do guardião");
    },
    text: () => `O morto fica imóvel. Depois abaixa o machado e se afasta da porta, devagar, com um som de pedras rolando.

Aodh solta o ar que estava prendendo. “Os pictos não tinham reis sobre a Pedra. A Pedra é que tinha os reis. Quem a serve passa. Quem quer possuí-la, não.”`,
    choices: [{ t: "Descer até a câmara", go: "c2_camara" }],
  },
  c2_tumulo_mal: {
    title: "Oração no escuro",
    enter() {
      S.hp = Math.max(S.hp, 3);
    },
    text: () => `Você cai na terra fria do túmulo. Aodh se põe entre você e o guardião e reza em voz alta, numa mistura de latim e de uma língua muito mais velha. O morto para, hesita, e volta para a escuridão de onde veio.

“Levanta”, diz o monge. “Não reza por muito tempo, um velho.”`,
    choices: [{ t: "Descer até a câmara", go: "c2_camara" }],
  },
  c2_camara: {
    eyebrow: "Sob a colina",
    title: "A Pedra do Destino",
    text: () => `A câmara é redonda e baixa. No centro, sobre um bloco de pedra mais simples, repousa a **Pedra**: negra, do tamanho de um baú, coberta de entalhes que parecem se mexer quando a tocha treme. Ela brilha de leve, um azul como o do gelo no fundo dos lagos.

Então a geada começa a subir pelas paredes. Seu hálito vira fumaça. Da parede congelada sai uma mulher velha, muito velha, de pele azul, um olho só e cabelos brancos que arrastam no chão. Ela segura um cajado de azevinho.

“Criança do sangue antigo.” A voz dela é o vento de janeiro. “Dá-me a Pedra, e tua terra terá paz. Nem ingleses, nem guerras, nem fome. Só a neve, limpa, para sempre.”`,
    choices: [
      {
        t: "Perguntar o que ela realmente quer",
        test: {
          o: [
            ["saber", 0],
            ["Vontade", 0],
          ],
          ok: "c2_cailleach_verdade",
          fail: "c2_cailleach_furia",
        },
      },
      { t: "“Não. A primavera também é da Escócia.”", go: "c2_cailleach_furia" },
    ],
  },
  c2_cailleach_verdade: {
    title: "O inverno também é necessário",
    enter() {
      S.flags.cailleach_verdade = 1;
      gain(3, "Palavras com a Velha");
    },
    text: () => `A Velha olha para você com o olho único por muito tempo. Depois, para surpresa de todos, ela responde.

“Eu não sou má, criança. Sou o inverno. Os pictos me prenderam nesta pedra porque tinham medo do frio, e desde então o mundo esquenta e esfria quando os homens querem, não quando deve. Quero ser livre. Só isso.”

Ela se vira para ir embora, e a geada recua. “Mas os meus cães não sabem conversar. Boa sorte com eles.”`,
    choices: [{ t: "Sair da câmara", go: "c2_lobo_rei" }],
  },
  c2_cailleach_furia: {
    title: "A fúria da Velha",
    enter() {
      S.fp = Math.max(0, S.fp - 2);
      note("−2 PF · O frio da Cailleach", "hurt");
    },
    text: () => `O olho da Velha se fecha devagar. “Então que os meus cães decidam.”

Ela bate o cajado no chão, e a geada explode pelas paredes. Lá fora, na boca da caverna, alguma coisa enorme uiva.`,
    choices: [{ t: "Correr para a saída", go: "c2_lobo_rei" }],
  },
  c2_lobo_rei: {
    title: "O Lobo-Rei do Inverno",
    text: () => `Na boca da caverna, a noite virou nevasca, em março. No meio da neve espera um lobo branco do tamanho de um cavalo, com geada na juba e olhos de gelo azul. Atrás dele, um lobo menor mostra os dentes.

O **Lobo-Rei do Inverno**, o cão de caça da própria Cailleach.${F("cailleach_saber") ? " Você se lembra: eles odeiam fogo e sorveira." : ""}`,
    choices: [
      {
        t: "Lutar pela Pedra",
        fight: () => ({
          e: ["lobo_rei", "lobo_inverno"],
          allies: [...comAilsa(), ALLY.aodh],
          blindAll: F("cailleach_saber") ? 1 : 0,
          win: "c2_vitoria",
          lose: "c2_aodh_sacrificio",
          intro: F("cailleach_saber")
            ? "Você acende a sorveira, e os lobos hesitam diante da chama vermelha."
            : "Aodh ergue o báculo e começa a rezar.",
        }),
      },
    ],
  },
  c2_vitoria: {
    title: "A nevasca para",
    enter() {
      giveMat({ prata: 2 });
      gain(4, "O Lobo-Rei derrotado");
    },
    text: () => `O Lobo-Rei cai na neve e se desfaz numa rajada de vento gelado que atravessa a colina e some no céu. A nevasca para de uma vez. No silêncio, você ouve um passarinho cantar, o primeiro da primavera.

Aodh se apoia no báculo, rindo e chorando ao mesmo tempo. “Ainda não, Velha. Ainda não.”`,
    choices: [{ t: "Voltar à câmara", go: "c2_selo" }],
  },
  c2_aodh_sacrificio: {
    title: "O último sermão",
    enter() {
      S.flags.aodh_morto = 1;
      S.hp = Math.max(S.hp, 3);
    },
    text: () => `Você cai, e o Lobo-Rei avança. Então o irmão Aodh se põe na frente dele, ergue o báculo e reza em voz alta.

A geada sobe pelos pés do velho, pelas pernas, pelo peito. Quando chega à boca, ele ainda reza. O monge vira gelo, e o lobo, como se tivesse recebido o que veio buscar, vira as costas e some na nevasca.

Uma estátua de gelo fica na boca da caverna, de braços abertos. Ela não derrete.`,
    choices: [{ t: "Voltar à câmara", go: "c2_selo" }],
  },
  c2_selo: {
    eyebrow: "Sob a colina",
    title: "O selo",
    enter() {
      S.sangue = Math.max(S.sangue, 2);
      giveItem("fragmento");
      gain(6, "Fim do Capítulo II");
    },
    text: () => `De volta à câmara, a Pedra brilha mais forte. Você tenta erguê-la, e ela pesa como uma montanha. Ela não quer ir a lugar nenhum.

A Dama Branca aparece no brilho azul. “A Pedra dorme onde deve, e assim deve ficar, por enquanto. Mas um dia um rei escocês vai precisar dela, e tu saberás o caminho.”

Um pedaço do tamanho de uma unha se solta da Pedra e cai na sua mão, morno. A Dama toca sua testa, e o fogo no seu sangue sobe mais um degrau. **O Sangue Antigo chegou ao nível 2.** Escolha uma nova magia.`,
    choices: [
      {
        t: "Espinhos de Sorveira",
        sub: "Galhos brotam do chão: 2d de perfuração, sem defesa · 2 PF",
        fx() {
          if (!S.skills.sp_espinhos) S.skills.sp_espinhos = 2;
        },
        go: "c2_fim",
      },
      {
        t: "Fogo de Beltane",
        sub: "Chama azul: 3d de queimadura · 3 PF",
        fx() {
          if (!S.skills.sp_beltane) S.skills.sp_beltane = 2;
        },
        go: "c2_fim",
      },
    ],
  },
  c2_fim: {
    eyebrow: "Fim do Capítulo II · Maio de 1297",
    title: "Fogo em Lanark",
    enter() {
      S.flags.cap2_fim = 1;
      S.hp = maxHP(S);
      S.fp = maxFP(S);
    },
    text: () => {
      const l = [];
      l.push(
        F("aodh_morto")
          ? "O irmão Aodh virou gelo na boca da caverna, de braços abertos."
          : "O irmão Aodh ficou em Dunsinane, guardando a Pedra.",
      );
      l.push(
        F("hale_morto")
          ? "Sir Osric Hale está morto."
          : "Sir Osric Hale ainda caça o monge de Dunsinane, e agora conhece seu rosto.",
      );
      if (F("cailleach_verdade")) l.push("A Cailleach falou com você de verdade. Ela não é só inimiga.");
      if (F("kelpie_usado")) l.push("O favor do kelpie foi cobrado.");
      else if (F("kelpie_divida")) l.push("O kelpie ainda lhe deve um favor.");
      if (F("ghillie")) l.push("O Ghillie Dhu das bétulas é seu amigo.");
      if (F("sangue_frio")) l.push("Tam ainda não o perdoou pela torre.");
      return `Você volta a Cartland no fim de abril. Em maio, a notícia corre os vales como fogo em palha seca: **em Lanark, um homem chamado William Wallace matou o xerife Heselrig** e queimou o salão dele. A Escócia inteira está pegando em armas.

Tam aparece na boca da caverna, ofegante. “Wallace está juntando um exército. Diz que o inglês vai mandar o dele, e que a luta vai ser numa ponte.” Ele olha para você. “Numa ponte de madeira, perto de Stirling.”

Seu título agora é **${title(S)}**, com ${S.earned} pontos de experiência acumulados.

<ul class="end-list">${l.map((x) => `<li>${x}</li>`).join("")}</ul>

**Capítulo III: A Ponte de Stirling** começa agora.`;
    },
    choices: [
      { t: "Começar o Capítulo III", go: "c3_inicio" },
      { t: "Gastar meus pontos", act: "evolve" },
      { t: "Começar uma nova jornada", act: "newgame" },
    ],
  },
});

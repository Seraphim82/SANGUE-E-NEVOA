/**
 * Capítulo I · A Noite do Fogo (1296).
 */
"use strict";

const SC = {
  c1_inicio: {
    eyebrow: "Capítulo I · A Noite do Fogo",
    title: "Véspera de Samhain",
    text: () => `31 de outubro de 1296. Kilbride do Vale, às margens do rio Clyde, a meio dia de caminhada de Lanark.

O sol se põe vermelho atrás das colinas e a aldeia se prepara para a noite mais perigosa do ano. Na véspera de Samhain os mortos caminham e o Povo Encantado sai das colinas ocas. As crianças esculpem rostos em nabos e põem brasas dentro. Seu irmão mais novo, Callum, já fez três, cada um mais feio que o outro.

Faz seis meses que os ingleses venceram em Dunbar. O rei John Balliol teve as insígnias arrancadas do manto e foi mandado para Londres. Dizem que o rei Eduardo levou também a Pedra do Destino, de Scone. Por aqui, a guerra ainda parece distante.

Ainda há tempo para uma coisa, ${heroName()}, antes de acenderem a fogueira.`,
    choices: [
      {
        t: "Ajudar a velha Mairi a preparar o rito da fogueira",
        test: {
          o: [
            ["saber", 0],
            ["IQ", -2],
          ],
          ok: "c1_mairi_ok",
          fail: "c1_mairi_fail",
        },
      },
      {
        t: "Ir à taverna ouvir as notícias dos viajantes",
        test: {
          o: [
            ["diplomacia", 0],
            ["IQ", 0],
          ],
          ok: "c1_taverna_ok",
          fail: "c1_taverna_fail",
        },
      },
      {
        t: "Ajudar Duncan, o ferreiro, a fechar a forja",
        test: {
          o: [
            ["ferraria", 0],
            ["ST", 0],
          ],
          ok: "c1_forja_ok",
          fail: "c1_forja_fail",
        },
      },
    ],
  },
  c1_mairi_ok: {
    title: "Sorveira e linha vermelha",
    enter() {
      state.flags.mairi_amiga = 1;
      giveItem("sorveira");
      giveMat({ tecido: 1 });
      gain(2, "Saber dos antigos");
    },
    text: () => `Você sabe a ordem certa: primeiro o sal, depois a água do poço, depois o fogo. Mairi aprova com a cabeça e amarra um galhinho de sorveira com linha vermelha no seu pulso.

“Sorveira e linha vermelha prendem bruxa e fada velha. Não tires isto esta noite, ouviste? E nunca montes num cavalo que te espera à beira d’água.”

Ela segura seu queixo e olha nos seus olhos por tempo demais. “Tens os olhos da tua avó. Ela também via coisas.”`,
    choices: [{ t: "Seguir para a fogueira", go: "c1_chegada" }],
  },
  c1_mairi_fail: {
    title: "Sal fora de ordem",
    enter() {
      state.flags.mairi_amiga = 1;
    },
    text: () =>
      `Você derruba o sal antes da hora e Mairi solta uma gargalhada rouca. “Assim os mortos vão entrar rindo, criança.” Ela refaz tudo sozinha, mas aperta seu ombro com carinho quando você vai embora.`,
    choices: [{ t: "Seguir para a fogueira", go: "c1_chegada" }],
  },
  c1_taverna_ok: {
    title: "Notícias de Lanark",
    enter() {
      state.flags.rumores = 1;
      givePennies(3);
      gain(1, "Ouvidos atentos");
    },
    text: () => `A taverna fede a turfa e cerveja azeda. Um tropeiro de Ayr conta, em voz baixa, sobre um homem enorme de Elderslie que quebrou o braço de dois soldados ingleses num mercado. *Wallace*, é o nome que ele sussurra.

Outro fala do novo xerife de Lanark, William Heselrig, que cobra o "tributo do rei" com corda e fogo. E de um sargento chamado **Blackwood**, que anda pelas aldeias procurando Iain, o filho de Duncan, que fugiu para as florestas com os fora-da-lei.`,
    choices: [{ t: "Seguir para a fogueira", go: "c1_chegada" }],
  },
  c1_taverna_fail: {
    title: "Canções de bêbado",
    text: () =>
      `O barulho é tanto que você só pega pedaços de conversa: impostos, ingleses, e um nome dito com raiva, *Blackwood*. Depois disso, só canções desafinadas.`,
    choices: [{ t: "Seguir para a fogueira", go: "c1_chegada" }],
  },
  c1_forja_ok: {
    title: "Ferro frio",
    enter() {
      giveWeapon("faca");
      giveMat({ ferro: 1 });
      gain(1, "Mãos de forja");
    },
    text: () => `Você ajuda Duncan a abafar o fogo sem desperdiçar o carvão. O gigante sorri, enfia a mão no avental e põe uma faca curta de ferro na sua mão.

“Leva. Esta noite não é noite de andar sem ferro. Ferro guarda a gente de coisas piores que ingleses. E se um cavalo bonito demais te esperar na beira do rio, encosta o ferro nele antes de pensar em montar.”

Ele olha para a estrada escura. “E se alguém perguntar pelo meu Iain, tu nunca ouviste falar dele.”`,
    choices: [{ t: "Seguir para a fogueira", go: "c1_chegada" }],
  },
  c1_forja_fail: {
    title: "Ferro quente",
    enter() {
      hurt("1d-3", "Queimadura na forja");
      giveWeapon("faca");
    },
    text: () => `Você segura a tenaz pelo lado errado e o ferro em brasa lambe sua mão. Duncan xinga, enfia sua mão no balde d'água e depois, ainda resmungando, lhe entrega uma faca de ferro.

“Leva. Pelo menos esta não queima. Esta noite não se anda sem ferro.”`,
    choices: [{ t: "Seguir para a fogueira", go: "c1_chegada" }],
  },
  c1_chegada: {
    title: "Cascos na escuridão",
    text: () => `A fogueira mal começou a estalar quando a terra treme. Cavalos. Muitos.

Doze soldados de túnicas vermelhas entram na aldeia com tochas. À frente, um homem de cota de malha e barba grisalha desmonta sem pressa. “Sou o sargento Roger Blackwood, a serviço de Sua Majestade o rei Eduardo. Quero o rebelde Iain, filho do ferreiro. E quero o tributo.”

Duncan dá um passo à frente. “Meu filho não está aqui. E o tributo vocês já levaram em agosto.”

O golpe vem de lado, de um soldado que nem estava olhando para ele. Duncan cai na lama e não se levanta. Alguém grita. As tochas voam para os telhados de palha, e em segundos Kilbride é uma fornalha.

Pela fumaça você vê duas coisas ao mesmo tempo: um recruta inglês arrastando **Callum** pelo braço em direção aos cavalos ("o garoto sabe onde o rebelde se esconde!"), e a cabana de **Mairi** pegando fogo, com a velha lá dentro.`,
    choices: [
      {
        t: "Partir para cima do recruta que leva Callum",
        fight: { e: ["recruta"], win: "c1_callum_salvo", lose: "c1_desmaio" },
      },
      {
        t: "Esgueirar-se pelas sombras e arrancar Callum das mãos dele",
        test: {
          o: [["furtividade", 0]],
          ok: "c1_callum_furtivo",
          fail: {
            e: ["recruta"],
            pen: -2,
            win: "c1_callum_salvo",
            lose: "c1_desmaio",
            intro: "O recruta vira na hora errada e vê você.",
          },
        },
      },
      {
        t: "Correr para a cabana em chamas de Mairi",
        test: {
          o: [
            ["ST", 0],
            ["HT", 0],
          ],
          ok: "c1_mairi_salva",
          fail: "c1_mairi_salva_ferido",
        },
      },
    ],
  },
  c1_callum_salvo: {
    title: "Entre as chamas",
    enter() {
      state.flags.mairi_morta = 1;
    },
    text: () => `O recruta cai, e Callum se agarra à sua cintura, tremendo. Vocês correm por trás das casas enquanto as vigas estalam.

Você olha para trás uma vez e vê o telhado da cabana de Mairi desabar numa chuva de faíscas. Ninguém sai de lá.`,
    choices: [{ t: "Continuar correndo", go: "c1_visao" }],
  },
  c1_callum_furtivo: {
    title: "Como sombra",
    enter() {
      state.flags.mairi_morta = 1;
      gain(2, "Resgate silencioso");
    },
    text: () => `Você conhece cada cerca e cada chiqueiro de Kilbride. Passa pela fumaça como um gato, e quando o recruta se vira para gritar ordens, Callum já não está na mão dele.

Na fuga, você olha para trás uma vez e vê o telhado da cabana de Mairi desabar numa chuva de faíscas.`,
    choices: [{ t: "Continuar correndo", go: "c1_visao" }],
  },
  c1_desmaio: {
    title: "Cinzas",
    enter() {
      state.flags.callum_levado = 1;
      state.flags.mairi_morta = 1;
    },
    text: () => `O mundo fica preto.

Quando você abre os olhos, o rosto está na lama e a aldeia é só brasa e fumaça. Os cavalos se foram, e Callum foi com eles. A cabana de Mairi é um monte de cinzas.`,
    choices: [{ t: "Levantar-se", go: "c1_visao" }],
  },
  c1_mairi_salva: {
    title: "A curandeira",
    enter() {
      state.flags.mairi_viva = 1;
      state.flags.callum_levado = 1;
      gain(2, "Coragem no fogo");
    },
    text: () => `Você chuta a porta em brasa e arrasta Mairi para fora pelos braços. Ela tosse, viva.

Mas quando você se vira, os cavalos já estão saindo da aldeia. Na garupa de um deles, um menino de cabelo ruivo grita seu nome. **Callum.**`,
    choices: [{ t: "Ficar de pé no meio da fumaça", go: "c1_visao" }],
  },
  c1_mairi_salva_ferido: {
    title: "A curandeira",
    enter() {
      state.flags.mairi_viva = 1;
      state.flags.callum_levado = 1;
      hurt("1d", "Queimaduras");
      gain(1, "Coragem no fogo");
    },
    text: () => `A viga em chamas cai no seu ombro, mas você não solta Mairi. Arrasta a velha para a lama, viva.

Quando você se vira, os cavalos já estão saindo da aldeia. Na garupa de um deles, um menino de cabelo ruivo grita seu nome. **Callum.**`,
    choices: [{ t: "Ficar de pé no meio da fumaça", go: "c1_visao" }],
  },
  c1_visao: {
    eyebrow: "Samhain",
    title: "A Dama Branca",
    enter() {
      state.visao = true;
      gain(3, "Encontro com a Dama Branca");
    },
    text: () => `O som some. As faíscas ficam paradas no ar, como estrelas presas. A fumaça para de subir.

No meio da rua, onde ninguém estava, há uma mulher alta. O cabelo é branco como neve nova, e os olhos têm a cor do gelo no fundo de um lago. Ela não pisa na lama. Ela não faz sombra.

“O sangue antigo corre em ti. Encontra a Pedra… ou tua terra cairá para os homens e para os monstros.”

Ela toca sua testa com um dedo frio. Algo se abre atrás dos seus olhos, como uma janela que estava pregada há séculos.

${hasFlag("callum_levado") ? "Ela olha para a estrada por onde levaram Callum, e depois some." : "Ela olha para Callum, adormecido de cansaço nos seus braços, e depois some."}

O som volta. As faíscas caem.`,
    choices: [
      {
        t: "Fugir antes que os ingleses voltem",
        go: "c1_fuga",
        after: "Você ganhou a vantagem Segunda Visão e o Sangue Antigo (latente).",
      },
    ],
  },
  c1_fuga: {
    title: "Os cães de Blackwood",
    text: () => `Atrás de vocês, latidos. Blackwood soltou os cães para caçar quem sobrou.

${hasFlag("mairi_viva") ? "Mairi se apoia no seu ombro, mancando, mas aponta para o norte com firmeza. “Os Rochedos de Cartland. Do outro lado do rio. Lá os fora-da-lei se escondem, e lá os ingleses não entram.”" : "Você sabe para onde ir. Todo mundo em Kilbride sabe: os Rochedos de Cartland, do outro lado do rio, onde os fora-da-lei se escondem."}

Os latidos estão cada vez mais perto.`,
    choices: [
      {
        t: "Esconder-se no pântano e despistar os cães",
        test: {
          o: [["sobrevivencia", 0]],
          ok: "c1_pantano_ok",
          fail: {
            e: ["cao", "cao"],
            win: "c1_vau",
            lose: "c1_desmaio_caes",
            intro: "Os cães acham seu rastro no lodo.",
          },
        },
      },
      {
        t: "Virar-se e enfrentar os cães",
        fight: { e: ["cao", "cao"], win: "c1_vau", lose: "c1_desmaio_caes" },
      },
      { t: "Correr direto para o vau do rio", go: "c1_vau" },
    ],
  },
  c1_pantano_ok: {
    title: "Turfa e água parada",
    enter() {
      giveItem("pedra");
      gain(2, "Rastro perdido");
    },
    text: () => `Você esfrega lama de turfa na pele e nas roupas e se enfia entre os juncos até a água bater no peito. Os cães passam a dez passos, farejam, ganem e seguem na direção errada.

Quando você sai da água, sua mão encontra na lama uma pedra lisa com um furo no meio. Uma **pedra de víbora**: os velhos dizem que, olhando pelo furo, se vê o que está escondido.`,
    choices: [{ t: "Seguir até o vau", go: "c1_vau" }],
  },
  c1_desmaio_caes: {
    title: "Um uivo que não é de cão",
    enter() {
      state.hp = Math.max(state.hp, Math.ceil(maxHP(state) / 3));
    },
    text: () => `Os dentes estão no seu braço quando um uivo atravessa a noite. Não é de lobo e não é de cão. É algo mais velho.

Os mastins soltam você e fogem ganindo, com o rabo entre as pernas. Na beira da mata, por um instante, você vê dois olhos verdes do tamanho de punhos. Depois, nada.`,
    choices: [{ t: "Arrastar-se até o vau", go: "c1_vau" }],
  },
  c1_vau: {
    title: "O vau do Clyde",
    text: () => `O rio está cheio das chuvas de outono, negro e gelado. Na margem, como se estivesse esperando, há um cavalo.

É o animal mais bonito que você já viu. Negro como breu, sem sela nem rédea, a crina molhada caindo até os joelhos. Ele se ajoelha devagar, oferecendo as costas.

${state.visao ? "Mas desde a noite do fogo seus olhos veem outra coisa. Por baixo da pele lustrosa a carne é verde, de afogado. A crina é feita de algas. Na boca brilham dentes de peixe. É um **kelpie**, o cavalo-d'água que leva os viajantes para o fundo do rio." : ""}

${hasFlag("mairi_viva") ? "“Não toques nele”, sussurra Mairi. “Não é cavalo.”" : ""}`,
    choices: [
      { t: "Montar no cavalo", go: "c1_kelpie_montar" },
      {
        t: "Agarrar a crina e encostar o ferro no pescoço dele",
        if: () => hasIron(),
        test: {
          o: [["Vontade", 2]],
          ok: "c1_kelpie_domado",
          fail: {
            e: ["kelpie"],
            win: "c1_kelpie_morto",
            lose: "c1_afogado",
            intro: "O kelpie empina e solta um relincho que parece um grito.",
          },
        },
      },
      {
        t: "Recitar as palavras antigas que prendem os espíritos da água",
        test: {
          o: [["saber", 0]],
          ok: "c1_kelpie_domado",
          fail: {
            e: ["kelpie"],
            win: "c1_kelpie_morto",
            lose: "c1_afogado",
            intro: "As palavras saem erradas e o kelpie mostra os dentes.",
          },
        },
      },
      {
        t: "Ignorá-lo e atravessar a nado",
        test: {
          o: [
            ["natacao", 0],
            ["HT", -2],
          ],
          ok: "c1_nado_ok",
          fail: "c1_nado_mal",
        },
      },
      {
        t: "Atacar a criatura",
        tag: () => "Perigoso",
        fight: { e: ["kelpie"], win: "c1_kelpie_morto", lose: "c1_afogado" },
      },
    ],
  },
  c1_kelpie_montar: {
    title: "Pele que gruda",
    text: () => `No instante em que você toca as costas do animal, sua pele gruda na dele como em resina. O cavalo ri, um som de água em pedra, e dispara para dentro do rio.

A água gelada sobe até a cintura, até o peito, até o queixo…`,
    choices: [
      {
        t: "Arrancar-se das costas dele",
        test: {
          o: [
            ["ST", 0],
            ["HT", 0],
          ],
          ok: {
            e: ["kelpie"],
            win: "c1_kelpie_morto",
            lose: "c1_afogado",
            intro: "Você se solta com um rasgo de pele e o kelpie se vira, furioso.",
          },
          fail: {
            e: ["kelpie"],
            pen: -2,
            pre: "1d",
            win: "c1_kelpie_morto",
            lose: "c1_afogado",
            intro: "Você engole água antes de se soltar. O kelpie se vira, furioso.",
          },
        },
      },
    ],
  },
  c1_kelpie_domado: {
    title: "Abhainn Dubh",
    enter() {
      state.flags.kelpie_divida = 1;
      giveItem("crina");
      gain(4, "Dominou um kelpie");
    },
    text: () => `O kelpie solta um grito agudo e fica imóvel, tremendo, preso pela sua mão e pela sua vontade. Agora é ele quem obedece.

Ele carrega ${hasFlag("mairi_viva") ? "você e Mairi" : hasFlag("callum_levado") ? "você" : "você e Callum"} até a outra margem sem molhar um fio de cabelo. Quando você o solta, ele vira o pescoço e fala com voz de homem afogado:

“Um favor, filho dos homens. Chama o nome da água negra, *Abhainn Dubh*, quando precisares, e eu virei. Uma vez só.”

Ele afunda no rio. Na sua mão fica um punhado de crina que nunca seca.`,
    choices: [{ t: "Subir em direção aos rochedos", go: "c1_cartland" }],
  },
  c1_kelpie_morto: {
    title: "Água e algas",
    enter() {
      giveItem("crina");
    },
    text: () => `O kelpie desaba e se desfaz como uma onda que quebra na margem. Fica só água, lodo e um punhado de crina que nunca seca.

Com a criatura morta, o vau fica calmo, e vocês atravessam com água pela cintura.`,
    choices: [{ t: "Subir em direção aos rochedos", go: "c1_cartland" }],
  },
  c1_afogado: {
    title: "Margem do outro lado",
    enter() {
      state.hp = Math.max(state.hp, 2);
    },
    text: () => `Água. Escuridão. Frio.

Você acorda tossindo na margem norte do rio, sem saber como chegou ali. Na lama há marcas de pés descalços e pequenos, como de mulher, que entram na água e não voltam.`,
    choices: [{ t: "Subir em direção aos rochedos", go: "c1_cartland" }],
  },
  c1_nado_ok: {
    title: "Contra a correnteza",
    enter() {
      gain(1, "Travessia");
    },
    text: () =>
      `Você entra no rio sem olhar para o cavalo. A água gelada tira seu fôlego, mas você atravessa. Atrás de você, o kelpie solta um grito de raiva e afunda.`,
    choices: [{ t: "Subir em direção aos rochedos", go: "c1_cartland" }],
  },
  c1_nado_mal: {
    title: "Contra a correnteza",
    enter() {
      hurt("1d", "Frio e pedras do rio");
    },
    text: () =>
      `A correnteza joga você contra as pedras duas vezes antes de você chegar à outra margem, sangrando e batendo os dentes. Atrás de você, o kelpie ri.`,
    choices: [{ t: "Subir em direção aos rochedos", go: "c1_cartland" }],
  },
  c1_cartland: {
    eyebrow: "Amanhecer",
    title: "Os Rochedos de Cartland",
    text: () => `O dia nasce cinzento sobre um desfiladeiro de pedra e carvalhos tortos. Uma flecha se crava na terra a um palmo do seu pé.

“Mais um passo e a Ailsa te costura no chão.” De trás de uma pedra sai um homem de barba ruiva com um bordão de freixo. Na rocha acima, uma moça mantém o arco esticado.

“Sou Tam. Os ingleses usam gente da terra como guia agora. Então me diz: quem és tu, e quem te mandou?”`,
    choices: [
      { t: "Deixar Mairi falar", if: () => hasFlag("mairi_viva"), go: "c1_aceito_mairi" },
      {
        t: "Contar o que aconteceu em Kilbride",
        tag: () => (hasFlag("rumores") ? "+2 rumores" : ""),
        test: {
          o: () => [
            ["diplomacia", hasFlag("rumores") ? 2 : 0],
            ["IQ", hasFlag("rumores") ? 1 : -1],
          ],
          ok: "c1_aceito",
          fail: "c1_amarrado",
        },
      },
      {
        t: "Desafiar Tam para um duelo",
        fight: {
          e: ["tam"],
          nonlethal: true,
          win: "c1_duelo_ok",
          lose: "c1_duelo_mal",
          intro:
            "Tam gira o bordão e sorri. “Escolhe tua arma, e vamos ver se sabes usá-la. Até alguém cair.”",
        },
      },
    ],
  },
  c1_aceito_mairi: {
    title: "Velhas dívidas",
    enter() {
      gain(1, "Aliada certa");
    },
    text: () =>
      `Tam baixa o bordão no instante em que vê o rosto da velha. “Mairi de Kilbride? Foste tu que costuraste minha barriga quando eu era moleque!” Ele se ajoelha e beija a mão dela. Não há mais perguntas.`,
    choices: [{ t: "Entrar no acampamento", go: "c1_acampamento" }],
  },
  c1_aceito: {
    title: "A verdade dita",
    enter() {
      gain(2, "Palavras certas");
    },
    text: () => `Você conta tudo: a fogueira, Duncan na lama, o fogo${hasFlag("rumores") ? ", o nome de Blackwood e o de Iain, filho do ferreiro" : ""}. Quando você termina, Tam está pálido.

“Iain está aqui, conosco. Ele vai querer ouvir isso de ti.” Ele faz sinal para Ailsa baixar o arco.`,
    choices: [{ t: "Entrar no acampamento", go: "c1_acampamento" }],
  },
  c1_amarrado: {
    title: "Uma noite amarrado",
    text: () => `Tam não acredita em uma palavra. Você passa a noite amarrado a um carvalho, com fome e frio.

De madrugada, Ailsa corta as cordas. “Um batedor voltou de Kilbride. Está tudo queimado, como disseste. Tam pede desculpas… do jeito dele.” Do jeito dele é uma tigela de sopa jogada no seu colo.`,
    choices: [{ t: "Entrar no acampamento", go: "c1_acampamento" }],
  },
  c1_duelo_ok: {
    title: "Respeito ganho no chão",
    enter() {
      giveOutfit("couro");
      gain(1, "Duelo vencido");
    },
    text: () =>
      `Tam está sentado na lama, rindo com o nariz sangrando. “Por todos os santos! Um espião inglês não bate assim.” Ele estende a mão para você o ajudar a levantar. “Qualquer um que me derrube merece um prato de sopa. E leva também este gibão de couro. Em mim já não fecha.”`,
    choices: [{ t: "Entrar no acampamento", go: "c1_acampamento" }],
  },
  c1_duelo_mal: {
    title: "Coragem não falta",
    text: () =>
      `Você está de costas no chão, com a ponta do bordão de Tam no peito. Mas ele sorri. “Perdeste, mas não fugiste. Os ingleses não mandam espiões com coragem. Levanta.”`,
    choices: [{ t: "Entrar no acampamento", go: "c1_acampamento" }],
  },
  c1_acampamento: {
    eyebrow: "Descanso",
    title: "O acampamento rebelde",
    enter() {
      if (hasFlag("cailleach")) {
        state.hp = Math.min(maxHP(state), state.hp + Math.ceil(maxHP(state) / 2));
        state.fp = Math.min(maxFP(state), state.fp + Math.ceil(maxFP(state) / 2));
        note("A Cailleach ronda seus sonhos: descanso pela metade", "hurt");
      } else {
        state.hp = maxHP(state);
        state.fp = maxFP(state);
        note("Descanso completo: PV e PF restaurados");
      }
      giveOutfit("tartan");
      giveMat({ tecido: 2, couro: 1 });
    },
    text: () => `Numa caverna escondida pela cachoeira, trinta homens e mulheres comem papa de aveia em volta de uma fogueira sem fumaça. Gente de Lanark, de Carluke, de aldeias que já não existem.

Tam se agacha ao seu lado. “Blackwood se abrigou na torre velha sobre a cachoeira de Corra Linn, com os prisioneiros. ${hasFlag("callum_levado") ? "Entre eles há um menino ruivo que não para de morder os guardas.” Ele sorri. “Teu irmão, imagino.”" : "Vai levá-los para o xerife Heselrig, em Lanark, ao amanhecer. Para a forca.”"}

Ailsa cospe no fogo. “Ninguém dorme naquela torre há cem anos. Dizem que é amaldiçoada.”

“Dizem muita coisa”, responde Tam. “Também dizem que um tal de Wallace anda juntando homens nas florestas de Selkirk. Talvez um dia a gente lute com ele. Esta noite, lutamos sozinhos.”

Antes de você dormir, Tam joga sobre seus ombros um manto de tartan verde e azul. “Agora pareces um dos nossos.”

<em>Abra a tela de Personagem para vestir o manto, melhorar seus itens na forja do acampamento e gastar seus pontos.</em>`,
    choices: [
      {
        t: "Escalar o penhasco de Corra Linn à noite",
        test: {
          o: [
            ["escalada", 0],
            ["DX", -2],
          ],
          ok: "c1_escalada_ok",
          fail: "c1_queda",
        },
      },
      { t: "Entrar pelo portão enquanto os rebeldes fazem barulho", go: "c1_portao" },
    ],
  },
  c1_escalada_ok: {
    title: "Pedra molhada",
    enter() {
      gain(2, "Escalada noturna");
    },
    text: () =>
      `A pedra é escorregadia e a cachoeira ruge a seu lado, mas seus dedos acham cada fenda. Você passa pela seteira mais alta da torre sem fazer barulho.`,
    choices: [{ t: "Descer as escadas", go: "c1_torre" }],
  },
  c1_queda: {
    title: "Pedra molhada",
    enter() {
      hurt("1d", "Queda");
    },
    text: () =>
      `No meio da subida, uma pedra se solta. Você escorrega, bate contra a rocha e só para numa saliência, mas consegue entrar pela seteira, ofegante e sangrando.`,
    choices: [{ t: "Descer as escadas", go: "c1_torre" }],
  },
  c1_portao: {
    title: "O portão",
    text: () =>
      `Os rebeldes gritam e atiram flechas contra as muralhas, do outro lado da torre. Um único sentinela ficou no portão, olhando na direção do barulho.`,
    choices: [
      { t: "Atacar o sentinela", fight: { e: ["recruta"], win: "c1_torre", lose: "c1_portao_mal" } },
      {
        t: "Passar por ele sem ser visto",
        test: {
          o: [["furtividade", 0]],
          ok: "c1_torre",
          fail: {
            e: ["recruta"],
            pen: -2,
            win: "c1_torre",
            lose: "c1_portao_mal",
            intro: "O sentinela se vira e ergue a espada.",
          },
        },
      },
    ],
  },
  c1_portao_mal: {
    title: "Uma flecha no escuro",
    enter() {
      state.hp = Math.max(state.hp, 3);
    },
    text: () =>
      `O sentinela ergue a espada para o golpe final, e uma flecha de Ailsa atravessa a garganta dele. Ele cai em cima de você. Lá do escuro vem a voz dela: “Levanta! Não tenho flechas para desperdiçar contigo.”`,
    choices: [{ t: "Entrar na torre", go: "c1_torre" }],
  },
  c1_torre: {
    eyebrow: "Corra Linn",
    title: "O que mora na torre",
    text: () => `Lá dentro, o rugido da cachoeira abafa tudo. O salão está cheio de soldados ingleses, e todos estão mortos, com a garganta rasgada.

Na escada, de costas para você, há um velho atarracado de botas de ferro, segurando um pique enferrujado. Ele mergulha o gorro na poça de sangue de um soldado e o põe de volta na cabeça, pingando. Quando se vira, os dentes são de lobo.

Encurralado contra a parede, ferido e com a espada tremendo na mão, está o **sargento Blackwood**. Num canto, acorrentados, os prisioneiros${hasFlag("callum_levado") ? ", e entre eles Callum," : ""} olham para você.

Você reconhece a criatura das histórias que Mairi contava junto ao fogo: um **Barrete Vermelho**, que tinge o gorro com o sangue dos viajantes e morre de medo de palavras sagradas.

Blackwood vê você. “Escocês… me ajuda, ou essa coisa mata todos nós. Os prisioneiros também.”`,
    choices: [
      {
        t: "Lutar ao lado de Blackwood contra o monstro",
        fight: {
          e: ["redcap"],
          hp: [10],
          win: "c1_redcap_bw",
          lose: "c1_derrota_final",
          intro: "Blackwood já feriu a criatura. Juntos, vocês têm uma chance.",
        },
      },
      { t: "Esperar nas sombras até o monstro acabar com o inglês", go: "c1_espera" },
      {
        t: "Recitar as escrituras e as palavras antigas",
        test: {
          o: [
            ["saber", 0],
            ["Vontade", -2],
          ],
          ok: "c1_redcap_foge",
          fail: {
            e: ["redcap"],
            hp: [13],
            win: "c1_redcap_bw",
            lose: "c1_derrota_final",
            intro: "O Barrete Vermelho ri das suas palavras e salta na sua direção.",
          },
        },
      },
    ],
  },
  c1_espera: {
    title: "O preço de esperar",
    enter() {
      state.flags.bw_morto = 1;
    },
    text: () => `Você fica parado nas sombras. O pique do Barrete Vermelho sobe e desce. Blackwood não grita.

A criatura molha o gorro de novo no sangue fresco, e as feridas que o sargento tinha feito nela se fecham na hora. Então ela fareja o ar, sorri e olha direto para você.`,
    choices: [{ t: "Lutar", fight: { e: ["redcap"], win: "c1_redcap_morto", lose: "c1_derrota_final" } }],
  },
  c1_redcap_foge: {
    title: "Palavras que queimam",
    enter() {
      giveWeapon("pique");
      gain(4, "Expulsou o Barrete Vermelho");
    },
    text: () => `“…in nomine Patris…”, e depois as palavras que Mairi ensinava baixinho, mais velhas que qualquer igreja.

O Barrete Vermelho solta um uivo, cobre as orelhas e se joga pela janela, direto na cachoeira. O pique enferrujado cai aos seus pés.`,
    choices: [{ t: "Virar-se para Blackwood", go: "c1_blackwood" }],
  },
  c1_redcap_bw: {
    title: "O gorro no chão",
    enter() {
      state.flags.ajudou_bw = 1;
    },
    text: () =>
      `A criatura cai, e o gorro vermelho rola pelo chão. O sangue nele escurece e vira pó. Blackwood escorrega pela parede até sentar, com a mão no flanco ferido.`,
    choices: [{ t: "Encarar o sargento", go: "c1_blackwood" }],
  },
  c1_redcap_morto: {
    title: "Sozinho na torre",
    enter() {
      giveWeapon("espada");
      giveOutfit("malha");
      givePennies(12);
    },
    text: () => `A criatura cai, e o gorro vermelho vira pó. Você está de pé, sozinho, num salão cheio de mortos.

Na mão fria de Blackwood ainda está a espada larga dele, de bom aço. Ele não vai mais precisar dela, nem da cota de malha.`,
    choices: [{ t: "Libertar os prisioneiros", go: "c1_libertacao" }],
  },
  c1_blackwood: {
    title: "O sargento",
    text: () => `Blackwood olha para você sem medo. A espada dele está no chão, longe da mão.

“Faz o que tens de fazer, escocês. Mas fica sabendo: não queimei aquela aldeia por gosto. Foram ordens do xerife Heselrig. E quem matou o ferreiro… está ali.” Ele aponta com o queixo para um dos cadáveres no salão.`,
    choices: [
      { t: "Poupar a vida dele", go: "c1_poupar" },
      {
        t: "Mandá-lo pegar a espada e lutar",
        fight: {
          e: ["blackwood"],
          hp: [8],
          win: "c1_bw_vencido",
          lose: "c1_derrota_final",
          intro: "Blackwood pega a espada com esforço. Ferido, mas perigoso.",
        },
      },
    ],
  },
  c1_poupar: {
    title: "Misericórdia",
    enter() {
      state.flags.bw_divida = 1;
      givePennies(15);
      gain(2, "Misericórdia");
    },
    text: () => `Você chuta a espada para longe e estende a mão. Blackwood a encara por um longo tempo antes de aceitar.

“Te devo a vida. Um inglês não esquece isso.” Ele joga para você a chave das correntes e uma bolsa de pennies. Depois, baixinho:

“Ouve. Eu estava em Scone quando entregaram a pedra ao rei Eduardo. Os monges riam quando a carregamos para a carroça. Riam. Pensa nisso.”

Ele manca até a porta e some na noite.`,
    choices: [{ t: "Libertar os prisioneiros", go: "c1_libertacao" }],
  },
  c1_bw_vencido: {
    title: "Aço inglês",
    enter() {
      state.flags.sangue_frio = 1;
      giveWeapon("espada");
      giveOutfit("malha");
    },
    text: () => `Blackwood cai de joelhos e depois de lado. Antes de fechar os olhos, murmura: “Os monges… riam…” e não diz mais nada.

Na porta, Tam e Ailsa viram tudo. Ailsa desvia o olhar. Tam não diz nada, mas não sorri.

A espada larga e a cota de malha dele são de bom aço. Agora são suas.`,
    choices: [{ t: "Libertar os prisioneiros", go: "c1_libertacao" }],
  },
  c1_derrota_final: {
    title: "Mãos amigas",
    enter() {
      state.hp = Math.max(state.hp, 2);
    },
    text: () => `Você cai. O último som que ouve é o pique raspando na pedra…

…e depois gritos escoceses, o zunido das flechas de Ailsa e o rugido de Tam. Quando você acorda, ${state.lastFoe === "blackwood" ? "o sargento fugiu, mancando, e deixou um rastro de sangue na escada" : "a criatura está morta e o sargento sumiu"}. Tam sorri, com sangue na barba. “Quase, ${heroName()}. Quase.”`,
    choices: [{ t: "Libertar os prisioneiros", go: "c1_libertacao" }],
  },
  c1_libertacao: {
    eyebrow: "Corra Linn · Alvorada",
    title: "A névoa da cachoeira",
    enter() {
      state.sangue = 1;
      giveOutfit("nevoa");
      giveMat({ prata: 2 });
      gain(5, "Fim do Capítulo I");
    },
    text: () => `As correntes caem. ${hasFlag("callum_levado") ? "Callum se joga no seu pescoço e não solta mais." : "Os prisioneiros choram e abraçam você, um por um."}

Você sai para a beira da cachoeira. A névoa de Corra Linn sobe em colunas brancas e, dentro dela, toma forma a mulher de cabelos de neve.

“Fizeste bem, criança do sangue antigo. Agora escuta. O Martelo do Sul levou uma pedra para Londres. Mas a Pedra que eles levaram…” Ela sorri pela primeira vez. “…não é a verdadeira. E a Velha do Inverno também a procura.”

Ela tira dos ombros um manto feito da própria névoa e o põe nos seus. Depois sopra sobre você, e o seu sangue arde como fogo e gelo ao mesmo tempo. **O Sangue Antigo despertou.** Escolha a primeira magia que vai aprender.`,
    choices: [
      {
        t: "Luz Feérica",
        sub: "Clarão que cega o inimigo · 1 PF",
        fx() {
          state.skills.sp_luz = 2;
        },
        go: "c1_fim",
      },
      {
        t: "Curar Ferimentos",
        sub: "Fecha feridas · 2 PF",
        fx() {
          state.skills.sp_cura = 2;
        },
        go: "c1_fim",
      },
      {
        t: "Manto de Névoa",
        sub: "Esconde você dos inimigos · 3 PF",
        fx() {
          state.skills.sp_nevoa = 2;
        },
        go: "c1_fim",
      },
    ],
  },
  c1_fim: {
    eyebrow: "Fim do Capítulo I",
    title: "O Martelo e a Pedra",
    enter() {
      state.flags.cap1 = 1;
    },
    text: () => {
      const l = [];
      l.push(
        hasFlag("mairi_viva")
          ? "Mairi está viva e caminha com os rebeldes."
          : "Mairi morreu no fogo de Kilbride.",
      );
      l.push(
        hasFlag("callum_levado")
          ? "Callum foi resgatado da torre de Corra Linn."
          : "Callum nunca saiu do seu lado.",
      );
      if (hasFlag("kelpie_divida")) l.push("Um kelpie deve um favor a você: Abhainn Dubh.");
      if (hasFlag("bw_divida"))
        l.push("O sargento Blackwood deve a vida a você e contou o segredo dos monges de Scone.");
      if (state.weapons.includes("espada")) l.push("Você carrega a espada larga de Blackwood.");
      if (state.weapons.includes("pique")) l.push("Você carrega o pique do Barrete Vermelho.");
      if (hasFlag("sangue_frio"))
        l.push("Os rebeldes viram você matar um homem ferido e desarmado. Tam não esqueceu.");
      return `Seu título agora é **${title(state)}**, com ${state.earned} pontos de experiência acumulados.

<ul class="end-list">${l.map((x) => `<li>${x}</li>`).join("")}</ul>

Em maio de 1297, em Lanark, um homem chamado William Wallace vai matar o xerife Heselrig, e a Escócia inteira vai pegar em armas. Mas a sua guerra é outra: encontrar a verdadeira Pedra do Destino antes da Cailleach.

**Capítulo II: O Martelo e a Pedra** está em preparação.`;
    },
    choices: [
      { t: "Começar o Capítulo II", go: "c2_inicio" },
      { t: "Gastar meus pontos", act: "evolve" },
      { t: "Começar uma nova jornada", act: "newgame" },
    ],
  },
};

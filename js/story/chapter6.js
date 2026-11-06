/**
 * Capítulo VI · Bannockburn e a Pedra (1306–1314) e os finais.
 */
"use strict";

const tamVivo = () => !F("tam_morto") || F("tam_salvo") || F("tam_ferido");
const ailsaViva = () => F("ailsa") && !F("ailsa_morta");
const aliadosFinais = () => [
  ALLY.callum,
  ...(tamVivo() ? [ALLY.tam] : []),
  ...(ailsaViva() ? [ALLY.ailsa] : []),
  ...(!F("aodh_morto") ? [ALLY.aodh] : []),
];
Object.assign(SC, {
  c6_inicio: {
    eyebrow: "Capítulo VI · Bannockburn e a Pedra",
    title: "Uma coroa sem pedra",
    enter() {
      S.hp = maxHP(S);
      S.fp = maxFP(S);
      S.flags.cap6 = 1;
    },
    text: () => `25 de março de 1306. Na abadia de Scone, Robert Bruce é coroado **rei dos escoceses**.

É uma coroação apressada e pobre. Os bispos estão lá, alguns condes, um punhado de cavaleiros. A coroa é um aro simples de ouro. E não há pedra: o trono onde os reis da Escócia sempre foram coroados está vazio, porque todo mundo acredita que a Pedra do Destino está em Londres, na abadia de Westminster.

Você sabe que não está.

Depois da cerimônia, Bruce chama você num canto. “Wallace me disse uma vez que tu sabias de coisas que os outros não sabem. Sobre a Pedra.” Ele espera.`,
    choices: [
      {
        t: "Contar a Bruce onde está a verdadeira Pedra",
        fx() {
          S.flags.bruce_sabe = 1;
        },
        go: "c6_segredo",
      },
      {
        t: "Guardar o segredo",
        fx() {
          S.flags.segredo = 1;
        },
        go: "c6_segredo",
      },
    ],
  },
  c6_segredo: {
    title: "O que um rei precisa",
    enter() {
      gain(2, "A coroação de Scone");
    },
    text: () =>
      F("bruce_sabe")
        ? `Você conta tudo: Dunsinane, o monge Aodh, a tampa da fossa, a Velha do Inverno.

Bruce ri da tampa da fossa até lacrimejar. Depois fica sério. “Deixa a Pedra dormir. Um rei que precisa de uma pedra para ser rei não é rei. Primeiro eu ganho o reino. Depois a Pedra decide se me quer.”`
        : `Você não responde. Bruce olha para você por um longo momento e concorda com a cabeça. “Bom. Um segredo que todo mundo sabe não é segredo. Guarda-o até que eu precise.”`,
    choices: [{ t: "Seguir com o rei", go: "c6_methven" }],
  },
  c6_methven: {
    eyebrow: "Junho de 1306",
    title: "Methven",
    text: () => `Três meses depois, o exército de Bruce acampa num bosque perto de Methven. Um cavaleiro inglês, Aymer de Valence, mandou dizer que lutaria no dia seguinte. Bruce acreditou.

Os ingleses atacam à noite. O acampamento vira fogo e gritos.`,
    choices: [
      {
        t: "Lutar para proteger o rei",
        fight: () => ({
          e: ["cavaleiro_montado", "soldado"],
          allies: [ALLY.callum],
          win: "c6_fuga",
          lose: "c6_fuga",
          intro: "No escuro, você não sabe onde está o rei. Só sabe onde estão os inimigos.",
        }),
      },
    ],
  },
  c6_fuga: {
    title: "Um rei fugitivo",
    enter() {
      gain(2, "Methven");
    },
    text: () => `Methven é um desastre. O exército de Bruce se desfaz. A rainha, a filha e as irmãs dele são capturadas. Os irmãos são presos e executados. Bruce foge para as montanhas com um punhado de homens, e você vai junto.

Naquele inverno, dizem que ele se escondeu numa caverna, e que viu uma aranha tentar seis vezes prender o fio na pedra, e conseguir na sétima.

*Ninguém sabe se a história da aranha é verdade. Mas você estava lá, e sabe que Bruce não desistiu.*`,
    choices: [{ t: "Os anos de guerra", go: "c6_anos" }],
  },
  c6_anos: {
    eyebrow: "1307–1314",
    title: "Sete anos de novo",
    text: () => `Em julho de 1307, o rei Eduardo, o Martelo dos Escoceses, morre a caminho da Escócia, velho e furioso. O filho dele, Eduardo II, não tem a mesma vontade.

Bruce volta das montanhas. Vence em Glen Trool, vence em Loudoun Hill, e toma de volta os castelos um a um, à noite, com escadas de corda e surpresa. Em 1314, só resta um grande castelo nas mãos inglesas: **Stirling**. O comandante inglês promete entregá-lo se nenhum exército vier socorrê-lo até o dia de São João, 24 de junho.

O rei Eduardo II vem, com o maior exército que a Inglaterra já mandou à Escócia.

Antes da batalha, há tempo para uma última coisa.`,
    choices: [
      {
        t: "Escalar a muralha de um castelo à noite com os homens de Bruce",
        test: {
          o: [
            ["escalada", 0],
            ["DX", -1],
          ],
          ok: "c6_castelo",
          fail: "c6_castelo_mal",
        },
      },
      { t: "Visitar Dunsinane e a Pedra", go: "c6_dunsinane" },
    ],
  },
  c6_castelo: {
    title: "Escadas de corda",
    enter() {
      gain(4, "O castelo tomado");
    },
    text: () =>
      `Vocês sobem a rocha de Edimburgo numa noite sem lua, por um caminho que um soldado conhecia desde menino, quando descia para visitar a namorada. No alto, a guarnição inglesa dorme. De manhã, o castelo é escocês.`,
    choices: [{ t: "Partir para Stirling", go: "c6_dama4" }],
  },
  c6_castelo_mal: {
    title: "Uma queda",
    enter() {
      hurt("1d", "Queda na rocha");
    },
    text: () =>
      `Você escorrega na rocha e despenca alguns metros, mas os outros sobem. De manhã, o castelo é escocês, e você está com o braço enfaixado.`,
    choices: [{ t: "Partir para Stirling", go: "c6_dama4" }],
  },
  c6_dunsinane: {
    title: "A colina de novo",
    enter() {
      S.flags.visitou_pedra = 1;
      gain(3, "Dunsinane");
    },
    text: () => `${F("aodh_morto") ? "Na boca da caverna, a estátua de gelo do irmão Aodh continua de braços abertos, há dezesseis anos sem derreter. Um jovem monge cuida da Pedra agora, e diz que reza para a estátua todas as manhãs." : "O irmão Aodh está muito velho e quase cego, mas reconhece sua voz na porta da cabana e chora."}

Na câmara, a Pedra brilha mais do que nunca. A geada nas paredes já não recua.

“A Velha está mais forte”, diz o monge. “Os homens derramaram tanto sangue nesta terra que o inverno cresceu. Ela vai tentar quebrar a Pedra logo, quando o sangue correr de novo.” Ele segura seu braço. “Leva a Pedra para a batalha. Um rei vai lutar pela Escócia. A Pedra deve estar lá.”`,
    choices: [
      {
        t: "Partir para Stirling com a Pedra numa carroça",
        fx() {
          S.flags.pedra_levada = 1;
        },
        go: "c6_dama4",
      },
    ],
  },
  c6_dama4: {
    title: "Filho da Névoa",
    enter() {
      S.sangue = 4;
      gain(4, "O Sangue Antigo completo");
    },
    text: () => `Na estrada para Stirling, a névoa sobe numa manhã de verão, e a Dama Branca caminha ao seu lado. Ela parece cansada, mais transparente do que antes.

“Faz dezoito anos desde Kilbride”, diz ela. “Tu cresceste, e o teu sangue também.” Ela toca sua testa, como na primeira noite. “Agora és o que os antigos chamavam de **Filho da Névoa**. O último degrau. Vais precisar dele.”

${F("pacto_cailleach") && !F("quebrou_pacto") ? "Ela olha para o seu pulso, onde as marcas da Velha ainda estão. “E vais ter de escolher entre a tua palavra e a tua terra.”" : "“A Velha vem buscar a Pedra. Quando vier, estarás entre as duas.”"}

**O Sangue Antigo chegou ao nível 4.** Você aprendeu a **Canção das Estações**.`,
    choices: [
      {
        t: "Chegar a Bannockburn",
        fx() {
          if (!S.skills.sp_estacoes) S.skills.sp_estacoes = 2;
        },
        go: "c6_bannock",
      },
    ],
  },
  c6_bannock: {
    eyebrow: "23 de junho de 1314",
    title: "O primeiro dia",
    text: () => `O exército escocês espera na borda de um bosque, perto de um riacho chamado Bannock Burn. Do outro lado, o exército inglês cobre a planície: cavaleiros, arqueiros, carroças sem fim.

Bruce passa na frente das linhas montado num pônei cinzento, só com um machado na mão e uma coroa de ouro sobre o elmo.

Um cavaleiro inglês, **Sir Henry de Bohun**, vê o rei escocês sozinho e baixa a lança. Atravessa o campo a galope, direto para ele. Os dois exércitos prendem a respiração.

No último instante, Bruce desvia o pônei, se ergue nos estribos e desce o machado na cabeça do cavaleiro. De Bohun cai morto. O machado se parte.

Os capitães de Bruce correm até ele, furiosos por ele ter arriscado a vida. Ele só olha o cabo quebrado. “Perdi o meu bom machado.”

O exército escocês ruge.`,
    choices: [{ t: "Esperar a noite", go: "c6_noite" }],
  },
  c6_noite: {
    title: "Neve no solstício",
    text: () => `Na noite mais curta do ano, começa a nevar.

Os soldados olham para o céu sem entender. A neve cai sobre os dois exércitos, sobre o riacho, sobre a carroça ${F("pedra_levada") ? "onde a Pedra dorme coberta de palha" : "do abade de Inchaffray, que, você descobre agora, trouxe a Pedra escondida de Dunsinane"}.

A Cailleach sai da neve. Está maior do que nunca, alta como um carvalho.

${F("pacto_cailleach") && !F("quebrou_pacto") ? "“A guerra acaba amanhã, criança. Cumpre a tua palavra. Amanhã, quando o sangue correr, tu quebras a Pedra.”" : F("quebrou_pacto") ? "“Rompeste a tua palavra, e eu cacei-te por dezesseis anos. Amanhã, quando o sangue correr, eu mesma quebro a Pedra.”" : F("cailleach_verdade") ? "“Nós já conversamos uma vez, criança. Amanhã, quando o sangue correr, eu venho buscar a minha liberdade. Pensa no que vais dizer.”" : "“Amanhã, quando o sangue correr, eu quebro a Pedra. E a Escócia vai dormir debaixo da neve para sempre.”"}

Ela some. A neve continua caindo até o amanhecer.`,
    choices: [{ t: "Esperar o amanhecer", go: "c6_manha" }],
  },
  c6_manha: {
    eyebrow: "24 de junho de 1314",
    title: "Ajoelhados",
    text: () => `De manhã, a neve derreteu, mas o frio ficou. Maurice, abade de Inchaffray, ergue um relicário de prata, e o exército escocês inteiro se ajoelha para rezar.

Do outro lado, o rei Eduardo II ri. “Eles se ajoelham para pedir misericórdia!”

Um velho cavaleiro ao lado dele responde: “Pedem, sim, majestade. Mas não a vós.”

Os escoceses se levantam e avançam. Onde você vai estar?`,
    choices: [
      { t: "No avanço dos schiltrons", go: "c6_avanco" },
      { t: "No monte, com a gente miúda do acampamento", go: "c6_gillies" },
      { t: "Guardando a carroça da Pedra", go: "c6_pedra" },
    ],
  },
  c6_avanco: {
    title: "Entre dois rios",
    text: () => `Os schiltrons escoceses descem a encosta, e desta vez são eles que atacam. O exército inglês, enorme, está espremido entre o Bannock Burn e o Forth, sem espaço para manobrar. Os cavaleiros se atropelam. Os arqueiros não conseguem atirar sem acertar os próprios homens.

Na sua frente, um cavaleiro tenta abrir caminho.`,
    choices: [
      {
        t: "Avançar com as lanças",
        fight: () => ({
          e: ["cavaleiro_montado", "soldado"],
          allies: [ALLY.lanceiros, ALLY.bruce, ...(tamVivo() ? [ALLY.tam] : [])],
          win: "c6_avanco_ok",
          lose: "c6_avanco_ok",
        }),
      },
    ],
  },
  c6_avanco_ok: {
    title: "O exército se desfaz",
    enter() {
      gain(3, "O avanço");
    },
    text: () => `As lanças empurram, e o exército inglês começa a ceder. Então, do monte atrás das linhas escocesas, surge um segundo exército.

É a gente miúda do acampamento: cozinheiros, carroceiros, meninos, mulheres, com lençóis e cobertores amarrados em varas como bandeiras. Os ingleses acham que são reforços. O pânico corre pelas fileiras deles como fogo em palha.

E é nesse momento que a neve volta a cair, só sobre a carroça da Pedra.`,
    choices: [{ t: "Correr para a Pedra", go: "c6_pedra" }],
  },
  c6_gillies: {
    title: "A gente miúda",
    text: () => `No monte atrás das linhas, a gente do acampamento espera a batalha terminar: cozinheiros, carroceiros, meninos, mulheres. Estão com medo.

Lá embaixo, o exército inglês treme, mas ainda não cedeu.`,
    choices: [
      {
        t: "Convencê-los a descer o monte como se fossem um exército",
        test: {
          o: [
            ["diplomacia", 1],
            ["Vontade", 0],
          ],
          ok: "c6_gillies_ok",
          fail: "c6_gillies_mal",
        },
      },
    ],
  },
  c6_gillies_ok: {
    title: "Lençóis como bandeiras",
    enter() {
      S.flags.gillies = 1;
      gain(5, "A gente miúda");
    },
    text: () => `“Peguem tudo o que tiverem! Lençóis, varas, panelas!” Você amarra a primeira bandeira com as próprias mãos.

Centenas de pessoas aparecem no alto do monte, gritando, com lençóis brancos tremulando como estandartes. Lá embaixo, os ingleses veem um exército novo chegando. O pânico explode. A fileira inglesa se quebra, e a fuga começa.

E é nesse momento que a neve volta a cair, só sobre a carroça da Pedra.`,
    choices: [{ t: "Correr para a Pedra", go: "c6_pedra" }],
  },
  c6_gillies_mal: {
    title: "O monte desce sozinho",
    text: () => `Eles não ouvem você. Mas logo depois, por conta própria, a gente do acampamento desce o monte gritando, com lençóis amarrados em varas. O pânico explode nas linhas inglesas.

E é nesse momento que a neve volta a cair, só sobre a carroça da Pedra.`,
    choices: [{ t: "Correr para a Pedra", go: "c6_pedra" }],
  },
  c6_pedra: {
    eyebrow: "24 de junho de 1314",
    title: "A Pedra e o inverno",
    text: () => `Na borda do campo, a carroça está coberta de gelo. A palha caiu, e a Pedra negra brilha azul, cada vez mais forte. Em volta dela, o verão virou inverno: a grama está branca, o riacho congelou.

Sobre a carroça, alta como uma torre de gelo, está a **Cailleach**. O olho único brilha como a estrela da manhã. Atrás de você, a batalha continua, e os gritos parecem muito longe.

${F("pacto_cailleach") && !F("quebrou_pacto") ? "“Chegou a hora, criança. A tua palavra.”" : "“Sai da frente, criança. Ou fica, e congela com a tua terra.”"}

${
  aliadosFinais().length
    ? `Ao seu lado chegam ${aliadosFinais()
        .map((a) => a.n)
        .join(", ")}.`
    : ""
}`,
    choices: [
      {
        t: "Propor um acordo: “O inverno também é da Escócia. Mas só no seu tempo.”",
        if: () => F("cailleach_verdade") && !F("quebrou_pacto"),
        test: {
          o: () => [
            ["Vontade", F("recusou_pacto") || F("recusou_londres") ? 2 : 0],
            ["saber", 0],
          ],
          ok: "c6_fim_primavera",
          fail: "c6_luta_final",
        },
      },
      {
        t: "Cumprir a palavra e quebrar a Pedra",
        if: () => F("pacto_cailleach") && !F("quebrou_pacto"),
        go: "c6_fim_inverno",
      },
      { t: "Despertar a Pedra e prender a Velha de novo", go: "c6_luta_final" },
    ],
  },
  c6_luta_final: {
    title: "A Velha do Inverno",
    text: () => `Você põe as mãos na Pedra, e ela queima de frio e de fogo ao mesmo tempo. O Sangue Antigo responde. A Velha grita, e o vento vira uma lâmina.

Ela desce da carroça, e com ela vem o **Lobo-Rei do Inverno**, renascido da neve.`,
    choices: [
      {
        t: "Lutar pela primavera",
        fight: () => ({
          e: ["avatar", "lobo_rei"],
          allies: aliadosFinais(),
          win: "c6_fim_selo",
          lose: "c6_fim_dama",
          intro: "A última batalha não é contra a Inglaterra.",
        }),
      },
    ],
  },
  c6_fim_primavera: {
    eyebrow: "Final",
    title: "O acordo das estações",
    enter() {
      S.flags.final = "primavera";
      gain(10, "O acordo das estações");
    },
    text: () => `Você tira as mãos da Pedra.

“Os pictos te prenderam porque tinham medo do frio. Mas o inverno faz parte desta terra. O inverno mata a praga, deixa a terra descansar, faz a primavera valer a pena.” Você respira fundo. “Então seja livre. Mas só no teu tempo. De Samhain a Beltane, a terra é tua. De Beltane a Samhain, é nossa. E a Pedra fica onde está, guardando o acordo.”

A Velha fica imóvel por tanto tempo que a neve para no ar, como as faíscas da noite do fogo, dezoito anos atrás.

Então ela ri. Um riso velho, enorme, que parece o gelo dos lagos rachando na primavera.

“Nenhum rei me ofereceu isso. Nenhum druida. Uma criança de Kilbride.” Ela se abaixa até o rosto dela ficar na altura do seu. “Aceito.”

A geada recua da Pedra. A neve vira chuva, a chuva vira sol. Em volta da carroça, a grama branca fica verde, e flores nascem onde o gelo estava. Na batalha, os ingleses fogem, e os escoceses param, olhando para o campo florido sem entender.`,
    choices: [{ t: "Epílogo", go: "c6_epilogo" }],
  },
  c6_fim_selo: {
    eyebrow: "Final",
    title: "O selo",
    enter() {
      S.flags.final = "selo";
      gain(10, "A Velha selada");
    },
    text: () => `A Velha cai de joelhos diante da Pedra, e o Lobo-Rei vira neve fina. Você põe as duas mãos na Pedra e canta, sem saber como, a Canção das Estações.

A Pedra puxa a Cailleach para dentro de si como a água puxa a chuva. Ela não grita. No último instante, olha para você com o olho único, e não há ódio nele. Só cansaço.

“Por mais mil anos, então”, diz ela. E some.

A neve para. O sol volta. Na batalha, o exército inglês foge em pânico, e o rei Eduardo II galopa para o castelo de Dunbar. A Escócia é livre.

A Pedra, agora pesada como nunca, só aceita voltar para debaixo da colina de Dunsinane.`,
    choices: [{ t: "Epílogo", go: "c6_epilogo" }],
  },
  c6_fim_dama: {
    eyebrow: "Final",
    title: "O sacrifício da Dama",
    enter() {
      S.flags.final = "dama";
      gain(8, "O sacrifício da Dama");
    },
    text: () => `Você cai na neve, e a Velha ergue o cajado sobre a Pedra.

Então a névoa sobe do chão, e a Dama Branca se põe entre as duas. Pela primeira vez você entende: elas são irmãs. Inverno e primavera. A Velha e a Donzela.

“Basta, irmã.” A Dama abraça a Cailleach, e as duas brilham, branco e azul, até você não conseguir olhar.

Quando a luz some, a Pedra está selada de novo, e não há mais ninguém sobre a carroça. Só uma flor branca de sorveira, no meio da neve que derrete.

A batalha está ganha. A Escócia é livre. E você nunca mais vai ver a Dama.`,
    choices: [{ t: "Epílogo", go: "c6_epilogo" }],
  },
  c6_fim_inverno: {
    eyebrow: "Final",
    title: "O inverno eterno",
    enter() {
      S.flags.final = "inverno";
      gain(5, "A palavra cumprida");
    },
    text: () => `Você deu a sua palavra. Ergue o machado, a espada, a pedra mais pesada que encontra, e desce sobre a Pedra do Destino.

Ela se parte com um som de mil lagos congelando ao mesmo tempo.

A Cailleach suspira, livre, e cresce até cobrir o céu. A neve começa a cair e não para mais. Na batalha, ingleses e escoceses largam as armas e olham para cima. O riacho congela. O Forth congela. Os campos somem debaixo do branco.

“Obrigada, criança”, diz a Velha, já muito longe. “Cumpriste a tua palavra. Poucos homens cumprem.”

Bruce ganhou a batalha de Bannockburn. Mas não houve primavera em 1315, nem em 1316. Os velhos ainda contam que foi o pior inverno que a Escócia já viu, e que nunca terminou de verdade.`,
    choices: [{ t: "Epílogo", go: "c6_epilogo" }],
  },
  c6_epilogo: {
    eyebrow: "Epílogo",
    title: "Sangue e Névoa",
    enter() {
      S.flags.fim_jogo = 1;
    },
    text: () => {
      const f = S.flags.final;
      const l = [];
      l.push(
        F("callum_ferido")
          ? "Callum mancou a vida inteira e se tornou o melhor arqueiro do exército de Bruce. Teve quatro filhos, e o mais velho se chama " +
              esc(S.name) +
              "."
          : "Callum se tornou capitão dos arqueiros do rei Robert. Teve quatro filhos, e o mais velho se chama " +
              esc(S.name) +
              ".",
      );
      if (F("mairi_viva"))
        l.push(
          "Mairi viveu até os noventa anos e morreu dormindo, numa noite de Samhain, com um galho de sorveira na mão.",
        );
      l.push(
        tamVivo()
          ? "Tam voltou para Cartland, ficou grisalho e contava a história da ponte de Stirling para qualquer um que pagasse uma cerveja."
          : "Tam está enterrado em Falkirk, e todo ano alguém deixa um bordão de freixo no túmulo dele.",
      );
      if (F("ailsa"))
        l.push(
          ailsaViva()
            ? "Ailsa nunca se casou. Ensinou meninas a atirar com arco até o fim da vida."
            : "Ailsa está enterrada em Falkirk, entre os arqueiros de Selkirk.",
        );
      if (F("bw_salvo"))
        l.push(
          "Roger Blackwood criou ovelhas em Yorkshire até morrer de velho. Nunca mais vestiu uma cota de malha.",
        );
      if (F("aodh_morto"))
        l.push("A estátua de gelo do irmão Aodh ainda está na colina de Dunsinane. Não derrete.");
      else l.push("O irmão Aodh morreu em paz em Dunsinane, ao lado da Pedra.");
      if (F("kelpie_divida") && !F("kelpie_usado"))
        l.push("O kelpie do Clyde ainda lhe deve um favor. Ele espera.");
      if (F("ghillie")) l.push("O Ghillie Dhu das bétulas deixou flores na sua porta todo ano.");
      const fim =
        {
          primavera:
            "Desde então, o inverno na Escócia vem em Samhain e vai embora em Beltane, sem falhar. Os velhos dizem que é por causa de um acordo. Ninguém lembra com quem.",
          selo: "A Pedra dorme de novo sob a colina de Dunsinane. Em Londres, os reis ingleses continuam sendo coroados sobre a tampa da fossa de Scone, e os monges continuam rindo.",
          dama: "A Pedra dorme de novo sob a colina. A primavera ainda vem todo ano, mas um pouco mais tarde, e um pouco mais triste.",
          inverno:
            "A Escócia é livre e coberta de neve. Os escoceses aprenderam a viver no inverno. Os ingleses nunca mais voltaram. Ninguém quer conquistar uma terra de gelo.",
        }[f] || "";
      return `${fim}

Em 1320, os nobres da Escócia escrevem ao papa uma carta que vai ficar famosa: *enquanto cem de nós estivermos vivos, nunca nos submeteremos ao domínio inglês. Não lutamos por glória, nem riquezas, nem honras, mas pela liberdade, que nenhum homem de bem perde senão com a vida.*

Muitos anos depois, você ouve lerem essa carta numa praça, já com cabelos brancos. Pensa em Kilbride, numa noite de Samhain, numa fogueira e num menino que esculpia nabos feios.

<ul class="end-list">${l.map((x) => `<li>${x}</li>`).join("")}</ul>

Seu título final é **${title(S)}**, com ${S.earned} pontos de experiência.

**Fim de Sangue e Névoa.** Obrigado por jogar.`;
    },
    choices: [{ t: "Começar uma nova jornada, com outras escolhas", act: "newgame" }],
  },
});

/**
 * Origens disponíveis na criação de personagem.
 */
"use strict";

const ORIGINS = {
  ferreiro: {
    n: "Aprendiz de Ferreiro",
    blurb:
      "Aprendiz de Duncan, o ferreiro da aldeia. Cresceu entre o fole e a bigorna, com braços fortes e respeito pelo ferro, o metal que as fadas temem.",
    attrs: { ST: 12, DX: 11, IQ: 10, HT: 11 },
    skills: { machado: 2, briga: 1, escudo: 1, ferraria: 4 },
    adv: [{ n: "Duro na Queda 1", p: 2 }],
    weapons: ["martelo", "punhos"],
    armor: "gibao",
    shield: true,
    ervas: 1,
    coins: 10,
    mat: { ferro: 2 },
  },
  pastor: {
    n: "Pastor(a) das Colinas",
    blurb:
      "Passou a vida atrás das ovelhas nas encostas. Conhece cada trilha e acerta um lobo com a funda a trinta passos.",
    attrs: { ST: 10, DX: 12, IQ: 10, HT: 11 },
    skills: { funda: 4, bordao: 2, sobrevivencia: 2, furtividade: 1, natacao: 1 },
    adv: [],
    weapons: ["bordao", "funda", "punhos"],
    armor: "la",
    shield: false,
    ervas: 1,
    coins: 6,
    mat: { couro: 2 },
  },
  curandeira: {
    n: "Aprendiz da Curandeira",
    blurb: "Aprendeu com a velha Mairi o nome de cada erva e as palavras que não se dizem perto da igreja.",
    attrs: { ST: 10, DX: 10, IQ: 12, HT: 11 },
    skills: { herbalismo: 2, primeiros: 1, saber: 2, faca: 2, diplomacia: 1, furtividade: 2 },
    adv: [],
    weapons: ["faca", "punhos"],
    armor: "la",
    shield: false,
    ervas: 3,
    coins: 8,
    mat: { tecido: 2 },
  },
};

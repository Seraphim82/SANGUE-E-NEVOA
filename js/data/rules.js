/**
 * Regras básicas: custos de atributo, dificuldades de perícia, lista de perícias e
 * magias, tabela de dano por Força e tipos de dano.
 */
"use strict";

const ATTR_COST = { ST: 10, DX: 20, IQ: 20, HT: 10 };
const ATTR_NAME = { ST: "Força", DX: "Destreza", IQ: "Inteligência", HT: "Vitalidade" };
const DIFF = {
  F: { off: 0, def: -4, n: "Fácil" },
  M: { off: -1, def: -5, n: "Média" },
  D: { off: -2, def: -6, n: "Difícil" },
  MD: { off: -3, def: null, n: "Muito difícil" },
};
const SK = {
  briga: { n: "Briga", a: "DX", d: "F", g: "Combate" },
  faca: { n: "Faca", a: "DX", d: "F", g: "Combate" },
  escudo: { n: "Escudo", a: "DX", d: "F", g: "Combate" },
  espada: { n: "Espada Larga", a: "DX", d: "M", g: "Combate" },
  machado: { n: "Machado/Maça", a: "DX", d: "M", g: "Combate" },
  bordao: { n: "Bordão", a: "DX", d: "M", g: "Combate" },
  lanca: { n: "Lança", a: "DX", d: "M", g: "Combate" },
  funda: { n: "Funda", a: "DX", d: "D", g: "Combate" },
  furtividade: { n: "Furtividade", a: "DX", d: "M", g: "Exploração" },
  escalada: { n: "Escalada", a: "DX", d: "M", g: "Exploração" },
  natacao: { n: "Natação", a: "HT", d: "F", g: "Exploração" },
  arco: { n: "Arco", a: "DX", d: "M", g: "Combate" },
  sobrevivencia: { n: "Sobrevivência", a: "IQ", d: "M", g: "Exploração" },
  primeiros: { n: "Primeiros Socorros", a: "IQ", d: "F", g: "Conhecimento" },
  herbalismo: { n: "Herbalismo", a: "IQ", d: "D", g: "Conhecimento" },
  diplomacia: { n: "Diplomacia", a: "IQ", d: "M", g: "Conhecimento" },
  saber: { n: "Saber Antigo", a: "IQ", d: "M", g: "Conhecimento" },
  ferraria: { n: "Ferraria", a: "IQ", d: "M", g: "Conhecimento" },
  sp_luz: {
    n: "Luz Feérica",
    a: "IQ",
    d: "D",
    g: "Magia",
    spell: { circle: 1, fp: 1, desc: "Inimigo −3 nos ataques por 2 turnos" },
  },
  sp_cura: {
    n: "Curar Ferimentos",
    a: "IQ",
    d: "D",
    g: "Magia",
    spell: { circle: 1, fp: 2, desc: "Recupera 1d+1 PV" },
  },
  sp_nevoa: {
    n: "Manto de Névoa",
    a: "IQ",
    d: "D",
    g: "Magia",
    spell: { circle: 1, fp: 3, desc: "Inimigos −2 por 3 turnos; fuga automática" },
  },
  sp_espinhos: {
    n: "Espinhos de Sorveira",
    a: "IQ",
    d: "D",
    g: "Magia",
    spell: { circle: 2, fp: 2, desc: "2d perfuração, sem defesa" },
  },
  sp_beltane: {
    n: "Fogo de Beltane",
    a: "IQ",
    d: "D",
    g: "Magia",
    spell: { circle: 2, fp: 3, desc: "3d de queimadura" },
  },
  sp_tempestade: {
    n: "Chamado da Tempestade",
    a: "IQ",
    d: "D",
    g: "Magia",
    spell: { circle: 3, fp: 5, desc: "Granizo sobre todos os inimigos: 2d em cada" },
  },
  sp_estacoes: {
    n: "Canção das Estações",
    a: "IQ",
    d: "D",
    g: "Magia",
    spell: { circle: 4, fp: 6, desc: "Cura 2d PV e cega todos os inimigos por 2 turnos" },
  },
  sp_bride: {
    n: "Bênção de Brìde",
    a: "IQ",
    d: "D",
    g: "Magia",
    spell: { circle: 3, fp: 4, desc: "Cura 2d+2 PV" },
  },
};
// tabela de dano por ST: [dados, modificador]
const GDP = {
  6: [1, -4],
  7: [1, -3],
  8: [1, -3],
  9: [1, -2],
  10: [1, -2],
  11: [1, -1],
  12: [1, -1],
  13: [1, 0],
  14: [1, 0],
  15: [1, 1],
  16: [1, 1],
  17: [1, 2],
  18: [1, 2],
  19: [2, -1],
  20: [2, -1],
};
const GEB = {
  6: [1, -3],
  7: [1, -2],
  8: [1, -2],
  9: [1, -1],
  10: [1, 0],
  11: [1, 1],
  12: [1, 2],
  13: [2, -1],
  14: [2, 0],
  15: [2, 1],
  16: [2, 2],
  17: [3, -1],
  18: [3, 0],
  19: [3, 1],
  20: [3, 2],
};
const DTYPE = {
  cr: { n: "contusão", m: 1 },
  cut: { n: "corte", m: 1.5 },
  imp: { n: "perfuração", m: 2 },
  burn: { n: "queimadura", m: 1 },
};

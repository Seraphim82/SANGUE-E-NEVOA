/**
 * Planos de ação pintados do cinema de combate, em img/action/<chave>.jpg.
 *
 * - heroi_<furia|dor>_<aparência>_<roupa>
 * - arma_<golpe|aparo>_<arma>
 * - escudo
 * - inimigo_<ataque|atingido|queda>_<retrato>
 *
 * Só os listados aqui são carregados. Para os que faltam, o cinema usa os retratos.
 * Gere novos com tools/gerar_imagens.py (chave "acao:<nome>") e rode
 * node tools/listar_planos.mjs para atualizar esta lista.
 */
"use strict";

const ACTION_SHOTS = new Set([
  "arma_aparo_espada",
  "arma_golpe_espada",
  "escudo",
  "heroi_dor_ruiva_malha",
  "heroi_furia_ruiva_malha",
  "heroi_furia_ruivo_malha",
  "inimigo_ataque_recruta",
  "inimigo_atingido_recruta",
  "inimigo_queda_recruta",
]);

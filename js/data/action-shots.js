/**
 * Planos de ação pintados do cinema de combate, em img/action/<chave>.jpg.
 *
 * - heroi_<furia|dor>_<aparência>_<roupa>
 * - arma_<golpe|aparo>_<arma>
 * - escudo
 * - inimigo_<ataque|atingido|queda>_<retrato>
 *
 * Só os listados aqui são carregados. Para os que faltam, o cinema usa os retratos.
 * Gere novos com tools/gerar_imagens.py (chave "acao:<nome>") e acrescente aqui.
 */
"use strict";

const ACTION_SHOTS = new Set([
  "heroi_furia_ruiva_malha",
  "heroi_dor_ruiva_malha",
  "arma_golpe_espada",
  "arma_aparo_espada",
  "escudo",
  "inimigo_ataque_recruta",
  "inimigo_atingido_recruta",
  "inimigo_queda_recruta",
]);

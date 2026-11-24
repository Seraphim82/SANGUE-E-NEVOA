/**
 * Conquistas e estatísticas.
 *
 * Valem para todas as partidas: ficam num perfil próprio no navegador (sen-perfil), separado
 * do save. O perfil é tratado como dado não confiável, como o save: só entram conquistas que
 * existem e números dentro de limites.
 */
"use strict";

/** Cada conquista: nome, descrição, grupo e a condição, testada sobre o herói e o perfil. */
const ACHIEVEMENTS = {
  cap1: { n: "A noite do fogo", d: "Termine o Capítulo I.", g: "Jornada", ok: () => hasFlag("cap1") },
  cap2: {
    n: "O Martelo e a Pedra",
    d: "Termine o Capítulo II.",
    g: "Jornada",
    ok: () => hasFlag("cap2_fim"),
  },
  cap3: { n: "A ponte caiu", d: "Termine o Capítulo III.", g: "Jornada", ok: () => hasFlag("cap3_fim") },
  cap4: {
    n: "Sobrevivente de Falkirk",
    d: "Termine o Capítulo IV.",
    g: "Jornada",
    ok: () => hasFlag("cap4_fim"),
  },
  cap5: { n: "Depois da traição", d: "Termine o Capítulo V.", g: "Jornada", ok: () => hasFlag("cap5_fim") },
  bannock: { n: "Bannockburn", d: "Chegue ao fim da história.", g: "Jornada", ok: () => hasFlag("fim_jogo") },
  primavera: {
    n: "O acordo das estações",
    d: "Alcance o final da primavera.",
    g: "Finais",
    ok: () => state.flags.final === "primavera",
  },
  selo: { n: "O selo", d: "Alcance o final do selo.", g: "Finais", ok: () => state.flags.final === "selo" },
  dama: {
    n: "O sacrifício da Dama",
    d: "Alcance o final da Dama Branca.",
    g: "Finais",
    ok: () => state.flags.final === "dama",
  },
  inverno: {
    n: "O inverno eterno",
    d: "Alcance o final do inverno.",
    g: "Finais",
    ok: () => state.flags.final === "inverno",
  },
  estacoes: {
    n: "Todas as estações",
    d: "Veja os quatro finais.",
    g: "Finais",
    ok: (p) => p.finais.length >= 4,
  },
  kelpie: {
    n: "Amigo do rio",
    d: "Ganhe a gratidão do kelpie do Clyde.",
    g: "Mistérios",
    ok: () => hasFlag("kelpie_divida"),
  },
  ghillie: {
    n: "Flores na porta",
    d: "Faça amizade com o Ghillie Dhu.",
    g: "Mistérios",
    ok: () => hasFlag("ghillie"),
  },
  velha: {
    n: "Conversa com a Velha",
    d: "Fale com a Cailleach e saia vivo.",
    g: "Mistérios",
    ok: () => hasFlag("cailleach_verdade"),
  },
  sinais: {
    n: "Marcado pelo inverno",
    d: "Receba três Sinais feéricos.",
    g: "Mistérios",
    ok: () => (state.sinais || 0) >= 3,
  },
  sangue: {
    n: "O sangue desperto",
    d: "Desperte todo o Sangue Antigo.",
    g: "Mistérios",
    ok: () => (state.sangue || 0) >= 4,
  },
  mairi: {
    n: "A velha Mairi",
    d: "Chegue ao fim com Mairi viva.",
    g: "Companheiros",
    ok: () => hasFlag("fim_jogo") && hasFlag("mairi_viva"),
  },
  tam: {
    n: "Tam envelhece",
    d: "Chegue ao fim com Tam vivo.",
    g: "Companheiros",
    ok: () => hasFlag("fim_jogo") && tamVivo(),
  },
  ailsa: {
    n: "A arqueira de Selkirk",
    d: "Chegue ao fim com Ailsa viva.",
    g: "Companheiros",
    ok: () => hasFlag("fim_jogo") && ailsaViva(),
  },
  blackwood: {
    n: "Misericórdia",
    d: "Poupe Roger Blackwood.",
    g: "Companheiros",
    ok: () => hasFlag("bw_salvo"),
  },
  lendario: {
    n: "Lendário",
    d: "Leve uma arma ou roupa ao nível Lendário na forja.",
    g: "Combate",
    ok: () => Object.values(state.up || {}).some((v) => v >= 3),
  },
  lenda: { n: "Lenda", d: "Conquiste o título de Lenda.", g: "Combate", ok: () => title(state) === "Lenda" },
  intacto: {
    n: "Nunca de joelhos",
    d: "Chegue ao fim sem nunca cair num combate.",
    g: "Combate",
    ok: () => hasFlag("fim_jogo") && !hasFlag("caiu"),
  },
  feericos: {
    n: "Ferro frio",
    d: "Derrote 25 criaturas feéricas, somando todas as partidas.",
    g: "Combate",
    ok: (p) => p.stats.feericos >= 25,
  },
  cem: {
    n: "Veterano",
    d: "Derrote 100 inimigos, somando todas as partidas.",
    g: "Combate",
    ok: (p) => p.stats.inimigos >= 100,
  },
};

/** Estatísticas do perfil e o máximo aceito para cada uma ao ler do navegador. */
const STAT_LIMITS = {
  partidas: 1e6,
  terminadas: 1e6,
  mortes: 1e6,
  quedas: 1e6,
  inimigos: 1e7,
  feericos: 1e7,
};

const ACH = (() => {
  const KEY = "sen-perfil";
  let perfil = load();

  function empty() {
    return {
      conquistas: {},
      finais: [],
      stats: Object.fromEntries(Object.keys(STAT_LIMITS).map((k) => [k, 0])),
    };
  }

  /** Lê o perfil, aceitando só o que existe e dentro dos limites. */
  function load() {
    const p = empty();
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!raw || typeof raw !== "object") return p;
      if (raw.conquistas && typeof raw.conquistas === "object")
        for (const k of Object.keys(raw.conquistas))
          if (Object.hasOwn(ACHIEVEMENTS, k) && Number.isFinite(raw.conquistas[k]))
            p.conquistas[k] = raw.conquistas[k];
      if (Array.isArray(raw.finais))
        p.finais = [
          ...new Set(raw.finais.filter((f) => ["primavera", "selo", "dama", "inverno"].includes(f))),
        ];
      if (raw.stats && typeof raw.stats === "object")
        for (const [k, max] of Object.entries(STAT_LIMITS)) {
          const v = raw.stats[k];
          if (Number.isFinite(v)) p.stats[k] = Math.max(0, Math.min(max, Math.floor(v)));
        }
    } catch {
      // Perfil ausente ou ilegível: começa do zero.
    }
    return p;
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(perfil));
    } catch {
      // Armazenamento indisponível: vale só nesta sessão.
    }
  }

  /** Confere todas as conquistas e anuncia as novas. */
  function check() {
    if (!state || state.mode !== "playing") return [];
    const f = state.flags.final;
    if (f && !perfil.finais.includes(f)) perfil.finais.push(f);
    const novas = [];
    for (const [k, a] of Object.entries(ACHIEVEMENTS)) {
      if (perfil.conquistas[k]) continue;
      let ok = false;
      try {
        ok = !!a.ok(perfil);
      } catch {
        // Uma condição que não pode ser avaliada agora simplesmente não vale ainda.
      }
      if (ok) {
        perfil.conquistas[k] = Date.now();
        novas.push(k);
      }
    }
    persist();
    novas.forEach((k, i) =>
      setTimeout(
        () => {
          toast(`Conquista: ${ACHIEVEMENTS[k].n}`);
          AUD.sting("sucesso");
        },
        600 + i * 2200,
      ),
    );
    return novas;
  }

  /** Soma a uma estatística (com teto) e confere as conquistas. */
  function count(stat, n = 1) {
    if (!Object.hasOwn(STAT_LIMITS, stat)) return;
    perfil.stats[stat] = Math.min(STAT_LIMITS[stat], perfil.stats[stat] + n);
    persist();
  }

  return {
    check,
    count,
    get perfil() {
      return perfil;
    },
    /** Só para os testes: recarrega o perfil do navegador. */
    reload() {
      perfil = load();
    },
  };
})();

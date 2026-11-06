/**
 * Trilha sonora e efeitos.
 *
 * Música medieval gerada em tempo real com a Web Audio API (zumbido de gaita de fole,
 * flauta, harpa e bodhrán) em cinco climas, mais vinhetas e efeitos sonoros.
 */
"use strict";

const AUD = (() => {
  let ctx = null,
    master,
    music,
    sfx,
    rev,
    noiseBuf,
    cur = null,
    wanted = "tema";
  const pref = { music: true, sfx: true };
  try {
    const p = JSON.parse(localStorage.getItem("sen-audio") || "null");
    if (p) Object.assign(pref, p);
  } catch (e) {}
  const savePref = () => {
    try {
      localStorage.setItem("sen-audio", JSON.stringify(pref));
    } catch (e) {}
  };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function init() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master.connect(comp);
    comp.connect(ctx.destination);
    const len = ctx.sampleRate * 3,
      ib = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ib.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    rev = ctx.createConvolver();
    rev.buffer = ib;
    const rg = ctx.createGain();
    rg.gain.value = 0.34;
    rev.connect(rg);
    rg.connect(master);
    music = ctx.createGain();
    music.gain.value = pref.music ? 0.5 : 0;
    music.connect(master);
    music.connect(rev);
    sfx = ctx.createGain();
    sfx.gain.value = pref.sfx ? 0.7 : 0;
    sfx.connect(master);
    const sr = ctx.createGain();
    sr.gain.value = 0.4;
    sfx.connect(sr);
    sr.connect(rev);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return true;
  }
  function env(g, t, a, peak, hold, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  }
  function whistle(d, t, m, dur, v = 0.14) {
    const o = ctx.createOscillator(),
      o2 = ctx.createOscillator(),
      g = ctx.createGain(),
      f = ctx.createBiquadFilter(),
      fr = mtof(m);
    o.type = "triangle";
    o2.type = "sine";
    o.frequency.value = fr;
    o2.frequency.value = fr * 2;
    const lfo = ctx.createOscillator(),
      lg = ctx.createGain();
    lfo.frequency.value = 5.3;
    lg.gain.setValueAtTime(0, t);
    lg.gain.linearRampToValueAtTime(fr * 0.007, t + Math.min(dur, 0.7));
    lfo.connect(lg);
    lg.connect(o.frequency);
    lg.connect(o2.frequency);
    const g2 = ctx.createGain();
    g2.gain.value = 0.22;
    o2.connect(g2);
    g2.connect(g);
    o.connect(g);
    f.type = "lowpass";
    f.frequency.value = 4200;
    g.connect(f);
    f.connect(d);
    env(g, t, 0.04, v, Math.max(0.01, dur - 0.12), 0.14);
    [o, o2, lfo].forEach((x) => {
      x.start(t);
      x.stop(t + dur + 0.35);
    });
  }
  function harp(d, t, m, v = 0.14, len = 1.6) {
    const o = ctx.createOscillator(),
      o2 = ctx.createOscillator(),
      g = ctx.createGain(),
      f = ctx.createBiquadFilter();
    o.type = "triangle";
    o2.type = "sine";
    o.frequency.value = mtof(m);
    o2.frequency.value = mtof(m) * 2.004;
    const g2 = ctx.createGain();
    g2.gain.value = 0.3;
    o2.connect(g2);
    g2.connect(g);
    o.connect(g);
    f.type = "lowpass";
    f.frequency.setValueAtTime(3400, t);
    f.frequency.exponentialRampToValueAtTime(650, t + len);
    g.connect(f);
    f.connect(d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    [o, o2].forEach((x) => {
      x.start(t);
      x.stop(t + len + 0.05);
    });
  }
  function pad(d, t, notes, dur, v = 0.04, type = "sawtooth", cut = 750) {
    notes.forEach((m) =>
      [-7, 7].forEach((dt) => {
        const o = ctx.createOscillator(),
          g = ctx.createGain(),
          f = ctx.createBiquadFilter();
        o.type = type;
        o.frequency.value = mtof(m);
        o.detune.value = dt;
        f.type = "lowpass";
        f.frequency.value = cut;
        o.connect(f);
        f.connect(g);
        g.connect(d);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(v, t + Math.min(1.2, dur * 0.4));
        g.gain.setValueAtTime(v, t + dur * 0.75);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);
        o.start(t);
        o.stop(t + dur + 1.3);
      }),
    );
  }
  function noise(d, t, dur, v, freq, type = "lowpass", q = 1, freq2) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    s.connect(f);
    f.connect(g);
    g.connect(d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.01, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.start(t, Math.random() * 0.4);
    s.stop(t + dur + 0.05);
  }
  function drum(d, t, v = 0.6, hi = 140, lo = 50) {
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(hi, t);
    o.frequency.exponentialRampToValueAtTime(lo, t + 0.18);
    o.connect(g);
    g.connect(d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.start(t);
    o.stop(t + 0.45);
    noise(d, t, 0.06, v * 0.22, 900, "bandpass");
  }
  function drone(d, notes, v) {
    return notes.map((m, i) => {
      const o = ctx.createOscillator(),
        f = ctx.createBiquadFilter(),
        g = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.value = mtof(m);
      o.detune.value = i * 4 - 2;
      f.type = "lowpass";
      f.frequency.value = 620;
      f.Q.value = 2;
      o.connect(f);
      f.connect(g);
      g.connect(d);
      g.gain.value = v;
      o.start();
      return o;
    });
  }
  function mel(d, t, b, bar, tr, v) {
    let off = 0;
    for (const [m, du] of bar) {
      if (m) whistle(d, t + off * b, m + tr, du * b * 0.92, v);
      off += du;
    }
  }
  const AEO = [62, 64, 65, 67, 69, 70, 72, 74, 76, 77],
    LYD = [74, 76, 78, 80, 81, 83, 85, 86, 88, 90, 92, 93];
  const TEMA_MEL = [
    [
      [69, 2],
      [67, 1],
    ],
    [
      [65, 1],
      [64, 1],
      [62, 1],
    ],
    [
      [64, 2],
      [65, 1],
    ],
    [[67, 3]],
    [
      [69, 1],
      [72, 1],
      [71, 1],
    ],
    [
      [69, 1],
      [67, 1],
      [65, 1],
    ],
    [
      [64, 1.5],
      [62, 0.5],
      [64, 1],
    ],
    [[62, 3]],
  ];
  const TEMA_CH = [
    [50, 57, 62, 65, 69],
    [48, 55, 60, 64, 67],
    [50, 57, 62, 65, 69],
    [45, 52, 57, 60, 64],
    [50, 57, 62, 65, 69],
    [41, 53, 57, 60, 65],
    [48, 55, 60, 64, 67],
    [50, 57, 62, 65, 69],
  ];
  const BRAV_MEL = [
    [
      [62, 1],
      [66, 0.5],
      [69, 0.5],
      [71, 1],
      [69, 1],
    ],
    [
      [67, 0.5],
      [66, 0.5],
      [64, 1],
      [62, 2],
    ],
    [
      [62, 1],
      [66, 0.5],
      [69, 0.5],
      [74, 1.5],
      [72, 0.5],
    ],
    [
      [71, 1],
      [69, 1],
      [67, 1],
      [69, 1],
    ],
    [
      [74, 1],
      [72, 0.5],
      [71, 0.5],
      [69, 1],
      [66, 1],
    ],
    [
      [67, 1],
      [69, 0.5],
      [67, 0.5],
      [66, 1],
      [64, 1],
    ],
    [
      [62, 0.5],
      [64, 0.5],
      [66, 1],
      [69, 1],
      [67, 0.5],
      [66, 0.5],
    ],
    [
      [64, 1],
      [60, 1],
      [62, 2],
    ],
  ];
  const BRAV_ROOT = [50, 43, 50, 43, 50, 43, 50, 48];
  const LAM_MEL = [
    [
      [74, 2],
      [72, 1],
      [70, 1],
    ],
    [
      [69, 3],
      [65, 1],
    ],
    [
      [67, 2],
      [65, 1],
      [64, 1],
    ],
    [[62, 4]],
    [
      [65, 2],
      [67, 1],
      [69, 1],
    ],
    [
      [70, 2],
      [69, 1],
      [67, 1],
    ],
    [
      [65, 1.5],
      [64, 0.5],
      [62, 1],
      [61, 1],
    ],
    [[62, 4]],
  ];
  const LAM_CH = [
    [50, 57, 62, 65],
    [50, 57, 62, 65],
    [43, 55, 58, 62],
    [50, 57, 62, 65],
    [46, 53, 58, 62],
    [43, 55, 58, 62],
    [45, 52, 57, 61],
    [50, 57, 62, 65],
  ];
  const SUS_CH = [
    [50, 57, 62, 65],
    [46, 53, 58, 62],
    [43, 55, 58, 62],
    [45, 52, 57, 61],
  ];
  const LOOPS = {
    tema: {
      bpm: 80,
      bpb: 3,
      drone: [38, 45],
      dv: 0.022,
      bar(i, t, b, d) {
        const ch = TEMA_CH[i % 8];
        harp(d, t, ch[0] - 12, 0.13, 2.6);
        [0, 2, 3, 4, 3, 2].forEach((k, j) =>
          harp(d, t + j * b * 0.5, ch[k] + (j === 3 ? 12 : 0), j ? 0.06 : 0.09, 1.5),
        );
        if (Math.floor(i / 8) % 2 === 1) mel(d, t, b, TEMA_MEL[i % 8], 12, 0.09);
      },
    },
    suspense: {
      bpm: 56,
      bpb: 4,
      drone: [38],
      dv: 0.03,
      bar(i, t, b, d) {
        if (i % 2 === 0) pad(d, t, SUS_CH[((i / 2) | 0) % 4], b * 8, 0.03);
        drum(d, t, 0.42, 85, 38);
        drum(d, t + b * 0.42, 0.28, 78, 36);
        for (let k = 0; k < 4; k++)
          if (Math.random() < 0.32)
            harp(
              d,
              t + k * b + (Math.random() < 0.5 ? b * 0.5 : 0),
              pick(AEO) + (Math.random() < 0.4 ? 12 : 0),
              0.055,
              2.4,
            );
        if (i % 4 === 3 && Math.random() < 0.7) whistle(d, t + b, pick([74, 77, 70, 72]), b * 2.6, 0.05);
      },
    },
    bravura: {
      bpm: 112,
      bpb: 4,
      drone: [38, 45],
      dv: 0.03,
      bar(i, t, b, d) {
        const k = i % 8,
          cyc = Math.floor(i / 8) % 3;
        if (cyc < 2) mel(d, t, b, BRAV_MEL[k], 12, 0.11);
        else {
          let off = 0;
          for (const [m, du] of BRAV_MEL[k]) {
            harp(d, t + off * b, m + 12, 0.1, 0.9);
            off += du;
          }
        }
        [
          [0, 1],
          [1.5, 0.5],
          [2, 0.8],
          [3, 0.7],
          [3.5, 0.5],
        ].forEach(([p, v]) => drum(d, t + p * b, 0.5 * v, 150, 55));
        const r = BRAV_ROOT[k];
        [0, 2].forEach((p) => {
          harp(d, t + p * b, r, 0.11, 1.1);
          harp(d, t + p * b + 0.02, r + 7, 0.07, 1.1);
          harp(d, t + p * b + 0.04, r + 12, 0.07, 1.1);
        });
      },
    },
    mistico: {
      bpm: 50,
      bpb: 4,
      drone: [50],
      dv: 0.012,
      bar(i, t, b, d) {
        if (i % 2 === 0)
          pad(d, t, i % 4 === 0 ? [62, 66, 69, 74, 76] : [64, 68, 71, 76, 78], b * 8, 0.022, "sine", 2400);
        const st = 6 + Math.floor(Math.random() * 6);
        for (let k = 0; k < 5; k++) harp(d, t + b * (1 + k * 0.33), LYD[Math.max(0, st - k)], 0.05, 3);
      },
    },
    lamento: {
      bpm: 52,
      bpb: 4,
      drone: [38, 45],
      dv: 0.025,
      bar(i, t, b, d) {
        pad(d, t, LAM_CH[i % 8], b * 4, 0.026);
        mel(d, t, b, LAM_MEL[i % 8], 12, 0.08);
        if (i % 2 === 0) drum(d, t, 0.28, 70, 34);
      },
    },
  };
  function startLoop(name) {
    const L = LOOPS[name];
    if (!L) return;
    const now = ctx.currentTime,
      g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(1, now + 1.6);
    g.connect(music);
    const dr = drone(g, L.drone, L.dv);
    const st = { name, g, dr, bar: 0, next: now + 0.15 };
    st.timer = setInterval(() => {
      const b = 60 / L.bpm;
      while (st.next < ctx.currentTime + 0.4) {
        try {
          L.bar(st.bar, st.next, b, g);
        } catch (e) {}
        st.next += L.bpb * b;
        st.bar++;
      }
    }, 60);
    cur = st;
  }
  function stopLoop() {
    if (!cur) return;
    const st = cur;
    cur = null;
    clearInterval(st.timer);
    const now = ctx.currentTime;
    st.g.gain.cancelScheduledValues(now);
    st.g.gain.setValueAtTime(Math.max(0.0001, st.g.gain.value), now);
    st.g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    setTimeout(() => {
      st.dr.forEach((o) => {
        try {
          o.stop();
        } catch (e) {}
      });
      try {
        st.g.disconnect();
      } catch (e) {}
    }, 2200);
  }
  const live = () => ctx && ctx.state === "running";
  function mood(name) {
    wanted = name;
    if (!live() || !pref.music) return;
    if (cur && cur.name === name) return;
    stopLoop();
    startLoop(name);
  }
  function duck() {
    if (!pref.music) return;
    const now = ctx.currentTime;
    music.gain.cancelScheduledValues(now);
    music.gain.setValueAtTime(music.gain.value, now);
    music.gain.linearRampToValueAtTime(0.2, now + 0.05);
    music.gain.linearRampToValueAtTime(0.5, now + 1.8);
  }
  let lastSting = 0;
  function sting(name) {
    if (!live() || !pref.sfx) return;
    const t = ctx.currentTime + 0.02,
      d = sfx;
    if (name === "moeda" && performance.now() - lastSting < 700) return;
    if (["sucesso", "infortunio", "vitoria", "derrota"].includes(name)) {
      duck();
      lastSting = performance.now();
    }
    switch (name) {
      case "sucesso":
        [62, 66, 69, 74].forEach((m, i) => harp(d, t + i * 0.07, m + 12, 0.13, 1.6));
        whistle(d, t + 0.32, 81, 0.55, 0.1);
        break;
      case "infortunio":
        [69, 65, 62, 61].forEach((m, i) => harp(d, t + i * 0.15, m, 0.14, 1.9));
        drum(d, t + 0.6, 0.5, 80, 34);
        break;
      case "vitoria":
        drum(d, t, 0.55);
        drum(d, t + 0.14, 0.45);
        drum(d, t + 0.28, 0.7);
        [62, 66, 69, 74].forEach((m, i) => whistle(d, t + 0.45 + i * 0.16, m + 12, i === 3 ? 1 : 0.15, 0.13));
        pad(d, t + 0.45, [50, 57, 62, 66, 69], 1.5, 0.035);
        break;
      case "derrota":
        drum(d, t, 0.6, 70, 30);
        pad(d, t, [38, 50, 53, 57], 2.4, 0.045);
        [74, 72, 70].forEach((m, i) => whistle(d, t + 0.3 + i * 0.6, m, i === 2 ? 1.3 : 0.55, 0.08));
        break;
      case "dado":
        for (let i = 0; i < 4; i++)
          noise(
            d,
            t + i * 0.055 + Math.random() * 0.02,
            0.045,
            0.35,
            2400 + Math.random() * 2200,
            "bandpass",
            4,
          );
        break;
      case "golpe":
        noise(d, t, 0.12, 0.55, 1300);
        drum(d, t, 0.55, 110, 45);
        noise(d, t, 0.3, 0.12, 5200, "highpass");
        break;
      case "ferido":
        drum(d, t, 0.85, 90, 30);
        noise(d, t, 0.22, 0.4, 600);
        break;
      case "erro":
        noise(d, t, 0.3, 0.22, 450, "bandpass", 2, 2600);
        break;
      case "magia":
        [81, 86, 88, 93, 98].forEach((m, i) => harp(d, t + i * 0.06, m, 0.08, 2.2));
        pad(d, t, [74, 81, 86], 1.2, 0.03, "sine", 3000);
        break;
      case "moeda":
        harp(d, t, 88, 0.09, 0.6);
        harp(d, t + 0.09, 93, 0.09, 0.9);
        break;
    }
  }
  function unlock() {
    if (!init()) return;
    if (ctx.state !== "running")
      ctx
        .resume()
        .then(() => {
          if (pref.music && (!cur || cur.name !== wanted)) {
            stopLoop();
            startLoop(wanted);
          }
        })
        .catch(() => {});
    else if (pref.music && !cur) startLoop(wanted);
  }
  function setMusic(on) {
    pref.music = on;
    savePref();
    if (!ctx) return;
    music.gain.cancelScheduledValues(ctx.currentTime);
    music.gain.setValueAtTime(on ? 0.5 : 0, ctx.currentTime);
    if (on) {
      if (!cur && live()) startLoop(wanted);
    } else stopLoop();
  }
  function setSfx(on) {
    pref.sfx = on;
    savePref();
    if (ctx) sfx.gain.setValueAtTime(on ? 0.7 : 0, ctx.currentTime);
  }
  let lastGust = 0;
  function gust(strong) {
    if (!live() || !pref.sfx) return;
    const n = performance.now();
    if (!strong && n - lastGust < 500) return;
    lastGust = n;
    const t = ctx.currentTime;
    noise(sfx, t, strong ? 1.7 : 1.3, strong ? 0.32 : 0.15, 320, "bandpass", 0.9, strong ? 1500 : 950);
    noise(sfx, t + 0.1, strong ? 1.4 : 1, strong ? 0.12 : 0.06, 2500, "highpass", 0.5);
  }
  return { unlock, mood, sting, setMusic, setSfx, pref, gust };
})();

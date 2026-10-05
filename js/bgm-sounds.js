'use strict';

// ============================================================
//  BGM の音づくり
//  ・雨・川・焚き火・虫の声・波しぶき：雨粒や泡、パチッという音を何千〜何万個も
//    24 秒ぶんのバッファに書き出し、つなぎ目なくループさせる。
//    （雨粒の「ポツ」は、ピッチが少し上がりながら消える小さな泡の音。ノイズではない）
//  ・波・森・風鈴・ピアノ・ローファイ：その場で少しずつ鳴らす
// ============================================================

const rand = (a, b) => a + Math.random() * (b - a);
const expRand = (a, b) => a * Math.pow(b / a, Math.random()); // 低い音も高い音も同じくらい出す
const LOOP_SEC = 24;
const renderedLoops = {};

// ---------- 書き出し用の道具 ----------

function makeTrack(seconds = LOOP_SEC) {
  const sr = actx().sampleRate;
  const n = Math.floor(sr * seconds);
  return { sr, n, L: new Float32Array(n), R: new Float32Array(n) };
}

const panGains = (p) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)];
const atSec = (o, sec) => Math.floor(sec * o.sr) % o.n;
const randAt = (o) => Math.floor(Math.random() * o.n);

// サイン波は表を引いて速くする（何万個も書くので）
const SIN_SIZE = 4096;
const SIN = new Float32Array(SIN_SIZE + 1).map((_, i) => Math.sin((2 * Math.PI * i) / SIN_SIZE));

// 泡の音：ピッチが少し上がりながら消えるサイン波（雨粒・せせらぎ）
function writeBubble(o, at, f0, tau, amp, p = 0, rise = 0.8) {
  const len = Math.floor(tau * 5 * o.sr);
  const [gl, gr] = panGains(p);
  const decay = Math.exp(-1 / (tau * o.sr));
  const inc0 = f0 / o.sr;
  const incStep = (inc0 * rise) / len;
  let phase = Math.random();
  let env = amp;
  for (let i = 0; i < len; i++) {
    phase += inc0 + incStep * i;
    phase -= Math.floor(phase);
    const v = SIN[(phase * SIN_SIZE) | 0] * env * (i < 6 ? i / 6 : 1);
    env *= decay;
    const k = (at + i) % o.n;
    o.L[k] += v * gl;
    o.R[k] += v * gr;
  }
}

// はじける音：高い成分だけの、ごく短いザッ（焚き火のパチッ・雨が当たる音）
function writeClick(o, at, amp, p = 0, decay = 0.0005) {
  const len = Math.max(4, Math.floor(decay * 7 * o.sr));
  const [gl, gr] = panGains(p);
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    const v = (w - prev) * 0.5 * Math.exp(-i / o.sr / decay) * amp;
    prev = w;
    const k = (at + i) % o.n;
    o.L[k] += v * gl;
    o.R[k] += v * gr;
  }
}

// 一定の高さの音（虫の声）。am を入れると細かくふるえる
function writeTone(o, at, f, dur, amp, p = 0, { attack = 0.004, release = 0.01, am = 0, amDepth = 0 } = {}) {
  const len = Math.floor(dur * o.sr);
  const [gl, gr] = panGains(p);
  const inc = f / o.sr;
  const incAm = am / o.sr;
  for (let i = 0; i < len; i++) {
    const t = i / o.sr;
    const env = Math.min(1, t / attack) * Math.min(1, (dur - t) / release);
    const trem = am ? 1 - amDepth * 0.5 * (1 + SIN[((incAm * i) % 1 * SIN_SIZE) | 0]) : 1;
    const v = SIN[((inc * i) % 1 * SIN_SIZE) | 0] * env * trem * amp;
    const k = (at + i) % o.n;
    o.L[k] += v * gl;
    o.R[k] += v * gr;
  }
}

// 配列にフィルター（RBJ のバイカッド）。先に終わりの部分でならして、ループのつなぎ目を自然にする
function filterArr(arr, type, f, q, sr) {
  const w = (2 * Math.PI * f) / sr;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (type === 'lowpass') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2; }
  else if (type === 'highpass') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; }
  else { b0 = alpha; b1 = 0; b2 = -alpha; }
  const a0 = 1 + alpha;
  const B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0, A1 = (-2 * cos) / a0, A2 = (1 - alpha) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const n = arr.length;
  for (let i = n - Math.min(n, 8192); i < n; i++) {
    const x = arr[i];
    const y = B0 * x + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
  }
  for (let i = 0; i < n; i++) {
    const x = arr[i];
    const y = B0 * x + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    arr[i] = y;
  }
}

// 下地のザーッ。mods は [ループ中の周期数, 深さ, 位相]（周期数が整数なのでつなぎ目でずれない）
function writeBed(o, { filters = [], level = 0.05, mods = [] }) {
  for (const ch of [o.L, o.R]) {
    const a = new Float32Array(o.n);
    for (let i = 0; i < o.n; i++) a[i] = Math.random() * 2 - 1;
    for (const [type, f, q = 0.7] of filters) filterArr(a, type, f, q, o.sr);
    for (let i = 0; i < o.n; i++) {
      let m = 1;
      for (const [cycles, depth, ph] of mods) m += depth * Math.sin((2 * Math.PI * cycles * i) / o.n + ph);
      ch[i] += a[i] * level * m;
    }
  }
}

// 全体の耳ざわりな高音を落とす
function lowpassTrack(o, f) {
  filterArr(o.L, 'lowpass', f, 0.7, o.sr);
  filterArr(o.R, 'lowpass', f, 0.7, o.sr);
}

// 音量をそろえて（RMS）、大きすぎる粒はやわらかく抑える
function finishTrack(o, rms = 0.12) {
  let sum = 0;
  for (let i = 0; i < o.n; i++) sum += o.L[i] * o.L[i] + o.R[i] * o.R[i];
  const g = rms / Math.max(1e-6, Math.sqrt(sum / (2 * o.n)));
  for (const ch of [o.L, o.R]) for (let i = 0; i < o.n; i++) ch[i] = Math.tanh(ch[i] * g);
  const buf = actx().createBuffer(2, o.n, o.sr);
  buf.copyToChannel(o.L, 0);
  buf.copyToChannel(o.R, 1);
  return buf;
}

function rendered(id, make) {
  if (!renderedLoops[id]) renderedLoops[id] = finishTrack(make(), id === 'insects' ? 0.06 : 0.12);
  return renderedLoops[id];
}

function playLoop(life, buf, level = 1, nodes = []) {
  const src = actx().createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const g = amp(level);
  chain(src, ...nodes, g, life.dest);
  src.start(0, Math.random() * buf.duration);
  life.add(src);
  return g;
}

// ---------- 書き出す音 ----------

function makeRain() {
  const o = makeTrack();
  // 遠くで降っているザー（高めの音だけ）
  writeBed(o, { filters: [['highpass', 900], ['lowpass', 7000]], level: 0.05, mods: [[3, 0.25, 0], [7, 0.12, 1.3]] });
  // 雨粒：小さな泡の音をたくさん
  for (let i = 0; i < LOOP_SEC * 260; i++) {
    writeBubble(o, randAt(o), expRand(1500, 5500), rand(0.0012, 0.0045), 0.008 + 0.06 * Math.pow(Math.random(), 3), rand(-0.9, 0.9), rand(0.4, 1.4));
  }
  // 地面や葉に当たるパチパチ
  for (let i = 0; i < LOOP_SEC * 160; i++) {
    writeClick(o, randAt(o), 0.01 + 0.05 * Math.pow(Math.random(), 2), rand(-1, 1), rand(0.0002, 0.0008));
  }
  // 軒先から落ちる近くのしずく
  for (let i = 0; i < LOOP_SEC * 0.9; i++) {
    writeBubble(o, randAt(o), expRand(650, 1400), rand(0.012, 0.03), rand(0.08, 0.18), rand(-0.7, 0.7), 0.9);
  }
  lowpassTrack(o, 9000);
  return o;
}

function makeStream() {
  const o = makeTrack();
  writeBed(o, { filters: [['bandpass', 900, 0.5]], level: 0.05, mods: [[4, 0.2, 0], [9, 0.15, 2]] });
  // せせらぎは、低めの泡がたくさん
  for (let i = 0; i < LOOP_SEC * 300; i++) {
    writeBubble(o, randAt(o), expRand(280, 1700), rand(0.004, 0.016), 0.012 + 0.07 * Math.pow(Math.random(), 2.5), rand(-0.8, 0.8), rand(0.6, 2));
  }
  // ときどきゴボッ
  for (let i = 0; i < LOOP_SEC * 5; i++) {
    writeBubble(o, randAt(o), expRand(150, 300), rand(0.02, 0.035), rand(0.06, 0.12), rand(-0.5, 0.5), 1.5);
  }
  return o;
}

function makeFire() {
  const o = makeTrack();
  // ゴーという低い燃える音（小さめ）と、細かいシュー
  writeBed(o, { filters: [['lowpass', 250]], level: 0.07, mods: [[2, 0.3, 0], [5, 0.2, 1]] });
  writeBed(o, { filters: [['bandpass', 3200, 0.8]], level: 0.012, mods: [[11, 0.5, 0], [17, 0.4, 2]] });
  // パチパチ：いくつかまとまってはじける
  for (let c = 0; c < LOOP_SEC * 9; c++) {
    const at = randAt(o);
    const p = rand(-0.7, 0.7);
    const count = 1 + Math.floor(Math.pow(Math.random(), 2) * 8);
    let t = at;
    for (let j = 0; j < count; j++) {
      writeClick(o, t, rand(0.15, 0.9) * (j ? 0.7 : 1), p, rand(0.0002, 0.0015));
      writeBubble(o, t, expRand(1800, 6000), 0.0006, rand(0.05, 0.2), p, 0); // 木がはじける「カッ」
      t += Math.floor(rand(0.002, 0.03) * o.sr);
    }
  }
  // 小さなはぜる音
  for (let i = 0; i < LOOP_SEC * 60; i++) writeClick(o, randAt(o), rand(0.02, 0.06), rand(-0.8, 0.8), rand(0.0002, 0.0006));
  // ときどきポンとはじける
  for (let i = 0; i < LOOP_SEC * 0.5; i++) {
    const at = randAt(o);
    const p = rand(-0.5, 0.5);
    writeBubble(o, at, expRand(140, 380), 0.02, 0.35, p, -0.4);
    writeClick(o, at, 0.6, p, 0.002);
  }
  lowpassTrack(o, 5500);
  return o;
}

function makeInsects() {
  const o = makeTrack();
  writeBed(o, { filters: [['lowpass', 1200]], level: 0.004 });
  // 鈴虫：リーーン（細かくふるえる高い音）
  for (let b = 0; b < 4; b++) {
    const f = rand(4300, 4800);
    const a = rand(0.04, 0.18);
    const p = rand(-0.8, 0.8);
    const period = rand(1.1, 2.4);
    const dur = rand(0.35, 0.8);
    const am = rand(45, 60);
    for (let t = rand(0, period); t < LOOP_SEC; t += period * rand(0.85, 1.15)) {
      writeTone(o, atSec(o, t), f * rand(0.995, 1.005), dur, a, p, { am, amDepth: 0.6, attack: 0.02, release: 0.08 });
    }
  }
  // コオロギ：コロコロ（短い音が 3〜5 回）
  for (let b = 0; b < 3; b++) {
    const f = rand(3600, 4200);
    const a = rand(0.03, 0.12);
    const p = rand(-0.9, 0.9);
    const period = rand(0.5, 0.9);
    for (let t = rand(0, period); t < LOOP_SEC; t += period * rand(0.9, 1.1)) {
      const pulses = 3 + Math.floor(Math.random() * 3);
      for (let k = 0; k < pulses; k++) writeTone(o, atSec(o, t + k * 0.03), f, 0.016, a, p, { attack: 0.002, release: 0.006 });
    }
  }
  return o;
}

// 波が砕けたあとのシュワシュワ
function makeFoam() {
  const o = makeTrack();
  writeBed(o, { filters: [['highpass', 2500]], level: 0.03 });
  for (let i = 0; i < LOOP_SEC * 900; i++) writeClick(o, randAt(o), rand(0.005, 0.04), rand(-1, 1), rand(0.0001, 0.0004));
  for (let i = 0; i < LOOP_SEC * 400; i++) writeBubble(o, randAt(o), expRand(3000, 9000), 0.0008, rand(0.01, 0.03), rand(-1, 1), 0.5);
  return o;
}

// ---------- その場で鳴らす音の部品 ----------

// 鳥の声：高さが動いて、少しビブラートがかかる
function bird(dest, at, f0, f1, dur, peak, p = 0, [vibRate, vibDepth] = [0, 0]) {
  const ctx = actx();
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(f0, at);
  o.frequency.exponentialRampToValueAtTime(f1, at + dur);
  if (vibRate) {
    const v = ctx.createOscillator();
    v.frequency.value = vibRate;
    const d = amp(vibDepth);
    v.connect(d).connect(o.frequency);
    v.start(at);
    v.stop(at + dur + 0.05);
  }
  const g = amp(0);
  chain(o, g, pan(p), dest);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + Math.min(0.02, dur / 4));
  g.gain.setValueAtTime(peak, at + dur * 0.7);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.start(at);
  o.stop(at + dur + 0.05);
}

// ピアノの音：倍音と、ハンマーが当たる小さな音
function pianoNote(dest, m, at, vel, len = 3.5) {
  const f = midi(m);
  const p = clamp((m - 62) / 28, -0.7, 0.7);
  const out = pan(p);
  out.connect(dest);
  for (const [h, a] of [[1, 1], [2, 0.42], [3, 0.2], [4, 0.09], [5, 0.05], [6, 0.03]]) {
    const ctx = actx();
    const o = ctx.createOscillator();
    o.frequency.value = f * h * (1 + 0.0004 * h * h); // 高い倍音ほど少しずれる（本物のピアノの弦と同じ）
    o.detune.value = (Math.random() - 0.5) * 4;
    const g = amp(0);
    chain(o, g, out);
    const decay = len / (1 + (h - 1) * 0.7);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vel * a, at + 0.006);
    g.gain.exponentialRampToValueAtTime(vel * a * 0.35, at + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    o.start(at);
    o.stop(at + decay + 0.05);
  }
  burst(out, { at, dur: 0.02, peak: vel * 0.12, f: 2200, ftype: 'lowpass', attack: 0.001 });
}

// ---------- 音の作り方 ----------

const BGM_BUILDERS = {
  rain(life) {
    playLoop(life, rendered('rain', makeRain), 1);
  },

  stream(life) {
    playLoop(life, rendered('stream', makeStream), 1);
  },

  waves(life) {
    // 遠くのゴー
    loopNoise(life, 'brown', 0.08, [biquad('lowpass', 140)]);
    const foamBuf = rendered('foam', makeFoam);
    for (const side of [-0.6, 0.6]) {
      // 波が立ち上がるにつれて音が明るくなり、砕けたあとシュワシュワと引いていく
      const lp = biquad('lowpass', 400, 0.5);
      const surf = loopNoise(life, 'pink', 0.03, [lp], side);
      const foam = playLoop(life, foamBuf, 0, [pan(side * 0.8)]);
      life.loop(side < 0 ? 0 : 3200, () => {
        const t = actx().currentTime + 0.05;
        const cycle = rand(7, 12);
        const crest = t + cycle * 0.42;
        const peak = rand(0.55, 0.9);
        lp.frequency.cancelScheduledValues(t);
        lp.frequency.setValueAtTime(Math.max(200, lp.frequency.value), t);
        lp.frequency.exponentialRampToValueAtTime(rand(2600, 3600), crest);
        lp.frequency.exponentialRampToValueAtTime(350, t + cycle);
        const g = surf.gain;
        g.cancelScheduledValues(t);
        g.setValueAtTime(g.value, t);
        g.linearRampToValueAtTime(peak, crest);
        g.linearRampToValueAtTime(0.04, t + cycle);
        const fg = foam.gain;
        fg.cancelScheduledValues(t);
        fg.setValueAtTime(fg.value, t);
        fg.linearRampToValueAtTime(0, crest - 0.3);
        fg.linearRampToValueAtTime(peak * 0.6, crest + 0.4);
        fg.exponentialRampToValueAtTime(0.01, t + cycle * 0.97);
        return cycle;
      });
    }
  },

  fire(life) {
    playLoop(life, rendered('fire', makeFire), 1);
  },

  insects(life) {
    playLoop(life, rendered('insects', makeInsects), 1);
  },

  forest(life) {
    const d = life.dest;
    // そよ風と、遠くの小川
    const lp = biquad('lowpass', 380);
    const wind = loopNoise(life, 'pink', 0.1, [lp]);
    lfo(life, wind.gain, 0.05, 0.07);
    lfo(life, lp.frequency, 0.03, 150);
    playLoop(life, rendered('stream', makeStream), 0.22);
    // 鳥の声は少し響かせる
    const birds = amp(1);
    birds.connect(d);
    chain(birds, reverb(1.8, 3), amp(0.35), d);
    const species = [
      // スズメ：チュンチュン
      [0.35, (t, p) => {
        const n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) { bird(birds, t, rand(4000, 4600), rand(3000, 3400), 0.06, 0.045, p); t += rand(0.12, 0.2); }
      }],
      // ヒバリのようなさえずり
      [0.35, (t, p) => {
        const n = 6 + Math.floor(Math.random() * 7);
        for (let i = 0; i < n; i++) {
          if (i % 2) bird(birds, t, rand(2400, 2800), rand(4000, 4600), 0.07, 0.035, p, [35, 250]);
          else bird(birds, t, rand(4400, 4900), rand(2700, 3100), 0.07, 0.035, p, [30, 200]);
          t += 0.085;
        }
      }],
      // ウグイス：ホーホケキョ
      [0.18, (t, p) => {
        bird(birds, t, 1380, 1500, 1.0, 0.05, p, [5, 8]);
        bird(birds, t + 1.12, 1900, 2350, 0.13, 0.05, p);
        bird(birds, t + 1.28, 2100, 2500, 0.12, 0.05, p);
        bird(birds, t + 1.45, 2700, 2150, 0.32, 0.055, p);
      }],
      // キジバト：デーデーポッポー（遠く）
      [0.12, (t, p) => {
        const dove = (s, f, len, v) => bird(birds, t + s, f, f * 0.95, len, v, p);
        dove(0, 560, 0.42, 0.025); dove(0.55, 520, 0.24, 0.022); dove(0.85, 520, 0.24, 0.022); dove(1.2, 560, 0.6, 0.025);
      }],
    ];
    life.every(2500, 6500, () => {
      let r = Math.random();
      const pick = species.find(([w]) => (r -= w) < 0) || species[0];
      pick[1](actx().currentTime + 0.05, rand(-0.8, 0.8));
    });
  },

  chime(life) {
    const d = life.dest;
    const lp = biquad('lowpass', 500);
    const breeze = loopNoise(life, 'pink', 0.08, [lp]);
    lfo(life, breeze.gain, 0.06, 0.05);
    const bus = amp(1);
    bus.connect(d);
    chain(bus, reverb(2.5, 2.5), amp(0.4), d);
    const notes = [1760, 1975, 2349, 2637, 2960];
    const strike = (at, f, v, p) => {
      for (const [h, a, len] of [[1, 1, 3.6], [2.76, 0.5, 2.2], [5.4, 0.25, 1.2], [8.93, 0.12, 0.6]]) {
        const ctx = actx();
        if (f * h > ctx.sampleRate * 0.45) continue;
        const o = ctx.createOscillator();
        o.frequency.value = f * h;
        const g = amp(0);
        chain(o, g, pan(p), bus);
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(v * a, at + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, at + len);
        o.start(at);
        o.stop(at + len + 0.05);
      }
    };
    life.every(1800, 6000, () => {
      const t = actx().currentTime + 0.05;
      const p = rand(-0.5, 0.5);
      const f = notes[Math.floor(Math.random() * notes.length)] * rand(0.99, 1.01);
      strike(t, f, rand(0.03, 0.06), p);
      if (Math.random() < 0.4) strike(t + rand(0.12, 0.3), notes[Math.floor(Math.random() * notes.length)], rand(0.02, 0.04), p + 0.1);
    });
  },

  piano(life) {
    const d = life.dest;
    const bus = amp(1);
    chain(bus, biquad('lowpass', 4200), amp(0.75), d);
    chain(bus, reverb(3.6, 2.2), amp(0.45), d);
    // ニ長調の、やわらかいコード進行（Dmaj7 → Bm7 → Gmaj7 → A6）
    const prog = [
      { bass: 50, notes: [62, 66, 69, 73], melody: [74, 76, 78, 81] },
      { bass: 47, notes: [59, 62, 66, 69], melody: [71, 74, 76, 78] },
      { bass: 43, notes: [55, 59, 62, 66], melody: [71, 74, 76, 79] },
      { bass: 45, notes: [57, 61, 64, 66], melody: [69, 73, 76, 78] },
    ];
    const step = 0.6; // 8 分音符
    let next = actx().currentTime + 0.2;
    let i = 0;
    life.interval(60, () => {
      while (next < actx().currentTime + 0.3) {
        const bar = prog[Math.floor(i / 8) % prog.length];
        const s = i % 8;
        if (s === 0) {
          pianoNote(bus, bar.bass, next, 0.11, 5);
          pianoNote(bus, bar.notes[0], next + 0.02, 0.05, 4);
        }
        // 分散和音：ときどき休む
        if (s > 0 && Math.random() < 0.7) {
          const m = bar.notes[(s + Math.floor(Math.random() * 2)) % bar.notes.length] + (Math.random() < 0.2 ? 12 : 0);
          pianoNote(bus, m, next + rand(0, 0.03), rand(0.045, 0.075));
        }
        // ときどきメロディ
        if ((s === 2 || s === 6) && Math.random() < 0.4) {
          pianoNote(bus, bar.melody[Math.floor(Math.random() * bar.melody.length)], next + 0.01, rand(0.06, 0.09), 4);
        }
        next += step;
        i++;
      }
    });
  },

  lofi(life) {
    const d = life.dest;
    const input = biquad('lowpass', 4200);
    input.connect(d);
    const bpm = 76;
    const beat = 60 / bpm;
    const chords = [
      { bass: 38, notes: [53, 57, 60, 64] }, // Dm9
      { bass: 43, notes: [53, 57, 59, 64] }, // G13
      { bass: 36, notes: [52, 55, 59, 62] }, // Cmaj9
      { bass: 45, notes: [55, 59, 60, 64] }, // Am9
    ];
    const keys = amp(0.9);
    keys.connect(input);
    lfo(life, keys.gain, 4.2, 0.22);
    loopNoise(life, 'pink', 0.012, [biquad('bandpass', 2000, 0.4)]);
    life.every(120, 900, () => burst(d, { dur: 0.003, peak: 0.05 + Math.random() * 0.06, f: 3000, ftype: 'highpass', attack: 0.0005 }));

    const kick = (t, v) => {
      const ctx = actx();
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(48, t + 0.1);
      const g = amp(0);
      chain(o, g, input);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      o.start(t);
      o.stop(t + 0.32);
    };
    const snare = (t) => {
      burst(input, { at: t, dur: 0.16, peak: 0.2, f: 2200, q: 0.8 });
      tone(input, { freq: 190, at: t, dur: 0.09, peak: 0.08, type: 'triangle', attack: 0.002 });
    };
    const hat = (t, v) => burst(input, { at: t, dur: 0.035, peak: v, f: 8000, ftype: 'highpass', attack: 0.001 });
    const rhodes = (notes, t, len) => {
      for (const m of notes) {
        const f = midi(m);
        for (const [type, mul, a] of [['sine', 1, 1], ['sine', 2, 0.18], ['triangle', 1, 0.15]]) {
          const ctx = actx();
          const o = ctx.createOscillator();
          o.type = type;
          o.frequency.value = f * mul;
          o.detune.value = (Math.random() - 0.5) * 8;
          const g = amp(0);
          chain(o, g, keys);
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.05 * a, t + 0.015);
          g.gain.exponentialRampToValueAtTime(0.014 * a, t + len * 0.8);
          g.gain.linearRampToValueAtTime(0, t + len);
          o.start(t);
          o.stop(t + len + 0.05);
        }
      }
    };
    const bassNote = (m, t, len) => tone(input, { freq: midi(m), at: t, dur: len, peak: 0.18, attack: 0.01 });
    // ゆったりしたメロディ（ペンタトニック）
    const melody = [74, 76, 77, 79, 81, 84];

    let next = actx().currentTime + 0.1;
    let step = 0;
    life.interval(40, () => {
      while (next < actx().currentTime + 0.25) {
        const c = chords[Math.floor(step / 16) % chords.length];
        const s = step % 16;
        const t = next + (s % 4 === 2 ? beat * 0.12 : 0);
        if (s === 0) { rhodes(c.notes, t, beat * 4); bassNote(c.bass, t, beat * 1.5); }
        if (s === 10) bassNote(c.bass + 7, t, beat * 0.9);
        if (s === 0 || s === 7 || s === 10) kick(t, s === 7 ? 0.45 : 0.65);
        if (s === 4 || s === 12) snare(t);
        if (s % 2 === 0) hat(t, s % 4 === 0 ? 0.04 : 0.025);
        if ((s === 3 || s === 9 || s === 14) && Math.random() < 0.35) {
          tone(keys, { freq: midi(melody[Math.floor(Math.random() * melody.length)]), at: t, dur: beat * rand(0.6, 1.4), peak: 0.05, type: 'triangle', attack: 0.02 });
        }
        next += beat / 4;
        step++;
      }
    });
  },

  brown(life) {
    loopNoise(life, 'brown', 0.7, [biquad('lowpass', 1200)]);
  },

  white(life) {
    loopNoise(life, 'white', 0.22, [biquad('lowpass', 9000)]);
  },
};

// 確認用：いま流れている音の「明るさ」（スペクトルの重心, Hz）
function bgmCentroid() {
  if (!bgm.analyser) return 0;
  const a = bgm.analyser;
  const data = new Float32Array(a.frequencyBinCount);
  a.getFloatFrequencyData(data);
  const hz = actx().sampleRate / a.fftSize;
  let num = 0;
  let den = 0;
  for (let i = 1; i < data.length; i++) {
    if (!Number.isFinite(data[i]) || data[i] < -120) continue;
    const mag = Math.pow(10, data[i] / 20);
    num += mag * i * hz;
    den += mag;
  }
  return den ? num / den : 0;
}

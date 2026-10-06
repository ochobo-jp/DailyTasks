'use strict';

// ============================================================
//  集中タイマーの BGM
//  自然の音・カフェ・電車・曲は本物の録音（bgm-recorded.js）、ブラウン / ホワイトノイズはその場で作る。
//  「重ねる」で、もう 1 つの音を小さく重ねられる（雨＋カフェ など）。
//  「マイ音楽」は自分の曲ファイルを順番に（またはシャッフルで）流す
// ============================================================

const BGM_SOUNDS = [
  { id: 'rain', icon: '🌧️', name: '雨音' },
  { id: 'stream', icon: '🏞️', name: '川のせせらぎ' },
  { id: 'waves', icon: '🌊', name: '波の音' },
  { id: 'fire', icon: '🔥', name: '焚き火' },
  { id: 'forest', icon: '🌲', name: '森の小鳥' },
  { id: 'insects', icon: '🦗', name: '虫の声' },
  { id: 'cafe', icon: '☕', name: 'カフェ' },
  { id: 'train', icon: '🚃', name: '電車の中' },
  { id: 'celtic', icon: '🍀', name: 'ケルト' },
  { id: 'lofi', icon: '🎧', name: 'ローファイ' },
  { id: 'brown', icon: '🟤', name: 'ブラウンノイズ' },
  { id: 'white', icon: '⚪', name: 'ホワイトノイズ' },
  { id: 'mine', icon: '📁', name: 'マイ音楽' },
];

// 音ごとの聞こえ方の差をならす
// （録音の音は bgm-recorded.js で自動的に大きさをそろえるので 1 のまま）
const SOUND_LEVEL = { brown: 0.8, white: 1.3 };

const bgm = {
  ctx: null,
  out: null,
  current: null,     // 鳴っている音 { id, life }
  layer: null,       // 重ねている音 { id, life }
  preview: false,    // BGM メニューを開いている間の試聴
  manual: false,     // タイマーと関係なく流している
  audio: null,       // マイ音楽の再生
  trackIndex: 0,
  errors: 0,
  fadeTimer: null,
  buffers: {},
};

const bgmSound = (id = prefs().bgm.sound) => BGM_SOUNDS.find((s) => s.id === id) || BGM_SOUNDS[0];

// ---------- 音の部品 ----------

function actx() {
  if (!bgm.ctx) {
    // iPhone：マナーモードでも BGM が聞こえるように（設定しないと消音スイッチで無音になる）
    if (navigator.audioSession) { try { navigator.audioSession.type = 'playback'; } catch { /* 無視 */ } }
    bgm.ctx = new AudioContext();
    bgm.out = bgm.ctx.createGain();
    bgm.out.gain.value = bgmVolume();
    // 急に大きな音が出ないように軽く抑える
    const comp = bgm.ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    bgm.out.connect(comp).connect(bgm.ctx.destination);
    // 確認用に、流れている音の明るさを測れるようにしておく
    bgm.analyser = bgm.ctx.createAnalyser();
    bgm.analyser.fftSize = 4096;
    bgm.out.connect(bgm.analyser);
  }
  if (bgm.ctx.state === 'suspended') bgm.ctx.resume();
  return bgm.ctx;
}

const bgmVolume = () => Math.pow(clamp(prefs().bgm.volume, 0, 1), 1.6);
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ノイズは一度作って使い回す。つなぎ目でプチッといわないよう、最後を最初になじませる
function noiseBuffer(type) {
  if (bgm.buffers[type]) return bgm.buffers[type];
  const ctx = actx();
  const rate = ctx.sampleRate;
  const len = rate * 6;
  const fadeLen = Math.floor(rate * 0.25);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'white') {
        d[i] = w * 0.4;
      } else if (type === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    for (let k = 0; k < fadeLen; k++) {
      const j = len - fadeLen + k;
      d[j] = d[j] * (1 - k / fadeLen) + d[k] * (k / fadeLen);
    }
  }
  buf.fadeLen = fadeLen;
  bgm.buffers[type] = buf;
  return buf;
}

function chain(...nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return nodes[nodes.length - 1];
}

function biquad(type, freq, q = 0.7) {
  const f = actx().createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function amp(v) {
  const g = actx().createGain();
  g.gain.value = v;
  return g;
}

function pan(v) {
  const p = actx().createStereoPanner();
  p.pan.value = clamp(v, -1, 1);
  return p;
}

// ずっと鳴り続けるノイズ
function loopNoise(life, type, level, filters = [], panValue = 0) {
  const ctx = actx();
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(type);
  src.loop = true;
  src.loopStart = src.buffer.fadeLen / ctx.sampleRate;
  src.loopEnd = src.buffer.duration;
  const g = amp(level);
  chain(src, ...filters, g, pan(panValue), life.dest);
  src.start(0, Math.random() * 3);
  life.add(src);
  return g;
}

// ゆっくり揺らす
function lfo(life, param, rate, depth) {
  const o = actx().createOscillator();
  o.frequency.value = rate;
  o.connect(amp(depth)).connect(param);
  o.start();
  life.add(o);
}

// 短いノイズ（雨粒・パチッという音など）
function burst(dest, { at = actx().currentTime, dur = 0.03, peak = 0.2, f = 3000, q = 1, ftype = 'bandpass', p = 0, attack = 0.002, type = 'white' } = {}) {
  const ctx = actx();
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(type);
  const g = amp(0);
  chain(src, biquad(ftype, f, q), g, pan(p), dest);
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.start(at, Math.random() * 5, dur + 0.05);
}

// 短い音（鳥の声・ベースなど）
function tone(dest, { freq, at, dur, peak = 0.08, type = 'sine', attack = 0.01, glideTo = null, p = 0, detune = 0 }) {
  const ctx = actx();
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, at + dur);
  o.detune.value = detune;
  const g = amp(0);
  chain(o, g, pan(p), dest);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.start(at);
  o.stop(at + dur + 0.05);
}

function reverb(seconds = 2.5, decay = 2.5) {
  const ctx = actx();
  const len = Math.floor(ctx.sampleRate * seconds);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  const c = ctx.createConvolver();
  c.buffer = ir;
  return c;
}

// 鳴らしている間の後片付けをまとめておく
function makeLife(dest) {
  const timers = [];
  const sources = [];
  return {
    dest,
    alive: true,
    add(src) { sources.push(src); },
    // min〜max ミリ秒おきに fn を呼ぶ
    every(min, max, fn) {
      const h = { id: 0 };
      const loop = () => {
        if (!this.alive) return;
        fn();
        h.id = setTimeout(loop, min + Math.random() * (max - min));
      };
      h.id = setTimeout(loop, Math.random() * min);
      timers.push(() => clearTimeout(h.id));
    },
    // fn が返した秒数のあとに、また fn を呼ぶ
    loop(delayMs, fn) {
      const h = { id: 0 };
      const run = () => {
        if (!this.alive) return;
        h.id = setTimeout(run, Math.max(0.5, fn()) * 1000);
      };
      h.id = setTimeout(run, delayMs);
      timers.push(() => clearTimeout(h.id));
    },
    interval(ms, fn) {
      const id = setInterval(() => { if (this.alive) fn(); }, ms);
      timers.push(() => clearInterval(id));
    },
    stop() {
      this.alive = false;
      timers.forEach((f) => f());
      sources.forEach((s) => { try { s.stop(); } catch { /* もう止まっている */ } });
      setTimeout(() => dest.disconnect(), 80);
    },
  };
}

// ---------- 再生の切り替え ----------

// 重ねる音の大きさ（メインの音に対して）
const LAYER_LEVEL = 0.45;

function startGenerated(id, slot = 'current') {
  const ctx = actx();
  const dest = amp(0);
  dest.connect(bgm.out);
  const t = ctx.currentTime;
  dest.gain.setValueAtTime(0, t);
  dest.gain.linearRampToValueAtTime((SOUND_LEVEL[id] ?? 1) * (slot === 'layer' ? LAYER_LEVEL : 1), t + 1.8);
  const life = makeLife(dest);
  BGM_BUILDERS[id](life);
  bgm[slot] = { id, life };
}

function stopGenerated(fade = 1, slot = 'current') {
  const cur = bgm[slot];
  if (!cur) return;
  bgm[slot] = null;
  const ctx = actx();
  const g = cur.life.dest.gain;
  const t = ctx.currentTime;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(0, t + fade);
  setTimeout(() => cur.life.stop(), fade * 1000 + 120);
}

// ---------- マイ音楽 ----------

function musicEl() {
  if (bgm.audio) return bgm.audio;
  const a = new Audio();
  a.preload = 'auto';
  a.volume = 0;
  a.addEventListener('ended', () => nextTrack());
  a.addEventListener('playing', () => { bgm.errors = 0; });
  a.addEventListener('error', () => {
    if (!a.getAttribute('src')) return;
    bgm.errors++;
    // 全部再生できないときは止める
    if (bgm.errors >= prefs().bgm.tracks.length) {
      toast('マイ音楽の曲を再生できませんでした');
      bgm.manual = false;
      fadeMusic(0, () => a.pause());
      return;
    }
    nextTrack();
  });
  bgm.audio = a;
  return a;
}

function loadTrack(i) {
  const tracks = prefs().bgm.tracks;
  if (!tracks.length) return null;
  bgm.trackIndex = ((i % tracks.length) + tracks.length) % tracks.length;
  const t = tracks[bgm.trackIndex];
  const a = musicEl();
  a.src = t.url;
  return t;
}

function nextTrack() {
  const tracks = prefs().bgm.tracks;
  if (!tracks.length) return;
  const i = prefs().bgm.shuffle && tracks.length > 1
    ? (bgm.trackIndex + 1 + Math.floor(Math.random() * (tracks.length - 1))) % tracks.length
    : bgm.trackIndex + 1;
  loadTrack(i);
  if (bgmWanted()) musicEl().play().catch(() => {});
  renderBgmChips();
}

function fadeMusic(target, done) {
  const a = musicEl();
  clearInterval(bgm.fadeTimer);
  bgm.fadeTimer = setInterval(() => {
    const diff = target - a.volume;
    if (Math.abs(diff) <= 0.04) {
      a.volume = clamp(target, 0, 1);
      clearInterval(bgm.fadeTimer);
      if (done) done();
    } else {
      a.volume = clamp(a.volume + Math.sign(diff) * 0.04, 0, 1);
    }
  }, 50);
}

function syncMusic(want) {
  const a = musicEl();
  if (!want || !prefs().bgm.tracks.length) {
    if (!a.paused) fadeMusic(0, () => a.pause());
    return;
  }
  const tracks = prefs().bgm.tracks;
  if (!a.getAttribute('src') || !tracks.some((t) => t.url === a.src)) loadTrack(bgm.trackIndex);
  a.play().catch(() => {});
  fadeMusic(Math.min(1, bgmVolume() * 1.2));
}

// ---------- 全体 ----------

// 流すとき：試聴中・「今すぐ流す」中・タイマーで集中しているとき（休憩中も流す設定ならその間も）
function bgmWanted() {
  const b = prefs().bgm;
  if (bgm.preview || bgm.manual) return true;
  return b.on && timer.running && (timer.mode === 'focus' || b.duringBreak);
}

const bgmPlaying = () => (prefs().bgm.sound === 'mine' ? !!bgm.audio && !bgm.audio.paused : !!bgm.current);

function bgmSync() {
  const want = bgmWanted();
  const id = prefs().bgm.sound;
  if (id === 'mine') {
    stopGenerated(0.8);
    if (want && !prefs().bgm.tracks.length) {
      if (!bgm.preview) toast('マイ音楽に曲を追加してください');
      syncMusic(false);
    } else {
      syncMusic(want);
    }
  } else {
    if (bgm.audio) syncMusic(false);
    if (!want) stopGenerated(1.2);
    else if (!bgm.current || bgm.current.id !== id) {
      stopGenerated(0.8);
      startGenerated(id);
    }
  }
  // 重ねる音（マイ音楽にも重ねられる）
  const layer = bgmLayerId();
  if (!want || !layer) stopGenerated(1.2, 'layer');
  else if (!bgm.layer || bgm.layer.id !== layer) {
    stopGenerated(0.8, 'layer');
    startGenerated(layer, 'layer');
  }
  renderBgmChips();
}

// 重ねる音：メインと同じ音・マイ音楽・もうない音は重ねない
function bgmLayerId() {
  const b = prefs().bgm;
  const id = b.layer;
  if (!id || id === b.sound || id === 'mine' || !BGM_BUILDERS[id]) return null;
  return id;
}

function bgmSetVolume(v) {
  prefs().bgm.volume = clamp(v, 0, 1);
  if (bgm.ctx) {
    const t = bgm.ctx.currentTime;
    bgm.out.gain.cancelScheduledValues(t);
    bgm.out.gain.setTargetAtTime(bgmVolume(), t, 0.05);
  }
  if (bgm.audio && !bgm.audio.paused) {
    clearInterval(bgm.fadeTimer);
    bgm.audio.volume = Math.min(1, bgmVolume() * 1.2);
  }
}

// タイマーのカードなどに出す小さな BGM ボタン
function bgmChip() {
  const b = prefs().bgm;
  const s = bgmSound();
  const playing = bgmPlaying();
  const lay = bgmLayerId();
  const label = b.on || bgm.manual ? `${s.icon} ${s.name}${lay ? ` ＋ ${bgmSound(lay).icon}` : ''}` : 'BGM オフ';
  return `<button class="bgm-chip ${b.on || bgm.manual ? 'on' : ''} ${playing ? 'playing' : ''}" data-act="bgm-menu" title="BGM を選ぶ">
    <span class="eq" aria-hidden="true"><i></i><i></i><i></i></span><span class="bgm-label">${label}</span><span class="bgm-caret">▾</span></button>`;
}

function renderBgmChips() {
  $$('.bgm-chip').forEach((el) => { el.outerHTML = bgmChip(); });
}

function bgmMenuHtml() {
  const b = prefs().bgm;
  const tracks = b.tracks;
  const cur = tracks[bgm.trackIndex];
  const check = (on) => (on ? ICON.check : '<i class="menu-ic"></i>');
  return `
    <div class="menu-title">🎵 集中するときの BGM</div>
    <div class="bgm-grid">
      ${BGM_SOUNDS.map((s) => `<button class="bgm-tile ${b.sound === s.id ? 'on' : ''}" data-m="sound" data-v="${s.id}"><span>${s.icon}</span><small>${s.name}</small></button>`).join('')}
    </div>
    <div class="menu-row bgm-layer-row"><span>重ねる</span><div class="menu-chips">
      <button class="menu-chip ${bgmLayerId() ? '' : 'on'}" data-m="layer" data-v="">なし</button>
      ${BGM_SOUNDS.filter((s) => s.id !== 'mine' && s.id !== b.sound).map((s) => `<button class="menu-chip ${bgmLayerId() === s.id ? 'on' : ''}" data-m="layer" data-v="${s.id}" title="${s.name}を小さく重ねる">${s.icon}</button>`).join('')}
    </div></div>
    <div class="menu-row bgm-vol-row"><span>音量</span><input type="range" class="range bgm-vol" min="0" max="100" value="${Math.round(b.volume * 100)}"></div>
    ${b.sound === 'mine' ? `
      <div class="bgm-tracks">${tracks.length ? `${tracks.length} 曲${cur ? `・いま：${escapeHtml(cur.name)}` : ''}` : 'まだ曲がありません'}</div>
      <button class="menu-item" data-m="pick-files">${ICON.plus}<span>曲を追加…</span></button>
      ${IS_WEB ? '' : `<button class="menu-item" data-m="pick-folder">${ICON.folder}<span>フォルダから追加…</span></button>`}
      ${tracks.length ? `<button class="menu-item" data-m="shuffle">${check(b.shuffle)}<span>シャッフル</span></button>
      <button class="menu-item" data-m="next-track">${ICON.skip}<span>次の曲</span></button>
      <button class="menu-item danger" data-m="clear-tracks">${ICON.trash}<span>曲をすべて外す</span></button>` : ''}
      <div class="menu-sep"></div>` : '<div class="menu-sep"></div>'}
    <button class="menu-item" data-m="on">${check(b.on)}<span>集中タイマーと一緒に流す</span></button>
    <button class="menu-item" data-m="break">${check(b.duringBreak)}<span>休憩中も流す</span></button>
    <button class="menu-item" data-m="manual">${bgm.manual ? ICON.pause : ICON.play}<span>${bgm.manual ? '止める' : 'タイマーなしで今すぐ流す'}</span></button>
    <button class="menu-item subtle" data-m="credits">${ICON.note}<span>音源について</span></button>`;
}

function openBgmMenu(x, y) {
  bgm.preview = false;
  openMenu(x, y, bgmMenuHtml(), (m, v) => {
    const b = prefs().bgm;
    if (m === 'sound') {
      b.sound = v;
      b.on = true;
      // 選んでいる間は試しに鳴らす
      bgm.preview = true;
    } else if (m === 'layer') {
      b.layer = v || null;
      bgm.preview = true;
    } else if (m === 'on') {
      b.on = !b.on;
      if (!b.on) bgm.manual = false;
    } else if (m === 'break') {
      b.duringBreak = !b.duringBreak;
    } else if (m === 'manual') {
      bgm.manual = !bgm.manual;
      bgm.preview = false;
    } else if (m === 'shuffle') {
      b.shuffle = !b.shuffle;
    } else if (m === 'next-track') {
      nextTrack();
    } else if (m === 'clear-tracks') {
      b.tracks = [];
      if (bgm.audio) { bgm.audio.pause(); bgm.audio.removeAttribute('src'); }
    } else if (m === 'credits') {
      closeMenu();
      openSoundCredits();
      return;
    } else if (m === 'pick-files' || m === 'pick-folder') {
      pickMusic(m === 'pick-folder');
      return 'keep';
    }
    save();
    bgmSync();
    updateMenu(bgmMenuHtml());
    return 'keep';
  }, {
    onClose: () => { bgm.preview = false; bgmSync(); },
  });
  menuEl.oninput = (e) => {
    if (e.target.matches('.bgm-vol')) {
      bgmSetVolume(Number(e.target.value) / 100);
      save();
    }
  };
}

async function pickMusic(folder) {
  const files = folder ? await window.api.pickMusicFolder() : await window.api.pickMusic();
  if (!files || !files.length) return;
  const b = prefs().bgm;
  const known = new Set(b.tracks.map((t) => t.path));
  const added = files.filter((f) => !known.has(f.path));
  b.tracks = [...b.tracks, ...added].slice(0, 500);
  b.sound = 'mine';
  b.on = true;
  save();
  toast(`${added.length} 曲を追加しました`);
  bgmSync();
  if (!menuEl.hidden) updateMenu(bgmMenuHtml());
}

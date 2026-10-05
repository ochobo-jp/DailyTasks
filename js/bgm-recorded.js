'use strict';

// ============================================================
//  集中 BGM：本物の録音（Wikimedia Commons の自由に使える音源）
//  長い録音を丸ごとメモリに展開すると iPhone で重いので、
//  <audio> を 2 つ交互に使って、つなぎ目をクロスフェードしながら流す。
//  録音ごとに音の大きさが違うので、流しながら自動で音量をそろえる
// ============================================================

const SOUND_BASE = 'sounds/';

// どの音にどのファイルを使うか。loop: 1 つを繰り返す / それ以外: 曲を順番に。
// gain は録音ごとの音の大きさをそろえる倍率（あらかじめ録音の大きさを測って決めた。大きな音が割れない範囲で）。
// from / end：最初や最後が静かすぎる録音は、その間だけを繰り返す。layers：同じ録音をずらして重ねる（鳴き声のすき間を埋める）
const RECORDED = {
  rain: { loop: true, files: [{ f: 'rain.mp3', gain: 4.2 }] },
  stream: { loop: true, files: [{ f: 'stream.mp3', gain: 24 }] },
  waves: { loop: true, files: [{ f: 'waves.mp3', gain: 0.38 }] },
  fire: { loop: true, files: [{ f: 'fire.mp3', gain: 3.5, from: 10, end: 54 }] },
  forest: { loop: true, files: [{ f: 'forest.mp3', gain: 1.1 }] },
  insects: { loop: true, layers: [0, 9], files: [{ f: 'insects.mp3', gain: 3 }] },
  chime: { loop: true, files: [{ f: 'chime.mp3', gain: 2, end: 52 }] },
  piano: { loop: false, files: [{ f: 'piano1.mp3', gain: 2.2 }, { f: 'piano2.mp3', gain: 1.1 }] },
  lofi: { loop: false, files: [{ f: 'lofi1.mp3', gain: 0.45 }, { f: 'lofi2.mp3', gain: 0.32 }] },
};

// 音源の作者とライセンス（設定と BGM メニューの「音源について」に出す）
const SOUND_CREDITS = [
  {"id": "rain", "file": "rain.mp3", "title": "Rain against the window", "artist": "cori", "license": "Public domain", "page": "https://commons.wikimedia.org/wiki/File:Rain_against_the_window.ogg"},
  {"id": "stream", "file": "stream.mp3", "title": "433589 jackthemurray stream-river-water-up-close", "artist": "jackthemurray", "license": "CC0", "page": "https://commons.wikimedia.org/wiki/File:433589_jackthemurray_stream-river-water-up-close.wav"},
  {"id": "waves", "file": "waves.mp3", "title": "Ocean Waves on a Tropical Beach", "artist": "Jarrod stanley", "license": "CC0", "page": "https://commons.wikimedia.org/wiki/File:Ocean_Waves_on_a_Tropical_Beach.ogg"},
  {"id": "fire", "file": "fire.mp3", "title": "Campfire sound ambience", "artist": "Glaneur de sons", "license": "CC BY 3.0", "page": "https://commons.wikimedia.org/wiki/File:Campfire_sound_ambience.ogg"},
  {"id": "forest", "file": "forest.mp3", "title": "Réveil des oiseaux", "artist": "Joseph Sardin", "license": "CC0", "page": "https://commons.wikimedia.org/wiki/File:R%C3%A9veil_des_oiseaux.ogg"},
  {"id": "insects", "file": "insects.mp3", "title": "Audio Hörbild Grillenzirpen - nachts um 3 im Föhrenwald Mödling", "artist": "DrTrumpet", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:Audio_H%C3%B6rbild_Grillenzirpen_-_nachts_um_3_im_F%C3%B6hrenwald_M%C3%B6dling.ogg"},
  {"id": "chime", "file": "chime.mp3", "title": "Windglockenspiel.Koshi", "artist": "Membeth.", "license": "CC0", "page": "https://commons.wikimedia.org/wiki/File:Windglockenspiel.Koshi.ogg"},
  {"id": "piano", "file": "piano1.mp3", "title": "Erik Satie - gymnopedies - la 1 ere. lent et douloureux", "artist": "Robin Alciatore", "license": "Public domain", "page": "https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg"},
  {"id": "piano", "file": "piano2.mp3", "title": "Gymnopédie no.3", "artist": "Teknopazzo", "license": "CC0", "page": "https://commons.wikimedia.org/wiki/File:Gymnop%C3%A9die_no.3.ogg"},
  {"id": "lofi", "file": "lofi1.mp3", "title": "Lofi music 001", "artist": "Luisalvaz", "license": "CC0", "page": "https://commons.wikimedia.org/wiki/File:Lofi_music_001.wav"},
  {"id": "lofi", "file": "lofi2.mp3", "title": "Sappheiros - Perspective (Lofi Hip Hop)", "artist": "Sappheiros", "license": "CC BY 3.0", "page": "https://commons.wikimedia.org/wiki/File:Sappheiros_-_Perspective_%28Lofi_Hip_Hop%29.ogg"},
];

const XFADE = 4;          // つなぎ目のクロスフェード（秒）

function playRecorded(life, id, firstOffset = null) {
  const def = RECORDED[id];
  const ctx = actx();
  const out = ctx.createGain();
  out.connect(life.dest);
  const decks = [0, 1].map(() => {
    const a = new Audio();
    a.preload = 'auto';
    const g = ctx.createGain();
    g.gain.value = 0;
    ctx.createMediaElementSource(a).connect(g);
    g.connect(out);
    return { a, g };
  });
  let cur = 0;
  let index = Math.floor(Math.random() * def.files.length);
  let timer = 0;

  const fadeTo = (g, v, sec) => {
    const t = ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(v, t + sec);
  };
  const start = (d, file, offset, fadeSec) => {
    d.file = file;
    d.a.src = `${SOUND_BASE}${file.f}${offset > 0 ? `#t=${offset.toFixed(1)}` : ''}`;
    d.a.play().catch(() => {});
    fadeTo(d.g, file.gain, fadeSec);
  };

  // 今の録音が終わりそうになったら、もう片方で次（または同じ録音の頭）を始めて重ねる
  const watch = () => {
    if (!life.alive) return;
    const d = decks[cur];
    const dur = d.a.duration;
    if (!dur || !isFinite(dur)) { timer = setTimeout(watch, 400); return; }
    const left = Math.min(dur, d.file?.end || dur) - d.a.currentTime;
    if (left > XFADE + 0.25 && !d.a.ended) { timer = setTimeout(watch, Math.min(1000, (left - XFADE - 0.2) * 1000)); return; }
    if (!def.loop) index = (index + 1) % def.files.length;
    const next = decks[cur ^ 1];
    start(next, def.files[index], def.files[index].from || 0, XFADE);
    fadeTo(d.g, 0, XFADE);
    setTimeout(() => d.a.pause(), XFADE * 1000 + 200);
    cur ^= 1;
    timer = setTimeout(watch, 1500);
  };

  // ループの音は途中から始めると、毎回同じ所から始まらない
  const first = def.files[index];
  start(decks[0], first, (first.from || 0) + (firstOffset ?? (def.loop ? Math.random() * 15 : 0)), 2);
  timer = setTimeout(watch, 1000);
  life.add({
    stop() {
      clearTimeout(timer);
      decks.forEach((d) => { d.a.pause(); d.a.removeAttribute('src'); d.a.load(); });
      setTimeout(() => { try { out.disconnect(); } catch { /* 無視 */ } }, 100);
    },
  });
}

// 録音がある音は、合成の代わりに録音を流す
for (const [id, def] of Object.entries(RECORDED)) {
  BGM_BUILDERS[id] = def.layers
    ? (life) => { const r = Math.random() * 10; def.layers.forEach((off) => playRecorded(life, id, r + off)); }
    : (life) => playRecorded(life, id);
}

function openSoundCredits() {
  openSheet(`
    <div class="sheet-head"><h2>音源について</h2><span class="spacer"></span><button class="icon-btn" id="crClose" aria-label="閉じる">${ICON.close}</button></div>
    <p class="desc small">集中 BGM の録音と曲は、Wikimedia Commons で自由に使えるように公開されているものです（CC0・パブリックドメイン・CC BY / CC BY-SA）。ブラウン / ホワイトノイズはアプリの中で作っています。</p>
    <div class="credits">${SOUND_CREDITS.map((c) => `<div class="credit">
      <b>${escapeHtml((BGM_SOUNDS.find((s) => s.id === c.id) || {}).name || c.id)}</b>
      <span>${escapeHtml(c.title)} — ${escapeHtml(c.artist || '作者不明')}（${escapeHtml(c.license)}）</span>
      <a href="${c.page}" target="_blank" rel="noopener">Wikimedia Commons</a>
    </div>`).join('')}</div>`, (el) => {
    $('#crClose', el).onclick = closeSheet;
  });
}

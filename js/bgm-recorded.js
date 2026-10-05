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
// from / end：最初や最後が静かすぎる録音は、その間だけを繰り返す。layers：同じ録音をずらして重ねる（鳴き声のすき間を埋める）。
// mix：別々の録音を同時に重ねる。lowpass：高い音を少しやわらげる（雨のパチパチなど）
const RECORDED = {
  rain: { loop: true, lowpass: 7000, files: [{ f: 'rain.mp3', gain: 1.8 }] },
  stream: { loop: true, files: [{ f: 'stream.mp3', gain: 24 }] },
  // 波：サーッという高い音（ノイズっぽさ）を削って、ザブーンという低い音を残す
  waves: { loop: true, lowpass: 1700, files: [{ f: 'waves.mp3', gain: 2.6 }] },
  fire: { loop: true, files: [{ f: 'fire.mp3', gain: 3.5, from: 10, end: 54 }] },
  // 森：鳥の声を少し遠くに（小さく・やわらかく）して、にぎやかさを抑える
  forest: { loop: true, lowpass: 2400, files: [{ f: 'forest.mp3', gain: 3.8 }] },
  insects: { loop: true, layers: [0, 9], files: [{ f: 'insects.mp3', gain: 3 }] },
  cafe: { loop: true, files: [{ f: 'cafe.mp3', gain: 0.65 }] },
  train: { loop: true, lowpass: 9000, files: [{ f: 'train.mp3', gain: 0.4 }] },
  celtic: { loop: false, files: [{ f: 'celtic1.mp3', gain: 0.4, from: 6 }, { f: 'celtic2.mp3', gain: 0.62 }] },
  lofi: { loop: false, files: [{ f: 'lofi1.mp3', gain: 0.45 }, { f: 'lofi2.mp3', gain: 0.32 }] },
};

// 音源の作者とライセンス（設定と BGM メニューの「音源について」に出す）
const SOUND_CREDITS = [
  {"id": "rain", "file": "rain.mp3", "title": "Calm rain", "artist": "Zuvji", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:Calm_rain.wav"},
  {"id": "stream", "file": "stream.mp3", "title": "433589 jackthemurray stream-river-water-up-close", "artist": "jackthemurray", "license": "CC0", "page": "https://commons.wikimedia.org/wiki/File:433589_jackthemurray_stream-river-water-up-close.wav"},
  {"id": "waves", "file": "waves.mp3", "title": "NausetBeach", "artist": "Groov3", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:NausetBeach.ogg"},
  {"id": "fire", "file": "fire.mp3", "title": "Campfire sound ambience", "artist": "Glaneur de sons", "license": "CC BY 3.0", "page": "https://commons.wikimedia.org/wiki/File:Campfire_sound_ambience.ogg"},
  {"id": "forest", "file": "forest.mp3", "title": "Atmo – Vögel Standard", "artist": "Burkhard Mücke", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:Atmo_%E2%80%93_V%C3%B6gel_Standard.mp3"},
  {"id": "insects", "file": "insects.mp3", "title": "Audio Hörbild Grillenzirpen - nachts um 3 im Föhrenwald Mödling", "artist": "DrTrumpet", "license": "CC BY-SA 4.0", "page": "https://commons.wikimedia.org/wiki/File:Audio_H%C3%B6rbild_Grillenzirpen_-_nachts_um_3_im_F%C3%B6hrenwald_M%C3%B6dling.ogg"},
  {"id": "cafe", "file": "cafe.mp3", "title": "Cafe ambiance", "artist": "Marble Toast", "license": "CC0", "page": "https://commons.wikimedia.org/wiki/File:Cafe_ambiance.ogg"},
  {"id": "train", "file": "train.mp3", "title": "Northern Trains 323239 DMSO A, on the Crewe to Manchester line, Jan 2022", "artist": "TheFrog001", "license": "CC0", "page": "https://commons.wikimedia.org/wiki/File:Northern_Trains_323239_DMSO_A%2C_on_the_Crewe_to_Manchester_line%2C_Jan_2022.ogg"},
  {"id": "celtic", "file": "celtic1.mp3", "title": "Skye Cuillin (ISRC USUAN1100346)", "artist": "Kevin MacLeod", "license": "CC BY 3.0", "page": "https://commons.wikimedia.org/wiki/File:Skye_Cuillin_%28ISRC_USUAN1100346%29.mp3"},
  {"id": "celtic", "file": "celtic2.mp3", "title": "Errigal (ISRC USUAN1100239)", "artist": "Kevin MacLeod", "license": "CC BY 3.0", "page": "https://commons.wikimedia.org/wiki/File:Errigal_%28ISRC_USUAN1100239%29.mp3"},
  {"id": "lofi", "file": "lofi1.mp3", "title": "Lofi music 001", "artist": "Luisalvaz", "license": "CC0", "page": "https://commons.wikimedia.org/wiki/File:Lofi_music_001.wav"},
  {"id": "lofi", "file": "lofi2.mp3", "title": "Sappheiros - Perspective (Lofi Hip Hop)", "artist": "Sappheiros", "license": "CC BY 3.0", "page": "https://commons.wikimedia.org/wiki/File:Sappheiros_-_Perspective_%28Lofi_Hip_Hop%29.ogg"},
];

const XFADE = 4;          // つなぎ目のクロスフェード（秒）

function playRecorded(life, def, firstOffset = null) {
  const ctx = actx();
  const out = ctx.createGain();
  if (def.lowpass) {
    // 2 段重ねて、境目から上をしっかり削る
    const lp1 = ctx.createBiquadFilter();
    const lp2 = ctx.createBiquadFilter();
    for (const lp of [lp1, lp2]) { lp.type = 'lowpass'; lp.frequency.value = def.lowpass; lp.Q.value = 0.6; }
    out.connect(lp1);
    lp1.connect(lp2);
    lp2.connect(life.dest);
  } else {
    out.connect(life.dest);
  }
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
  BGM_BUILDERS[id] = (life) => {
    if (def.mix) { def.mix.forEach((part) => playRecorded(life, part)); return; }
    if (def.layers) { const r = Math.random() * 10; def.layers.forEach((off) => playRecorded(life, def, r + off)); return; }
    playRecorded(life, def);
  };
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

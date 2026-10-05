'use strict';

// ============================================================
//  見た目のスタイル
//  スタイルごとに雰囲気（形・文字・質感）が変わり、色違いを選べる
//  CSS は themes.css。html の data-style / data-variant / data-mode で切り替える
// ============================================================

const STYLES = [
  {
    id: 'glass', name: 'ガラス', desc: 'すりガラスと淡いグラデーション。後ろのデスクトップが透けます', darkToggle: true, tint: true,
    variants: [
      { id: 'lavender', name: 'ラベンダー', colors: ['#8b7cf6', '#5cc8e8'] },
      { id: 'sakura', name: 'さくら', colors: ['#f472b6', '#fb923c'] },
      { id: 'mint', name: 'ミント', colors: ['#34d399', '#22d3ee'] },
      { id: 'sunset', name: 'サンセット', colors: ['#f97316', '#facc15'] },
      { id: 'ocean', name: 'オーシャン', colors: ['#3b82f6', '#06b6d4'] },
    ],
  },
  {
    id: 'paper', name: 'ノート', desc: '罫線のノートに手書き風の文字。赤ペンでチェック',
    variants: [
      { id: 'cream', name: 'クリーム', colors: ['#fffaf0', '#e25c4b'] },
      { id: 'grid', name: '方眼', colors: ['#f6faff', '#2f6fd6'] },
      { id: 'kraft', name: 'クラフト', colors: ['#dccbad', '#3f6b4f'] },
      { id: 'sticky', name: 'ふせん', colors: ['#fff6b8', '#e98a15'] },
    ],
  },
  {
    id: 'neon', name: 'ネオン', desc: '夜の街みたいに光るライン。暗い場所でも見やすい', dark: true,
    variants: [
      { id: 'cyan', name: 'シアン', colors: ['#22e3ff', '#7c5cff'] },
      { id: 'magenta', name: 'マゼンタ', colors: ['#ff3cac', '#7b61ff'] },
      { id: 'lime', name: 'ライム', colors: ['#a3ff3c', '#00e0a4'] },
      { id: 'amber', name: 'アンバー', colors: ['#ffb000', '#ff5e3a'] },
    ],
  },
  {
    id: 'minimal', name: 'ミニマル', desc: '余白と細い線だけの、静かで落ち着いた画面',
    variants: [
      { id: 'snow', name: 'スノー', colors: ['#ffffff', '#111111'] },
      { id: 'sand', name: 'サンド', colors: ['#f4efe6', '#8a6a3f'] },
      { id: 'slate', name: 'スレート', colors: ['#eef1f5', '#3b5bdb'] },
      { id: 'charcoal', name: 'チャコール', colors: ['#17181b', '#f2f2f2'], dark: true },
    ],
  },
  {
    id: 'retro', name: 'レトロ', desc: '太いフチとドットの、ゲーム機みたいな画面',
    variants: [
      { id: 'pop', name: 'ポップ', colors: ['#fff1f6', '#ff4fa3'] },
      { id: 'gameboy', name: 'ゲームボーイ', colors: ['#c4cfa1', '#306230'] },
      { id: 'famicom', name: 'ファミコン', colors: ['#e8e3d9', '#b8282c'] },
      { id: 'arcade', name: 'アーケード', colors: ['#1d1033', '#ffd23f'], dark: true },
    ],
  },
  {
    id: 'wa', name: '和', desc: '和紙と明朝体。済んだことには朱色のはんこ',
    variants: [
      { id: 'haru', name: '春', colors: ['#fbf3f1', '#d4567a'] },
      { id: 'natsu', name: '夏', colors: ['#f2f6f8', '#1f4e8c'] },
      { id: 'aki', name: '秋', colors: ['#f8f1e6', '#c0461b'] },
      { id: 'fuyu', name: '冬', colors: ['#f4f5f7', '#4a5a6a'] },
      { id: 'yoru', name: '夜', colors: ['#1a1a22', '#d8b25a'], dark: true },
    ],
  },
  {
    id: 'pop', name: 'ポップ', desc: 'まんまるの文字と、ステッカーみたいなぷっくりカード',
    variants: [
      { id: 'strawberry', name: 'いちご', colors: ['#fff0f5', '#ff5c8a'] },
      { id: 'soda', name: 'ソーダ', colors: ['#eef8ff', '#2bb3ff'] },
      { id: 'melon', name: 'メロン', colors: ['#effcf2', '#2fbf71'] },
      { id: 'lemon', name: 'レモン', colors: ['#fffbe6', '#f5b700'] },
      { id: 'grape', name: 'ぶどう', colors: ['#f6f0ff', '#8b5cf6'] },
    ],
  },
  {
    id: 'chalk', name: '黒板', desc: 'チョークで書いたような教室の黒板。木の枠つき',
    variants: [
      { id: 'green', name: '黒板', colors: ['#264d3b', '#ffe66d'], dark: true },
      { id: 'black', name: 'ブラック', colors: ['#24272b', '#ff9fc0'], dark: true },
      { id: 'white', name: 'ホワイトボード', colors: ['#f7f8f6', '#1e5bd8'] },
    ],
  },
  {
    id: 'terminal', name: 'ターミナル', desc: '黒い画面に等幅の文字。完了は [x]', dark: true,
    variants: [
      { id: 'green', name: 'グリーン', colors: ['#030a05', '#33ff66'] },
      { id: 'amber', name: 'アンバー', colors: ['#0d0700', '#ffb000'] },
      { id: 'ice', name: 'アイス', colors: ['#020814', '#5cc8ff'] },
      { id: 'paper', name: 'ペーパー', colors: ['#f4f1e8', '#222222'], dark: false },
    ],
  },
  {
    id: 'soft', name: 'ソフト', desc: 'ふっくら浮き出て、押すとへこむ やわらかい立体',
    variants: [
      { id: 'cloud', name: 'クラウド', colors: ['#e9edf3', '#6c7cff'] },
      { id: 'peach', name: 'ピーチ', colors: ['#f6ebe6', '#ff7a59'] },
      { id: 'sage', name: 'セージ', colors: ['#e6eee8', '#4f9d69'] },
      { id: 'night', name: 'ナイト', colors: ['#2a2d35', '#8fa2ff'], dark: true },
    ],
  },
  {
    id: 'news', name: '新聞', desc: '明朝の見出しと二重の罫線。紙面みたいにすっきり',
    variants: [
      { id: 'morning', name: '朝刊', colors: ['#f6f2e9', '#111111'] },
      { id: 'salmon', name: '英字紙', colors: ['#fff1e5', '#990f3d'] },
      { id: 'extra', name: '号外', colors: ['#fbfaf7', '#d6001c'] },
      { id: 'evening', name: '夕刊', colors: ['#e9e7e1', '#2b4a6f'] },
    ],
  },
  {
    id: 'aurora', name: 'オーロラ', desc: '夜空にゆらめく光。ゆっくり色が流れます', dark: true,
    variants: [
      { id: 'arctic', name: '北極', colors: ['#3cffb4', '#7a5cff'] },
      { id: 'dusk', name: '夕焼け', colors: ['#ff8a4c', '#ff3c8e'] },
      { id: 'deepsea', name: '深海', colors: ['#24c6ff', '#2b5bff'] },
      { id: 'sakura', name: '夜桜', colors: ['#ff8fc8', '#b48cff'] },
    ],
  },
  {
    id: 'ios', name: 'iPhone', desc: 'iPhone の標準アプリのような、すっきりした見た目。端末がダークモードなら自動で暗く', darkToggle: true, autoDark: true,
    variants: [
      { id: 'blue', name: 'ブルー', colors: ['#f2f2f7', '#007aff'] },
      { id: 'green', name: 'グリーン', colors: ['#f2f2f7', '#34c759'] },
      { id: 'orange', name: 'オレンジ', colors: ['#f2f2f7', '#ff9500'] },
      { id: 'pink', name: 'ピンク', colors: ['#f2f2f7', '#ff2d55'] },
      { id: 'purple', name: 'パープル', colors: ['#f2f2f7', '#af52de'] },
      { id: 'graphite', name: 'グラファイト', colors: ['#f2f2f7', '#8e8e93'] },
    ],
  },
];

// 端末のダークモード（iPhone スタイルはこれに合わせる）
const systemDark = matchMedia('(prefers-color-scheme: dark)');
systemDark.addEventListener('change', () => { if (styleById(prefs().style).autoDark) { applyAppearance(); renderAll(); } });

const styleById = (id) => STYLES.find((s) => s.id === id) || STYLES[0];
const variantOf = (style, id) => style.variants.find((v) => v.id === id) || style.variants[0];

function isDarkLook(style, variant, p = prefs()) {
  if (variant.dark === false) return false;
  if (style.autoDark && systemDark.matches) return true;
  return !!(style.dark || variant.dark || (style.darkToggle && p.dark));
}

function applyAppearance() {
  const p = prefs();
  const style = styleById(p.style);
  const variant = variantOf(style, p.variant);
  const dark = isDarkLook(style, variant, p);
  const root = document.documentElement;
  root.dataset.style = style.id;
  root.dataset.variant = variant.id;
  root.dataset.mode = dark ? 'dark' : 'light';
  root.style.setProperty('--tint', String(p.tint));
  // ガラスとネオンは後ろが透けるので、アクリルの明るさも合わせる
  window.api.setDark(dark);
}

function setStyle(styleId, variantId) {
  const p = prefs();
  const style = styleById(styleId);
  p.style = style.id;
  // 前に選んでいた色が新しいスタイルにもあれば引き継ぐ
  p.variant = variantOf(style, variantId || p.variant).id;
  applyAppearance();
  save();
}

function isDarkNow() {
  const style = styleById(prefs().style);
  return isDarkLook(style, variantOf(style, prefs().variant));
}

// 夜モード：ガラスはそのまま暗くする。ほかのスタイルは、暗い色違い ⇔ 明るい色違いを切り替える
function setDarkMode(on) {
  const p = prefs();
  const style = styleById(p.style);
  if (style.darkToggle) {
    p.dark = on;
  } else {
    const target = style.variants.find((v) => isDarkLook(style, v, p) === on);
    if (!target) {
      toast(on ? `${style.name}には暗い色がありません` : `${style.name}はいつも暗い色です`);
      return;
    }
    p.variant = target.id;
  }
  applyAppearance();
  save();
}

// 設定画面のプレビュー（そのスタイルのトークンで、本物の部品を小さく描く）
function stylePreview(style, variant) {
  const dark = isDarkLook(style, variant);
  return `<span class="style-preview" data-style="${style.id}" data-variant="${variant.id}" data-mode="${dark ? 'dark' : 'light'}">
    <span class="sp-card card">
      <span class="sp-head">今日</span>
      <span class="item sp-item"><span class="check"></span><span class="sp-line"></span></span>
      <span class="item sp-item done"><span class="check">${ICON.check}</span><span class="sp-line short"></span></span>
    </span>
  </span>`;
}

function stylePicker() {
  const p = prefs();
  const current = styleById(p.style);
  const order = IS_TOUCH ? [styleById('ios'), ...STYLES.filter((s) => s.id !== 'ios')] : STYLES;
  const tiles = order.map((s) => {
    const v = s.id === current.id ? variantOf(s, p.variant) : s.variants[0];
    return `<button class="style-tile ${s.id === current.id ? 'on' : ''}" data-pick-style="${s.id}">
      ${stylePreview(s, v)}
      <span class="st-text"><b>${s.name}</b><small>${s.desc}</small></span>
    </button>`;
  }).join('');
  const variants = current.variants.map((v) => `<button class="variant-chip ${v.id === variantOf(current, p.variant).id ? 'on' : ''}" data-pick-variant="${v.id}">
      <i style="background:${v.colors[0]}"></i><i style="background:${v.colors[1]}"></i>${v.name}</button>`).join('');
  return `<div class="style-grid">${tiles}</div>
    <div class="variant-row"><span class="variant-label">${current.name}の色</span><div class="variant-chips">${variants}</div></div>`;
}

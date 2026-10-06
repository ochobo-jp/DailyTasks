'use strict';

// ============================================================
//  スタイルの追加分（themes.js の一覧に足す）。CSS は themes-100.css
// ============================================================

const MORE_STYLES = [
  // ---------- 大胆：並び方そのものが変わる ----------
  ['bold', { id: 'tategaki', name: '縦書き', desc: 'タスクが縦書きの短冊になって、右から左へ並びます', variants: [
    { id: 'washi', name: '和紙', colors: ['#f4efe2', '#b0302a'] }, { id: 'ai', name: '藍', colors: ['#e9edf3', '#24467a'] }, { id: 'sumi', name: '墨', colors: ['#1a1917', '#e8e2d2'], dark: true }] }],
  ['bold', { id: 'sheet', name: '表計算', desc: '表計算ソフトの画面。行番号とマス目、上には数式バー', variants: [
    { id: 'green', name: 'グリーン', colors: ['#ffffff', '#217346'] }, { id: 'blue', name: 'ブルー', colors: ['#ffffff', '#2b579a'] }, { id: 'dark', name: 'ダーク', colors: ['#1e1e1e', '#6fd38f'], dark: true }] }],
  ['bold', { id: 'subway', name: '路線図', desc: 'タスクが駅に。太い路線の色でつながった地下鉄の路線図', variants: [
    { id: 'tokyo', name: 'メトロ', colors: ['#f4f5f7', '#f39700'] }, { id: 'london', name: 'ロンドン', colors: ['#ffffff', '#dc241f'] }, { id: 'night', name: '夜の路線', colors: ['#14161c', '#00a7db'], dark: true }] }],
  ['bold', { id: 'sugoroku', name: 'すごろく', desc: 'タスクがすごろくのマスに。番号つきで、ゴールを目指して進みます', variants: [
    { id: 'pop', name: 'ポップ', colors: ['#fff6d6', '#ff6b4a'] }, { id: 'forest', name: '森', colors: ['#e9f3dc', '#4f8a3a'] }] }],
  ['bold', { id: 'bookshelf', name: '本棚', desc: 'タスクが本の背表紙に。棚にずらっと並びます', variants: [
    { id: 'oak', name: 'オーク', colors: ['#d9c3a0', '#7a4a24'] }, { id: 'walnut', name: 'ウォルナット', colors: ['#3a2a20', '#c9a26a'], dark: true }] }],
  ['bold', { id: 'genko', name: '原稿用紙', desc: 'マス目の原稿用紙に、1 文字ずつ書きこむように並びます', variants: [
    { id: 'red', name: '朱', colors: ['#fbf8f1', '#c4553e'] }, { id: 'green', name: '緑', colors: ['#f8faf4', '#4c8a5a'] }] }],
  ['bold', { id: 'sns', name: 'SNS', desc: 'タスクが投稿に。アイコンと、済んだら赤いハート', variants: [
    { id: 'light', name: 'ライト', colors: ['#ffffff', '#1d9bf0'] }, { id: 'dim', name: 'ディム', colors: ['#15202b', '#1d9bf0'], dark: true }, { id: 'pink', name: 'ピンク', colors: ['#fff5f8', '#e1306c'] }] }],
  ['bold', { id: 'ticket', name: 'チケット', desc: 'タスクが搭乗券に。切り取り線と半券つき', variants: [
    { id: 'sky', name: 'スカイ', colors: ['#dfe9f3', '#0b5cad'] }, { id: 'sunset', name: 'サンセット', colors: ['#fdeee0', '#e0662a'] }, { id: 'night', name: '夜行便', colors: ['#10141f', '#f2b134'], dark: true }] }],
  ['bold', { id: 'stamp', name: '切手', desc: 'タスクがギザギザのふちの切手に。済んだら消印', variants: [
    { id: 'classic', name: 'クラシック', colors: ['#efe6d4', '#b73a3a'] }, { id: 'pastel', name: 'パステル', colors: ['#f4eef7', '#7a5cc9'] }] }],
  ['bold', { id: 'vinyl', name: 'レコード', desc: '今日のまとめがくるくる回るレコードに。タスクは曲目リスト', dark: true, variants: [
    { id: 'black', name: 'ブラック', colors: ['#121212', '#ff5a36'] }, { id: 'jazz', name: 'ジャズ', colors: ['#1a1410', '#d9a441'] }, { id: 'pink', name: 'ピンク盤', colors: ['#1c1218', '#ff6fb0'] }] }],
  ['bold', { id: 'tilt', name: '3D', desc: '画面全体がななめに傾いて、カードが厚みのある立体に', variants: [
    { id: 'mint', name: 'ミント', colors: ['#e8f6f1', '#19a383'] }, { id: 'violet', name: 'バイオレット', colors: ['#efeaff', '#7a4ff0'] }, { id: 'dark', name: 'ダーク', colors: ['#16161e', '#ff4f7b'], dark: true }] }],
  ['bold', { id: 'bubble', name: 'バブル', desc: 'タスクがまんまるのシャボン玉に。ふわふわ浮かびます', variants: [
    { id: 'soda', name: 'ソーダ', colors: ['#e6f6ff', '#2fa8e0'] }, { id: 'candy', name: 'キャンディ', colors: ['#fff0f6', '#ff5fa2'] }, { id: 'night', name: '夜', colors: ['#0e1024', '#7b8cff'], dark: true }] }],
  ['bold', { id: 'collage', name: 'コラージュ', desc: '雑誌や新聞を切り抜いた紙を、ななめに貼り合わせたような画面', variants: [
    { id: 'paper', name: 'ペーパー', colors: ['#e9e4da', '#e2383f'] }, { id: 'zine', name: 'ジン', colors: ['#f2f2f2', '#111111'] }] }],
  ['bold', { id: 'poster', name: 'ポスター', desc: '特大の番号と太い文字。1 つ 1 つが色のブロックのポスター', variants: [
    { id: 'red', name: 'レッド', colors: ['#f2ede4', '#e63946'] }, { id: 'blue', name: 'ブルー', colors: ['#eef2f6', '#1d4ed8'] }, { id: 'black', name: 'ブラック', colors: ['#111111', '#ffd60a'], dark: true }] }],
  ['bold', { id: 'hud', name: 'コックピット', desc: '宇宙船の計器のような画面。カードの角に照準のマーク', dark: true, variants: [
    { id: 'cyan', name: 'シアン', colors: ['#06121c', '#35e0ff'] }, { id: 'orange', name: 'オレンジ', colors: ['#140b05', '#ff9b3d'] }, { id: 'red', name: 'レッド', colors: ['#14070a', '#ff4466'] }] }],
  ['bold', { id: 'reverse', name: 'リバース', desc: '左右と上下が反対。メニューは右、追加欄は上、チェックは右側', variants: [
    { id: 'coral', name: 'コーラル', colors: ['#fff4f0', '#ff6b57'] }, { id: 'teal', name: 'ティール', colors: ['#effaf8', '#0f9b8e'] }, { id: 'dark', name: 'ダーク', colors: ['#17181c', '#ffb454'], dark: true }] }],
  ['bold', { id: 'letter', name: '手紙', desc: 'タスクが封筒に。済んだら封が開きます。ふちはエアメールのしま', variants: [
    { id: 'air', name: 'エアメール', colors: ['#f6f1e7', '#c8102e'] }, { id: 'rose', name: 'ローズ', colors: ['#fbeef0', '#b3476a'] }] }],
  ['bold', { id: 'tearoff', name: '日めくり', desc: 'リストが日めくりカレンダーに。上にとじ具、赤い帯', variants: [
    { id: 'red', name: '赤', colors: ['#f3f1ec', '#d62828'] }, { id: 'navy', name: '紺', colors: ['#eef0f4', '#1f3a68'] }] }],

  // ---------- 個性派 ----------
  ['unique', { id: 'vhs', name: 'ビデオ', desc: 'ビデオテープの画面。走査線と色ずれ、右上に ● REC', dark: true, variants: [
    { id: 'blue', name: 'ブルー', colors: ['#0a0f3a', '#ffffff'] }, { id: 'black', name: 'ブラック', colors: ['#050505', '#7dff7a'] }] }],
  ['unique', { id: 'treasure', name: '宝の地図', desc: '古い羊皮紙。タスクを点線の道でつなぎ、済んだら赤い ✕', variants: [
    { id: 'parchment', name: '羊皮紙', colors: ['#e8d3a5', '#9b2f1f'] }, { id: 'night', name: '夜の地図', colors: ['#2a2016', '#e8c37a'], dark: true }] }],
  ['unique', { id: 'block', name: 'ブロック', desc: 'おもちゃのブロック。カードの上にポッチがならびます', variants: [
    { id: 'primary', name: '原色', colors: ['#f2f2f2', '#d01012'] }, { id: 'pastel', name: 'パステル', colors: ['#fdf6f0', '#f28fb0'] }] }],
  ['unique', { id: 'cassette', name: 'カセット', desc: 'タスクがカセットテープのラベルに。2 つのリールつき', dark: true, variants: [
    { id: 'black', name: 'ブラック', colors: ['#1b1b1e', '#ff6f3c'] }, { id: 'clear', name: 'クリア', colors: ['#2a3442', '#7fe0d0'] }] }],
  ['unique', { id: 'bauhaus', name: 'バウハウス', desc: '赤・青・黄と黒。丸と四角と三角の、幾何学のポスター', variants: [
    { id: 'classic', name: 'クラシック', colors: ['#f1ece1', '#e2312d'] }, { id: 'night', name: 'ナイト', colors: ['#141414', '#f2c12e'], dark: true }] }],
  ['unique', { id: 'memphis', name: 'メンフィス', desc: 'くねくね線と三角と水玉。80 年代のにぎやかな模様', variants: [
    { id: 'pop', name: 'ポップ', colors: ['#fff8ec', '#ff4f8b'] }, { id: 'mint', name: 'ミント', colors: ['#effaf6', '#2ec4b6'] }] }],
  ['unique', { id: 'artdeco', name: 'アールデコ', desc: '黒と金の扇の模様。左右対称の飾り枠', dark: true, variants: [
    { id: 'gold', name: 'ゴールド', colors: ['#0e0e0e', '#d4af37'] }, { id: 'emerald', name: 'エメラルド', colors: ['#06201a', '#d4af37'] }] }],
  ['unique', { id: 'denim', name: 'デニム', desc: 'デニムの生地にオレンジのステッチ。見出しは革のタグ', dark: true, variants: [
    { id: 'indigo', name: 'インディゴ', colors: ['#24365a', '#e8a14a'] }, { id: 'light', name: 'ライト', colors: ['#6f8fb8', '#e8a14a'] }] }],

  // ---------- かわいい ----------
  ['cute', { id: 'capsule', name: 'ガチャ', desc: 'タスクがガチャのカプセルに。上半分に色、下は透明', variants: [
    { id: 'mix', name: 'ミックス', colors: ['#fff4e0', '#ff5d5d'] }, { id: 'pastel', name: 'パステル', colors: ['#f6f1ff', '#b48cff'] }] }],
  ['cute', { id: 'sweets', name: 'スイーツ', desc: 'カードの上にとろりとクリーム。背景にカラースプレー', variants: [
    { id: 'strawberry', name: 'いちご', colors: ['#fff1f4', '#ff6f91'] }, { id: 'choco', name: 'チョコ', colors: ['#f7ede4', '#7b4a2f'] }, { id: 'matcha', name: '抹茶', colors: ['#f2f6e8', '#6b9a3e'] }] }],
  ['cute', { id: 'felt', name: 'フェルト', desc: 'フェルトの布を、ていねいに縫いつけたようなカード', variants: [
    { id: 'red', name: 'あか', colors: ['#f3e6d8', '#c8423b'] }, { id: 'green', name: 'みどり', colors: ['#e7eedc', '#4f8a4a'] }] }],
  ['cute', { id: 'garden', name: '花畑', desc: '小さな花が咲く草原。済んだタスクには花が咲きます', variants: [
    { id: 'spring', name: '春', colors: ['#eef8e4', '#ff7fa8'] }, { id: 'sunflower', name: 'ひまわり', colors: ['#f4f8df', '#f2b705'] }] }],
  ['cute', { id: 'cloudsky', name: '雲の上', desc: '青空にもくもくの雲。カードも雲のようにふわふわ', variants: [
    { id: 'blue', name: '青空', colors: ['#bfe3ff', '#3a8fe0'] }, { id: 'pink', name: '夕焼け', colors: ['#ffd9e4', '#ff7aa2'] }] }],
  ['cute', { id: 'yumekawa', name: 'ゆめかわ', desc: 'ピンクと水色とラベンダーのグラデーション。きらきらの星', variants: [
    { id: 'unicorn', name: 'ユニコーン', colors: ['#fde6f6', '#b48cff'] }, { id: 'mermaid', name: 'マーメイド', colors: ['#dff7f6', '#5fb8e8'] }] }],

  // ---------- ダーク ----------
  ['dark', { id: 'gothic', name: 'ゴシック', desc: '深い紅と黒。飾り枠とろうそくの明かり', dark: true, variants: [
    { id: 'crimson', name: 'クリムゾン', colors: ['#0f0809', '#b3122e'] }, { id: 'violet', name: 'バイオレット', colors: ['#0d0812', '#8e44ad'] }] }],
  ['dark', { id: 'fireworks', name: '花火', desc: '夜空に花火が上がります。済んだタスクもぱっと光る', dark: true, variants: [
    { id: 'summer', name: '夏祭り', colors: ['#070b1f', '#ff7b47'] }, { id: 'gold', name: '金色', colors: ['#0b0906', '#ffd36b'] }] }],
  ['dark', { id: 'rainwindow', name: '雨の窓', desc: '雨つぶのついた窓ごしに、にじむ街の明かり', dark: true, variants: [
    { id: 'city', name: '街', colors: ['#0d1218', '#ffb86b'] }, { id: 'blue', name: '青い夜', colors: ['#0a1020', '#7fb5ff'] }] }],
  ['dark', { id: 'inkwash', name: '墨', desc: '黒い紙に白い墨の筆あと。済んだら朱色の印', dark: true, variants: [
    { id: 'black', name: '漆黒', colors: ['#111110', '#e9e4d8'] }, { id: 'navy', name: '紺', colors: ['#0f1522', '#e9e4d8'] }] }],
  ['dark', { id: 'film', name: '白黒映画', desc: '昔の白黒映画。フィルムのざらつきと、上下の黒い帯', dark: true, variants: [
    { id: 'mono', name: 'モノクロ', colors: ['#141414', '#e8e8e8'] }, { id: 'sepia', name: 'セピア', colors: ['#1c150e', '#e6d3b0'] }] }],

  // ---------- シンプル ----------
  ['simple', { id: 'marble', name: '大理石', desc: '白い大理石の模様に、細い金の線', variants: [
    { id: 'white', name: 'ホワイト', colors: ['#f4f2ef', '#b8975a'] }, { id: 'black', name: 'ブラック', colors: ['#161616', '#c9a96e'], dark: true }] }],
  ['simple', { id: 'wood', name: '木', desc: '木の机の上に白い紙。木目がやさしい', variants: [
    { id: 'light', name: 'メープル', colors: ['#e3c9a3', '#7a5230'] }, { id: 'dark', name: 'ウォルナット', colors: ['#4a3426', '#e2b77a'], dark: true }] }],

  // ---------- 似ていたスタイルの代わりに入れた 12 種類 ----------
  ['simple', { id: 'desert', name: '砂漠', desc: 'なだらかな砂の丘と大きな太陽。あたたかい砂の色', variants: [
    { id: 'day', name: '昼', colors: ['#f3e3c7', '#c4622d'] }, { id: 'dusk', name: '夕暮れ', colors: ['#2b1d2e', '#ff9a5a'], dark: true }] }],
  ['simple', { id: 'topo', name: '登山地図', desc: '等高線の地図。見出しは山頂の ▲、タスクは道しるべ', variants: [
    { id: 'trail', name: 'トレイル', colors: ['#eef0e2', '#c0392b'] }, { id: 'night', name: '夜の山', colors: ['#14201c', '#e6c45a'], dark: true }] }],
  ['simple', { id: 'sketch', name: 'スケッチ', desc: 'えんぴつで描いたような、少しゆがんだ手描きの線', variants: [
    { id: 'pencil', name: 'えんぴつ', colors: ['#fbfbf8', '#333333'] }, { id: 'pen', name: '青ペン', colors: ['#fbfbf8', '#2456c8'] }] }],
  ['cute', { id: 'circus', name: 'サーカス', desc: '赤白しまのテントと、電球がぐるりと光る看板', variants: [
    { id: 'classic', name: 'クラシック', colors: ['#fff4e2', '#d7263d'] }, { id: 'night', name: '夜の部', colors: ['#1d1030', '#ffcc33'], dark: true }] }],
  ['dark', { id: 'halloween', name: 'ハロウィン', desc: '大きな月とクモの巣。済んだタスクにはかぼちゃ', dark: true, variants: [
    { id: 'pumpkin', name: 'かぼちゃ', colors: ['#16101f', '#ff7a1a'] }, { id: 'ghost', name: 'おばけ', colors: ['#0f1418', '#9fe870'] }] }],
  ['dark', { id: 'circuit', name: '回路基板', desc: '緑の基板に金の配線。チェックははんだのパッド', dark: true, variants: [
    { id: 'green', name: 'グリーン', colors: ['#0b3d2a', '#e8b84a'] }, { id: 'blue', name: 'ブルー', colors: ['#0b2140', '#e8b84a'] }, { id: 'black', name: 'ブラック', colors: ['#141414', '#e8b84a'] }] }],
  ['dark', { id: 'gem', name: '宝石', desc: 'ベルベットの上に、カットされた宝石の色。チェックもダイヤ形', dark: true, variants: [
    { id: 'ruby', name: 'ルビー', colors: ['#14070b', '#e0115f'] }, { id: 'sapphire', name: 'サファイア', colors: ['#060b1c', '#2f6bff'] }, { id: 'emerald', name: 'エメラルド', colors: ['#04140d', '#19b36b'] }] }],
  ['unique', { id: 'sento', name: '銭湯', desc: 'タイルの壁にペンキの富士山。見出しはのれん', variants: [
    { id: 'men', name: '男湯', colors: ['#eef4f8', '#2a5caa'] }, { id: 'women', name: '女湯', colors: ['#f8eef0', '#c8364a'] }] }],
  ['unique', { id: 'showa', name: '昭和レトロ', desc: 'ホーロー看板と、花柄の壁紙。喫茶店や商店街の色', variants: [
    { id: 'kissa', name: '喫茶', colors: ['#f2e6cc', '#b5462f'] }, { id: 'shotengai', name: '商店街', colors: ['#e8f0e6', '#1f7a6e'] }] }],
  ['unique', { id: 'camo', name: '迷彩', desc: '迷彩柄にステンシルの文字。見出しはドッグタグ', variants: [
    { id: 'woodland', name: 'ウッドランド', colors: ['#4b5320', '#d9c58b'], dark: true }, { id: 'desert', name: 'デザート', colors: ['#c2a878', '#5b4a2e'] }, { id: 'urban', name: 'アーバン', colors: ['#5a5f66', '#ff6a00'], dark: true }] }],
  ['bold', { id: 'cardboard', name: '段ボール', desc: 'タスクが段ボール箱に。ガムテープで閉じて、済んだら「配達済」', variants: [
    { id: 'kraft', name: 'クラフト', colors: ['#c89f6c', '#b3261e'] }, { id: 'white', name: '白箱', colors: ['#e6e1d6', '#2a6fb0'] }] }],
  ['bold', { id: 'puzzle', name: 'パズル', desc: 'タスクがジグソーパズルのピースに。済んだピースははまって光る', variants: [
    { id: 'color', name: 'カラフル', colors: ['#f4f1ea', '#ef6f5e'] }, { id: 'wood', name: '木のパズル', colors: ['#e8d2ab', '#8a5a2b'] }] }],
];

for (const [cat, style] of MORE_STYLES) {
  STYLES.push(style);
  STYLE_CATEGORY[style.id] = cat;
}

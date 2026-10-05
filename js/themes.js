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
  {
    id: 'comic', name: 'マンガ', desc: '太い線とトーンの点々。見出しはマンガのコマの文字みたい',
    variants: [
      { id: 'shonen', name: '少年', colors: ['#ffffff', '#e60012'] },
      { id: 'shojo', name: '少女', colors: ['#fff5fa', '#ff5fa2'] },
      { id: 'amecomi', name: 'アメコミ', colors: ['#fff6cc', '#1e5bd8'] },
      { id: 'mono', name: 'モノクロ', colors: ['#f4f4f4', '#222222'] },
    ],
  },
  {
    id: 'rpg', name: 'RPG', desc: 'ゲームのメッセージウィンドウ。選んでいる行に ▶ が出ます', dark: true,
    variants: [
      { id: 'quest', name: 'クエスト', colors: ['#1b2a8a', '#ffd75e'] },
      { id: 'fantasy', name: 'ファンタジー', colors: ['#3446b8', '#9fe8ff'] },
      { id: 'dungeon', name: 'ダンジョン', colors: ['#111111', '#ff6b4a'] },
      { id: 'forest', name: '森の村', colors: ['#1d5a2a', '#ffe08a'] },
    ],
  },
  {
    id: 'cafe', name: 'カフェ', desc: 'クリーム色の紙と、コーヒー色の文字。黒板メニューのような見出し',
    variants: [
      { id: 'latte', name: 'ラテ', colors: ['#f6efe4', '#6f4e37'] },
      { id: 'matcha', name: '抹茶', colors: ['#f3f1e4', '#5b7f3a'] },
      { id: 'berry', name: 'ベリー', colors: ['#fbeff1', '#b03a5b'] },
      { id: 'espresso', name: 'エスプレッソ', colors: ['#2a1f1a', '#d9a066'], dark: true },
    ],
  },
  {
    id: 'space', name: '宇宙', desc: '星がまたたく夜空。済んだことは星のように光ります', dark: true,
    variants: [
      { id: 'galaxy', name: '銀河', colors: ['#8b5cf6', '#22d3ee'] },
      { id: 'nebula', name: '星雲', colors: ['#ff4fd8', '#7b61ff'] },
      { id: 'mars', name: '火星', colors: ['#ff7a45', '#ffb36b'] },
      { id: 'moon', name: '月', colors: ['#cfd6e6', '#8fa3c8'] },
    ],
  },
  {
    id: 'material', name: 'マテリアル', desc: 'Android のような、やわらかい色の面と大きな角丸',
    variants: [
      { id: 'purple', name: 'パープル', colors: ['#fef7ff', '#6750a4'] },
      { id: 'green', name: 'グリーン', colors: ['#f7fbf1', '#386a20'] },
      { id: 'blue', name: 'ブルー', colors: ['#f8f9ff', '#0061a4'] },
      { id: 'orange', name: 'オレンジ', colors: ['#fff8f4', '#8b5000'] },
      { id: 'dark', name: 'ダーク', colors: ['#141218', '#d0bcff'], dark: true },
    ],
  },
  {
    id: 'vapor', name: 'ベイパー', desc: '80年代の夕焼けとネオンのグリッド。見出しはメタリック', dark: true,
    variants: [
      { id: 'sunset', name: 'サンセット', colors: ['#ff71ce', '#01cdfe'] },
      { id: 'outrun', name: 'アウトラン', colors: ['#ff2a6d', '#05d9e8'] },
      { id: 'miami', name: 'マイアミ', colors: ['#ff9de2', '#2de2e6'] },
      { id: 'pastel', name: 'パステル', colors: ['#ffe3f6', '#b967ff'], dark: false },
    ],
  },

  // ---------- 大胆：色だけでなく、並び方や形まで変わる ----------
  {
    id: 'board', name: '付箋ボード', desc: 'タスクが 1 枚ずつ付箋になって、ボードにピンで留まります',
    variants: [
      { id: 'cork', name: 'コルク', colors: ['#c69c6d', '#fff59d'] },
      { id: 'wall', name: '白い壁', colors: ['#efebe4', '#ffcdd2'] },
      { id: 'peg', name: '有孔ボード', colors: ['#cfe3d8', '#c8e6ff'] },
    ],
  },
  {
    id: 'bento', name: 'ベント', desc: 'タスクが大きなタイルに。左のメニューはアイコンだけの細いレールになります',
    variants: [
      { id: 'tangerine', name: 'みかん', colors: ['#eef0f3', '#ff5a1f'] },
      { id: 'ocean', name: '海', colors: ['#edf2f7', '#2563eb'] },
      { id: 'leaf', name: '若葉', colors: ['#eef3ee', '#16a34a'] },
      { id: 'night', name: '夜', colors: ['#0f1115', '#f5b041'], dark: true },
    ],
  },
  {
    id: 'brutal', name: 'ブルータル', desc: '特大の見出し、太い線、大きなチェック。飾りのない力強い画面',
    variants: [
      { id: 'volt', name: 'ボルト', colors: ['#ffffff', '#e6ff00'] },
      { id: 'pink', name: 'ピンク', colors: ['#ffffff', '#ff3ea5'] },
      { id: 'blue', name: 'ブルー', colors: ['#ffffff', '#2f6bff'] },
      { id: 'black', name: 'ブラック', colors: ['#0a0a0a', '#e6ff00'], dark: true },
    ],
  },
  {
    id: 'planner', name: '手帳', desc: 'リングでとじた手帳を開いたところ。メニューはインデックスのタブ',
    variants: [
      { id: 'leather', name: '革', colors: ['#8a5a3c', '#fbf8f1'] },
      { id: 'navy', name: 'ネイビー', colors: ['#24365c', '#fbf8f1'] },
      { id: 'wine', name: 'ワイン', colors: ['#7a2e3e', '#fbf8f1'] },
      { id: 'forest', name: 'フォレスト', colors: ['#2f5a46', '#fbf8f1'] },
    ],
  },
  {
    id: 'kanban', name: 'カンバン', desc: '今日のリストが横に並ぶ列になり、カードを横にスクロールして見ます',
    variants: [
      { id: 'blue', name: 'ブルー', colors: ['#0079bf', '#ffffff'] },
      { id: 'green', name: 'グリーン', colors: ['#3d8a4a', '#ffffff'] },
      { id: 'grape', name: 'グレープ', colors: ['#89609e', '#ffffff'] },
      { id: 'dark', name: 'ダーク', colors: ['#1d2125', '#22272b'], dark: true },
    ],
  },
  {
    id: 'widget', name: 'ウィジェット', desc: '今日のリストがひとつずつ、カラフルなウィジェットになります',
    variants: [
      { id: 'peach', name: 'ピーチ', colors: ['#ffd1dc', '#ff5e7e'] },
      { id: 'ocean', name: 'オーシャン', colors: ['#c7f0ff', '#2f7bff'] },
      { id: 'candy', name: 'キャンディ', colors: ['#fde2ff', '#8a5cf6'] },
      { id: 'night', name: 'ナイト', colors: ['#14142b', '#ff5e7e'], dark: true },
    ],
  },

  // ---------- シンプル（追加） ----------
  {
    id: 'mono', name: 'モノ', desc: '白と黒と細い線だけ。スイスのポスターのような、きっちりした格子',
    variants: [
      { id: 'red', name: 'レッド', colors: ['#ffffff', '#e4002b'] },
      { id: 'blue', name: 'ブルー', colors: ['#ffffff', '#0047bb'] },
      { id: 'ink', name: 'インク', colors: ['#111111', '#ffffff'], dark: true },
    ],
  },
  {
    id: 'nordic', name: '北欧', desc: 'あたたかい白に、くすんだ緑とテラコッタ。ゆったりした余白',
    variants: [
      { id: 'sage', name: 'セージ', colors: ['#f6f3ee', '#7d9a7e'] },
      { id: 'terracotta', name: 'テラコッタ', colors: ['#f7f1ea', '#c8714d'] },
      { id: 'fjord', name: 'フィヨルド', colors: ['#f1f4f6', '#4f6d8a'] },
    ],
  },
  {
    id: 'frost', name: 'フロスト', desc: '凍った窓ガラスのような、ひんやり澄んだ青白い画面',
    variants: [
      { id: 'ice', name: 'アイス', colors: ['#e8f3fb', '#3a8fd6'] },
      { id: 'mint', name: 'ミント', colors: ['#e6f7f3', '#1fa38a'] },
      { id: 'lilac', name: 'ライラック', colors: ['#f0ecfb', '#7b61d6'] },
    ],
  },
  {
    id: 'linen', name: 'リネン', desc: '麻の布の手ざわり。明朝体の見出しと、やさしい生成り色',
    variants: [
      { id: 'natural', name: 'ナチュラル', colors: ['#efe8dc', '#8c6b4a'] },
      { id: 'indigo', name: '藍', colors: ['#e9ebee', '#33507a'] },
      { id: 'rose', name: 'ローズ', colors: ['#f3e7e4', '#a9566a'] },
    ],
  },
  // ---------- かわいい（追加） ----------
  {
    id: 'candy', name: 'キャンディ', desc: 'ストライプの包み紙と、ぷるんとつやのあるボタン',
    variants: [
      { id: 'strawberry', name: 'いちごミルク', colors: ['#ffe4ec', '#ff5d8f'] },
      { id: 'ramune', name: 'ラムネ', colors: ['#e2f6ff', '#2fb4e8'] },
      { id: 'melon', name: 'メロンソーダ', colors: ['#e5fbe7', '#2ec26a'] },
    ],
  },
  {
    id: 'bear', name: 'くま', desc: 'カードにくまの耳。ふわふわの茶色で、ほっとする画面',
    variants: [
      { id: 'brown', name: 'ちゃいろ', colors: ['#f5ece1', '#a0703f'] },
      { id: 'polar', name: 'しろくま', colors: ['#eef3f7', '#7a9bb5'] },
      { id: 'panda', name: 'パンダ', colors: ['#f3f3f1', '#2b2b2b'] },
    ],
  },
  {
    id: 'sakura', name: 'さくら', desc: '花びらがひらひら舞う、春の画面',
    variants: [
      { id: 'day', name: '昼', colors: ['#fff3f6', '#e4789b'] },
      { id: 'dusk', name: '夕暮れ', colors: ['#fdeee8', '#d9667a'] },
      { id: 'night', name: '夜桜', colors: ['#1c1428', '#f3a6c1'], dark: true },
    ],
  },
  {
    id: 'y2k', name: 'Y2K', desc: 'ホログラムとクロームの 2000 年代。キラキラの星つき',
    variants: [
      { id: 'holo', name: 'ホログラム', colors: ['#f2f0ff', '#9b7bff'] },
      { id: 'bubble', name: 'バブル', colors: ['#fff0fb', '#ff4fc3'] },
      { id: 'chrome', name: 'クローム', colors: ['#eef1f5', '#5a6b85'] },
    ],
  },
  {
    id: 'picnic', name: 'ピクニック', desc: 'ギンガムチェックの敷物の上に、紙ナプキンのカード',
    variants: [
      { id: 'red', name: 'あか', colors: ['#fbe9e7', '#d84339'] },
      { id: 'blue', name: 'あお', colors: ['#e8eff9', '#3a6fc4'] },
      { id: 'green', name: 'みどり', colors: ['#eaf5e6', '#4a9a3c'] },
    ],
  },
  // ---------- ダーク（追加） ----------
  {
    id: 'midnight', name: 'ミッドナイト', desc: '深い紺に金の細い線。ホテルのラウンジのような落ち着き', dark: true,
    variants: [
      { id: 'gold', name: 'ゴールド', colors: ['#0d1426', '#d4af6a'] },
      { id: 'silver', name: 'シルバー', colors: ['#10131a', '#c4ccd8'] },
      { id: 'emerald', name: 'エメラルド', colors: ['#071a17', '#5fc9a5'] },
    ],
  },
  {
    id: 'cyber', name: 'サイバー', desc: '黄色と黒の警告ストライプ、斜めに欠けた角、ゆれる文字', dark: true,
    variants: [
      { id: 'yellow', name: 'イエロー', colors: ['#0b0b0f', '#fcee0a'] },
      { id: 'red', name: 'レッド', colors: ['#0b0b0f', '#ff2a3d'] },
      { id: 'cyan', name: 'シアン', colors: ['#0b0b0f', '#00f0ff'] },
    ],
  },
  {
    id: 'editor', name: 'エディタ', desc: 'コードエディタの画面。行番号がついて、見出しはファイルのタブ', dark: true,
    variants: [
      { id: 'dracula', name: 'ドラキュラ', colors: ['#282a36', '#bd93f9'] },
      { id: 'monokai', name: 'モノカイ', colors: ['#272822', '#a6e22e'] },
      { id: 'solar', name: 'ソーラー', colors: ['#002b36', '#b58900'] },
      { id: 'light', name: 'ライト', colors: ['#fafafa', '#4078f2'], dark: false },
    ],
  },
  {
    id: 'ember', name: '残り火', desc: '黒の中で、オレンジの火の粉がゆっくり立ちのぼる', dark: true,
    variants: [
      { id: 'orange', name: 'オレンジ', colors: ['#120a06', '#ff7a1a'] },
      { id: 'blue', name: '青い炎', colors: ['#060a14', '#4fa3ff'] },
      { id: 'green', name: '鬼火', colors: ['#06120a', '#5cff8a'] },
    ],
  },
  {
    id: 'deepsea', name: '深海', desc: '光の届かない海の底。泡が立ちのぼり、青く光る', dark: true,
    variants: [
      { id: 'abyss', name: '深淵', colors: ['#020b18', '#2fe0d0'] },
      { id: 'jelly', name: 'クラゲ', colors: ['#0b0618', '#c77dff'] },
      { id: 'coral', name: 'サンゴ', colors: ['#120712', '#ff7b9c'] },
    ],
  },
  // ---------- 個性派（追加） ----------
  {
    id: 'blueprint', name: '設計図', desc: '青い方眼紙に白い線。寸法の矢印つきの製図のような画面', dark: true,
    variants: [
      { id: 'blue', name: 'ブループリント', colors: ['#1d4e89', '#ffffff'] },
      { id: 'cad', name: 'CAD', colors: ['#111418', '#38e0ff'] },
      { id: 'pencil', name: '鉛筆', colors: ['#f4f4ef', '#3c4b5c'], dark: false },
    ],
  },
  {
    id: 'museum', name: '美術館', desc: 'カードが額縁に入った絵に。見出しは小さな作品プレート',
    variants: [
      { id: 'gallery', name: 'ギャラリー', colors: ['#ece8e1', '#b8892f'] },
      { id: 'modern', name: '現代美術館', colors: ['#f5f5f5', '#222222'] },
      { id: 'night', name: '夜の美術館', colors: ['#1b1714', '#c9a24a'], dark: true },
    ],
  },
  {
    id: 'botanical', name: '植物図鑑', desc: '古い図鑑の紙に、緑の挿絵と飾り罫',
    variants: [
      { id: 'fern', name: 'シダ', colors: ['#f2ecd9', '#4f7a3a'] },
      { id: 'rose', name: 'バラ', colors: ['#f5e9df', '#a8445b'] },
      { id: 'lavender', name: 'ラベンダー', colors: ['#efebf2', '#6d5a9e'] },
    ],
  },
  {
    id: 'receipt', name: 'レシート', desc: '感熱紙のレシート。今日のタスクが 1 行ずつ印字されます',
    variants: [
      { id: 'white', name: '感熱紙', colors: ['#d9d6d0', '#ffffff'] },
      { id: 'cafe', name: 'カフェ', colors: ['#5a4334', '#fdf8ee'] },
      { id: 'night', name: '夜のレシート', colors: ['#16161a', '#f2f0e8'] },
    ],
  },
  {
    id: 'origami', name: '折り紙', desc: '角を折った色紙のカード。ななめの折り目に影',
    variants: [
      { id: 'classic', name: 'いろがみ', colors: ['#f4f1ea', '#e94f37'] },
      { id: 'washi', name: '千代紙', colors: ['#f6efe6', '#7a4b9a'] },
      { id: 'mono', name: '白い紙', colors: ['#efefef', '#555555'] },
    ],
  },
  // ---------- 大胆（追加） ----------
  {
    id: 'chat', name: 'チャット', desc: 'タスクがメッセージの吹き出しに。見出しは日付の区切り',
    variants: [
      { id: 'green', name: 'グリーン', colors: ['#8fb4d9', '#06c755'] },
      { id: 'blue', name: 'ブルー', colors: ['#f1f1f4', '#0a84ff'] },
      { id: 'dark', name: 'ダーク', colors: ['#0f0f12', '#5e5ce6'], dark: true },
    ],
  },
  {
    id: 'metro', name: 'タイル', desc: '真四角の色タイルがびっしり並ぶ。大きな文字と英字の見出し',
    variants: [
      { id: 'color', name: 'カラフル', colors: ['#1f1f1f', '#00a300'], dark: true },
      { id: 'light', name: 'ライト', colors: ['#f0f0f0', '#2d89ef'] },
      { id: 'mono', name: 'モノ', colors: ['#111111', '#ffffff'], dark: true },
    ],
  },
  {
    id: 'timeline', name: '年表', desc: 'タスクが 1 本の線でつながった年表に。丸い節をたどって進む',
    variants: [
      { id: 'indigo', name: 'インディゴ', colors: ['#f5f6fb', '#4b5bd6'] },
      { id: 'coral', name: 'コーラル', colors: ['#fff6f3', '#f0644c'] },
      { id: 'night', name: '夜', colors: ['#12141c', '#7ee0c3'], dark: true },
    ],
  },
  {
    id: 'cards', name: 'トランプ', desc: 'タスクがトランプのカードに。フェルトのテーブルに並べて', dark: true,
    variants: [
      { id: 'casino', name: 'カジノ', colors: ['#0f5c3a', '#c8102e'] },
      { id: 'navy', name: 'ネイビー', colors: ['#14213d', '#c8102e'] },
      { id: 'wine', name: 'ワイン', colors: ['#4a1020', '#1d1d1d'] },
    ],
  },
  {
    id: 'magazine', name: '雑誌', desc: '大きな番号 01・02… と太い見出し。雑誌の誌面のような画面',
    variants: [
      { id: 'fashion', name: 'ファッション', colors: ['#ffffff', '#ff2e63'] },
      { id: 'travel', name: '旅', colors: ['#f7f3ea', '#e07a2e'] },
      { id: 'tech', name: 'テック', colors: ['#0d0d0d', '#7cff6b'], dark: true },
    ],
  },
  {
    id: 'scrap', name: 'スクラップ', desc: 'ポラロイド写真のようなカードを、テープで貼ったスクラップ帳',
    variants: [
      { id: 'kraft', name: 'クラフト', colors: ['#cdb08a', '#ffffff'] },
      { id: 'black', name: '黒台紙', colors: ['#24211e', '#ffffff'], dark: true },
      { id: 'pink', name: 'ピンク', colors: ['#f7d9e1', '#ffffff'] },
    ],
  },
];

// 設定のスタイル一覧で絞り込むための分類（1 つのスタイルは 1 つの分類だけに入れる）
const STYLE_CATEGORY = {
  glass: 'simple', ios: 'simple', minimal: 'simple', soft: 'simple', material: 'simple', news: 'simple',
  mono: 'simple', nordic: 'simple', frost: 'simple', linen: 'simple',
  pop: 'cute', paper: 'cute', cafe: 'cute', comic: 'cute',
  candy: 'cute', bear: 'cute', sakura: 'cute', y2k: 'cute', picnic: 'cute',
  neon: 'dark', aurora: 'dark', space: 'dark', vapor: 'dark',
  midnight: 'dark', cyber: 'dark', editor: 'dark', ember: 'dark', deepsea: 'dark',
  retro: 'unique', wa: 'unique', chalk: 'unique', terminal: 'unique', rpg: 'unique',
  blueprint: 'unique', museum: 'unique', botanical: 'unique', receipt: 'unique', origami: 'unique',
  board: 'bold', bento: 'bold', brutal: 'bold', planner: 'bold', kanban: 'bold', widget: 'bold',
  chat: 'bold', metro: 'bold', timeline: 'bold', cards: 'bold', magazine: 'bold', scrap: 'bold',
};
const STYLE_FILTERS = [
  { id: 'all', name: 'すべて' },
  { id: 'simple', name: 'シンプル' },
  { id: 'cute', name: 'かわいい' },
  { id: 'dark', name: 'ダーク' },
  { id: 'unique', name: '個性派' },
  { id: 'bold', name: '大胆（配置も変わる）' },
];

// 端末のダークモード（iPhone スタイルはこれに合わせる）
const systemDark = matchMedia('(prefers-color-scheme: dark)');
systemDark.addEventListener('change', () => { if (state.data && styleById(prefs().style).autoDark) { applyAppearance(); renderAll(); } });

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

// 設定のいちばん上：いまのスタイルと色。ほかのスタイルは「スタイルを選ぶ」で一覧から
function variantSwatches(style, currentId) {
  return `<div class="vswatches">${style.variants.map((v) => `<button class="vswatch ${v.id === currentId ? 'on' : ''}" data-pick-variant="${v.id}" aria-label="${v.name}" title="${v.name}">
      <i style="--a:${v.colors[0]};--b:${v.colors[1]}"></i><small>${v.name}</small></button>`).join('')}</div>`;
}

function styleSummary() {
  const p = prefs();
  const style = styleById(p.style);
  const variant = variantOf(style, p.variant);
  return `<div class="style-now">
      <button class="style-now-preview" data-act="style-gallery" aria-label="スタイルを選ぶ">${stylePreview(style, variant)}</button>
      <div class="style-now-text">
        <b>${style.name}<span>・${variant.name}</span></b>
        <small>${style.desc}</small>
        <div class="style-now-btns">
          <button class="btn primary" data-act="style-gallery">${ICON.paint}スタイルを選ぶ（${STYLES.length}種類）</button>
          <button class="btn" data-act="style-random" title="おまかせ">🎲 おまかせ</button>
        </div>
      </div>
    </div>
    <div class="variant-label">色</div>
    ${variantSwatches(style, variant.id)}`;
}

// スタイルの一覧（絞り込みつき）。押すとすぐ全体に反映される
function styleGalleryGrid(filter) {
  const p = prefs();
  const current = styleById(p.style);
  let list = IS_TOUCH ? [styleById('ios'), ...STYLES.filter((s) => s.id !== 'ios')] : STYLES;
  if (filter !== 'all') list = list.filter((s) => STYLE_CATEGORY[s.id] === filter);
  return list.map((s) => {
    const v = s.id === current.id ? variantOf(s, p.variant) : s.variants[0];
    return `<button class="style-tile ${s.id === current.id ? 'on' : ''}" data-pick-style="${s.id}">
      ${stylePreview(s, v)}
      <span class="st-name">${s.name}<i class="st-dots">${s.variants.map((x) => `<i style="background:${x.colors[1]}"></i>`).join('')}</i></span>
    </button>`;
  }).join('');
}

function randomStyle() {
  const p = prefs();
  const others = STYLES.filter((s) => s.id !== p.style);
  const s = others[Math.floor(Math.random() * others.length)];
  const v = s.variants[Math.floor(Math.random() * s.variants.length)];
  setStyle(s.id, v.id);
  return s;
}

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
    id: 'linen', name: 'リネン', desc: '麻の布の手ざわり。明朝体の見出しと、やさしい生成り色',
    variants: [
      { id: 'natural', name: 'ナチュラル', colors: ['#efe8dc', '#8c6b4a'] },
      { id: 'indigo', name: '藍', colors: ['#e9ebee', '#33507a'] },
      { id: 'rose', name: 'ローズ', colors: ['#f3e7e4', '#a9566a'] },
    ],
  },
  // ---------- かわいい（追加） ----------
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
    id: 'picnic', name: 'ピクニック', desc: 'ギンガムチェックの敷物の上に、紙ナプキンのカード',
    variants: [
      { id: 'red', name: 'あか', colors: ['#fbe9e7', '#d84339'] },
      { id: 'blue', name: 'あお', colors: ['#e8eff9', '#3a6fc4'] },
      { id: 'green', name: 'みどり', colors: ['#eaf5e6', '#4a9a3c'] },
    ],
  },
  // ---------- ダーク（追加） ----------
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
    id: 'metro', name: 'タイル', desc: '真四角の色タイルがびっしり並ぶ。大きな文字と英字の見出し',
    variants: [
      { id: 'color', name: 'カラフル', colors: ['#1f1f1f', '#00a300'], dark: true },
      { id: 'light', name: 'ライト', colors: ['#f0f0f0', '#2d89ef'] },
      { id: 'mono', name: 'モノ', colors: ['#111111', '#ffffff'], dark: true },
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

  // ---------- さらに追加：雰囲気がガラッと変わるもの ----------
  {
    id: 'retropc', name: 'レトロPC', desc: '昔のパソコンの画面。リストがひとつずつウィンドウになります',
    variants: [
      { id: 'teal', name: 'クラシック', colors: ['#008080', '#000080'] },
      { id: 'rose', name: 'ローズ', colors: ['#a0566b', '#6b1e3a'] },
      { id: 'sky', name: 'スカイ', colors: ['#3a6ea5', '#0a246a'] },
    ],
  },
  {
    id: 'led', name: '電光掲示板', desc: '駅の発車案内のような、黒い板に光る点の文字', dark: true,
    variants: [
      { id: 'amber', name: 'アンバー', colors: ['#0b0b0b', '#ffb000'] },
      { id: 'green', name: 'グリーン', colors: ['#0b0b0b', '#46ff6e'] },
      { id: 'white', name: 'ホワイト', colors: ['#0b0b0b', '#dfe9ff'] },
    ],
  },
  {
    id: 'stained', name: 'ステンドグラス', desc: 'タスクが 1 枚ずつ色ガラスに。黒い鉛の線でつながります', dark: true,
    variants: [
      { id: 'cathedral', name: '大聖堂', colors: ['#14101c', '#d4a017'] },
      { id: 'modern', name: 'モダン', colors: ['#101418', '#3fb6c8'] },
      { id: 'rose', name: 'バラ窓', colors: ['#1a0d14', '#e0457b'] },
    ],
  },
  {
    id: 'aqua', name: 'アクア', desc: 'ストライプの背景に、つやつやのジェルのボタン。見出しに 3 つの信号',
    variants: [
      { id: 'blue', name: 'ブルー', colors: ['#eef1f5', '#3b8ef0'] },
      { id: 'graphite', name: 'グラファイト', colors: ['#eef0f2', '#8a95a5'] },
      { id: 'lime', name: 'ライム', colors: ['#f0f5ee', '#4caf50'] },
    ],
  },
  {
    id: 'tatami', name: '和室', desc: '畳の床に、障子紙のカード。木の格子と明朝体',
    variants: [
      { id: 'day', name: '昼', colors: ['#c9c38a', '#fdfbf3'] },
      { id: 'night', name: '行灯', colors: ['#3a3424', '#f6d48a'], dark: true },
    ],
  },
  {
    id: 'nightview', name: '夜景', desc: 'ビルの窓に明かりがともる、都会の夜', dark: true,
    variants: [
      { id: 'tokyo', name: 'ネオン', colors: ['#0a0c1e', '#ff4fa3'] },
      { id: 'golden', name: '黄金', colors: ['#120d08', '#ffbf47'] },
      { id: 'blue', name: 'ブルーアワー', colors: ['#0b1636', '#7cc4ff'] },
    ],
  },
  {
    id: 'watercolor', name: '水彩', desc: '画用紙に水彩絵の具をにじませたような、やわらかい色',
    variants: [
      { id: 'spring', name: '春', colors: ['#fbf8f2', '#e7849b'] },
      { id: 'ocean', name: '海', colors: ['#f6f9fa', '#4a90c2'] },
      { id: 'autumn', name: '秋', colors: ['#fbf6ee', '#c8763a'] },
    ],
  },
  {
    id: 'beach', name: '海辺', desc: '空と海と砂浜。画面の下で波がゆっくり寄せては返します',
    variants: [
      { id: 'tropical', name: '南の島', colors: ['#bfeaf5', '#ff7f6a'] },
      { id: 'sunset', name: '夕暮れ', colors: ['#ffd2b0', '#e8556d'] },
    ],
  },
  {
    id: 'snow', name: '雪', desc: '雪がしんしんと降る、静かな冬の画面。カードの上にも雪',
    variants: [
      { id: 'day', name: '雪の日', colors: ['#eef4fa', '#5b8bc4'] },
      { id: 'night', name: '雪の夜', colors: ['#0f1a2e', '#a9c8ff'], dark: true },
    ],
  },
];

// 設定のスタイル一覧で絞り込むための分類（1 つのスタイルは 1 つの分類だけに入れる）
const STYLE_CATEGORY = {
  glass: 'simple', ios: 'simple', minimal: 'simple', soft: 'simple', material: 'simple', news: 'simple',
  mono: 'simple', linen: 'simple',
  pop: 'cute', paper: 'cute', cafe: 'cute', comic: 'cute',
  bear: 'cute', sakura: 'cute', picnic: 'cute',
  neon: 'dark', aurora: 'dark', space: 'dark', vapor: 'dark',
  cyber: 'dark', editor: 'dark', ember: 'dark',
  retro: 'unique', wa: 'unique', chalk: 'unique', terminal: 'unique', rpg: 'unique',
  blueprint: 'unique', museum: 'unique', receipt: 'unique', origami: 'unique',
  board: 'bold', bento: 'bold', brutal: 'bold', planner: 'bold', kanban: 'bold', widget: 'bold',
  metro: 'bold', cards: 'bold', magazine: 'bold',
  retropc: 'bold', led: 'bold', stained: 'bold',
  aqua: 'unique', tatami: 'unique',
  nightview: 'dark',
  watercolor: 'cute', beach: 'cute',
  snow: 'simple',
};
const STYLE_FILTERS = [
  { id: 'all', name: 'すべて' },
  { id: 'fav', name: '★ お気に入り' },
  { id: 'recent', name: '最近' },
  { id: 'simple', name: 'シンプル' },
  { id: 'cute', name: 'かわいい' },
  { id: 'dark', name: 'ダーク' },
  { id: 'unique', name: '個性派' },
  { id: 'bold', name: '大胆（配置も変わる）' },
];

// 端末のダークモード（iPhone スタイルはこれに合わせる）
const systemDark = matchMedia('(prefers-color-scheme: dark)');
systemDark.addEventListener('change', () => { if (state.data && styleById(prefs().style).autoDark) { applyAppearance(); renderAll(); } });

const styleById = (id) => STYLES.find((s) => s.id === liveStyleId(id)) || STYLES[0];
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
  if (p.style !== style.id) p.styleRecent = [p.style, ...(p.styleRecent || []).filter((x) => x !== p.style && x !== style.id)].slice(0, 12);
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

// スタイルの一覧（絞り込み・検索つき）。押すとすぐ全体に反映される
const kana = (t) => String(t).toLowerCase().replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
function styleList(filter = 'all', query = '') {
  const p = prefs();
  let list = IS_TOUCH ? [styleById('ios'), ...STYLES.filter((s) => s.id !== 'ios')] : STYLES;
  if (filter === 'fav') list = list.filter((s) => (p.styleFavs || []).includes(s.id));
  else if (filter === 'recent') list = (p.styleRecent || []).map((id) => STYLES.find((s) => s.id === id)).filter(Boolean);
  else if (filter !== 'all') list = list.filter((s) => STYLE_CATEGORY[s.id] === filter);
  const q = kana(query.trim());
  if (q) {
    const cat = (s) => (STYLE_FILTERS.find((f) => f.id === STYLE_CATEGORY[s.id]) || {}).name || '';
    list = list.filter((s) => q.split(/\s+/).every((w) => kana([s.name, s.desc, cat(s), s.id, ...s.variants.map((v) => v.name)].join(' ')).includes(w)));
  }
  return list;
}
const styleFilterCount = (id) => styleList(id).length;

function styleGalleryGrid(filter, query = '') {
  const p = prefs();
  const current = styleById(p.style);
  const list = styleList(filter, query);
  if (!list.length) {
    const msg = query ? '見つかりませんでした' : filter === 'fav' ? 'スタイルの ☆ を押すと、ここに集まります' : 'まだほかのスタイルを使っていません';
    return `<div class="style-empty">${msg}</div>`;
  }
  const favs = p.styleFavs || [];
  return list.map((s) => {
    const v = s.id === current.id ? variantOf(s, p.variant) : s.variants[0];
    const fav = favs.includes(s.id);
    return `<div class="style-tile ${s.id === current.id ? 'on' : ''}" data-pick-style="${s.id}" role="button" tabindex="0" title="${s.desc}">
      ${stylePreview(s, v)}
      <span class="st-name"><span class="st-label">${s.name}</span><i class="st-dots">${s.variants.map((x) => `<i style="background:${x.colors[1]}"></i>`).join('')}</i></span>
      <button class="st-fav ${fav ? 'on' : ''}" data-fav-style="${s.id}" aria-label="${fav ? 'お気に入りから外す' : 'お気に入りに入れる'}">${fav ? '★' : '☆'}</button>
    </div>`;
  }).join('');
}

function toggleStyleFav(id) {
  const p = prefs();
  const favs = p.styleFavs || [];
  p.styleFavs = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];
  save();
  return p.styleFavs.includes(id);
}

// 日替わりスタイル：日付が変わったら、お気に入り（または全部）から 1 つ選ぶ
function dailyStyle() {
  const p = prefs();
  if (!p.styleDaily || p.styleDaily === 'off' || p.styleDailyDay === state.today) return false;
  const favs = (p.styleFavs || []).filter((id) => STYLES.some((s) => s.id === id));
  const pool = p.styleDaily === 'fav' && favs.length >= 2 ? favs.map(styleById) : STYLES;
  // 日付から決めるので、同じ日はいつ開いても同じスタイル
  let h = 0;
  for (const c of state.today) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  let s = pool[h % pool.length];
  if (s.id === p.style && pool.length > 1) s = pool[(h + 1) % pool.length];
  p.styleDailyDay = state.today;
  setStyle(s.id, s.variants[(h >> 4) % s.variants.length].id);
  return true;
}

function randomStyle(pool = STYLES) {
  const p = prefs();
  let others = pool.filter((s) => s.id !== p.style);
  if (!others.length) others = STYLES.filter((s) => s.id !== p.style);
  const s = others[Math.floor(Math.random() * others.length)];
  const v = s.variants[Math.floor(Math.random() * s.variants.length)];
  setStyle(s.id, v.id);
  return s;
}

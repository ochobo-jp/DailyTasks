'use strict';

// ============================================================
//  単語帳：表と裏のカード。覚えたカードほど間をあけて出す（ライトナー方式）
//  箱 0〜5。「覚えた」で 1 つ上の箱へ、「まだ」で箱 0 にもどる
// ============================================================

const BOX_DAYS = [0, 1, 2, 4, 7, 15, 30];

function decks() {
  state.data.decks ||= [];
  return state.data.decks;
}
const deckById = (id) => decks().find((d) => d.id === id);
const cardDue = (c) => !c.due || c.due <= state.today;
const deckDue = (d) => d.cards.filter(cardDue);
const deckLearned = (d) => d.cards.filter((c) => (c.box || 0) >= 4).length;

function newDeck(name) {
  const d = { id: uid(), name: name.trim() || '単語帳', cards: [], createdAt: state.today };
  decks().push(d);
  return d;
}

// 「apple りんご」「apple = りんご」「apple, りんご」「apple（タブ）りんご」
function parseCard(line) {
  const t = line.trim();
  if (!t) return null;
  let m = /^(.+?)\s*(?:\t|=|＝|:|：|,|，|、|→|->)\s*(.+)$/.exec(t);
  if (!m) m = /^(\S+)\s+(.+)$/.exec(t);
  if (!m) return null;
  return { id: uid(), q: m[1].trim(), a: m[2].trim(), box: 0, due: null };
}

function addCards(deck, text) {
  const cards = text.split(/\n/).map(parseCard).filter(Boolean);
  deck.cards.push(...cards);
  return cards;
}

function answerCard(card, known) {
  card.box = known ? Math.min(BOX_DAYS.length - 1, (card.box || 0) + 1) : 0;
  card.due = known ? addDays(state.today, BOX_DAYS[card.box]) : state.today;
  card.seen = (card.seen || 0) + 1;
  const log = (state.data.studyLog ||= {});
  log[state.today] = (log[state.today] || 0) + 1;
}

// ---------- 画面 ----------

function deckCard(d) {
  const due = deckDue(d).length;
  const pct = d.cards.length ? Math.round((deckLearned(d) / d.cards.length) * 100) : 0;
  return `<button class="deck-card" data-act="deck-open" data-id="${d.id}" data-kind="deck">
    <b>${escapeHtml(d.name)}</b>
    <span class="deck-meta">${d.cards.length} 枚${due ? ` ・ <em>今日 ${due} 枚</em>` : ''}</span>
    <span class="deck-bar"><i style="width:${pct}%"></i></span>
    <small>覚えた ${pct}%</small>
  </button>`;
}

function renderStudyView() {
  if (state.study) return renderStudySession();
  const deck = deckById(state.deckId);
  if (deck) return renderDeck(deck);
  const list = decks();
  const totalDue = list.reduce((s, d) => s + deckDue(d).length, 0);
  const today = (state.data.studyLog || {})[state.today] || 0;
  return `${pageHead('単語帳', totalDue ? `今日おぼえるカード ${totalDue} 枚${today ? `・今日 ${today} 枚やった` : ''}` : (today ? `今日 ${today} 枚やりました` : '覚えたものほど、間をあけて出てきます'))}
    ${list.length ? `<div class="deck-grid">${list.map(deckCard).join('')}</div>`
      : emptyState('🃏', '単語帳はまだありません。<br>下の欄に「英単語」のように名前を書くと作れます')}`;
}

function renderDeck(d) {
  const due = deckDue(d).length;
  const rows = d.cards.map((c) => `<div class="item card-row" data-kind="flash" data-id="${c.id}">
      <span class="box-dots" title="箱 ${c.box || 0}">${'●'.repeat(c.box || 0)}${'○'.repeat(BOX_DAYS.length - 1 - (c.box || 0))}</span>
      <div class="body"><div class="title">${escapeHtml(c.q)}</div><div class="meta"><span>${escapeHtml(c.a)}</span></div></div>
      <div class="row-actions"><button class="mini-btn del" data-act="flash-del" data-id="${c.id}" data-tip="消す">${ICON.trash}</button></div>
    </div>`);
  return `<div class="page-head always"><button class="mini-btn" data-act="deck-back" aria-label="一覧にもどる">${ICON.chevL}</button>
      <div class="page-title"><h1>${escapeHtml(d.name)}</h1><div class="page-sub">${d.cards.length} 枚・覚えた ${deckLearned(d)} 枚</div></div>
      <span class="spacer"></span><button class="mini-btn" data-act="deck-menu" data-id="${d.id}" aria-label="メニュー">${ICON.more}</button></div>
    <div class="study-actions">
      <button class="btn primary big-btn" data-act="study-start" ${d.cards.length ? '' : 'disabled'}>${ICON.play}${due ? `今日の ${due} 枚をおぼえる` : '全部をおさらいする'}</button>
    </div>
    ${rows.length ? section('カード', rows, { count: rows.length })
      : emptyState('✍️', '下の欄に「apple りんご」のように書くとカードになります。<br>何行かまとめて貼り付けても OK')}`;
}

function startStudy(d) {
  const due = deckDue(d);
  const pool = (due.length ? due : [...d.cards]).sort(() => Math.random() - 0.5);
  state.study = { deckId: d.id, queue: pool.map((c) => c.id), flipped: false, done: 0, known: 0, total: pool.length };
}

function renderStudySession() {
  const st = state.study;
  const d = deckById(st.deckId);
  if (!d || !st.queue.length) {
    const msg = st.total ? `${st.total} 枚おわり！ 一回で覚えていたのは ${st.known} 枚` : 'おぼえるカードはありません';
    return `<div class="study-done"><div class="big">🎉</div><h2>${msg}</h2>
      <button class="btn primary" data-act="study-end">もどる</button></div>`;
  }
  const c = d.cards.find((x) => x.id === st.queue[0]);
  const front = st.reverse ? c.a : c.q;
  const back = st.reverse ? c.q : c.a;
  return `<div class="study">
    <div class="study-top"><button class="mini-btn" data-act="study-end" aria-label="やめる">${ICON.close}</button>
      <span class="study-progress"><i style="width:${(st.done / st.total) * 100}%"></i></span><span class="muted small">${st.done}/${st.total}</span>
      <button class="chip ${st.reverse ? 'on' : ''}" data-act="study-reverse">裏から</button></div>
    <button class="flash ${st.flipped ? 'flipped' : ''}" data-act="study-flip">
      <span class="flash-face front">${escapeHtml(front)}</span>
      <span class="flash-face back"><small>${escapeHtml(front)}</small>${escapeHtml(back)}</span>
    </button>
    ${st.flipped ? `<div class="study-answer">
        <button class="btn study-no" data-act="study-answer" data-v="0">まだ</button>
        <button class="btn primary study-yes" data-act="study-answer" data-v="1">覚えた</button></div>`
      : `<div class="study-hint muted small">${TAP}してめくる</div>`}
  </div>`;
}

function studyAddbar(input, opts, roomy) {
  const d = deckById(state.deckId);
  if (state.study) { $('#addbar').hidden = true; return; }
  input.placeholder = d ? (roomy ? `「${d.name}」にカードを追加…　例：apple りんご　／　photosynthesis = 光合成` : '例：apple りんご') : '新しい単語帳の名前（例：英単語）';
  opts.innerHTML = '';
}

function studyAddFromText(text) {
  const d = deckById(state.deckId);
  if (!d) {
    const nd = newDeck(text);
    state.deckId = nd.id;
    return { kind: 'deck', item: nd };
  }
  const cards = addCards(d, text);
  if (!cards.length) { toast('「表 裏」の形で書いてください（例：apple りんご）'); return null; }
  return { kind: 'flash', item: cards[0] };
}

function deckMenu(d, x, y) {
  openMenu(x, y, `<div class="menu-title">🃏 ${escapeHtml(d.name)}</div>
    <button class="menu-item" data-m="rename">${ICON.edit}<span>名前を変える</span></button>
    <button class="menu-item" data-m="reset">${ICON.reset}<span>覚えた記録をリセット</span></button>
    <button class="menu-item danger" data-m="del">${ICON.trash}<span>単語帳を消す</span></button>`, (m) => {
    if (m === 'rename') {
      setTimeout(() => openSheet(`
        <div class="sheet-head"><h2>単語帳の名前</h2><span class="spacer"></span><button class="icon-btn" id="dClose" aria-label="閉じる">${ICON.close}</button></div>
        ${field('名前', `<input class="text" id="dName" value="${escapeHtml(d.name)}">`)}`, (el) => {
        $('#dClose', el).onclick = closeSheet;
        $('#dName', el).oninput = (e) => { d.name = e.target.value.trim() || d.name; save(); };
        setTimeout(() => $('#dName', el).select(), 50);
        return () => refresh();
      }), 0);
    }
    if (m === 'reset') { d.cards.forEach((c) => { c.box = 0; c.due = null; }); save(); refresh(); toast('リセットしました', { undo: true }); }
    if (m === 'del') { state.data.decks = decks().filter((x) => x !== d); state.deckId = null; save(); refresh(); toast('単語帳を消しました', { undo: true }); }
  });
}

const STUDY_ACTIONS = {
  'deck-open': (el) => { state.deckId = el.dataset.id; transition(() => { renderContent(); renderAddbar(); }); },
  'deck-back': () => { state.deckId = null; transition(() => { renderContent(); renderAddbar(); }); },
  'deck-menu': (el, e) => { const d = deckById(el.dataset.id); const r = el.getBoundingClientRect(); if (d) deckMenu(d, r.left, r.bottom + 4); },
  'flash-del': (el) => { const d = deckById(state.deckId); if (!d) return; d.cards = d.cards.filter((c) => c.id !== el.dataset.id); save(); refresh(); },
  'study-start': () => { const d = deckById(state.deckId); if (!d) return; startStudy(d); renderContent(); renderAddbar(); },
  'study-flip': () => { if (!state.study) return; state.study.flipped = !state.study.flipped; renderContent(); },
  'study-reverse': () => { state.study.reverse = !state.study.reverse; state.study.flipped = false; renderContent(); },
  'study-answer': (el) => {
    const st = state.study;
    const d = deckById(st.deckId);
    const c = d && d.cards.find((x) => x.id === st.queue[0]);
    if (!c) return;
    const known = el.dataset.v === '1';
    if (known && !c._missed) st.known++;
    answerCard(c, known);
    st.queue.shift();
    if (!known) { c._missed = true; st.queue.push(c.id); } else { delete c._missed; st.done++; }
    st.flipped = false;
    if (prefs().sound) chime(known ? 'tick' : 'soft');
    save();
    renderContent();
  },
  'study-end': () => { if (state.study) { const d = deckById(state.study.deckId); d?.cards.forEach((c) => delete c._missed); } state.study = null; renderContent(); renderAddbar(); },
};

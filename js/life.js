'use strict';

// ============================================================
//  くらし：買い物リスト・お金（家計簿）・メモ・カウントダウン
//  毎日のこまごましたことを、このアプリだけで済ませるための画面
// ============================================================

const LIFE_TABS = [
  { id: 'shop', label: '買い物', icon: 'cart' },
  { id: 'money', label: 'お金', icon: 'wallet' },
  { id: 'notes', label: 'メモ', icon: 'note' },
  { id: 'count', label: 'カウントダウン', icon: 'hourglass' },
];

const MONEY_CATS = [
  { id: 'food', name: '食費', icon: '🍙', words: ['ランチ', '昼', '朝食', '夕飯', '夜ご飯', 'ごはん', 'ご飯', '弁当', 'コンビニ', 'スーパー', 'カフェ', 'コーヒー', 'お菓子', 'おやつ', '飲み物', 'パン', '外食', 'マック', 'スタバ', '食'] },
  { id: 'daily', name: '日用品', icon: '🧻', words: ['日用品', '洗剤', 'ティッシュ', 'シャンプー', '薬', 'ドラッグ', '100均', 'ダイソー'] },
  { id: 'move', name: '交通', icon: '🚃', words: ['電車', 'バス', 'タクシー', '定期', '交通', 'ガソリン', '駐車', 'suica', 'スイカ'] },
  { id: 'fun', name: '娯楽', icon: '🎮', words: ['映画', 'ゲーム', 'カラオケ', 'ライブ', 'チケット', '漫画', 'マンガ', '課金', 'サブスク', '遊'] },
  { id: 'style', name: '服・美容', icon: '👕', words: ['服', '靴', '美容', '化粧', 'コスメ', 'ネイル', 'ヘア', 'カット'] },
  { id: 'study', name: '勉強', icon: '📚', words: ['本', '参考書', 'ノート', '文房具', 'ペン', '勉強', '教材', '検定', '模試'] },
  { id: 'social', name: '交際', icon: '🎁', words: ['プレゼント', '飲み会', '会費', '誕生日', 'お祝い', 'ご祝儀'] },
  { id: 'other', name: 'その他', icon: '📦', words: [] },
  { id: 'income', name: '収入', icon: '💰', words: ['バイト', '給料', 'お小遣い', 'おこづかい', '収入', '入金', 'お年玉'] },
];
const moneyCat = (id) => MONEY_CATS.find((c) => c.id === id) || MONEY_CATS[7];
const yen = (n) => `¥${Math.round(Math.abs(n)).toLocaleString('ja-JP')}`;

function emptyLife() {
  return { shop: [], shopHistory: {}, money: { entries: [], budget: 0 }, notes: [], countdowns: [] };
}
function life() {
  if (!state.data.life) state.data.life = emptyLife();
  const l = state.data.life;
  l.shop ||= []; l.shopHistory ||= {}; l.money ||= { entries: [], budget: 0 }; l.money.entries ||= []; l.notes ||= []; l.countdowns ||= [];
  return l;
}

// ---------- 買い物 ----------

function addShopItems(text) {
  const names = text.split(/[、,，\n]+/).map((x) => x.trim()).filter(Boolean);
  const l = life();
  const added = [];
  for (const raw of names) {
    const m = /^(.*?)\s*(?:[x×＊*]\s*(\d+)|(\d+)\s*(?:個|本|袋|パック|枚|つ))$/.exec(raw);
    const name = (m ? m[1] : raw).trim() || raw;
    const qty = m ? Number(m[2] || m[3]) : 1;
    const same = l.shop.find((x) => !x.done && x.name === name);
    if (same) { same.qty = (same.qty || 1) + qty; added.push(same); continue; }
    const item = { id: uid(), name, qty, done: false, addedAt: state.today };
    l.shop.push(item);
    l.shopHistory[name] = (l.shopHistory[name] || 0) + 1;
    added.push(item);
  }
  return added;
}

function shopRow(x) {
  return `<div class="item shop ${x.done ? 'done' : ''}" data-kind="shop" data-id="${x.id}">
    <button class="check" data-act="shop-toggle" data-id="${x.id}" aria-label="${x.done ? 'もどす' : 'カゴに入れた'}">${ICON.check}</button>
    <div class="body"><div class="title">${escapeHtml(x.name)}${x.qty > 1 ? ` <span class="qty">×${x.qty}</span>` : ''}</div></div>
    <div class="row-actions"><button class="mini-btn del" data-act="shop-del" data-id="${x.id}" data-tip="消す">${ICON.trash}</button></div>
  </div>`;
}

function renderShop() {
  const l = life();
  const todo = l.shop.filter((x) => !x.done);
  const done = l.shop.filter((x) => x.done);
  const inList = new Set(todo.map((x) => x.name));
  const freq = Object.entries(l.shopHistory).filter(([n]) => !inList.has(n)).sort((a, b) => b[1] - a[1]).slice(0, 12);
  return `
    ${freq.length ? `<div class="section"><div class="section-head"><span>よく買うもの</span><span class="muted small">押すとリストに入ります</span></div>
      <div class="chips shop-freq">${freq.map(([n]) => `<button class="chip" data-act="shop-add" data-name="${escapeHtml(n)}">${ICON.plus}${escapeHtml(n)}</button>`).join('')}</div></div>` : ''}
    ${todo.length ? section('買うもの', todo.map(shopRow), { count: todo.length })
      : emptyState('🛒', '買うものはありません。<br>下の欄に「牛乳、卵、パン」のように書くと、まとめて入ります')}
    ${done.length ? section('カゴに入れた', done.map(shopRow), { count: done.length, link: '<button class="link" data-act="shop-clear">カゴのものを消す</button>' }) : ''}`;
}

// ---------- お金 ----------

const MONEY_IN_WORDS = /(\+|＋|収入|入金|バイト代|給料|お小遣い|おこづかい|お年玉)/;

function parseMoney(text) {
  const m = /([+＋-]?)\s*[¥￥]?\s*([0-9０-９][0-9０-９,，]*)\s*円?/.exec(text);
  if (!m) return null;
  const amount = Number(m[2].replace(/[,，]/g, '').replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)));
  if (!amount) return null;
  let rest = (text.slice(0, m.index) + text.slice(m.index + m[0].length)).trim();
  // 「昨日」「おととい」の分（家計簿はあとから付けることが多い）
  let back = 0;
  if (/一昨日|おととい/.test(rest)) back = 2;
  else if (/昨日|きのう/.test(rest)) back = 1;
  rest = rest.replace(/一昨日|おととい|昨日|きのう/g, ' ').replace(/\s+/g, ' ').trim();
  const p = parseQuick(rest || '', state.today);
  const note = (p.title || rest).trim();
  const income = MONEY_IN_WORDS.test(text);
  const lower = note.toLowerCase();
  let cat = income ? 'income' : 'other';
  if (!income) {
    for (const c of MONEY_CATS) {
      if (c.id === 'income') continue;
      if (lower.includes(c.name) || c.words.some((w) => lower.includes(w.toLowerCase()))) { cat = c.id; break; }
    }
  }
  const date = back ? addDays(state.today, -back) : (p.due && p.due <= state.today ? p.due : state.today);
  return { amount, note: note.replace(/^[+＋]/, '').trim(), cat, kind: income ? 'in' : 'out', date };
}

function addMoney(text) {
  const e = parseMoney(text);
  if (!e) return null;
  const entry = { id: uid(), ...e };
  life().money.entries.push(entry);
  return entry;
}

function monthEntries(month) {
  return life().money.entries.filter((e) => e.date.startsWith(month));
}

function moneyRow(e) {
  const c = moneyCat(e.cat);
  return `<div class="item money ${e.kind === 'in' ? 'income' : ''}" data-kind="money" data-id="${e.id}">
    <span class="money-ic">${c.icon}</span>
    <div class="body" data-act="money-open" data-id="${e.id}"><div class="title">${escapeHtml(e.note || c.name)}</div><div class="meta"><span>${c.name}</span></div></div>
    <b class="money-amt">${e.kind === 'in' ? '+' : '−'}${yen(e.amount)}</b>
  </div>`;
}

function renderMoney() {
  const l = life();
  const month = state.moneyMonth || state.today.slice(0, 7);
  const list = monthEntries(month);
  const out = list.filter((e) => e.kind !== 'in').reduce((s, e) => s + e.amount, 0);
  const inc = list.filter((e) => e.kind === 'in').reduce((s, e) => s + e.amount, 0);
  const isThis = month === state.today.slice(0, 7);
  const today = list.filter((e) => e.date === state.today && e.kind !== 'in').reduce((s, e) => s + e.amount, 0);
  const budget = l.money.budget || 0;
  const [y, mo] = month.split('-').map(Number);
  const daysInMonth = new Date(y, mo, 0).getDate();
  const daysLeft = isThis ? daysInMonth - Number(state.today.slice(8)) + 1 : 0;
  const left = budget - out;
  const byCat = MONEY_CATS.filter((c) => c.id !== 'income')
    .map((c) => ({ c, sum: list.filter((e) => e.cat === c.id && e.kind !== 'in').reduce((s, e) => s + e.amount, 0) }))
    .filter((x) => x.sum > 0).sort((a, b) => b.sum - a.sum);
  const max = Math.max(1, ...byCat.map((x) => x.sum));
  const days = [...new Set(list.map((e) => e.date))].sort().reverse();
  return `
    <section class="card money-head">
      <div class="money-month">
        <button class="mini-btn" data-act="money-month" data-d="-1" aria-label="前の月">${ICON.chevL}</button>
        <b>${y}年${mo}月</b>
        <button class="mini-btn" data-act="money-month" data-d="1" aria-label="次の月" ${isThis ? 'disabled' : ''}>${ICON.chevR}</button>
      </div>
      <div class="money-big"><small>使ったお金</small><b>${yen(out)}</b>${inc ? `<span class="money-in">収入 +${yen(inc)}</span>` : ''}</div>
      ${budget ? `<div class="money-bar ${left < 0 ? 'over' : ''}"><i style="width:${Math.min(100, (out / budget) * 100)}%"></i></div>
        <div class="money-sub"><span>予算 ${yen(budget)}</span><span>${left >= 0 ? `残り ${yen(left)}` : `${yen(-left)} オーバー`}</span>
        ${isThis && left > 0 && daysLeft ? `<span>1 日 ${yen(left / daysLeft)} まで</span>` : ''}</div>`
      : `<button class="link" data-act="money-budget">＋ 1 か月の予算を決める</button>`}
      ${isThis ? `<div class="money-sub"><span>今日 ${yen(today)}</span>${budget ? '<button class="link" data-act="money-budget">予算を変える</button>' : ''}</div>` : ''}
    </section>
    ${byCat.length ? `<section class="card money-cats"><div class="card-head">何に使った？</div>
      ${byCat.map(({ c, sum }) => `<div class="money-cat"><span>${c.icon} ${c.name}</span><i style="--w:${(sum / max) * 100}%"></i><b>${yen(sum)}</b></div>`).join('')}</section>` : ''}
    ${days.length ? days.map((d) => {
      const rows = list.filter((e) => e.date === d).reverse();
      const sum = rows.filter((e) => e.kind !== 'in').reduce((s, e) => s + e.amount, 0);
      return section(`${relDate(d, state.today)}`, rows.map(moneyRow), { count: sum ? yen(sum) : '' });
    }).join('') : emptyState('💴', 'まだ記録がありません。<br>下の欄に「ランチ 850」「+3000 バイト」のように書くと記録できます')}`;
}

// ---------- メモ ----------

function addNote(text) {
  const n = { id: uid(), text: text.trim(), pinned: false, color: 0, updatedAt: Date.now() };
  life().notes.unshift(n);
  return n;
}

const NOTE_COLORS = ['', '#fff3a8', '#ffd6e0', '#cfe8ff', '#d7f5d0', '#eadcff'];

function noteCard(n) {
  const [first, ...rest] = n.text.split('\n');
  const d = new Date(n.updatedAt);
  return `<button class="note-card ${n.pinned ? 'pinned' : ''}" data-act="note-open" data-id="${n.id}" data-kind="note" ${n.color ? `style="--note:${NOTE_COLORS[n.color]}"` : ''}>
    ${n.pinned ? `<span class="note-pin">${ICON.pin}</span>` : ''}
    <b>${escapeHtml(first || '（空のメモ）')}</b>
    ${rest.join('\n').trim() ? `<span class="note-body">${escapeHtml(rest.join('\n').trim())}</span>` : ''}
    <small>${d.getMonth() + 1}/${d.getDate()}</small>
  </button>`;
}

function renderNotes() {
  const q = normalize(state.noteQuery || '');
  const notes = life().notes.filter((n) => !q || normalize(n.text).includes(q))
    .sort((a, b) => (b.pinned - a.pinned) || (b.updatedAt - a.updatedAt));
  return `
    ${life().notes.length > 4 ? `<label class="search">${ICON.search}<input id="noteSearch" type="search" data-focus-key="noteSearch" placeholder="メモを探す" value="${escapeHtml(state.noteQuery || '')}"></label>` : ''}
    ${notes.length ? `<div class="note-grid">${notes.map(noteCard).join('')}</div>`
      : emptyState('📝', q ? '見つかりませんでした' : 'メモはまだありません。<br>思いついたことを下の欄に書いておけます。1 行目がタイトルになります')}`;
}

function openNoteSheet(n) {
  openSheet(`
    <div class="sheet-head"><h2>メモ</h2><span class="spacer"></span>
      <button class="icon-btn ${n.pinned ? 'on' : ''}" id="nPin" title="上に固定">${ICON.pin}</button>
      <button class="icon-btn" id="nClose" aria-label="閉じる">${ICON.close}</button></div>
    <textarea class="text autosize note-edit" id="nText" rows="8" placeholder="1 行目がタイトルになります">${escapeHtml(n.text)}</textarea>
    <div class="note-colors">${NOTE_COLORS.map((c, i) => `<button class="note-color ${n.color === i ? 'on' : ''}" data-color="${i}" style="background:${c || 'var(--field)'}" aria-label="色 ${i + 1}"></button>`).join('')}</div>
    <div class="sheet-foot"><button class="btn danger" id="nDel">${ICON.trash}消す</button><span class="spacer"></span><small class="muted">変更はすぐ保存されます</small></div>`, (el) => {
    const ta = $('#nText', el);
    ta.oninput = () => { n.text = ta.value; n.updatedAt = Date.now(); save(); };
    $('#nPin', el).onclick = (e) => { n.pinned = !n.pinned; e.currentTarget.classList.toggle('on', n.pinned); save(); refresh(); };
    $('#nClose', el).onclick = closeSheet;
    $('#nDel', el).onclick = () => { checkpoint(); life().notes = life().notes.filter((x) => x !== n); closeSheet(); save(); refresh(); toast('メモを消しました', { undo: true }); };
    el.addEventListener('click', (e) => {
      const c = e.target.closest('[data-color]');
      if (!c) return;
      n.color = Number(c.dataset.color);
      $$('[data-color]', el).forEach((x) => x.classList.toggle('on', x === c));
      save(); refresh();
    });
    if (!n.text) setTimeout(() => ta.focus(), 50);
    return () => { if (!n.text.trim()) { life().notes = life().notes.filter((x) => x !== n); save(); } refresh(); };
  });
}

// ---------- カウントダウン ----------

const COUNT_EMOJI = [[/誕生日|バースデー/, '🎂'], [/テスト|試験|模試|検定|受験/, '📝'], [/旅行|旅/, '✈️'], [/ライブ|コンサート/, '🎤'], [/記念日|付き合/, '💐'], [/卒業/, '🎓'], [/入学|新学期/, '🌸'], [/締め切り|締切|提出/, '⏰'], [/クリスマス/, '🎄'], [/夏休み|冬休み|春休み|休み/, '🏖️']];

function addCountdown(text) {
  const yearly = /毎年/.test(text);
  const em = /^(\p{Extended_Pictographic}️?)\s*/u.exec(text);
  const body = text.replace(/毎年/g, ' ').replace(em ? em[0] : '', '').trim();
  const p = parseQuick(body, state.today);
  if (!p.due) return null;
  const title = (p.title || body).trim();
  const emoji = em ? em[1] : (COUNT_EMOJI.find(([re]) => re.test(title)) || [null, '📅'])[1];
  const c = { id: uid(), title, date: p.due, yearly, emoji };
  life().countdowns.push(c);
  return c;
}

// 次にくる日（毎年のものは今年か来年）
function countdownNext(c) {
  if (!c.yearly) return c.date;
  const md = c.date.slice(5);
  const y = Number(state.today.slice(0, 4));
  const thisYear = `${y}-${md}`;
  return thisYear >= state.today ? thisYear : `${y + 1}-${md}`;
}
const countdownDays = (c) => diffDays(countdownNext(c), state.today);

function countdownsSorted() {
  return life().countdowns.map((c) => ({ c, days: countdownDays(c) }))
    .filter((x) => x.days >= 0 || x.days > -2)
    .sort((a, b) => a.days - b.days);
}

function countCard({ c, days }) {
  return `<button class="count-card ${days === 0 ? 'today' : ''} ${days < 0 ? 'past' : ''}" data-act="count-open" data-id="${c.id}" data-kind="count">
    <span class="count-emoji">${c.emoji}</span>
    <span class="count-title">${escapeHtml(c.title)}</span>
    <span class="count-days">${days === 0 ? '<b>今日！</b>' : days > 0 ? `あと<b>${days}</b>日` : `${-days}日前`}</span>
    <small>${shortDate(countdownNext(c))}${c.yearly ? '・毎年' : ''}</small>
  </button>`;
}

function renderCountdowns() {
  const list = countdownsSorted();
  const past = life().countdowns.filter((c) => countdownDays(c) < -1);
  return `${list.length ? `<div class="count-grid">${list.map(countCard).join('')}</div>`
    : emptyState('⏳', 'テストや誕生日まであと何日？<br>下の欄に「期末テスト 12/20」「🎂 ママの誕生日 5/3 毎年」のように書きます')}
    ${past.length ? `<details class="section fold" data-fold="count-past"><summary class="section-head"><span><span class="chev">›</span>終わったもの <span class="count">${past.length}</span></span></summary>
      <div class="count-grid">${past.map((c) => countCard({ c, days: countdownDays(c) })).join('')}</div></details>` : ''}`;
}

function openCountSheet(c) {
  openSheet(`
    <div class="sheet-head"><h2>${c.emoji} カウントダウン</h2><span class="spacer"></span><button class="icon-btn" id="cClose" aria-label="閉じる">${ICON.close}</button></div>
    <div class="sheet-grid">
      ${field('なまえ', `<input class="text" id="cTitle" value="${escapeHtml(c.title)}">`)}
      ${field('日付', `<input class="text" type="date" id="cDate" value="${c.date}">`)}
      ${field('絵文字', `<input class="text" id="cEmoji" value="${escapeHtml(c.emoji)}" maxlength="4">`)}
      ${field('毎年くり返す', sw('cYearly', c.yearly))}
    </div>
    <div class="sheet-foot"><button class="btn danger" id="cDel">${ICON.trash}消す</button></div>`, (el) => {
    $('#cClose', el).onclick = closeSheet;
    $('#cTitle', el).oninput = (e) => { c.title = e.target.value; save(); };
    $('#cDate', el).onchange = (e) => { if (e.target.value) { c.date = e.target.value; save(); refresh(); } };
    $('#cEmoji', el).oninput = (e) => { c.emoji = e.target.value || '📅'; save(); };
    $('#cYearly', el).onclick = (e) => { c.yearly = !c.yearly; setSwitch(e.currentTarget, c.yearly); save(); refresh(); };
    $('#cDel', el).onclick = () => { checkpoint(); life().countdowns = life().countdowns.filter((x) => x !== c); closeSheet(); save(); refresh(); toast('消しました', { undo: true }); };
    return () => refresh();
  });
}

// 今日の画面に出す、近いカウントダウン（60 日以内・3 つまで）
function countdownStrip() {
  if (!prefs().features.life) return '';
  const list = countdownsSorted().filter((x) => x.days >= 0 && x.days <= 60).slice(0, 3);
  if (!list.length) return '';
  return `<div class="count-strip">${list.map(({ c, days }) => `<button class="count-chip" data-act="count-open" data-id="${c.id}">
    ${c.emoji} ${escapeHtml(c.title)} <b>${days === 0 ? '今日！' : `あと${days}日`}</b></button>`).join('')}</div>`;
}

// ---------- お金の 1 件を直す ----------

function openMoneySheet(e) {
  openSheet(`
    <div class="sheet-head"><h2>${moneyCat(e.cat).icon} お金の記録</h2><span class="spacer"></span><button class="icon-btn" id="mClose" aria-label="閉じる">${ICON.close}</button></div>
    <div class="sheet-grid">
      ${field('金額', `<input class="text" type="number" inputmode="numeric" id="mAmt" value="${e.amount}">`)}
      ${field('メモ', `<input class="text" id="mNote" value="${escapeHtml(e.note)}">`)}
      ${field('日付', `<input class="text" type="date" id="mDate" value="${e.date}">`)}
    </div>
    ${field('分類', `<div class="chips">${MONEY_CATS.map((c) => `<button class="chip ${e.cat === c.id ? 'on' : ''}" data-mcat="${c.id}">${c.icon} ${c.name}</button>`).join('')}</div>`)}
    <div class="sheet-foot"><button class="btn danger" id="mDel">${ICON.trash}消す</button></div>`, (el) => {
    $('#mClose', el).onclick = closeSheet;
    $('#mAmt', el).oninput = (ev) => { const v = Math.abs(Math.round(Number(ev.target.value))); if (v) { e.amount = v; save(); } };
    $('#mNote', el).oninput = (ev) => { e.note = ev.target.value; save(); };
    $('#mDate', el).onchange = (ev) => { if (ev.target.value) { e.date = ev.target.value; save(); } };
    el.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-mcat]');
      if (!b) return;
      e.cat = b.dataset.mcat;
      e.kind = e.cat === 'income' ? 'in' : 'out';
      $$('[data-mcat]', el).forEach((x) => x.classList.toggle('on', x === b));
      save();
    });
    $('#mDel', el).onclick = () => { checkpoint(); life().money.entries = life().money.entries.filter((x) => x !== e); closeSheet(); save(); refresh(); toast('消しました', { undo: true }); };
    return () => refresh();
  });
}

function openBudgetSheet() {
  const m = life().money;
  openSheet(`
    <div class="sheet-head"><h2>1 か月の予算</h2><span class="spacer"></span><button class="icon-btn" id="bClose" aria-label="閉じる">${ICON.close}</button></div>
    ${field('毎月つかっていい金額（0 で予算なし）', `<input class="text" type="number" inputmode="numeric" id="bAmt" value="${m.budget || ''}" placeholder="例：30000">`)}
    <p class="desc small">使ったお金のバーと、「1 日いくらまで使えるか」が出るようになります。</p>`, (el) => {
    $('#bClose', el).onclick = closeSheet;
    $('#bAmt', el).oninput = (e) => { m.budget = Math.max(0, Math.round(Number(e.target.value) || 0)); save(); };
    setTimeout(() => $('#bAmt', el).focus(), 50);
    return () => refresh();
  });
}

// ---------- 画面 ----------

function renderLifeView() {
  const tab = LIFE_TABS.find((t) => t.id === state.lifeTab) || LIFE_TABS[0];
  const counts = {
    shop: life().shop.filter((x) => !x.done).length,
    money: '',
    notes: life().notes.length,
    count: countdownsSorted().filter((x) => x.days >= 0).length,
  };
  const body = { shop: renderShop, money: renderMoney, notes: renderNotes, count: renderCountdowns }[tab.id]();
  return `${pageHead('くらし', '買い物・お金・メモ・カウントダウン')}
    <div class="life-tabs" role="tablist">${LIFE_TABS.map((t) => `<button class="life-tab ${t.id === tab.id ? 'on' : ''}" data-act="life-tab" data-tab="${t.id}" role="tab">
      ${ICON[t.icon]}<span>${t.label}</span>${counts[t.id] ? `<i>${counts[t.id]}</i>` : ''}</button>`).join('')}</div>
    <div class="life-body life-${tab.id}">${body}</div>`;
}

// 追加欄：開いているタブに合わせて追加する
function lifeAddbar(input, opts, roomy) {
  const tab = state.lifeTab || 'shop';
  input.placeholder = {
    shop: roomy ? '買うものを追加…　例：牛乳、卵、パン×2' : '買うもの（例：牛乳、卵）',
    money: roomy ? '使ったお金を記録…　例：ランチ 850　／　+3000 バイト　／　昨日 電車 420' : '例：ランチ 850',
    notes: 'メモを書く…（1 行目がタイトル）',
    count: roomy ? 'カウントダウンを追加…　例：期末テスト 12/20　／　🎂 誕生日 3/14 毎年' : '例：期末テスト 12/20',
  }[tab];
  opts.innerHTML = '';
}

function lifeAddFromText(text) {
  const tab = state.lifeTab || 'shop';
  if (tab === 'shop') {
    const items = addShopItems(text);
    return items.length ? { kind: 'shop', item: items[0] } : null;
  }
  if (tab === 'money') {
    const e = addMoney(text);
    if (!e) { toast('金額が見つかりませんでした（例：ランチ 850）'); return null; }
    toast(`${moneyCat(e.cat).icon} ${e.kind === 'in' ? '+' : ''}${yen(e.amount)} を記録しました（${moneyCat(e.cat).name}）`, { undo: true });
    return { kind: 'money', item: e };
  }
  if (tab === 'notes') return { kind: 'note', item: addNote(text) };
  const c = addCountdown(text);
  if (!c) { toast('日付が見つかりませんでした（例：期末テスト 12/20）'); return null; }
  return { kind: 'count', item: c };
}

function lifeMenu(kind, id, x, y) {
  const l = life();
  if (kind === 'shop') {
    const it = l.shop.find((s) => s.id === id);
    if (!it) return;
    openMenu(x, y, `<div class="menu-title">🛒 ${escapeHtml(it.name)}</div>
      <button class="menu-item" data-m="toggle">${ICON.check}<span>${it.done ? 'リストにもどす' : 'カゴに入れた'}</span></button>
      <button class="menu-item" data-m="plus">${ICON.plus}<span>数を 1 つ増やす（いま ${it.qty || 1}）</span></button>
      <button class="menu-item danger" data-m="del">${ICON.trash}<span>消す</span></button>`, (m) => {
      if (m === 'toggle') it.done = !it.done;
      if (m === 'plus') it.qty = (it.qty || 1) + 1;
      if (m === 'del') l.shop = l.shop.filter((s) => s !== it);
      save(); refresh();
    });
  } else if (kind === 'money') {
    const e = l.money.entries.find((s) => s.id === id);
    if (!e) return;
    openMenu(x, y, `<div class="menu-title">${moneyCat(e.cat).icon} ${escapeHtml(e.note || moneyCat(e.cat).name)} ${yen(e.amount)}</div>
      <button class="menu-item" data-m="edit">${ICON.edit}<span>直す</span></button>
      <button class="menu-item danger" data-m="del">${ICON.trash}<span>消す</span></button>`, (m) => {
      if (m === 'edit') setTimeout(() => openMoneySheet(e), 0);
      if (m === 'del') { l.money.entries = l.money.entries.filter((s) => s !== e); save(); refresh(); toast('消しました', { undo: true }); }
    });
  } else if (kind === 'note') {
    const n = l.notes.find((s) => s.id === id);
    if (!n) return;
    openMenu(x, y, `<div class="menu-title">📝 ${escapeHtml(n.text.split('\n')[0] || 'メモ')}</div>
      <button class="menu-item" data-m="pin">${ICON.pin}<span>${n.pinned ? '固定をやめる' : '上に固定'}</span></button>
      <button class="menu-item danger" data-m="del">${ICON.trash}<span>消す</span></button>`, (m) => {
      if (m === 'pin') n.pinned = !n.pinned;
      if (m === 'del') { l.notes = l.notes.filter((s) => s !== n); toast('メモを消しました', { undo: true }); }
      save(); refresh();
    });
  } else if (kind === 'count') {
    const c = l.countdowns.find((s) => s.id === id);
    if (!c) return;
    openMenu(x, y, `<div class="menu-title">${c.emoji} ${escapeHtml(c.title)}</div>
      <button class="menu-item" data-m="edit">${ICON.edit}<span>直す</span></button>
      <button class="menu-item danger" data-m="del">${ICON.trash}<span>消す</span></button>`, (m) => {
      if (m === 'edit') setTimeout(() => openCountSheet(c), 0);
      if (m === 'del') { l.countdowns = l.countdowns.filter((s) => s !== c); save(); refresh(); toast('消しました', { undo: true }); }
    });
  }
}

const LIFE_ACTIONS = {
  'life-tab': (el) => { state.lifeTab = el.dataset.tab; try { localStorage.setItem('lifeTab', state.lifeTab); } catch { /* 無視 */ } transition(() => { renderContent(); renderAddbar(); }); },
  'shop-toggle': (el) => {
    const it = life().shop.find((x) => x.id === el.dataset.id);
    if (!it) return;
    it.done = !it.done;
    if (it.done && prefs().sound) chime();
    save(); transition(refresh);
  },
  'shop-del': (el) => { life().shop = life().shop.filter((x) => x.id !== el.dataset.id); save(); transition(refresh); },
  'shop-add': (el) => { addShopItems(el.dataset.name); save(); transition(refresh); },
  'shop-clear': () => { const n = life().shop.filter((x) => x.done).length; life().shop = life().shop.filter((x) => !x.done); save(); transition(refresh); toast(`${n} 件を消しました`, { undo: true }); },
  'money-open': (el) => { const e = life().money.entries.find((x) => x.id === el.dataset.id); if (e) openMoneySheet(e); },
  'money-month': (el) => {
    const cur = state.moneyMonth || state.today.slice(0, 7);
    const [y, m] = cur.split('-').map(Number);
    const d = new Date(y, m - 1 + Number(el.dataset.d), 1);
    const next = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    state.moneyMonth = next > state.today.slice(0, 7) ? state.today.slice(0, 7) : next;
    refresh();
  },
  'money-budget': () => openBudgetSheet(),
  'note-open': (el) => { const n = life().notes.find((x) => x.id === el.dataset.id); if (n) openNoteSheet(n); },
  'count-open': (el) => { const c = life().countdowns.find((x) => x.id === el.dataset.id); if (c) openCountSheet(c); },
};

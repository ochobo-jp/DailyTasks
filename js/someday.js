'use strict';

// ============================================================
//  いつか：ずっと先のやるべきこと・やりたいこと
//  「今月中 / 今年中 / 来年 / 数年のうちに / いつか」に分けて、カードで並べる。
//  ステップに分けたり、ToDo にして今日の予定に落とし込んだりできる
// ============================================================

const HORIZONS = [
  { id: 'month', name: '今月中', icon: '🌱' },
  { id: 'year', name: '今年中', icon: '🌿' },
  { id: 'nextyear', name: '来年', icon: '🌳' },
  { id: 'years', name: '数年のうちに', icon: '⛰️' },
  { id: 'someday', name: 'いつか', icon: '✨' },
];
const SOMEDAY_KINDS = {
  want: { name: 'やりたい', icon: '💫' },
  must: { name: 'やるべき', icon: '📌' },
};
const SOMEDAY_STATUS = { idea: 'アイデア', doing: '進行中', done: '叶った！' };
const SOMEDAY_EMOJIS = ['✨', '💫', '🌟', '📌', '🎯', '✈️', '🗻', '🏖️', '🏕️', '🌍', '🗾', '🧳', '🎨', '🎸', '🎹', '🎤', '🎬', '🎮', '📷', '📚',
  '📝', '🎓', '💼', '💰', '🏠', '🚗', '🍳', '🍰', '☕', '🏃', '🚴', '🏊', '🧘', '💪', '🐶', '🐱', '🌸', '🎁', '💍', '❤️'];
const SOMEDAY_IDEAS = ['🗻 富士山に登る', '📝 英検2級を取る', '✈️ 海外旅行に行く', '📚 本を50冊読む', '🎸 ギターを弾けるようになる',
  '🏃 フルマラソンを走る', '🍳 料理のレパートリーを増やす', '💰 貯金を100万円ためる', '🚗 運転免許を取る', '🎨 絵を描けるようになる'];

const EMOJI_HINTS = [
  [/旅行|旅|海外|観光|行きたい/, '✈️'], [/山|登山|富士/, '🗻'], [/海|ビーチ|沖縄/, '🏖️'], [/キャンプ/, '🏕️'], [/本|読書|読む/, '📚'],
  [/資格|検定|試験|英検|TOEIC|漢検/, '📝'], [/卒業|大学|受験|合格|留学/, '🎓'], [/仕事|転職|就職|起業/, '💼'], [/貯金|お金|投資|貯め/, '💰'],
  [/家|引っ越/, '🏠'], [/車|免許|運転/, '🚗'], [/料理|レシピ/, '🍳'], [/ケーキ|お菓子|スイーツ/, '🍰'], [/カフェ|コーヒー/, '☕'],
  [/走|マラソン|ラン/, '🏃'], [/自転車|サイクリング/, '🚴'], [/泳|水泳|プール/, '🏊'], [/ヨガ|瞑想/, '🧘'], [/筋トレ|ジム|ダイエット/, '💪'],
  [/犬/, '🐶'], [/猫/, '🐱'], [/桜|花見/, '🌸'], [/映画/, '🎬'], [/ゲーム/, '🎮'], [/写真|カメラ/, '📷'], [/ギター/, '🎸'], [/ピアノ/, '🎹'],
  [/歌|カラオケ|ライブ|コンサート/, '🎤'], [/絵|描/, '🎨'], [/プレゼント|贈/, '🎁'], [/結婚|指輪/, '💍'],
];

const somedayById = (id) => state.data.someday.find((x) => x.id === id);

function newSomeday(fields) {
  return {
    id: uid(), title: '', kind: 'want', horizon: 'someday', target: null, emoji: '',
    note: '', steps: [], status: 'idea', doneAt: null, createdAt: state.today, ...fields,
  };
}

function guessEmoji(title, kind) {
  for (const [re, e] of EMOJI_HINTS) if (re.test(title)) return e;
  return kind === 'must' ? '📌' : '✨';
}

// 目標の年月から、どのくらい先かを決める
function horizonFromTarget(target) {
  const [ty, tm] = target.split('-').map(Number);
  const [y, m] = state.today.split('-').map(Number);
  if (ty < y || (ty === y && tm <= m)) return 'month';
  if (ty === y) return 'year';
  if (ty === y + 1) return 'nextyear';
  return 'years';
}

const targetLabel = (target) => { const [y, m] = target.split('-').map(Number); return `${y}年${m}月まで`; };

// 「2027年3月 富士山に登る」「来年 英検を取る #やるべき」などを読み取る
function parseSomeday(text) {
  const res = { title: text.trim(), horizon: null, target: null, kind: null, emoji: null };
  let s = ` ${text.replace(/　/g, ' ')} `;
  const cut = (re, fn) => {
    let hit = false;
    s = s.replace(re, (...m) => { hit = true; fn(...m); return ' '; });
    return hit;
  };
  const em = text.trim().match(/^(\p{Extended_Pictographic}(?:️)?(?:‍\p{Extended_Pictographic}(?:️)?)*)/u);
  if (em) { res.emoji = em[1]; s = s.replace(em[1], ' '); }
  cut(/[#＃](やりたい|やるべき)/, (_, k) => { res.kind = k === 'やりたい' ? 'want' : 'must'; });
  cut(/(\d{4})年\s?(\d{1,2})月(?:まで|までに|ごろ|頃|中)?に?/, (_, y, m) => { res.target = `${y}-${pad(+m)}`; })
    || cut(/(\d{4})年(?:まで|までに|中|ごろ|頃|のうち)?に?/, (_, y) => { res.target = `${y}-12`; })
    || cut(/(?<=\s)今月(?:中|まで|までに|のうち)?に?/, () => { res.horizon = 'month'; })
    || cut(/(?<=\s)今年(?:中|まで|までに|のうち)?に?/, () => { res.horizon = 'year'; })
    || cut(/(?<=\s)来年(?:中|まで|までに|のうち)?に?/, () => { res.horizon = 'nextyear'; })
    || cut(/(?<=\s)(?:数年(?:以内|のうち)?|そのうち)に?/, () => { res.horizon = 'years'; })
    || cut(/(?<=\s)いつか(?:は)?/, () => { res.horizon = 'someday'; });
  if (res.target) res.horizon = horizonFromTarget(res.target);
  const title = s.replace(/\s+/g, ' ').trim();
  if (title) res.title = title;
  return res;
}

function addSomeday(text, { kind, horizon } = {}) {
  const p = parseSomeday(text);
  if (!p.title) return null;
  const k = p.kind || kind || state.newSomedayKind;
  const item = newSomeday({
    title: p.title, kind: k, horizon: p.horizon || horizon || state.newSomedayHorizon,
    target: p.target, emoji: p.emoji || guessEmoji(p.title, k),
  });
  state.data.someday.push(item);
  return item;
}

// ---------- 画面 ----------

function somedayCard(x) {
  const stepsDone = x.steps.filter((s) => s.done).length;
  const linked = state.data.todos.filter((t) => t.somedayId === x.id && !t.done).length;
  const kind = SOMEDAY_KINDS[x.kind];
  const meta = [
    `<span class="tag sd-kind ${x.kind}">${kind.icon} ${kind.name}</span>`,
    x.target ? `<span class="tag">🎯 ${targetLabel(x.target)}</span>` : '',
    x.status === 'doing' ? '<span class="tag today">進行中</span>' : '',
    x.status === 'done' ? `<span class="tag">${shortDate(x.doneAt)} に叶った</span>` : '',
    linked ? `<span class="tag">ToDo ${linked}</span>` : '',
  ].join('');
  return `<div class="sd-card ${x.kind} st-${x.status}" data-act="open-someday" data-kind="someday" data-id="${x.id}" draggable="true"${vtName('s', x.id)}>
    <div class="sd-emoji">${x.emoji || guessEmoji(x.title, x.kind)}</div>
    <div class="sd-body">
      <div class="sd-title">${escapeHtml(x.title)}</div>
      <div class="meta">${meta}</div>
      ${x.steps.length ? `<div class="sd-progress" title="${stepsDone}/${x.steps.length} ステップ"><i style="width:${(stepsDone / x.steps.length) * 100}%"></i></div>
        <div class="sd-steps-label">${stepsDone}/${x.steps.length} ステップ</div>` : ''}
    </div>
  </div>`;
}

function renderSomedayView() {
  const all = state.data.someday;
  const f = state.somedayFilter;
  const open = all.filter((x) => x.status !== 'done' && (f === 'all' || x.kind === f));
  const done = all.filter((x) => x.status === 'done').sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1));
  const wants = all.filter((x) => x.kind === 'want' && x.status !== 'done').length;
  const musts = all.filter((x) => x.kind === 'must' && x.status !== 'done').length;

  let html = pageHead('いつか', `やりたいこと ${wants}・やるべきこと ${musts}・叶えたこと ${done.length}`,
    wants + musts ? `<button class="btn" data-act="someday-random">🎲 なにしよう？</button>` : '');
  if (state.layout === 'compact' && wants + musts) {
    html += `<div class="compact-actions"><button class="btn" data-act="someday-random">🎲 なにしよう？</button></div>`;
  }
  html += `<div class="toolbar">
    <div class="chips">
      ${[['all', 'すべて'], ['want', '💫 やりたい'], ['must', '📌 やるべき']].map(([v, l]) => `<button class="chip ${f === v ? 'on' : ''}" data-act="someday-filter" data-v="${v}">${l}</button>`).join('')}
    </div>
  </div>`;

  if (!all.length) {
    html += `<section class="card sd-empty">
      <div class="big">🌠</div>
      <h2>ずっと先のこと、メモしておこう</h2>
      <p>「いつか行きたい場所」「今年中にやること」「来年までに取りたい資格」など。<br>下の欄に書くか、アイデアから選んでください。</p>
      <div class="chips center">${SOMEDAY_IDEAS.map((t) => `<button class="chip" data-act="someday-idea" data-v="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('')}</div>
    </section>`;
    return html;
  }

  for (const h of HORIZONS) {
    const items = open.filter((x) => x.horizon === h.id)
      .sort((a, b) => (a.target || '9999') < (b.target || '9999') ? -1 : (a.target || '9999') > (b.target || '9999') ? 1 : 0);
    if (!items.length && state.layout === 'compact') continue;
    html += `<section class="section sd-section" data-drop-horizon="${h.id}">
      <div class="section-head"><span>${h.icon} ${h.name} <span class="count">${items.length}</span></span></div>
      <div class="sd-grid">${items.map(somedayCard).join('') || '<div class="sd-drop-hint">ここにドラッグで移動</div>'}</div>
    </section>`;
  }
  if (!open.length) html += emptyState('🎉', f === 'all' ? '全部叶えました！次の夢を書いてみよう' : 'この種類のものはありません');
  html += fold('someday-done', '叶えたこと', done.length, done.map(somedayCard));
  return html;
}

// ---------- 詳細 ----------

function openSomedaySheet(x) {
  if (!x) return;
  let showEmoji = false;
  openSheet(`
    <div class="sheet-head">
      <button class="sd-emoji-btn" id="sEmoji" title="絵文字を変える">${x.emoji || guessEmoji(x.title, x.kind)}</button>
      <input class="text title-text" id="sTitle" maxlength="200" value="${escapeHtml(x.title)}">
      <button class="icon-btn" id="sClose" aria-label="閉じる">${ICON.close}</button>
    </div>
    <div class="emoji-grid" id="sEmojiGrid" hidden>${SOMEDAY_EMOJIS.map((e) => `<button data-emoji="${e}">${e}</button>`).join('')}</div>
    <div class="sheet-grid">
      ${field('種類', `<div class="seg mini" id="sKind"><button data-kind-v="want">💫 やりたい</button><button data-kind-v="must">📌 やるべき</button></div>`)}
      ${field('状態', `<div class="seg mini" id="sStatus">${Object.entries(SOMEDAY_STATUS).map(([k, v]) => `<button data-status="${k}">${v}</button>`).join('')}</div>`)}
      ${field('いつまでに', `<div class="chips" id="sHorizon"></div>
        <div class="inline field-note"><span class="small muted">目標の月</span><input type="month" class="text" id="sTarget" value="${x.target || ''}"><button class="chip" id="sTargetClear">なし</button></div>`, 'full')}
      ${field('ステップ', `<div class="subtasks" id="sSteps"></div>
        <form class="sub-add" id="sStepForm"><input class="text" id="sStepInput" placeholder="小さな一歩を追加…（例：登山靴を買う）" maxlength="200"><button class="icon-btn sub-add-btn" aria-label="追加" title="追加">${ICON.plus}</button></form>`, 'full')}
      ${field('メモ', `<textarea class="text autosize" id="sNote" rows="3" maxlength="5000" placeholder="きっかけ、調べたこと、リンクなど">${escapeHtml(x.note)}</textarea>`, 'full')}
    </div>
    <div class="sheet-foot">
      <span class="muted small">書いた日 ${shortDate(x.createdAt)}${x.doneAt ? `・叶った日 ${shortDate(x.doneAt)}` : ''}</span>
      <span class="spacer"></span>
      <button class="btn" id="sToTodo">${ICON.arrowRight}ToDo にする</button>
      <button class="btn danger" id="sDel">${ICON.trash}削除</button>
    </div>`, (el) => {
    const paint = () => {
      $$('#sKind button', el).forEach((b) => b.classList.toggle('active', b.dataset.kindV === x.kind));
      $$('#sStatus button', el).forEach((b) => b.classList.toggle('active', b.dataset.status === x.status));
      $('#sHorizon', el).innerHTML = HORIZONS.map((h) => `<button class="chip ${x.horizon === h.id ? 'on' : ''}" data-horizon="${h.id}">${h.icon} ${h.name}</button>`).join('');
      $('#sEmoji', el).textContent = x.emoji || guessEmoji(x.title, x.kind);
      $('#sSteps', el).innerHTML = x.steps.map((s) => `<div class="sub ${s.done ? 'done' : ''}" data-sub="${s.id}">
        <button class="check small" data-subact="toggle">${ICON.check}</button>
        <input class="sub-title" value="${escapeHtml(s.title)}" maxlength="200">
        <button class="mini-btn" data-subact="todo" data-tip="この一歩を ToDo にする">${ICON.arrowRight}</button>
        <button class="mini-btn del" data-subact="del">${ICON.close}</button></div>`).join('');
    };
    paint();
    $('#sClose', el).onclick = closeSheet;
    $('#sTitle', el).oninput = (e) => { if (e.target.value.trim()) { x.title = e.target.value.trim(); commit(); } };
    $('#sEmoji', el).onclick = () => { showEmoji = !showEmoji; $('#sEmojiGrid', el).hidden = !showEmoji; };
    el.addEventListener('click', (e) => {
      const em = e.target.closest('[data-emoji]');
      if (em) { x.emoji = em.dataset.emoji; showEmoji = false; $('#sEmojiGrid', el).hidden = true; paint(); commit(); }
      const k = e.target.closest('[data-kind-v]');
      if (k) { x.kind = k.dataset.kindV; paint(); commit(); }
      const st = e.target.closest('[data-status]');
      if (st) setSomedayStatus(x, st.dataset.status, paint);
      const h = e.target.closest('[data-horizon]');
      if (h) { x.horizon = h.dataset.horizon; x.target = null; $('#sTarget', el).value = ''; paint(); commit(); }
      const s = e.target.closest('[data-subact]');
      if (s) {
        const id = s.closest('[data-sub]').dataset.sub;
        const step = x.steps.find((y) => y.id === id);
        if (s.dataset.subact === 'toggle') { step.done = !step.done; if (step.done) chime(); }
        else if (s.dataset.subact === 'todo') {
          state.data.todos.push(newTodo({ title: step.title, due: state.today, somedayId: x.id, note: `いつか「${x.title}」の一歩` }));
          if (x.status === 'idea') x.status = 'doing';
          toast(`「${step.title}」を今日の ToDo にしました`, { undo: true });
        } else x.steps = x.steps.filter((y) => y.id !== id);
        paint(); commit();
      }
    });
    $('#sTarget', el).onchange = (e) => {
      x.target = e.target.value || null;
      if (x.target) x.horizon = horizonFromTarget(x.target);
      paint(); commit();
    };
    $('#sTargetClear', el).onclick = () => { x.target = null; $('#sTarget', el).value = ''; commit(); };
    $('#sSteps', el).addEventListener('input', (e) => {
      const id = e.target.closest('[data-sub]')?.dataset.sub;
      const step = x.steps.find((y) => y.id === id);
      if (step && e.target.value.trim()) { step.title = e.target.value.trim(); save(); }
    });
    $('#sSteps', el).addEventListener('focusout', () => refresh());
    const addSteps = (lines) => {
      for (const v of lines) x.steps.push({ id: uid(), title: v, done: false });
      paint(); commit();
    };
    $('#sStepForm', el).onsubmit = (e) => {
      e.preventDefault();
      const input = $('#sStepInput', el);
      const v = input.value.trim();
      if (!v) return;
      input.value = '';
      addSteps([v]);
      input.focus();
    };
    $('#sStepInput', el).addEventListener('paste', (e) => {
      const lines = splitLines(e.clipboardData.getData('text'));
      if (lines.length < 2) return;
      e.preventDefault();
      addSteps(lines);
    });
    $('#sNote', el).oninput = (e) => { x.note = e.target.value; autosize(e.target); save(); };
    $('#sToTodo', el).onclick = (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      somedayToTodoMenu(x, r.left, r.bottom + 6);
    };
    $('#sDel', el).onclick = () => { closeSheet(); removeSomeday(x.id); };
  });
}

function setSomedayStatus(x, status, after) {
  const was = x.status;
  x.status = status;
  x.doneAt = status === 'done' ? (x.doneAt || state.today) : null;
  commit();
  if (after) after();
  if (status === 'done' && was !== 'done') {
    confetti();
    chime('done');
    toast(`🎉「${x.title}」が叶いました！`, { undo: true });
  }
}

function somedayToTodoMenu(x, px, py) {
  const T = state.today;
  openMenu(px, py, `
    <div class="menu-title">「${escapeHtml(x.title)}」を ToDo に</div>
    ${mItem('today', 'sun', '今日やる')}
    ${mItem('tomorrow', 'arrowRight', '明日やる')}
    ${mItem('week', 'calendar', '来週やる')}
    ${mItem('none', 'list', '期限なしで ToDo に')}`, (m) => {
    const due = { today: T, tomorrow: addDays(T, 1), week: nextMonday(T), none: null }[m];
    state.data.todos.push(newTodo({ title: x.title, due, somedayId: x.id, note: x.note }));
    if (x.status === 'idea') x.status = 'doing';
    commit();
    toast(`${due ? relDate(due, T) + 'の' : '期限なしの'} ToDo にしました`, { undo: true });
  });
}

function removeSomeday(id) {
  const i = state.data.someday.findIndex((x) => x.id === id);
  if (i < 0) return;
  const [x] = state.data.someday.splice(i, 1);
  save();
  transition(refresh);
  toast(`「${x.title}」を削除しました`, { undo: true });
}

function somedayMenu(x, px, py) {
  openMenu(px, py, `
    <div class="menu-title">${x.emoji || ''} ${escapeHtml(x.title)}</div>
    ${x.status !== 'done' ? mItem('done', 'check', '叶った！') : mItem('undone', 'undo', 'まだ叶っていない')}
    ${x.status === 'idea' ? mItem('doing', 'play', '進行中にする') : ''}
    ${mItem('todo', 'arrowRight', 'ToDo にする…')}
    ${mRow('いつ', HORIZONS.map((h) => mChip('horizon', h.id, h.name, x.horizon === h.id)).join(''))}
    ${mRow('種類', mChip('kind', 'want', '💫 やりたい', x.kind === 'want') + mChip('kind', 'must', '📌 やるべき', x.kind === 'must'))}
    ${mSep}
    ${mItem('open', 'edit', '詳細を開く', { kbd: 'Enter' })}
    ${mItem('del', 'trash', '削除', { danger: true })}`, (m, v) => {
    if (m === 'done') return setSomedayStatus(x, 'done');
    if (m === 'undone') return setSomedayStatus(x, 'idea');
    if (m === 'doing') return setSomedayStatus(x, 'doing');
    if (m === 'todo') { setTimeout(() => somedayToTodoMenu(x, px, py), 0); return undefined; }
    if (m === 'horizon') { x.horizon = v; x.target = null; commit(); return undefined; }
    if (m === 'kind') { x.kind = v; commit(); return undefined; }
    if (m === 'open') return openSomedaySheet(x);
    if (m === 'del') return removeSomeday(x.id);
    return undefined;
  });
}

// 今日のおすすめ（右パネル用）。日付ごとに同じものを出す
function somedayPick(offset = 0) {
  const items = state.data.someday.filter((x) => x.status !== 'done');
  if (!items.length) return null;
  const seed = [...state.today].reduce((s, c) => s + c.charCodeAt(0), 0) + offset;
  return items[seed % items.length];
}

function somedayPanelCard() {
  if (!prefs().features.someday) return '';
  const x = somedayPick(state.somedayPickOffset || 0);
  if (!x) return '';
  return `<section class="card sd-panel">
    <div class="card-head">いつかリストから<span class="spacer"></span><button class="mini-btn" data-act="someday-next-pick" data-tip="ほかのを見る">${ICON.repeat}</button></div>
    <button class="sd-pick" data-act="open-someday" data-id="${x.id}">
      <span class="sd-emoji">${x.emoji || guessEmoji(x.title, x.kind)}</span>
      <span class="sd-pick-text"><b>${escapeHtml(x.title)}</b><small>${x.target ? targetLabel(x.target) : HORIZONS.find((h) => h.id === x.horizon).name}・今日、一歩進めてみる？</small></span>
    </button>
  </section>`;
}

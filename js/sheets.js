'use strict';

// ============================================================
//  シート（詳細編集・設定）
//  変更はその場で保存されるので「保存」ボタンはない
// ============================================================

const sheet = $('#sheet');
const backdrop = $('#sheetBackdrop');
let sheetCleanup = null;

function openSheet(html, bind) {
  closeSheet();
  closeMenu();
  closePalette();
  sheet.innerHTML = html;
  sheet.hidden = false;
  backdrop.hidden = false;
  sheetCleanup = bind(sheet) || null;
  $$('textarea.autosize', sheet).forEach(autosize);
}

function closeSheet() {
  if (sheet.hidden) return;
  if (sheetCleanup) sheetCleanup();
  sheetCleanup = null;
  sheet.hidden = true;
  backdrop.hidden = true;
  sheet.innerHTML = '';
}
backdrop.addEventListener('click', closeSheet);

const field = (label, body, cls = '') => `<div class="field ${cls}"><div class="field-label">${label}</div>${body}</div>`;
const sw = (id, on) => `<button class="switch ${on ? 'on' : ''}" id="${id}" role="switch" aria-checked="${!!on}"></button>`;

function setSwitch(el, on) {
  el.classList.toggle('on', !!on);
  el.setAttribute('aria-checked', String(!!on));
}

// 変更を保存して、裏の画面も描き直す
function commit() {
  save();
  refresh();
}

// ============================================================
//  ToDo の詳細
// ============================================================

function openTodoSheet(t) {
  if (!t) return;
  openSheet(`
    <div class="sheet-head">
      <div class="item todo prio-${t.priority} ${t.done ? 'done' : ''}" id="sHeadItem"><button class="check" id="sToggle">${ICON.check}</button></div>
      <input class="text title-text" id="sTitle" maxlength="300" value="${escapeHtml(t.title)}">
      <button class="icon-btn" id="sClose" aria-label="閉じる">${ICON.close}</button>
    </div>
    <div class="sheet-grid">
      ${field('期限', `<div class="chips" id="sDue"></div>`)}
      ${field('時刻と通知', `<div class="inline">
          <input type="time" class="text time" id="sTime" value="${t.time || ''}">
          <button class="chip" id="sTimeClear">時刻なし</button>
          <span class="spacer"></span>
          <span class="small muted">通知</span>${sw('sRemind', t.remind)}
        </div>
        <div class="chips" id="sBefore" ${t.remind ? '' : 'hidden'}>
          ${[0, 5, 10, 30, 60].map((m) => `<button class="chip ${t.remindBefore === m ? 'on' : ''}" data-before="${m}">${m ? `${m}分前` : 'ちょうど'}</button>`).join('')}
        </div>`)}
      ${field('かかる時間', `<div class="chips" id="sDur"></div>`)}
      ${field('リスト', `<div class="chips" id="sList"></div>`)}
      ${field('優先度', `<div class="chips" id="sPrio"></div>`)}
      ${schoolOn() && school().subjects.length ? field('科目（学校の課題）', `<div class="chips" id="sSubj"></div>`, 'full') : ''}
      ${field('サブタスク', `<div class="subtasks" id="sSubs"></div>
        <form class="sub-add" id="sSubForm"><input class="text" id="sSubInput" placeholder="サブタスクを追加…（複数行の貼り付けもOK）" maxlength="300"></form>`, 'full')}
      ${field('メモ', `<textarea class="text autosize" id="sNote" rows="3" maxlength="5000" placeholder="詳しいことやリンクなど">${escapeHtml(t.note)}</textarea>`, 'full')}
    </div>
    <div class="sheet-foot">
      <span class="muted small">作成 ${shortDate(t.createdAt)}${t.focusMin ? `・集中 ${minutesLabel(t.focusMin)}` : ''}${t.done ? `・完了 ${shortDate(t.doneAt)}` : ''}</span>
      <span class="spacer"></span>
      <button class="btn" id="sDup">${ICON.copy}複製</button>
      ${t.done ? '' : `<button class="btn" id="sFocus">${ICON.timer}集中する</button>`}
      <button class="btn danger" id="sDel">${ICON.trash}削除</button>
    </div>`, (el) => {
    const paint = () => {
      $('#sDue', el).innerHTML = dueChips(t.due, 'sdue');
      $('#sDur', el).innerHTML = durationChips(t.duration, 'sdur');
      $('#sList', el).innerHTML = listChips(t.listId, 'slist');
      $('#sPrio', el).innerHTML = priorityChips(t.priority, 'sprio');
      if ($('#sSubj', el)) $('#sSubj', el).innerHTML = subjectChips(t.subjectId, 'ssubj');
      $('#sHeadItem', el).className = `item todo prio-${t.priority} ${t.done ? 'done' : ''}`;
      $('#sSubs', el).innerHTML = t.subtasks.map((s) => `<div class="sub ${s.done ? 'done' : ''}" data-sub="${s.id}">
        <button class="check small" data-subact="toggle">${ICON.check}</button>
        <input class="sub-title" value="${escapeHtml(s.title)}" maxlength="300">
        <button class="mini-btn del" data-subact="del">${ICON.close}</button></div>`).join('');
    };
    paint();

    $('#sClose', el).onclick = closeSheet;
    $('#sToggle', el).onclick = () => {
      if (toggleTodo(t)) chime('done');
      paint(); commit();
    };
    $('#sTitle', el).oninput = (e) => { if (e.target.value.trim()) { t.title = e.target.value.trim(); commit(); } };
    el.addEventListener('click', (e) => {
      const d = e.target.closest('[data-sdue]');
      if (d) { t.due = d.dataset.sdue || null; paint(); commit(); }
      const du = e.target.closest('[data-sdur]');
      if (du) { t.duration = du.dataset.sdur ? Number(du.dataset.sdur) : null; paint(); commit(); }
      const l = e.target.closest('[data-slist]');
      if (l) { t.listId = l.dataset.slist || null; paint(); commit(); }
      const p = e.target.closest('[data-sprio]');
      if (p) { t.priority = Number(p.dataset.sprio); paint(); commit(); }
      const sj = e.target.closest('[data-ssubj]');
      if (sj) { t.subjectId = sj.dataset.ssubj || null; paint(); commit(); }
      const b = e.target.closest('[data-before]');
      if (b) { t.remindBefore = Number(b.dataset.before); $$('[data-before]', el).forEach((x) => x.classList.toggle('on', x === b)); commit(); }
      const s = e.target.closest('[data-subact]');
      if (s) {
        const id = s.closest('[data-sub]').dataset.sub;
        const sub = t.subtasks.find((x) => x.id === id);
        if (s.dataset.subact === 'toggle') { sub.done = !sub.done; if (sub.done) chime(); }
        else t.subtasks = t.subtasks.filter((x) => x.id !== id);
        paint(); commit();
      }
    });
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-sdue-date]') && e.target.value) { t.due = e.target.value; paint(); commit(); }
    });
    $('#sSubs', el).addEventListener('input', (e) => {
      const id = e.target.closest('[data-sub]')?.dataset.sub;
      const sub = t.subtasks.find((x) => x.id === id);
      if (sub && e.target.value.trim()) { sub.title = e.target.value.trim(); save(); }
    });
    $('#sSubs', el).addEventListener('focusout', () => refresh());
    const addSubs = (lines) => {
      for (const v of lines) t.subtasks.push({ id: uid(), title: v, done: false });
      paint(); commit();
    };
    $('#sSubForm', el).onsubmit = (e) => {
      e.preventDefault();
      const input = $('#sSubInput', el);
      const v = input.value.trim();
      if (!v) return;
      input.value = '';
      addSubs([v]);
      input.focus();
    };
    // 箇条書きを貼り付けたら、1 行ずつサブタスクにする
    $('#sSubInput', el).addEventListener('paste', (e) => {
      const lines = splitLines(e.clipboardData.getData('text'));
      if (lines.length < 2) return;
      e.preventDefault();
      addSubs(lines);
    });
    $('#sTime', el).onchange = (e) => {
      t.time = e.target.value || null;
      if (t.time && !t.due) { t.due = state.today; paint(); }
      commit();
    };
    $('#sTimeClear', el).onclick = () => { t.time = null; $('#sTime', el).value = ''; commit(); };
    $('#sRemind', el).onclick = (e) => {
      t.remind = !t.remind;
      if (t.remind && !t.time) {
        t.time = `${pad((new Date().getHours() + 1) % 24)}:00`;
        $('#sTime', el).value = t.time;
        if (!t.due) { t.due = state.today; paint(); }
      }
      setSwitch(e.currentTarget, t.remind);
      $('#sBefore', el).hidden = !t.remind;
      commit();
    };
    $('#sNote', el).oninput = (e) => { t.note = e.target.value; autosize(e.target); save(); };
    $('#sNote', el).onblur = () => refresh();
    $('#sDup', el).onclick = () => {
      const copy = duplicateTodo(t);
      save(); refresh();
      openTodoSheet(copy);
      toast('複製しました', { undo: true });
    };
    if (!t.done) $('#sFocus', el).onclick = () => focusOnTask(t);
    $('#sDel', el).onclick = () => { closeSheet(); removeItem('todo', t.id); };
  });
}

// ============================================================
//  ルーティンの詳細
// ============================================================

function openRoutineSheet(r) {
  if (!r) return;
  const streak = streakOf(r);
  const best = bestStreakOf(r);
  const rate = rateOf(r, 30);
  openSheet(`
    <div class="sheet-head">
      <input class="text title-text" id="sTitle" maxlength="120" value="${escapeHtml(r.title)}">
      <button class="icon-btn" id="sClose" aria-label="閉じる">${ICON.close}</button>
    </div>
    <div class="mini-stats">
      <div><b>🔥 ${streak}</b><span>いまの連続</span></div>
      <div><b>${best}</b><span>最高記録</span></div>
      <div><b>${rate === null ? '—' : Math.round(rate * 100) + '%'}</b><span>30日の達成率</span></div>
    </div>
    <div class="sheet-grid">
      ${field('くり返し', `<div class="seg mini" id="sType">
          <button data-type="weekly">曜日</button><button data-type="monthly">毎月</button><button data-type="interval">N日ごと</button>
        </div><div id="sSched" class="sched"></div>`, 'full')}
      ${field('1日の目標回数', `<div class="inline">
          <div class="stepper"><button class="icon-btn" id="sGoalMinus">${ICON.minus}</button><b id="sGoal">${r.goal}</b><button class="icon-btn" id="sGoalPlus">${ICON.plus}</button></div>
          <input class="text unit" id="sUnit" placeholder="単位（回・杯など）" maxlength="6" value="${escapeHtml(r.unit || '')}">
        </div>`)}
      ${field('通知する時刻', `<div class="inline">
          <input type="time" class="text time" id="sRemindTime" value="${r.remind || ''}">
          <button class="chip" id="sRemindClear">通知しない</button></div>
          <div class="small muted field-note">時刻を入れると、今日のタイムラインにも出ます</div>`)}
      ${field('リスト', `<div class="chips" id="sList"></div>`)}
      ${field('一時停止', `<div class="inline"><span class="small muted">旅行中などはお休みにできます（連続記録は止まりません）</span><span class="spacer"></span>${sw('sPaused', r.paused)}</div>`)}
      ${field('メモ', `<textarea class="text autosize" id="sNote" rows="2" maxlength="2000" placeholder="やり方のメモなど">${escapeHtml(r.note || '')}</textarea>`, 'full')}
    </div>
    <div class="sheet-foot">
      <span class="muted small">開始 ${shortDate(r.createdAt)}</span>
      <span class="spacer"></span>
      <button class="btn" id="sDup">${ICON.copy}複製</button>
      <button class="btn danger" id="sDel">${ICON.trash}削除</button>
    </div>`, (el) => {
    const paintSched = () => {
      const s = r.schedule;
      $$('#sType button', el).forEach((b) => b.classList.toggle('active', b.dataset.type === s.type));
      const box = $('#sSched', el);
      if (s.type === 'weekly') box.innerHTML = `<div class="chips">${dayChips(s.days, 'sday')}</div>`;
      else if (s.type === 'monthly') {
        box.innerHTML = `<div class="month-grid">${Array.from({ length: 31 }, (_, i) => i + 1).map((d) => `<button class="chip day ${s.dates.includes(d) ? 'on' : ''}" data-sdate="${d}">${d}</button>`).join('')}</div>
          <div class="small muted">31日を選ぶと、31日がない月は月末になります</div>`;
      } else {
        box.innerHTML = `<div class="inline"><input type="number" class="text num-input" id="sEvery" min="1" max="365" value="${s.every}"><span>日ごと</span>
          <span class="small muted">開始日</span><input type="date" class="text" id="sStart" value="${s.start || r.createdAt}"></div>`;
      }
      $('#sList', el).innerHTML = listChips(r.listId, 'slist');
    };
    paintSched();

    $('#sClose', el).onclick = closeSheet;
    $('#sTitle', el).oninput = (e) => { if (e.target.value.trim()) { r.title = e.target.value.trim(); commit(); } };
    el.addEventListener('click', (e) => {
      const ty = e.target.closest('[data-type]');
      if (ty && ty.dataset.type !== r.schedule.type) {
        const type = ty.dataset.type;
        r.schedule = type === 'weekly' ? { type, days: [...ALL_DAYS] }
          : type === 'monthly' ? { type, dates: [parseKey(state.today).getDate()] }
          : { type, every: 2, start: state.today };
        paintSched(); commit();
      }
      const d = e.target.closest('[data-sday]');
      if (d) { r.schedule.days = toggleDay(r.schedule.days, d.dataset.sday); paintSched(); commit(); }
      const md = e.target.closest('[data-sdate]');
      if (md) {
        const n = Number(md.dataset.sdate);
        const dates = r.schedule.dates.includes(n) ? r.schedule.dates.filter((x) => x !== n) : [...r.schedule.dates, n];
        if (dates.length) { r.schedule.dates = dates; paintSched(); commit(); }
      }
      const l = e.target.closest('[data-slist]');
      if (l) { r.listId = l.dataset.slist || null; paintSched(); commit(); }
    });
    el.addEventListener('change', (e) => {
      if (e.target.id === 'sEvery') { r.schedule.every = clamp(Number(e.target.value) || 1, 1, 365); e.target.value = r.schedule.every; commit(); }
      if (e.target.id === 'sStart' && e.target.value) { r.schedule.start = e.target.value; commit(); }
    });
    const setGoal = (g) => { r.goal = clamp(g, 1, 50); $('#sGoal', el).textContent = r.goal; commit(); };
    $('#sGoalMinus', el).onclick = () => setGoal(r.goal - 1);
    $('#sGoalPlus', el).onclick = () => setGoal(r.goal + 1);
    $('#sUnit', el).oninput = (e) => { r.unit = e.target.value.trim(); commit(); };
    $('#sRemindTime', el).onchange = (e) => { r.remind = e.target.value || null; commit(); };
    $('#sRemindClear', el).onclick = () => { r.remind = null; $('#sRemindTime', el).value = ''; commit(); };
    $('#sPaused', el).onclick = (e) => { r.paused = !r.paused; setSwitch(e.currentTarget, r.paused); commit(); };
    $('#sNote', el).oninput = (e) => { r.note = e.target.value; autosize(e.target); save(); };
    $('#sDup', el).onclick = () => {
      const copy = duplicateRoutine(r);
      save(); refresh();
      openRoutineSheet(copy);
      toast('複製しました', { undo: true });
    };
    $('#sDel', el).onclick = () => { closeSheet(); removeItem('routine', r.id); };
  });
}

// ============================================================
//  リスト
// ============================================================

function openListSheet(list) {
  const isNew = !list;
  const l = list || { id: uid(), name: '', color: LIST_COLORS[state.data.lists.length % LIST_COLORS.length] };
  openSheet(`
    <div class="sheet-head"><h2>${isNew ? '新しいリスト' : 'リストを編集'}</h2><span class="spacer"></span>
      <button class="icon-btn" id="sClose" aria-label="閉じる">${ICON.close}</button></div>
    ${field('名前', `<input class="text wide-input" id="sName" maxlength="30" value="${escapeHtml(l.name)}" placeholder="例：仕事、買い物、勉強">`)}
    ${field('色', `<div class="swatches">${LIST_COLORS.map((c) => `<button class="swatch ${l.color === c ? 'on' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}</div>`)}
    <div class="sheet-foot">
      ${isNew ? '' : `<button class="btn danger" id="sDel">${ICON.trash}削除</button>`}
      <span class="spacer"></span>
      <button class="btn primary" id="sOk">${isNew ? '作成' : '完了'}</button>
    </div>`, (el) => {
    const name = $('#sName', el);
    setTimeout(() => name.focus(), 50);
    const done = () => {
      const v = name.value.trim();
      if (!v) { name.focus(); return; }
      l.name = v;
      if (isNew) state.data.lists.push(l);
      closeSheet();
      commit();
    };
    name.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) done(); };
    $('#sOk', el).onclick = done;
    $('#sClose', el).onclick = closeSheet;
    el.addEventListener('click', (e) => {
      const s = e.target.closest('[data-color]');
      if (s) { l.color = s.dataset.color; $$('.swatch', el).forEach((x) => x.classList.toggle('on', x === s)); if (!isNew) commit(); }
    });
    if (!isNew) $('#sDel', el).onclick = () => { closeSheet(); removeList(l); };
  });
}

function removeList(l) {
  deleteList(l.id);
  save();
  renderAll();
  toast(`リスト「${l.name}」を削除しました（中のタスクは残っています）`, { undo: true });
}

// ============================================================
//  設定
// ============================================================

async function exportBackup() {
  await flush();
  if (await window.api.exportData(state.data)) toast('バックアップを保存しました');
}

async function importBackup() {
  const raw = await window.api.importData();
  if (raw === null) return;
  const data = migrate(raw);
  if (!data) { toast('このファイルは読み込めませんでした'); return; }
  state.data = data;
  closeSheet();
  applyAppearance();
  save();
  renderAll();
  toast('バックアップを読み込みました', { undo: true });
}

const settingRow = (label, desc, control) => `<div class="setting-row"><div><div class="label">${label}</div>${desc ? `<div class="desc">${desc}</div>` : ''}</div>${control}</div>`;

// スタイルによって出す項目（ガラスだけの夜モード・透け具合）
function styleExtras() {
  const p = prefs();
  const style = styleById(p.style);
  const rows = [];
  if (style.autoDark) rows.push(settingRow('夜モード', systemDark.matches ? '端末がダークモードなので暗くしています' : 'いつも暗くします（端末がダークモードのときは自動で暗くなります）', sw('swDark', p.dark || systemDark.matches)));
  else if (style.darkToggle) rows.push(settingRow('夜モード', '暗めのすりガラスにします', sw('swDark', p.dark)));
  if (style.tint) rows.push(settingRow('背景の濃さ', '左ほど後ろが透けて見えます', `<input type="range" class="range" id="tint" min="0" max="100" value="${Math.round(p.tint * 100)}">`));
  return rows.join('');
}

function openSettings() {
  const s = state.settings;
  const p = prefs();
  const row = settingRow;
  openSheet(`
    <div class="sheet-head"><h2>設定</h2><span class="spacer"></span><button class="icon-btn" id="sClose" aria-label="閉じる">${ICON.close}</button></div>
    <div class="setting-group style-group">
      <h3>スタイル</h3>
      <div id="stylePicker">${stylePicker()}</div>
      <div id="styleExtras">${styleExtras()}</div>
    </div>
    <div class="settings">
      <div class="setting-group">
        <h3>使う機能</h3>
        ${row('学校', '時間割・出席・課題', sw('swSchool', p.features.school))}
        ${row('いつか', 'ずっと先のやりたいこと・やるべきこと', sw('swSomeday', p.features.someday))}
        ${row('紙吹雪', '今日のタスクが全部終わったとき', sw('swConfetti', p.confetti))}
        ${row('効果音', 'チェックやタイマー終了のとき', sw('swSound', p.sound))}
      </div>
      <div class="setting-group">
        <h3>天気</h3>
        ${row('天気を表示', '今日の画面・右パネル・カレンダーに出します', sw('swWeather', weatherOn()))}
        ${row('場所', p.weather.place ? `📍 ${escapeHtml(p.weather.place.name)}${p.weather.place.source === 'gps' ? '（現在地）' : ''}` : 'まだ決めていません', `<button class="btn" id="wxPlaceBtn">場所を変える</button>`)}
        <div class="desc">天気は Open-Meteo、地名は OpenStreetMap から。位置は約 1km 単位に丸めて送ります。</div>
      </div>
      <div class="setting-group">
        <h3>集中タイマー</h3>
        ${row('集中', '', `<div class="inline"><input type="number" class="text num-input" id="focusMin" min="1" max="180" value="${p.focusMin}">分</div>`)}
        ${row('休憩', '', `<div class="inline"><input type="number" class="text num-input" id="breakMin" min="1" max="60" value="${p.breakMin}">分</div>`)}
        ${row('長い休憩（4回ごと）', '', `<div class="inline"><input type="number" class="text num-input" id="longBreakMin" min="1" max="90" value="${p.longBreakMin}">分</div>`)}
        ${row('BGM', '集中しているあいだ流す音。押すと選べます', `<div class="inline">${bgmChip()}${sw('swBgm', p.bgm.on)}</div>`)}
        ${row('BGM の音量', '', `<input type="range" class="range" id="bgmVol" min="0" max="100" value="${Math.round(p.bgm.volume * 100)}">`)}
      </div>
      ${IS_WEB ? webAppGroup() : `<div class="setting-group">
        <h3>ウィンドウ</h3>
        ${row('ミニ表示', '画面のすみに、次のタスクだけを小さく表示', `<button class="btn" id="miniOn">${ICON.pip}ミニ表示にする</button>`)}
        ${row('最前面に固定', 'ほかのウィンドウより常に手前に表示', sw('swTop', s.alwaysOnTop))}
        ${row('PC起動時に開く', 'Windows にサインインしたら自動で起動', sw('swLogin', s.openAtLogin))}
        ${row('全画面', 'F11 キーでも切り替えられます', `<button class="btn" id="fullBtn">${ICON.expand}切り替え</button>`)}
      </div>`}
      <div class="setting-group">
        <h3>タスク</h3>
        ${row('週のはじまり', 'カレンダーと週表示に使います', `<div class="seg mini" id="weekStart">
          <button class="${p.weekStart === 1 ? 'active' : ''}" data-ws="1">月曜</button><button class="${p.weekStart === 0 ? 'active' : ''}" data-ws="0">日曜</button></div>`)}
        ${row('期限切れを自動で今日へ', '日付が変わったとき、終わっていない ToDo を今日に移します', sw('swRollover', p.autoRollover))}
        ${row('朝のまとめ通知', '指定した時刻に、今日のタスク数をお知らせ', `<div class="inline"><input type="time" class="text time" id="morning" value="${p.morningTime || ''}">${sw('swMorning', !!p.morningTime)}</div>`)}
      </div>
      <div class="setting-group">
        <h3>データ</h3>
        ${row('バックアップ', 'すべてのデータを1つのファイルに保存 / 読み込み', `<div class="inline"><button class="btn" id="export">${ICON.download}保存</button><button class="btn" id="import">${ICON.upload}読み込み</button></div>`)}
        ${IS_WEB ? row('保存場所', window.api.touch ? 'タスクはこの iPhone の中に保存されます。PC 版とはバックアップのファイルでやりとりできます' : 'タスクはこのブラウザの中に保存されます', '') : `
        ${row('保存場所', 'タスクはこのPCの中に保存されます', `<button class="btn" id="openData">${ICON.folder}開く</button>`)}
        ${row('ショートカット', `<kbd>Ctrl K</kbd> 検索・コマンド　<kbd>${escapeHtml(s.shortcut)}</kbd> 表示/非表示`, `<button class="btn" id="help">${ICON.keyboard}一覧</button>`)}`}
      </div>
    </div>`, (el) => {
    const repaintStyle = () => {
      $('#stylePicker', el).innerHTML = stylePicker();
      $('#styleExtras', el).innerHTML = styleExtras();
    };
    $('#sClose', el).onclick = closeSheet;
    el.addEventListener('click', (e) => {
      const st = e.target.closest('[data-pick-style]');
      if (st) { setStyle(st.dataset.pickStyle); repaintStyle(); renderAll(); }
      const v = e.target.closest('[data-pick-variant]');
      if (v) { setStyle(p.style, v.dataset.pickVariant); repaintStyle(); renderAll(); }
      if (e.target.closest('#swDark')) { setDarkMode(!p.dark); repaintStyle(); renderAll(); }
      const ws = e.target.closest('[data-ws]');
      if (ws) {
        p.weekStart = Number(ws.dataset.ws);
        state.calWeek = null;
        $$('[data-ws]', el).forEach((x) => x.classList.toggle('active', x === ws));
        save(); refresh();
      }
    });
    el.addEventListener('input', (e) => {
      if (e.target.id === 'tint') { p.tint = Number(e.target.value) / 100; applyAppearance(); save(); }
      if (e.target.id === 'bgmVol') { bgmSetVolume(Number(e.target.value) / 100); save(); }
    });
    const feature = (id, key) => {
      $(id, el).onclick = (e) => {
        p.features[key] = !p.features[key];
        setSwitch(e.currentTarget, p.features[key]);
        save();
        if (!p.features[key] && state.view === key) state.view = 'today';
        renderAll();
      };
    };
    $('#swWeather', el).onclick = (e) => {
      p.weather.enabled = !weatherOn();
      setSwitch(e.currentTarget, p.weather.enabled);
      save();
      renderAll();
      if (p.weather.enabled) loadWeather({ force: true });
    };
    $('#wxPlaceBtn', el).onclick = openPlaceSheet;
    feature('#swSchool', 'school');
    feature('#swSomeday', 'someday');
    $('#swConfetti', el).onclick = (e) => { p.confetti = !p.confetti; setSwitch(e.currentTarget, p.confetti); save(); if (p.confetti) confetti(); };
    $('#swSound', el).onclick = (e) => { p.sound = !p.sound; setSwitch(e.currentTarget, p.sound); save(); chime(); };
    $('#swBgm', el).onclick = (e) => {
      p.bgm.on = !p.bgm.on;
      if (!p.bgm.on) bgm.manual = false;
      setSwitch(e.currentTarget, p.bgm.on);
      save();
      bgmSync();
    };
    $('#swRollover', el).onclick = (e) => {
      p.autoRollover = !p.autoRollover;
      setSwitch(e.currentTarget, p.autoRollover);
      save();
    };
    if (IS_WEB) {
      bindWebAppGroup(el);
    } else {
      $('#swTop', el).onclick = async (e) => { s.alwaysOnTop = await window.api.setAlwaysOnTop(!s.alwaysOnTop); setSwitch(e.currentTarget, s.alwaysOnTop); renderTitlebar(); };
      $('#swLogin', el).onclick = async (e) => { s.openAtLogin = await window.api.setOpenAtLogin(!s.openAtLogin); setSwitch(e.currentTarget, s.openAtLogin); };
      $('#fullBtn', el).onclick = () => window.api.toggleFullScreen();
      $('#miniOn', el).onclick = () => { closeSheet(); window.api.setMini(true); };
      $('#openData', el).onclick = () => window.api.openDataFolder();
      $('#help', el).onclick = openHelp;
    }
    const morning = $('#morning', el);
    $('#swMorning', el).onclick = (e) => {
      p.morningTime = p.morningTime ? null : (morning.value || '08:00');
      morning.value = p.morningTime || morning.value;
      setSwitch(e.currentTarget, !!p.morningTime); save();
    };
    morning.onchange = () => { if (morning.value) { p.morningTime = morning.value; setSwitch($('#swMorning', el), true); save(); } };
    for (const [id, min, max] of [['focusMin', 1, 180], ['breakMin', 1, 60], ['longBreakMin', 1, 90]]) {
      $(`#${id}`, el).onchange = (e) => {
        p[id] = clamp(Math.round(Number(e.target.value) || p[id]), min, max);
        e.target.value = p[id];
        save();
        if (!timer.running) timerResetTo(timer.mode);
        updateTimerDom();
      };
    }
    $('#export', el).onclick = exportBackup;
    $('#import', el).onclick = importBackup;
  });
}

// ---------- ブラウザ / iPhone 版だけの設定 ----------

function notifyStatusText() {
  const perm = window.api.notifyPermission();
  if (perm === 'granted') return 'オン：アプリを開いている間、予定の時刻・授業の 5 分前・朝のまとめをお知らせします';
  if (perm === 'denied') return 'オフになっています。iPhone の「設定」→「通知」→「Daily Tasks」から許可できます';
  if (perm === 'unsupported') return window.api.ios && !window.api.standalone ? 'ホーム画面に追加すると使えます' : 'このブラウザでは使えません';
  return 'アプリを開いている間、予定の時刻や授業の 5 分前にお知らせします';
}

function webAppGroup() {
  const perm = window.api.notifyPermission();
  const install = window.api.ios && !window.api.standalone
    ? settingRow('ホーム画面に追加', 'Safari の下にある共有ボタン（□↑）→「ホーム画面に追加」。アイコンから全画面で開けて、オフラインでも使えます', '')
    : '';
  return `<div class="setting-group">
    <h3>この端末</h3>
    ${install}
    ${settingRow('通知', `<span id="notifyDesc">${notifyStatusText()}</span>`, perm === 'default' ? `<button class="btn" id="notifyBtn">${ICON.bell}許可する</button>` : '')}
  </div>`;
}

function bindWebAppGroup(el) {
  const btn = $('#notifyBtn', el);
  if (!btn) return;
  btn.onclick = async () => {
    const r = await window.api.requestNotify();
    $('#notifyDesc', el).textContent = notifyStatusText();
    if (r !== 'default') btn.remove();
    if (r === 'granted') window.api.notify('🔔 通知がオンになりました', '予定の時刻になったらお知らせします');
  };
}

function openHelp() {
  const keys = [
    ['Ctrl + K', '検索・コマンドパレット'],
    [state.settings.shortcut, 'どこからでも表示 / 非表示'],
    [state.settings.quickAddShortcut, 'どこからでも、すばやく追加'],
    ['Ctrl + N  /  /', '追加欄にカーソル'],
    ['Ctrl + Z  /  Ctrl + Y', '元に戻す / やり直す'],
    ['Ctrl + F', 'ToDo を検索'],
    ['Ctrl + 1〜8', '画面の切り替え（左から順に）'],
    ['↑ ↓（J K）', '行を選ぶ'],
    ['Space', '選んだ行を完了 / 戻す'],
    ['Enter', '詳細を開く'],
    ['T / M / W', '今日 / 明日 / 来週に移す'],
    ['Alt + ↑ ↓', '並べ替え'],
    ['Delete', '削除'],
    ['右クリック', 'その場で期限・優先度・リストを変更'],
    ['F11', '全画面'],
    ['Esc', '閉じる'],
    ['?', 'この一覧'],
  ];
  const syntax = [
    ['今日 / 明日 / 明後日', '期限'],
    ['金曜までに / 来週の月曜 / 3日後 / 月末', '期限'],
    ['10/15 / 10月15日', '期限'],
    ['15:00 / 15時 / 午後3時半', '時刻'],
    ['30分 / 1時間（前後にスペース）', 'かかる時間'],
    ['#仕事', 'リスト（なければ作成）'],
    ['!高 / !中 / !低（!!! !! !）', '優先度'],
    ['毎日 / 毎朝 / 平日 / 週末', 'ルーティンとして追加'],
    ['毎週月木 / 毎月曜 / 毎月15日 / 毎月末', 'ルーティンとして追加'],
    ['3日ごと / 隔日', 'ルーティンとして追加'],
    ['×8', '1日の目標回数（ルーティン）'],
    ['複数行を貼り付け', '1 行ずつまとめて追加'],
    ['英語 単語テスト 金曜', '学校タブ：頭の科目名で、その科目の課題に'],
    ['来年 富士山に登る / 2027年3月 英検', 'いつかタブ：いつまでに、を読み取る'],
  ];
  const table = (rows) => `<table class="keys">${rows.map(([k, v]) => `<tr><td><kbd>${escapeHtml(k)}</kbd></td><td>${v}</td></tr>`).join('')}</table>`;
  openSheet(`
    <div class="sheet-head"><h2>ショートカットと入力のコツ</h2><span class="spacer"></span><button class="icon-btn" id="sClose" aria-label="閉じる">${ICON.close}</button></div>
    <div class="sheet-grid">
      ${field('キーボード', table(keys))}
      ${field('追加欄の書き方（例：明日 15時 歯医者 #生活 !高）', table(syntax))}
    </div>`, (el) => { $('#sClose', el).onclick = closeSheet; });
}

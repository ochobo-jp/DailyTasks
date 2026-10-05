'use strict';

// ============================================================
//  学校：時間割・出席・課題
//  時間割のマスに科目を入れると、今日の授業が「今日」画面とタイムラインに出る。
//  出席は ○ △ × で記録し、科目ごとに出席率と「あと何回休めるか」を出す。
//  課題は科目つきの ToDo（期限・通知・カレンダーがそのまま使える）
// ============================================================

const SCHOOL_PRESETS = [
  { id: 'hs', name: '中学・高校', desc: '50分 × 6時間', periods: [['08:50', '09:40'], ['09:50', '10:40'], ['10:50', '11:40'], ['11:50', '12:40'], ['13:30', '14:20'], ['14:30', '15:20']] },
  { id: 'univ', name: '大学・専門', desc: '90分 × 5コマ', periods: [['09:00', '10:30'], ['10:40', '12:10'], ['13:00', '14:30'], ['14:40', '16:10'], ['16:20', '17:50']] },
  { id: 'elem', name: '小学校', desc: '45分 × 6時間', periods: [['08:45', '09:30'], ['09:35', '10:20'], ['10:40', '11:25'], ['11:30', '12:15'], ['13:45', '14:30'], ['14:35', '15:20']] },
];
const SUBJECT_COLORS = ['#ef6b6b', '#f59e0b', '#e5b908', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#a16207'];
const ATT = {
  present: { label: '出席', mark: '○' },
  late: { label: '遅刻', mark: '△' },
  absent: { label: '欠席', mark: '×' },
  cancel: { label: '休講', mark: '休' },
};

const school = () => state.data.school;
const schoolOn = () => prefs().features.school;
const subjectById = (id) => school().subjects.find((s) => s.id === id);
const schoolDays = () => weekOrder().filter((d) => school().days.includes(d));

function classesOn(k) {
  const sc = school();
  if (!schoolOn() || !sc.setup || !sc.days.includes(dow(k))) return [];
  return sc.periods.map((p, i) => {
    const sub = subjectById(sc.timetable[`${dow(k)}-${i}`]);
    return sub ? { i, sub, start: p.start, end: p.end, rec: sc.attendance[k]?.[i] || null } : null;
  }).filter(Boolean);
}

function currentClass(k = state.today) {
  if (k !== state.today) return null;
  const now = nowMinutes();
  return classesOn(k).find((c) => toMinutes(c.start) <= now && now < toMinutes(c.end)) || null;
}

function setAttendance(k, i, status) {
  const sc = school();
  const day = { ...(sc.attendance[k] || {}) };
  if (!status || day[i]?.s === status) delete day[i];
  else day[i] = { s: status, sub: sc.timetable[`${dow(k)}-${i}`] };
  if (Object.keys(day).length) sc.attendance[k] = day;
  else delete sc.attendance[k];
}

function subjectStats(sid) {
  const c = { present: 0, late: 0, absent: 0, cancel: 0 };
  for (const day of Object.values(school().attendance)) {
    for (const rec of Object.values(day)) if (rec.sub === sid && c[rec.s] !== undefined) c[rec.s]++;
  }
  const held = c.present + c.late + c.absent;
  const sub = subjectById(sid);
  return {
    ...c, held,
    rate: held ? (c.present + c.late) / held : null,
    left: sub && sub.maxAbsence ? sub.maxAbsence - c.absent : null,
  };
}

// 時間割のどこにある科目か（「月2・水3」）
function subjectSlots(sid) {
  const sc = school();
  return schoolDays().flatMap((d) => sc.periods.map((_, i) => (sc.timetable[`${d}-${i}`] === sid ? `${WEEK[d]}${i + 1}` : null)).filter(Boolean)).join('・');
}

function newSubject(name) {
  const sc = school();
  const s = { id: uid(), name, color: SUBJECT_COLORS[sc.subjects.length % SUBJECT_COLORS.length], room: '', teacher: '', maxAbsence: null, note: '' };
  sc.subjects.push(s);
  return s;
}

// 課題の入力の頭に科目名があれば、その科目にする（「英語 単語テスト 金曜」）
function matchSubject(text) {
  const t = text.trim();
  const hit = [...school().subjects].sort((a, b) => b.name.length - a.name.length)
    .find((s) => t.startsWith(s.name) && (t.length === s.name.length || /\s|の/.test(t[s.name.length])));
  if (!hit) return { subject: null, rest: text };
  return { subject: hit, rest: t.slice(hit.name.length).replace(/^\s*の?\s*/, '') };
}

// ---------- 今日の授業 ----------

function classRow(c, k) {
  const now = currentClass(k)?.i === c.i;
  const st = c.rec?.s;
  const open = state.data.todos.filter((t) => t.subjectId === c.sub.id && !t.done).length;
  return `<div class="class-row ${now ? 'now' : ''} ${st ? `st-${st}` : ''}" style="--c:${c.sub.color}" data-kind="class" data-id="${c.sub.id}" data-day="${k}" data-period="${c.i}">
    <span class="cr-period">${c.i + 1}</span>
    <div class="cr-body" data-act="open-subject" data-id="${c.sub.id}">
      <div class="cr-title">${escapeHtml(c.sub.name)}${now ? '<span class="tag today">いま</span>' : ''}${st === 'cancel' ? '<span class="tag">休講</span>' : ''}</div>
      <div class="cr-meta">${c.start}–${c.end}${c.sub.room ? `・${escapeHtml(c.sub.room)}` : ''}${open ? `・課題 ${open}` : ''}</div>
    </div>
    <div class="att-btns">
      ${['present', 'late', 'absent'].map((s) => `<button class="att ${s} ${st === s ? 'on' : ''}" data-act="attend" data-day="${k}" data-period="${c.i}" data-v="${s}" data-tip="${ATT[s].label}">${ATT[s].mark}</button>`).join('')}
    </div>
  </div>`;
}

function classesSection(k = state.today, title = '今日の授業') {
  const cls = classesOn(k);
  if (!cls.length) return '';
  const unmarked = cls.filter((c) => !c.rec).length;
  return section(title, cls.map((c) => classRow(c, k)), {
    count: `${cls.length}コマ`,
    link: unmarked && k <= state.today ? `<button class="link" data-act="attend-all" data-day="${k}">まとめて出席</button>` : '',
  });
}

// ---------- 学校の画面 ----------

function schoolSetup() {
  return `${pageHead('学校', '時間割・出席・課題をまとめて管理', '', { always: true })}
    <section class="card school-setup">
      <div class="big">🏫</div>
      <h2>時間割をつくろう</h2>
      <p>学校の種類を選ぶと、授業の時間を自動で入れます（あとで変えられます）。<br>そのあと、マスを${TAP}して科目を入れてください。</p>
      <div class="seg mini" id="setupDays">
        <button class="${school().days.length === 5 ? 'active' : ''}" data-act="school-days" data-v="5">月〜金</button>
        <button class="${school().days.length === 6 ? 'active' : ''}" data-act="school-days" data-v="6">月〜土</button>
      </div>
      <div class="preset-grid">
        ${SCHOOL_PRESETS.map((p) => `<button class="preset" data-act="school-preset" data-v="${p.id}"><b>${p.name}</b><small>${p.desc}</small><small>${p.periods[0][0]} 〜 ${p.periods[p.periods.length - 1][1]}</small></button>`).join('')}
      </div>
    </section>`;
}

// 科目ごとに「次の授業」のマス（課題の数は、そこにだけ出す）
function nextSlots() {
  const sc = school();
  const now = nowMinutes();
  const next = {};
  for (let ahead = 0; ahead < 7; ahead++) {
    const d = (dow(state.today) + ahead) % 7;
    if (!sc.days.includes(d)) continue;
    sc.periods.forEach((p, i) => {
      if (ahead === 0 && toMinutes(p.end) <= now) return;
      const sid = sc.timetable[`${d}-${i}`];
      if (sid && !next[sid]) next[sid] = `${d}-${i}`;
    });
  }
  return next;
}

function timetableCard() {
  const sc = school();
  const days = schoolDays();
  const todayDow = dow(state.today);
  const cur = currentClass();
  const next = nextSlots();
  let cells = '<div class="tt-corner"></div>';
  cells += days.map((d) => `<div class="tt-day ${d === todayDow ? 'today' : ''}">${WEEK[d]}</div>`).join('');
  sc.periods.forEach((p, i) => {
    cells += `<div class="tt-period"><b>${i + 1}</b><span class="tt-time">${p.start}</span><span class="tt-time">${p.end}</span></div>`;
    for (const d of days) {
      const sub = subjectById(sc.timetable[`${d}-${i}`]);
      const cls = `${d === todayDow ? ' today' : ''}${cur && d === todayDow && cur.i === i ? ' now' : ''}`;
      if (sub) {
        const open = next[sub.id] === `${d}-${i}` ? state.data.todos.filter((x) => x.subjectId === sub.id && !x.done).length : 0;
        cells += `<button class="tt-cell filled${cls}" style="--c:${sub.color}" data-act="tt-cell" data-day="${d}" data-period="${i}">
          <span class="tt-name">${escapeHtml(sub.name)}</span>${sub.room ? `<span class="tt-room">${escapeHtml(sub.room)}</span>` : ''}
          ${open ? `<span class="tt-badge" data-tip="次の授業までの課題 ${open} 件">${open}</span>` : ''}</button>`;
      } else {
        cells += `<button class="tt-cell empty${cls}" data-act="tt-cell" data-day="${d}" data-period="${i}" aria-label="${WEEK[d]}曜 ${i + 1}限">${state.schoolEdit ? ICON.plus : ''}</button>`;
      }
    }
  });
  return `<section class="card tt-card ${state.schoolEdit ? 'editing' : ''}">
    <div class="tt-grid" style="--days:${days.length}">${cells}</div>
    ${state.schoolEdit ? `<p class="hint small">マスを${TAP}して科目を入れます。入れたマスをもう一度押すと変更できます</p>` : ''}
  </section>`;
}

function attendanceCard() {
  const sc = school();
  const used = sc.subjects.filter((s) => Object.values(sc.timetable).includes(s.id));
  if (!used.length) return '';
  const rows = used.map((s) => {
    const st = subjectStats(s.id);
    const warn = st.left !== null && st.left <= 1;
    return `<button class="att-row ${warn ? 'warn' : ''}" data-act="open-subject" data-id="${s.id}" style="--c:${s.color}">
      <span class="att-name"><i></i>${escapeHtml(s.name)}</span>
      <span class="hbar"><span style="width:${(st.rate ?? 0) * 100}%"></span></span>
      <span class="att-num">${st.rate === null ? '—' : Math.round(st.rate * 100) + '%'}</span>
      <span class="att-counts">○${st.present} △${st.late} ×${st.absent}</span>
      <span class="att-left">${st.left === null ? '' : st.left < 0 ? `${-st.left}回オーバー` : `あと${st.left}回休める`}</span>
    </button>`;
  }).join('');
  return `<section class="card chart-card att-card">
    <div class="card-head">出席 <span class="muted small">○ 出席・△ 遅刻・× 欠席</span></div>
    <div class="att-list">${rows}</div>
    <p class="hint small">科目を開くと「欠席できる回数」を決められます</p>
  </section>`;
}

function renderSchoolView() {
  const sc = school();
  if (!sc.setup) return schoolSetup();
  const t = state.today;
  const cls = classesOn(t);
  const assignments = state.data.todos.filter((x) => x.subjectId && !x.done).sort(byDue);
  const doneAssign = state.data.todos.filter((x) => x.subjectId && x.done).sort((a, b) => (a.doneAt < b.doneAt ? 1 : -1));
  const head = pageHead('学校', `今日 ${cls.length} コマ・課題 ${assignments.length} 件`,
    `<button class="btn ${state.schoolEdit ? 'primary' : ''}" data-act="school-edit">${ICON.edit}${state.schoolEdit ? '編集を終える' : '時間割を編集'}</button>
     <button class="icon-btn" data-act="school-settings" data-tip="時間と曜日の設定">${ICON.gear}</button>`, { always: true });

  let left = '';
  left += classesSection(t) || (sc.days.includes(dow(t)) ? '' : `<p class="hint">${ICON.sun}今日は授業のない日です</p>`);
  left += section('課題', assignments.map((x) => todoRow(x)), { count: assignments.length });
  if (!assignments.length) left += `<p class="hint">${ICON.note}下の欄から「英語 単語テスト 金曜」のように課題を追加できます</p>`;
  left += fold('assign-done', '提出ずみ', doneAssign.length, doneAssign.slice(0, 50).map((x) => todoRow(x, { draggable: false, vt: false })));

  return `${head}${timetableCard()}
    <div class="cols school-cols"><div class="col">${left}</div><div class="col">${attendanceCard()}</div></div>`;
}

// ---------- マスの科目を選ぶ ----------

function openCellSheet(d, i) {
  const sc = school();
  const key = `${d}-${i}`;
  const cur = subjectById(sc.timetable[key]);
  let color = SUBJECT_COLORS[sc.subjects.length % SUBJECT_COLORS.length];
  openSheet(`
    <div class="sheet-head"><h2>${WEEK[d]}曜 ${i + 1}限（${sc.periods[i].start}〜${sc.periods[i].end}）</h2><span class="spacer"></span>
      <button class="icon-btn" id="sClose" aria-label="閉じる">${ICON.close}</button></div>
    ${sc.subjects.length ? field('科目を選ぶ', `<div class="subject-chips">${sc.subjects.map((s) => `<button class="subject-chip ${cur && cur.id === s.id ? 'on' : ''}" data-pick="${s.id}" style="--c:${s.color}"><i></i>${escapeHtml(s.name)}${s.room ? `<small>${escapeHtml(s.room)}</small>` : ''}</button>`).join('')}</div>`) : ''}
    ${field('新しい科目', `<div class="inline">
        <input class="text" id="sName" placeholder="科目名（例：英語）" maxlength="20">
        <input class="text room" id="sRoom" placeholder="教室（なくてもOK）" maxlength="20">
      </div>
      <div class="swatches field-note" id="sColors">${SUBJECT_COLORS.map((c) => `<button class="swatch ${c === color ? 'on' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}</div>`)}
    <div class="sheet-foot">
      ${cur ? `<button class="btn danger" id="sClear">${ICON.trash}空きにする</button>` : ''}
      <span class="spacer"></span>
      <button class="btn primary" id="sAdd">${ICON.plus}追加して入れる</button>
    </div>`, (el) => {
    const assign = (sid) => {
      if (sid) sc.timetable[key] = sid;
      else delete sc.timetable[key];
      closeSheet();
      commit();
    };
    $('#sClose', el).onclick = closeSheet;
    el.addEventListener('click', (e) => {
      const p = e.target.closest('[data-pick]');
      if (p) assign(p.dataset.pick);
      const c = e.target.closest('[data-color]');
      if (c) { color = c.dataset.color; $$('#sColors .swatch', el).forEach((x) => x.classList.toggle('on', x === c)); }
    });
    const add = () => {
      const name = $('#sName', el).value.trim();
      if (!name) { $('#sName', el).focus(); return; }
      const existing = sc.subjects.find((s) => s.name === name);
      const s = existing || newSubject(name);
      if (!existing) { s.color = color; s.room = $('#sRoom', el).value.trim(); }
      assign(s.id);
    };
    $('#sAdd', el).onclick = add;
    $('#sName', el).onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) add(); };
    if (cur) $('#sClear', el).onclick = () => assign(null);
    setTimeout(() => (sc.subjects.length ? null : $('#sName', el).focus()), 50);
  });
}

// ---------- 科目の詳細 ----------

function openSubjectSheet(s) {
  if (!s) return;
  const st = subjectStats(s.id);
  const history = Object.entries(school().attendance)
    .flatMap(([k, day]) => Object.entries(day).filter(([, r]) => r.sub === s.id).map(([i, r]) => ({ k, i: Number(i), s: r.s })))
    .sort((a, b) => (a.k < b.k ? 1 : -1)).slice(0, 12);
  openSheet(`
    <div class="sheet-head">
      <span class="subject-dot" style="background:${s.color}"></span>
      <input class="text title-text" id="sTitle" maxlength="20" value="${escapeHtml(s.name)}">
      <button class="icon-btn" id="sClose" aria-label="閉じる">${ICON.close}</button>
    </div>
    <div class="mini-stats">
      <div><b>${st.rate === null ? '—' : Math.round(st.rate * 100) + '%'}</b><span>出席率</span></div>
      <div><b>${st.absent}</b><span>欠席</span></div>
      <div><b class="${st.left !== null && st.left <= 1 ? 'warn-text' : ''}">${st.left === null ? '—' : st.left < 0 ? `${st.left}` : st.left}</b><span>${st.left === null ? 'あと休める回数（未設定）' : 'あと休める回数'}</span></div>
    </div>
    <div class="sheet-grid">
      ${field('教室', `<input class="text wide-input" id="sRoom" maxlength="20" value="${escapeHtml(s.room || '')}" placeholder="例：A201">`)}
      ${field('先生', `<input class="text wide-input" id="sTeacher" maxlength="20" value="${escapeHtml(s.teacher || '')}" placeholder="例：山田先生">`)}
      ${field('色', `<div class="swatches">${SUBJECT_COLORS.map((c) => `<button class="swatch ${c === s.color ? 'on' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}</div>`)}
      ${field('欠席できる回数', `<div class="inline"><input type="number" class="text num-input" id="sMax" min="0" max="99" value="${s.maxAbsence ?? ''}" placeholder="—"><span class="small muted">回まで（空欄なら数えない）</span></div>`)}
      ${field('課題', `<div class="list sheet-list" id="sAssign"></div>
        <form class="sub-add" id="sAssignForm"><input class="text" id="sAssignInput" placeholder="課題を追加…（例：金曜までに レポート）" maxlength="200"></form>`, 'full')}
      ${field('メモ（持ち物・テスト範囲など）', `<textarea class="text autosize" id="sNote" rows="2" maxlength="3000">${escapeHtml(s.note || '')}</textarea>`, 'full')}
      ${history.length ? field('最近の出席', `<div class="att-history">${history.map((h) => `<span class="att-h ${h.s}" data-tip="${shortDate(h.k)} ${h.i + 1}限・${ATT[h.s].label}">${ATT[h.s].mark}<small>${shortDate(h.k)}</small></span>`).join('')}</div>`, 'full') : ''}
    </div>
    <div class="sheet-foot">
      <span class="muted small">${subjectSlots(s.id) || '時間割にはまだ入っていません'}</span>
      <span class="spacer"></span>
      <button class="btn danger" id="sDel">${ICON.trash}科目を削除</button>
    </div>`, (el) => {
    const paintAssign = () => {
      const items = state.data.todos.filter((t) => t.subjectId === s.id).sort((a, b) => a.done - b.done || byDue(a, b)).slice(0, 30);
      $('#sAssign', el).innerHTML = items.map((t) => todoRow(t, { draggable: false, vt: false })).join('') || '<div class="muted small">課題はありません</div>';
    };
    paintAssign();
    $('#sClose', el).onclick = closeSheet;
    $('#sTitle', el).oninput = (e) => { if (e.target.value.trim()) { s.name = e.target.value.trim(); commit(); } };
    $('#sRoom', el).oninput = (e) => { s.room = e.target.value.trim(); commit(); };
    $('#sTeacher', el).oninput = (e) => { s.teacher = e.target.value.trim(); save(); };
    $('#sMax', el).onchange = (e) => {
      const v = e.target.value.trim();
      s.maxAbsence = v === '' ? null : clamp(Math.round(Number(v)), 0, 99);
      commit();
    };
    $('#sNote', el).oninput = (e) => { s.note = e.target.value; autosize(e.target); save(); };
    el.addEventListener('click', (e) => {
      const c = e.target.closest('.swatch[data-color]');
      if (c) { s.color = c.dataset.color; $$('.swatch', el).forEach((x) => x.classList.toggle('on', x === c)); commit(); }
      // シートの中の課題のチェック・削除は、ふつうの操作と同じ
      if (e.target.closest('#sAssign [data-act]')) setTimeout(paintAssign, 0);
    });
    $('#sAssignForm', el).onsubmit = (e) => {
      e.preventDefault();
      const input = $('#sAssignInput', el);
      const text = input.value.trim();
      if (!text) return;
      const p = parseQuick(text, state.today);
      state.data.todos.push(newTodo({ title: p.title, due: p.due ?? null, time: p.time, remind: !!p.time, priority: p.priority || 0, subjectId: s.id }));
      input.value = '';
      commit();
      paintAssign();
    };
    $('#sDel', el).onclick = () => { closeSheet(); removeSubject(s.id); };
  });
}

function removeSubject(id) {
  const sc = school();
  const s = subjectById(id);
  if (!s) return;
  sc.subjects = sc.subjects.filter((x) => x.id !== id);
  for (const k of Object.keys(sc.timetable)) if (sc.timetable[k] === id) delete sc.timetable[k];
  for (const t of state.data.todos) if (t.subjectId === id) t.subjectId = null;
  save();
  renderAll();
  toast(`科目「${s.name}」を削除しました（課題は残っています）`, { undo: true });
}

// ---------- 時間と曜日の設定 ----------

function openSchoolSettings() {
  const sc = school();
  openSheet(`
    <div class="sheet-head"><h2>時間割の設定</h2><span class="spacer"></span><button class="icon-btn" id="sClose" aria-label="閉じる">${ICON.close}</button></div>
    ${field('授業のある曜日', `<div class="chips" id="sDays">${weekOrder().map((d) => `<button class="chip day ${d === 0 ? 'sun' : d === 6 ? 'sat' : ''} ${sc.days.includes(d) ? 'on' : ''}" data-day="${d}">${WEEK[d]}</button>`).join('')}</div>`)}
    ${field('時間', `<div class="periods" id="sPeriods"></div>
      <div class="inline field-note"><button class="btn" id="sAddPeriod">${ICON.plus}時間を足す</button>
      <span class="small muted">まとめて入れる：</span>${SCHOOL_PRESETS.map((p) => `<button class="chip" data-preset="${p.id}">${p.name}</button>`).join('')}</div>`)}
    ${field('通知', `<div class="inline"><span class="small">授業の 5 分前にお知らせ</span><span class="spacer"></span>${sw('sNotify', prefs().classNotify)}</div>`)}
    <div class="sheet-foot">
      <button class="btn" id="sOff">学校の機能を使わない</button>
      <span class="spacer"></span>
      <button class="btn primary" id="sDone">完了</button>
    </div>`, (el) => {
    const paint = () => {
      $('#sPeriods', el).innerHTML = sc.periods.map((p, i) => `<div class="period-row" data-i="${i}">
        <b>${i + 1}限</b>
        <input type="time" class="text time" data-edge="start" value="${p.start}">
        <span>〜</span>
        <input type="time" class="text time" data-edge="end" value="${p.end}">
        <button class="mini-btn del" data-remove="${i}" data-tip="この時間を消す">${ICON.close}</button>
      </div>`).join('');
    };
    paint();
    $('#sClose', el).onclick = closeSheet;
    $('#sDone', el).onclick = closeSheet;
    el.addEventListener('click', (e) => {
      const d = e.target.closest('[data-day]');
      if (d) {
        const n = Number(d.dataset.day);
        sc.days = sc.days.includes(n) ? sc.days.filter((x) => x !== n) : [...sc.days, n].sort();
        d.classList.toggle('on', sc.days.includes(n));
        commit();
      }
      const r = e.target.closest('[data-remove]');
      if (r) {
        const i = Number(r.dataset.remove);
        sc.periods.splice(i, 1);
        // 後ろの時間のマスを 1 つずつ前につめる
        const next = {};
        for (const [k, sid] of Object.entries(sc.timetable)) {
          const [day, p] = k.split('-').map(Number);
          if (p === i) continue;
          next[`${day}-${p > i ? p - 1 : p}`] = sid;
        }
        sc.timetable = next;
        paint(); commit();
      }
      const pr = e.target.closest('[data-preset]');
      if (pr) {
        const preset = SCHOOL_PRESETS.find((x) => x.id === pr.dataset.preset);
        sc.periods = preset.periods.map(([start, end]) => ({ start, end }));
        paint(); commit();
      }
    });
    el.addEventListener('change', (e) => {
      const row = e.target.closest('.period-row');
      if (row && e.target.value) {
        sc.periods[Number(row.dataset.i)][e.target.dataset.edge] = e.target.value;
        commit();
      }
    });
    $('#sAddPeriod', el).onclick = () => {
      const last = sc.periods[sc.periods.length - 1];
      const start = last ? Math.min(toMinutes(last.end) + 10, 23 * 60) : 9 * 60;
      const len = last ? toMinutes(last.end) - toMinutes(last.start) : 50;
      sc.periods.push({ start: hm(start), end: hm(Math.min(start + len, 23 * 60 + 59)) });
      paint(); commit();
    };
    $('#sNotify', el).onclick = (e) => { prefs().classNotify = !prefs().classNotify; setSwitch(e.currentTarget, prefs().classNotify); save(); };
    $('#sOff', el).onclick = () => {
      prefs().features.school = false;
      closeSheet();
      save();
      switchView('today');
      toast('学校の機能をオフにしました（設定からいつでも戻せます）');
    };
  });
}

// ---------- 右クリック ----------

function classMenu(k, i, x, y) {
  const c = classesOn(k).find((cl) => cl.i === i);
  if (!c) return;
  const st = c.rec?.s;
  openMenu(x, y, `
    <div class="menu-title">${shortDate(k)} ${i + 1}限・${escapeHtml(c.sub.name)}</div>
    ${Object.entries(ATT).map(([key, a]) => `<button class="menu-item" data-m="att" data-v="${key}"><span class="att-mark ${key}">${a.mark}</span><span>${a.label}</span>${st === key ? ICON.check : ''}</button>`).join('')}
    ${st ? mItem('clear', 'undo', '記録を消す') : ''}
    ${mSep}
    ${mItem('open', 'edit', '科目を開く')}`, (m, v) => {
    if (m === 'att') { setAttendance(k, i, v); save(); refresh(); }
    if (m === 'clear') { setAttendance(k, i, null); save(); refresh(); }
    if (m === 'open') openSubjectSheet(c.sub);
  });
}

function ttCellMenu(d, i, x, y) {
  const sc = school();
  const sub = subjectById(sc.timetable[`${d}-${i}`]);
  openMenu(x, y, `
    <div class="menu-title">${WEEK[d]}曜 ${i + 1}限${sub ? `・${escapeHtml(sub.name)}` : ''}</div>
    ${mItem('pick', 'edit', sub ? '科目を変える' : '科目を入れる')}
    ${sub ? mItem('open', 'note', '科目を開く') : ''}
    ${sub ? mItem('clear', 'trash', '空きにする', { danger: true }) : ''}`, (m) => {
    if (m === 'pick') openCellSheet(d, i);
    if (m === 'open') openSubjectSheet(sub);
    if (m === 'clear') { delete sc.timetable[`${d}-${i}`]; commit(); }
  });
}

'use strict';

// ============================================================
//  iPhone の操作
//  ・長押し → 右クリックメニュー
//  ・行を右にスワイプ → 完了 / 左にスワイプ → メニュー
//  ・シートを下にスワイプ → 閉じる
//  ・キーボードが出ている間は、画面の高さをキーボードの上までにする
// ============================================================

(function () {
  if (!window.api.touch) return;

  const MENU_TARGET = '[data-kind][data-id], .tt-cell, [data-list], [data-drop-day]';
  const SWIPE_TARGET = '#content .item[data-kind="todo"], #content .item[data-kind="routine"], #content .class-row';
  const SWIPE_DONE = 72;

  let g = null;   // いまの指の動き

  const fireMenu = (target, x, y) => {
    target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: x, clientY: y }));
  };

  function clearSwipe(el, animate) {
    if (!el) return;
    const reveal = el.querySelector(':scope > .swipe-reveal');
    if (animate) {
      el.style.transition = 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)';
      el.style.transform = '';
      setTimeout(() => { el.style.transition = ''; reveal?.remove(); el.classList.remove('swiping'); }, 230);
    } else {
      el.style.transform = '';
      reveal?.remove();
      el.classList.remove('swiping');
    }
  }

  document.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { cancel(); return; }
    const t = e.touches[0];
    const target = e.target;
    const field = target.closest('input, textarea, select, [contenteditable]');
    // 入力中の欄の上では、文字の選択などを iPhone に任せる
    if (field && field === document.activeElement) return;
    g = { x: t.clientX, y: t.clientY, dx: 0, dy: 0, target, mode: null, fired: false };
    const menuEl = !field && target.closest(MENU_TARGET);
    if (menuEl && !target.closest('.menu, .palette')) {
      g.timer = setTimeout(() => {
        if (!g || g.mode) return;
        g.fired = true;
        fireMenu(target, g.x, g.y);
      }, 480);
    }
    g.swipeEl = field ? null : target.closest(SWIPE_TARGET);
    const sheet = target.closest('#sheet');
    if (sheet && sheet.scrollTop <= 0) g.sheet = sheet;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!g) return;
    const t = e.touches[0];
    g.dx = t.clientX - g.x;
    g.dy = t.clientY - g.y;
    if (!g.mode) {
      if (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) return;
      clearTimeout(g.timer);
      if (g.swipeEl && Math.abs(g.dx) > Math.abs(g.dy) * 1.4) g.mode = 'swipe';
      else if (g.sheet && g.dy > 0 && g.dy > Math.abs(g.dx) && g.sheet.scrollTop <= 0) g.mode = 'sheet';
      else { g.mode = 'scroll'; return; }
    }
    if (g.mode === 'swipe') {
      e.preventDefault();
      const el = g.swipeEl;
      const dx = g.dx > 0 ? Math.min(g.dx, 140) : Math.max(g.dx, -140);
      el.classList.add('swiping');
      let reveal = el.querySelector(':scope > .swipe-reveal');
      if (!reveal) {
        reveal = document.createElement('div');
        reveal.className = 'swipe-reveal';
        el.appendChild(reveal);
      }
      const right = dx > 0;
      const isDone = el.classList.contains('done') || el.classList.contains('st-present');
      reveal.className = `swipe-reveal ${right ? (isDone ? 'undo' : 'done') : 'more'} ${Math.abs(dx) >= SWIPE_DONE ? 'ready' : ''}`;
      const doneLabel = el.classList.contains('class-row') ? '○ 出席' : '✓ 完了';
      reveal.textContent = right ? (isDone ? (el.classList.contains('class-row') ? '出席ずみ' : '↺ もどす') : doneLabel) : '… メニュー';
      reveal.style.width = `${Math.abs(dx)}px`;
      reveal.style.left = right ? `${-dx}px` : '100%';
      el.style.transform = `translateX(${dx}px)`;
    } else if (g.mode === 'sheet') {
      e.preventDefault();
      g.sheet.style.transition = 'none';
      g.sheet.style.transform = `translateY(${Math.max(0, g.dy)}px)`;
    }
  }, { passive: false });

  function cancel() {
    if (!g) return;
    clearTimeout(g.timer);
    g = null;
  }

  document.addEventListener('touchend', (e) => {
    if (!g) return;
    const cur = g;
    clearTimeout(cur.timer);
    g = null;
    // 長押しでメニューを出したときは、そのあとのタップを起こさない
    if (cur.fired) { e.preventDefault(); return; }
    if (cur.mode === 'swipe') {
      const el = cur.swipeEl;
      if (cur.dx >= SWIPE_DONE) {
        const check = el.querySelector('.check:not(.placeholder), .att.present:not(.on)');
        clearSwipe(el, true);
        if (check) setTimeout(() => check.click(), 120);
      } else if (cur.dx <= -SWIPE_DONE) {
        clearSwipe(el, true);
        const r = el.getBoundingClientRect();
        setTimeout(() => fireMenu(el, r.right - 40, r.top + r.height / 2), 120);
      } else {
        clearSwipe(el, true);
      }
    } else if (cur.mode === 'sheet') {
      const s = cur.sheet;
      if (cur.dy > 110) {
        s.style.transition = 'transform 0.2s ease-in';
        s.style.transform = 'translateY(100%)';
        setTimeout(() => { closeSheet(); s.style.transition = ''; s.style.transform = ''; }, 190);
      } else {
        s.style.transition = 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)';
        s.style.transform = '';
        setTimeout(() => { s.style.transition = ''; }, 230);
      }
    }
  }, { passive: false });

  document.addEventListener('touchcancel', () => {
    if (g && g.mode === 'swipe') clearSwipe(g.swipeEl, true);
    if (g && g.mode === 'sheet') { g.sheet.style.transform = ''; g.sheet.style.transition = ''; }
    cancel();
  });

  // ---------- キーボード ----------
  // ホーム画面のアプリでは、キーボードが出ても画面の高さが変わらないので、見えている高さに合わせる
  const vv = window.visualViewport;
  if (vv) {
    const root = document.documentElement;
    const fit = () => {
      const kb = innerHeight - vv.height > 120;
      root.classList.toggle('kb-open', kb);
      root.style.setProperty('--vvh', `${Math.round(vv.height)}px`);
      if (kb) window.scrollTo(0, 0);
    };
    vv.addEventListener('resize', fit);
    vv.addEventListener('scroll', () => { if (root.classList.contains('kb-open')) window.scrollTo(0, 0); });
    fit();
  }
}());

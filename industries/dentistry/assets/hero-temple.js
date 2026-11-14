/* KINETIA / Dentistry — emerald temple hero
   The supplied artwork is the immutable visual source: no crop, no stretch,
   no recolour. Depth comes from layered frame parallax, moving emerald light
   and sparse volumetric dust. All decorative motion pauses offscreen and is
   disabled for prefers-reduced-motion. */
(function () {
  'use strict';

  var host = document.getElementById('dnTemple');
  if (!host || host.dataset.dnTempleReady) return;
  host.dataset.dnTempleReady = '1';

  var dust = host.querySelector('.dn-temple-dust');
  var img = host.querySelector('.dn-temple-media img');
  var mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
  var reduced = mqReduced.matches;

  /* ---------- reveal ---------- */
  var revealed = false;
  var revealTimer = 0;
  function reveal() {
    if (revealed) return;
    revealed = true;
    host.classList.remove('is-start');
    host.classList.add('is-on');
  }
  if (img && !img.complete) {
    host.classList.add('is-start');
    img.addEventListener('load', reveal, { once: true });
    img.addEventListener('error', reveal, { once: true });
    revealTimer = window.setTimeout(reveal, 4000);
  } else {
    reveal();
  }

  /* ---------- pointer parallax (desktop, fine pointer only) ---------- */
  var frame = 0;
  var targetX = 0, targetY = 0, curX = 0, curY = 0;

  function onMove(e) {
    var r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    targetX = (e.clientX - r.left) / r.width - .5;
    targetY = (e.clientY - r.top) / r.height - .5;
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function tick() {
    frame = 0;
    curX += (targetX - curX) * .12;
    curY += (targetY - curY) * .12;
    host.style.setProperty('--dn-px', curX.toFixed(4));
    host.style.setProperty('--dn-py', curY.toFixed(4));
    if (Math.abs(targetX - curX) > .0015 || Math.abs(targetY - curY) > .0015) {
      frame = requestAnimationFrame(tick);
    }
  }

  function onLeave() {
    targetX = 0;
    targetY = 0;
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function bindPointer() {
    if (reduced || !mqFine.matches) return;
    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave, { passive: true });
  }

  function unbindPointer() {
    host.removeEventListener('pointermove', onMove);
    host.removeEventListener('pointerleave', onLeave);
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    host.style.removeProperty('--dn-px');
    host.style.removeProperty('--dn-py');
    curX = curY = targetX = targetY = 0;
  }

  /* ---------- sparse luminous dust ---------- */
  var ctx = dust ? dust.getContext('2d') : null;
  var parts = [];
  var W = 0, H = 0, seededW = 0, seededH = 0;
  var dustFrame = 0, lastFrame = 0, startTime = 0;
  var visible = true;

  function seed() {
    var density = W < 520 ? 9 : W < 900 ? 15 : 24;
    parts = [];
    for (var i = 0; i < density; i++) {
      parts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: .5 + Math.random() * 1.5,
        a: .04 + Math.random() * .12,
        vx: (Math.random() - .5) * 5,
        vy: -6 - Math.random() * 12,
        ph: Math.random() * 6.283
      });
    }
  }

  function sizeDust() {
    if (!dust || !ctx) return;
    var r = dust.getBoundingClientRect();
    if (!r.width || !r.height) return;
    W = r.width;
    H = r.height;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    dust.width = Math.round(W * dpr);
    dust.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (Math.abs(W - seededW) > 1 || Math.abs(H - seededH) > 1 || !parts.length) {
      seededW = W;
      seededH = H;
      seed();
    }
  }

  function drawDust(now) {
    dustFrame = 0;
    if (!ctx || !visible || document.hidden) return;
    var dt = Math.min((now - lastFrame) / 1000, .05);
    lastFrame = now;
    if (!startTime) startTime = now;
    var t = (now - startTime) / 1000;

    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y < -6) {
        p.y = H + 4;
        p.x = Math.random() * W;
      }
      if (p.x < -6) p.x = W + 4;
      else if (p.x > W + 6) p.x = -4;

      var alpha = p.a * (.55 + .45 * Math.sin(t * .5 + p.ph));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.283);
      ctx.fillStyle = 'rgba(122,255,203,' + alpha.toFixed(3) + ')';
      ctx.fill();
    }
    dustFrame = requestAnimationFrame(drawDust);
  }

  function startDust() {
    if (reduced || !ctx || dustFrame || !visible || document.hidden) return;
    sizeDust();
    lastFrame = performance.now();
    dustFrame = requestAnimationFrame(drawDust);
  }

  function stopDust() {
    if (dustFrame) {
      cancelAnimationFrame(dustFrame);
      dustFrame = 0;
    }
  }

  /* ---------- viewport / visibility ---------- */
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      host.classList.toggle('is-live', visible);
      if (visible) startDust();
      else stopDust();
    }, { threshold: 0 });
    io.observe(host);
  } else {
    host.classList.add('is-live');
    startDust();
  }

  function onVisibility() {
    if (document.hidden) {
      stopDust();
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    } else if (visible) {
      startDust();
    }
  }

  /* ---------- resize ---------- */
  var ro = null;
  if ('ResizeObserver' in window && dust) {
    ro = new ResizeObserver(function () { sizeDust(); });
    ro.observe(dust);
  } else {
    window.addEventListener('resize', sizeDust, { passive: true });
  }

  /* ---------- preference changes ---------- */
  function onMotionChange() {
    reduced = mqReduced.matches;
    if (reduced) {
      unbindPointer();
      stopDust();
      if (ctx) ctx.clearRect(0, 0, W, H);
    } else {
      bindPointer();
      if (visible) startDust();
    }
  }

  function onFineChange() {
    if (mqFine.matches) bindPointer();
    else unbindPointer();
  }

  if (mqReduced.addEventListener) mqReduced.addEventListener('change', onMotionChange);
  if (mqFine.addEventListener) mqFine.addEventListener('change', onFineChange);

  /* ---------- lifecycle ---------- */
  function destroy() {
    unbindPointer();
    stopDust();
    if (io) io.disconnect();
    if (ro) ro.disconnect();
    if (revealTimer) window.clearTimeout(revealTimer);
    window.removeEventListener('resize', sizeDust);
    document.removeEventListener('visibilitychange', onVisibility);
    if (mqReduced.removeEventListener) mqReduced.removeEventListener('change', onMotionChange);
    if (mqFine.removeEventListener) mqFine.removeEventListener('change', onFineChange);
  }

  bindPointer();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', destroy, { once: true });
})();

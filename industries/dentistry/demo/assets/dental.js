/* ============================================================
   SMILA Dental Atelier — demo website behaviour
   Header, navigation, reveal, booking flow, shared demo store.
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };
  var RM = false;
  try { RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  window.smilaEsc = esc;

  /* ---------- year ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- header ---------- */
  var hdr = $('.hdr');
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle('solid', window.scrollY > 12); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- current page ---------- */
  var path = location.pathname.replace(/index\.html$/, '');
  $$('.hdr-nav a,.mnav-links a').forEach(function (a) {
    var href = a.getAttribute('href') || '';
    var norm = href.replace(/index\.html$/, '');
    if (norm === '/' || /^https?:/.test(norm)) return;
    if (path === norm || (norm.length > 1 && path.indexOf(norm) === 0 && norm.indexOf('/industries/dentistry/demo/') !== 0)) {
      a.setAttribute('aria-current', 'page');
    }
  });

  /* ---------- mobile nav ---------- */
  var burger = $('#burger'), mnav = $('#mnav');
  if (burger && mnav) {
    var setMenu = function (open) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
      mnav.classList.toggle('open', open);
      document.body.classList.toggle('lock', open);
      if (open) { var f = mnav.querySelector('a'); if (f) f.focus({ preventScroll: true }); }
    };
    burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
    $$('a', mnav).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mnav.classList.contains('open')) setMenu(false);
    });
    var mq = window.matchMedia('(min-width: 901px)');
    var onChange = function (e) { if (e.matches && mnav.classList.contains('open')) setMenu(false); };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  /* ---------- reveal ---------- */
  var rv = $$('[data-rv]');
  if (rv.length) {
    if (RM || !('IntersectionObserver' in window)) rv.forEach(function (el) { el.classList.add('in'); });
    else {
      var rio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          en.target.classList.add('in');
          rio.unobserve(en.target);
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: .08 });
      rv.forEach(function (el) { rio.observe(el); });
    }
  }

  /* ---------- demo toast ---------- */
  var toastEl = null;
  window.smilaToast = function (msg, ms) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove('show'); }, ms || 3600);
  };

  /* ---------- reset demo data (available on all pages) ---------- */
  $$('[data-demo-reset]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!window.confirm('Скинути всі демо-дані до початкового стану? Зміни в CRM, записах і автоматизаціях буде втрачено.')) return;
      KD.reset();
      window.smilaToast('Демо-дані скинуто до початкового стану.');
      setTimeout(function () { location.reload(); }, 700);
    });
  });

  /* ---------- booking ---------- */
  var bkRoot = $('#booking');
  if (!bkRoot || !window.KD) return;

  var state = {
    step: 1,
    service: null,
    doctor: null,
    date: null,
    time: null,
    name: '',
    phone: '',
    email: '',
    consentAppt: false,
    consentMkt: false,
    lead: null,
    appt: null,
    busy: false
  };

  var panels = $$('.bk-panel', bkRoot);
  var stepEls = $$('.bk-steps li', bkRoot);
  var nextBtns = $$('[data-bk-next]', bkRoot);
  var backBtns = $$('[data-bk-back]', bkRoot);
  var summaryEl = $('#bkSummary', bkRoot);
  var stepNoEl = $('#bkStepNo', bkRoot);
  var liveEl = $('#bkLive', bkRoot);

  stepEls.forEach(function (li, i) { li.setAttribute('data-n', String(i + 1)); });

  function announce(msg) {
    if (!liveEl) return;
    liveEl.textContent = '';
    setTimeout(function () { liveEl.textContent = msg; }, 30);
  }

  /* prefill from query (service/doctor slugs, no PII) */
  try {
    var qp = new URLSearchParams(location.search);
    var s = qp.get('service');
    var d = qp.get('doctor');
    if (s) { var sv = KD.SERVICES.filter(function (x) { return x.slug === s || x.id === s; })[0]; if (sv) state.service = sv.id; }
    if (d) { var dv = KD.DOCTORS.filter(function (x) { return x.slug === d || x.id === d; })[0]; if (dv) state.doctor = dv.id; }
  } catch (e) {}

  function serviceObj() { return state.service ? KD.serviceById(state.service) : null; }
  function doctorObj() { return state.doctor && state.doctor !== 'any' ? KD.doctorById(state.doctor) : null; }

  function renderDoctors() {
    var wrap = $('#bkDoctors', bkRoot);
    if (!wrap) return;
    var svc = serviceObj();
    var list = KD.DOCTORS.filter(function (d) { return !svc || svc.doctors.indexOf(d.id) >= 0; });
    if (state.doctor && state.doctor !== 'any' && !list.some(function (d) { return d.id === state.doctor; })) {
      state.doctor = null;
    }
    var options = [{ id: 'any', name: 'Будь-який вільний лікар', role: 'Адміністратор підбере фахівця за напрямом' }].concat(list.map(function (d) {
      return { id: d.id, name: d.name, role: d.role };
    }));
    wrap.innerHTML = options.map(function (o) {
      return '<button type="button" class="opt" data-doc="' + esc(o.id) + '" aria-pressed="' + (state.doctor === o.id) + '"><b>' + esc(o.name) + '</b><span>' + esc(o.role) + '</span><span class="tick">✓</span></button>';
    }).join('');
    $$('[data-doc]', wrap).forEach(function (b) {
      b.addEventListener('click', function () {
        state.doctor = b.getAttribute('data-doc');
        $$('[data-doc]', wrap).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        if (state.date) renderTimes();
      });
    });
  }

  function renderServices() {
    var wrap = $('#bkServices', bkRoot);
    if (!wrap) return;
    var list = KD.SERVICES.filter(function (s) { return s.enabled; });
    wrap.innerHTML = list.map(function (s) {
      return '<button type="button" class="opt" data-svc="' + esc(s.id) + '" aria-pressed="' + (state.service === s.id) + '"><b>' + esc(s.title) + '</b><span>' + esc(s.short) + ' · ' + s.duration + ' хв</span><span class="tick">✓</span></button>';
    }).join('');
    $$('[data-svc]', wrap).forEach(function (b) {
      b.addEventListener('click', function () {
        state.service = b.getAttribute('data-svc');
        state.doctor = null;
        $$('[data-svc]', wrap).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        renderDoctors();
        renderDates();
      });
    });
  }

  var DOW = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  var MON = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];

  function nextDates(n) {
    var out = [], d = new Date();
    d.setHours(0, 0, 0, 0);
    for (var i = 1; out.length < n && i < n + 20; i++) {
      var x = new Date(d); x.setDate(x.getDate() + i);
      if (x.getDay() === 0) continue; /* Sunday: за домовленістю */
      out.push(x);
    }
    return out;
  }

  function renderDates() {
    var wrap = $('#bkDays', bkRoot);
    if (!wrap) return;
    var days = nextDates(7);
    wrap.innerHTML = days.map(function (d) {
      var iso = KD.isoDate(d);
      return '<button type="button" class="day" data-day="' + iso + '" aria-pressed="' + (state.date === iso) + '"><span>' + DOW[d.getDay()] + '</span><b>' + d.getDate() + '</b><em>' + MON[d.getMonth()] + '</em></button>';
    }).join('');
    $$('[data-day]', wrap).forEach(function (b) {
      b.addEventListener('click', function () {
        state.date = b.getAttribute('data-day');
        state.time = null;
        $$('[data-day]', wrap).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        renderTimes();
      });
    });
    if (!state.date) {
      state.date = KD.isoDate(days[0]);
      var first = wrap.querySelector('[data-day="' + state.date + '"]');
      if (first) first.setAttribute('aria-pressed', 'true');
    }
    renderTimes();
  }

  var TIMES = ['09:00', '09:40', '10:20', '11:00', '11:40', '12:20', '14:00', '14:40', '15:20', '16:00', '16:40', '17:20', '18:00'];

  function renderTimes() {
    var wrap = $('#bkTimes', bkRoot);
    if (!wrap) return;
    /* deterministic availability: stable and demo-friendly */
    var seed = (state.date || '') + (state.doctor || 'any') + (state.service || '');
    var h = 0;
    for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    wrap.innerHTML = TIMES.map(function (t, i) {
      var busy = ((h >> (i % 28)) & 1) === 1 && i % 5 === 0;
      return '<button type="button" class="time" data-time="' + t + '" aria-pressed="' + (state.time === t) + '"' + (busy ? ' disabled aria-disabled="true"' : '') + '>' + t + '</button>';
    }).join('');
    $$('[data-time]', wrap).forEach(function (b) {
      b.addEventListener('click', function () {
        state.time = b.getAttribute('data-time');
        $$('[data-time]', wrap).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      });
    });
  }

  function summaryHTML() {
    var svc = serviceObj(), doc = doctorObj();
    var d = state.date ? new Date(state.date + 'T12:00:00') : null;
    return [
      ['Напрям', svc ? svc.title : '—'],
      ['Лікар', doc ? doc.name : 'Будь-який вільний'],
      ['Дата', d ? d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear() : '—'],
      ['Час', state.time || '—'],
      ['Контакт', state.name || '—'],
      ['Телефон', state.phone || '—']
    ].map(function (r) { return '<div><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>'; }).join('');
  }

  function updateSummary() {
    if (summaryEl) summaryEl.innerHTML = summaryHTML();
  }

  function go(step) {
    state.step = Math.max(1, Math.min(5, step));
    panels.forEach(function (p) { p.classList.toggle('on', +p.getAttribute('data-step') === state.step); });
    stepEls.forEach(function (li) {
      var n = +li.getAttribute('data-step');
      li.classList.toggle('on', n === state.step);
      li.classList.toggle('done', n < state.step);
      if (n === state.step) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
    if (stepNoEl) stepNoEl.textContent = String(state.step);
    if (state.step === 3) renderDates();
    if (state.step === 4) updateSummary();
    if (state.step === 5) { updateSummary(); submitBooking(); }
    if (backBtns.length) backBtns.forEach(function (b) { b.hidden = state.step === 1 || state.step === 5; });
    if (nextBtns.length) {
      var labels = { 1: 'Далі', 2: 'До вибору часу', 3: 'До контактів', 4: 'Підтвердити заявку' };
      nextBtns.forEach(function (b) {
        b.innerHTML = (labels[state.step] || 'Далі') + ' <span class="arw">→</span>';
        b.hidden = state.step === 5;
        b.disabled = false;
      });
      state.busy = false;
    }
    var body = $('.bk-body', bkRoot);
    if (body && state.step < 5) {
      var focusEl = $('.bk-panel.on h3', bkRoot);
      if (focusEl) { focusEl.setAttribute('tabindex', '-1'); focusEl.focus({ preventScroll: true }); }
      body.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'nearest' });
    }
    announce('Крок ' + state.step + ' із 5.');
  }

  function clearErrors() {
    $$('.field .err', bkRoot).forEach(function (e) { e.classList.remove('show'); e.textContent = ''; });
    $$('.field input', bkRoot).forEach(function (e) { e.setAttribute('aria-invalid', 'false'); });
  }

  function fieldError(input, errEl, msg) {
    if (errEl) { errEl.textContent = msg; errEl.classList.add('show'); }
    if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
  }

  function validate() {
    if (state.step === 1 && !state.service) { window.smilaToast('Оберіть напрям, щоб продовжити.'); return false; }
    if (state.step === 2 && !state.doctor) { window.smilaToast('Оберіть лікаря або варіант «будь-який вільний».'); return false; }
    if (state.step === 3 && (!state.date || !state.time)) { window.smilaToast('Оберіть дату й час візиту.'); return false; }
    if (state.step === 4) {
      clearErrors();
      var nameInput = $('#bkName', bkRoot), phoneInput = $('#bkPhone', bkRoot), emailInput = $('#bkEmail', bkRoot), cAppt = $('#consentAppt', bkRoot);
      state.name = nameInput.value.trim().replace(/\s+/g, ' ');
      state.phone = phoneInput.value.trim();
      state.email = emailInput.value.trim();
      state.consentAppt = !!(cAppt && cAppt.checked);
      var mkt = $('#consentMkt', bkRoot);
      state.consentMkt = !!(mkt && mkt.checked);

      if (state.name.length < 2) { fieldError(nameInput, $('#errName', bkRoot), 'Вкажіть ім\u2019я (мінімум 2 символи).'); return false; }
      var digits = state.phone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) { fieldError(phoneInput, $('#errPhone', bkRoot), 'Вкажіть телефон у форматі +380 XX XXX XX XX.'); return false; }
      if (state.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(state.email)) { fieldError(emailInput, $('#errEmail', bkRoot), 'Перевірте формат email.'); return false; }
      if (!state.consentAppt) { window.smilaToast('Потрібна згода на обробку даних для запису.'); if (cAppt) cAppt.focus(); return false; }
    }
    return true;
  }

  function signature() {
    var svc = serviceObj(), doc = doctorObj();
    return [state.name.toLowerCase(), state.phone.replace(/\D/g, ''), state.service, doc ? doc.id : 'any', state.date, state.time].join('|');
  }

  function readDupe() {
    try {
      var raw = sessionStorage.getItem('smila_booking_dupe_v1');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function submitBooking() {
    if (state.lead) return;
    var svc = serviceObj(), doc = doctorObj();
    var doctorId = doc ? doc.id : (svc && svc.doctors[0]) || 'iryna';

    var sig = signature();
    var prev = readDupe();
    if (prev && prev.sig === sig && (Date.now() - prev.at) < 15 * 60 * 1000) {
      state.lead = { id: prev.leadId };
      state.appt = { id: prev.apptId };
      showDone();
      return;
    }

    var utm = { source: 'website', medium: 'booking', campaign: 'demo_booking' };
    try {
      var qp = new URLSearchParams(location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
        if (qp.get(k)) utm[k.replace('utm_', '')] = qp.get(k);
      });
    } catch (e) {}

    var sourceId = 'direct';
    try {
      var match = KD.SOURCES.filter(function (x) { return x.id === utm.source || x.short.toLowerCase() === String(utm.source).toLowerCase(); })[0];
      if (match) sourceId = match.id;
    } catch (e) {}

    var lead, appt;
    try {
      lead = KD.addLead({
        name: state.name,
        phone: state.phone,
        email: state.email,
        city: 'Київ',
        source: sourceId,
        campaign: 'Форма запису на сайті',
        landing: '/industries/dentistry/demo/booking/',
        serviceId: state.service,
        doctorId: doctorId,
        utm: utm,
        notes: [{ at: new Date().toISOString(), by: 'Система', text: 'Заявка з демо-форми запису. Очікує підтвердження адміністратором.' }],
        consent: {
          appointment: true,
          marketing: state.consentMkt,
          at: new Date().toISOString(),
          source: 'booking_form'
        }
      });
      appt = KD.addAppointment({
        leadId: lead.id,
        serviceId: state.service,
        doctorId: doctorId,
        date: state.date,
        time: state.time,
        status: 'request',
        note: 'Заявка з сайту. Очікує підтвердження адміністратором.'
      });
    } catch (err) {
      state.busy = false;
      go(4);
      window.smilaToast('Не вдалося створити демо-заявку. Спробуйте ще раз.');
      return;
    }

    state.lead = lead;
    state.appt = appt;
    try {
      sessionStorage.setItem('smila_booking_dupe_v1', JSON.stringify({ sig: sig, leadId: lead.id, apptId: appt.id, at: Date.now() }));
    } catch (e) {}
    showDone();
  }

  function showDone() {
    var ref = $('#bkRef', bkRoot);
    if (ref) ref.textContent = 'Заявка ' + state.lead.id + ' · запис ' + state.appt.id;
    var doneName = $('#bkDoneName', bkRoot);
    if (doneName) doneName.textContent = (state.name || 'друже').split(' ')[0];
    var doneTime = $('#bkDoneTime', bkRoot);
    if (doneTime && state.date) {
      var d = new Date(state.date + 'T12:00:00');
      doneTime.textContent = DOW[d.getDay()] + ', ' + d.getDate() + ' ' + MON[d.getMonth()] + ' · ' + state.time;
    }
    announce('Заявку створено в демонстраційній CRM.');
  }

  if (nextBtns.length) {
    nextBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (state.busy) return;
        if (!validate()) return;
        if (state.step === 4) {
          state.busy = true;
          btn.disabled = true;
          go(5);
        } else {
          go(state.step + 1);
        }
      });
    });
  }
  backBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { go(state.step - 1); });
  });

  $$('.field input', bkRoot).forEach(function (input) {
    input.addEventListener('input', function () {
      input.setAttribute('aria-invalid', 'false');
      var err = input.parentElement && input.parentElement.querySelector('.err');
      if (err) { err.classList.remove('show'); err.textContent = ''; }
    });
  });

  var phoneInput = $('#bkPhone', bkRoot);
  if (phoneInput) {
    phoneInput.addEventListener('input', function () {
      var v = phoneInput.value.replace(/[^\d+]/g, '');
      if (v && v[0] !== '+') v = '+' + v;
      phoneInput.value = v;
    });
  }

  renderServices();
  renderDoctors();
  if (state.service) {
    var preset = $('#bkServices [data-svc="' + state.service + '"]', bkRoot);
    if (preset) preset.setAttribute('aria-pressed', 'true');
  }
  go(1);
})();

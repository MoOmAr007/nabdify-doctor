// صفحة الحجز أونلاين: المريض يختار الخدمة واليوم والساعة ويكتب اسمه ورقمه
const FN = 'https://yzlecuynlakrhvxcqrnx.supabase.co/functions/v1/book';
const slug = new URLSearchParams(location.search).get('c') || '';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iso = (d) => d.toLocaleDateString('en-CA');
const addDays = (s, n) => { const d = new Date(`${s}T12:00:00`); d.setDate(d.getDate() + n); return iso(d); };
const fmtTime = (t) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'م' : 'ص'}`; };
const day = (s, o) => new Date(`${s}T12:00:00`).toLocaleDateString('ar-EG', o);

async function call(action, data = {}) {
  const r = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, slug, ...data }) })
    .catch(() => { throw new Error('مفيش اتصال بالنت'); });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(b.error || 'حصلت مشكلة');
  return b;
}

const f = { service: null, date: iso(new Date()), time: null };
let info;

async function start() {
  try { info = await call('info'); } catch (e) { $('#bk').innerHTML = `<div class="empty">${esc(e.message)}</div>`; return; }
  document.title = `حجز موعد — ${info.clinic}`;
  const days = Array.from({ length: 14 }, (_, i) => addDays(iso(new Date()), i));
  $('#bk').innerHTML = `
    <h1>${esc(info.clinic)}</h1>
    <div class="sub">${[info.address, info.phone ? `<span class="ltr">${esc(info.phone)}</span>` : ''].filter(Boolean).map((x) => x.startsWith('<') ? x : esc(x)).join(' · ')}${info.note ? `<br>${esc(info.note)}` : ''}</div>
    <div class="step">1. الخدمة</div>
    <div class="chips2" id="sv">${info.services.map((s) => `<button data-s="${s.id}">${esc(s.name)}</button>`).join('')}<button data-s="" class="on">مش متأكد / كشف</button></div>
    <div class="step">2. اليوم</div>
    <div class="days" id="dy">${days.map((d, i) => `<button data-d="${d}" class="${i === 0 ? 'on' : ''}">${day(d, { weekday: 'short' })}<b>${day(d, { day: 'numeric' })}</b></button>`).join('')}</div>
    <div class="step">3. الساعة</div>
    <div class="slots" id="tm"></div>
    <div class="step">4. بياناتك</div>
    <div class="glass card" style="display:flex;flex-direction:column;gap:8px">
      <input id="nm" placeholder="الاسم" autocomplete="name">
      <input id="ph" class="ltr" placeholder="رقم الموبايل 01xxxxxxxxx" inputmode="tel" autocomplete="tel">
      <input id="nt" placeholder="ملاحظة (اختياري)"></div>
    <div class="err" id="er"></div>
    <button class="btn" id="go" disabled>تأكيد الحجز</button>`;
  $$('[data-s]').forEach((b) => (b.onclick = () => { f.service = b.dataset.s || null; $$('[data-s]').forEach((x) => x.classList.toggle('on', x === b)); slots(); }));
  $$('[data-d]').forEach((b) => (b.onclick = () => { f.date = b.dataset.d; $$('[data-d]').forEach((x) => x.classList.toggle('on', x === b)); slots(); }));
  ['nm', 'ph'].forEach((id) => ($(`#${id}`).oninput = check));
  $('#go').onclick = book;
  slots();
}
const check = () => ($('#go').disabled = !(f.time && $('#nm').value.trim().length > 1 && /^01\d{9}$/.test($('#ph').value.replace(/\D/g, ''))));

async function slots() {
  f.time = null; check();
  $('#tm').innerHTML = '<div class="muted">بيحمّل…</div>';
  try {
    const r = await call('slots', { date: f.date, service_id: f.service });
    $('#tm').innerHTML = r.closed ? '<div class="muted">العيادة أجازة اليوم ده</div>'
      : r.times.length ? r.times.map((t) => `<button data-t="${t}">${fmtTime(t)}</button>`).join('') : '<div class="muted">مفيش مواعيد فاضية — جرب يوم تاني</div>';
    $$('[data-t]').forEach((b) => (b.onclick = () => { f.time = b.dataset.t; $$('[data-t]').forEach((x) => x.classList.toggle('on', x === b)); check(); }));
  } catch (e) { $('#tm').innerHTML = `<div class="muted">${esc(e.message)}</div>`; }
}

async function book() {
  $('#go').disabled = true; $('#er').textContent = '';
  try {
    await call('book', { name: $('#nm').value.trim(), phone: $('#ph').value.replace(/\D/g, ''), service_id: f.service, date: f.date, time: f.time, notes: $('#nt').value });
    $('#bk').innerHTML = `<div class="glass card done">✅<b>اتحجز ميعادك</b>${day(f.date, { weekday: 'long', day: 'numeric', month: 'long' })} الساعة ${fmtTime(f.time)}
      <div class="sub" style="margin-top:10px">في ${esc(info.clinic)}. لو حبيت تغيّر أو تلغي، كلّم العيادة${info.phone ? ` على <span class="ltr">${esc(info.phone)}</span>` : ''}.</div></div>`;
  } catch (e) { $('#er').textContent = e.message; $('#go').disabled = false; if (/اتحجز/.test(e.message)) slots(); }
}

start();

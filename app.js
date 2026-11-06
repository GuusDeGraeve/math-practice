'use strict';

/* =========================================================
   Reken Idol – optellen en aftrekken tot 20 en tot 100
   Alles wordt lokaal bewaard in localStorage.
   ========================================================= */

// ---------- Kleine hulpfuncties ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const uid = () => Math.random().toString(36).slice(2, 10);
const opSym = (op) => (op === '-' ? '−' : '+');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtSec = (ms) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDate(ts) {
  return new Date(ts).toLocaleString('nl-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ---------- Soorten oefeningen ----------
// Elke generator geeft [a, op, b] terug.
const CATEGORIES = [
  {
    id: 'add10', group: '20', label: 'Optellen tot 10', example: '4 + 5',
    gen: () => { const a = rand(1, 9); return [a, '+', rand(1, 10 - a)]; },
  },
  {
    id: 'sub10', group: '20', label: 'Aftrekken tot 10', example: '9 − 4',
    gen: () => { const a = rand(2, 10); return [a, '-', rand(1, a - 1)]; },
  },
  {
    id: 'add20', group: '20', label: 'Optellen tot 20 zonder brug', example: '13 + 4',
    gen: () => {
      const u = rand(0, 8), a = 10 + u, b = rand(1, 9 - u);
      return Math.random() < 0.3 ? [b, '+', a] : [a, '+', b];
    },
  },
  {
    id: 'add20b', group: '20', label: 'Optellen tot 20 met brug', example: '8 + 5',
    gen: () => { const a = rand(2, 9); return [a, '+', rand(Math.max(2, 11 - a), 9)]; },
  },
  {
    id: 'sub20', group: '20', label: 'Aftrekken tot 20 zonder brug', example: '17 − 5',
    gen: () => { const u = rand(1, 9); return [10 + u, '-', rand(1, u)]; },
  },
  {
    id: 'sub20b', group: '20', label: 'Aftrekken tot 20 met brug', example: '13 − 7',
    gen: () => { const u = rand(1, 8); return [10 + u, '-', rand(u + 1, 9)]; },
  },
  {
    id: 'add100t', group: '100', label: 'Tientallen optellen', example: '30 + 40',
    gen: () => { const a = rand(1, 9); return [a * 10, '+', rand(1, 10 - a) * 10]; },
  },
  {
    id: 'sub100t', group: '100', label: 'Tientallen aftrekken', example: '70 − 30',
    gen: () => { const a = rand(2, 10); return [a * 10, '-', rand(1, a - 1) * 10]; },
  },
  {
    id: 'add100', group: '100', label: 'Optellen tot 100 zonder brug', example: '34 + 5 · 34 + 20 · 34 + 25',
    gen: () => {
      const t = rand(1, 3);
      if (t === 1) { const T = rand(1, 8), u = rand(0, 8); return [T * 10 + u, '+', rand(1, 9 - u)]; }
      if (t === 2) { const T = rand(1, 8), u = rand(1, 9); return [T * 10 + u, '+', rand(1, 9 - T) * 10]; }
      const T1 = rand(1, 7), T2 = rand(1, 8 - T1), u1 = rand(1, 8), u2 = rand(1, 9 - u1);
      return [T1 * 10 + u1, '+', T2 * 10 + u2];
    },
  },
  {
    id: 'add100b', group: '100', label: 'Optellen tot 100 met brug', example: '38 + 5 · 38 + 25',
    gen: () => {
      if (Math.random() < 0.6) { const T = rand(1, 8), u = rand(1, 9); return [T * 10 + u, '+', rand(10 - u, 9)]; }
      const u1 = rand(1, 9), u2 = rand(10 - u1, 9), T1 = rand(1, 7), T2 = rand(1, 8 - T1);
      return [T1 * 10 + u1, '+', T2 * 10 + u2];
    },
  },
  {
    id: 'sub100', group: '100', label: 'Aftrekken tot 100 zonder brug', example: '47 − 5 · 47 − 20 · 47 − 25',
    gen: () => {
      const t = rand(1, 3);
      if (t === 1) { const T = rand(2, 9), u = rand(1, 9); return [T * 10 + u, '-', rand(1, u)]; }
      if (t === 2) { const T = rand(2, 9), u = rand(0, 9); return [T * 10 + u, '-', rand(1, T - 1) * 10]; }
      const T1 = rand(2, 9), u1 = rand(1, 9), T2 = rand(1, T1 - 1), u2 = rand(1, u1);
      return [T1 * 10 + u1, '-', T2 * 10 + u2];
    },
  },
  {
    id: 'sub100b', group: '100', label: 'Aftrekken tot 100 met brug', example: '42 − 7 · 42 − 27',
    gen: () => {
      if (Math.random() < 0.6) { const T = rand(2, 9), u = rand(0, 8); return [T * 10 + u, '-', rand(u + 1, 9)]; }
      const T1 = rand(2, 9), u1 = rand(0, 8), T2 = rand(1, T1 - 1), u2 = rand(u1 + 1, 9);
      return [T1 * 10 + u1, '-', T2 * 10 + u2];
    },
  },
  // Klok-generatoren geven [uur, minuten] terug.
  {
    id: 'klokUur', group: 'klok', kind: 'clock', label: 'Klok: hele uren', example: '07:00 = zeven uur',
    gen: () => [rand(1, 12), 0],
  },
  {
    id: 'klokHalf', group: 'klok', kind: 'clock', label: 'Klok: halve uren', example: '07:30 = half acht',
    gen: () => [rand(1, 12), 30],
  },
  {
    id: 'klokKwart', group: 'klok', kind: 'clock', label: 'Klok: kwart over en kwart voor', example: '07:15 = kwart over zeven',
    gen: () => [rand(1, 12), pick([15, 45])],
  },
  {
    id: 'klok5', group: 'klok', kind: 'clock', label: 'Klok: per 5 minuten', example: '07:20 = tien voor half acht',
    gen: () => [rand(1, 12), pick([5, 10, 20, 25, 35, 40, 50, 55])],
  },
  {
    id: 'klok24', group: 'klok', kind: 'clock', label: 'Klok: namiddag en avond (13:00 tot 23:59)', example: '14:30 = half drie \'s namiddags',
    gen: () => [Math.random() < 0.8 ? rand(12, 23) : rand(6, 11), pick([0, 15, 30, 45])],
  },
];
const CAT_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

const MODES = [
  { id: '20', title: 'Tot 20', emoji: '🎤', sub: 'plus en min tot 20' },
  { id: '100', title: 'Tot 100', emoji: '💎', sub: 'plus en min tot 100' },
  { id: 'mix', title: 'Mix', emoji: '🌈', sub: 'plus en min door elkaar' },
  { id: 'klok', title: 'Klok', emoji: '⏰', sub: 'digitale klok lezen' },
];

// ---------- Klok: tijd in woorden ----------
const HOUR_WORDS = ['twaalf', 'één', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien', 'elf'];
const pad2 = (n) => String(n).padStart(2, '0');
const digital = (h, m) => `${pad2(h)}:${pad2(m)}`;

function dayPart(h) {
  if (h < 6) return '\'s nachts';
  if (h < 12) return '\'s morgens';
  if (h < 14) return '\'s middags';
  if (h < 18) return '\'s namiddags';
  return '\'s avonds';
}

function clockWords(h, m, withDayPart = false) {
  const cur = HOUR_WORDS[h % 12];
  const next = HOUR_WORDS[(h + 1) % 12];
  const words = {
    0: `${cur} uur`,
    5: `vijf over ${cur}`,
    10: `tien over ${cur}`,
    15: `kwart over ${cur}`,
    20: `tien voor half ${next}`,
    25: `vijf voor half ${next}`,
    30: `half ${next}`,
    35: `vijf over half ${next}`,
    40: `tien over half ${next}`,
    45: `kwart voor ${next}`,
    50: `tien voor ${next}`,
    55: `vijf voor ${next}`,
  }[m];
  return withDayPart ? `${words} ${dayPart(h)}` : words;
}

function clockHint(q) {
  const { h, m } = q;
  const h12 = h % 12 || 12;
  const nh = (h + 1) % 24;
  const parts = [];
  if (h > 12) parts.push(`${h} uur is ${h} − 12 = ${h12} uur`);
  if (m === 0) parts.push(`:00 betekent een heel uur`);
  else if (m === 30) parts.push(`30 minuten is een half uur.<br>Half = halfweg naar ${HOUR_WORDS[nh % 12]} uur`);
  else if (m < 20) parts.push(`${m} minuten na ${HOUR_WORDS[h % 12]} uur`);
  else if (m < 30) parts.push(`nog ${30 - m} minuten tot ${digital(h, 30)}<br>(dat is half ${HOUR_WORDS[nh % 12]})`);
  else if (m <= 40) parts.push(`${m - 30} minuten na ${digital(h, 30)}<br>(dat is half ${HOUR_WORDS[nh % 12]})`);
  else parts.push(`nog ${60 - m} minuten tot ${HOUR_WORDS[nh % 12]} uur`);
  return `${parts.join('<br>')}<br>→ <b>${clockWords(h, m, q.is24)}</b>`;
}

const RANKS = [
  { min: 0, name: 'Beginner', emoji: '🌱' },
  { min: 250, name: 'Talent', emoji: '🎤' },
  { min: 750, name: 'Popster', emoji: '💜' },
  { min: 1500, name: 'Ster', emoji: '⭐' },
  { min: 3000, name: 'Superster', emoji: '🌟' },
  { min: 6000, name: 'Legende', emoji: '👑' },
];

const PRAISE_FAST = ['Supersnel! ⚡', 'Perfect! 💜', 'Wauw! 🤩', 'Bliksemsnel! ⭐', 'Knap zeg! 🫰'];
const PRAISE_OK = ['Goed zo! 👏', 'Juist! ✨', 'Netjes! 💖', 'Top! 🎶'];
const COMBO_TEXT = ['Knappe reeks! 🔥', 'Wat een reeks! 🔥', 'Niet te stoppen! 💪', 'Superster! 🌟'];

// ---------- Instellingen voor de ouder-view ----------
const SETTING_FIELDS = [
  { key: 'questionsPerRound', label: 'Aantal oefeningen per ronde', type: 'number', min: 5, max: 50 },
  { key: 'timeLimitOn', label: 'Tijdslimiet per oefening', type: 'bool', help: 'Uit = geen tijdsdruk. Sneller antwoorden geeft nog steeds meer punten.' },
  { key: 'timeLimitSec', label: 'Tijd per oefening (seconden)', type: 'number', min: 3, max: 60 },
  { key: 'clockTimeLimitSec', label: 'Tijd per klok-oefening (seconden)', type: 'number', min: 3, max: 90, help: 'Klokvragen vragen meer leeswerk. De grens voor volle punten schaalt mee.' },
  { key: 'fastSec', label: 'Volle punten als antwoord binnen (seconden)', type: 'number', min: 1, max: 30 },
  { key: 'maxPoints', label: 'Punten voor een snel juist antwoord', type: 'number', min: 1, max: 100 },
  { key: 'minPoints', label: 'Punten voor een traag juist antwoord', type: 'number', min: 0, max: 100 },
  { key: 'streakBonus', label: 'Bonuspunten per 5 juist op rij', type: 'number', min: 0, max: 100 },
  { key: 'answerMode', label: 'Manier van antwoorden', type: 'select', options: [['choices', 'Juiste antwoord aantikken (keuzes)'], ['numpad', 'Antwoord intikken op cijferpad']] },
  { key: 'numChoices', label: 'Aantal keuzes', help: 'Klok-oefeningen hebben altijd maximaal 4 keuzes.', type: 'select', numeric: true, options: [['3', '3'], ['4', '4'], ['6', '6']] },
  { key: 'repeatMistakes', label: 'Foute oefeningen later in de ronde herhalen', type: 'bool' },
  { key: 'adaptive', label: 'Moeilijke oefeningen vaker vragen', type: 'bool', help: 'Oefeningen die vaak fout of traag gaan, komen vaker terug.' },
  { key: 'showHints', label: 'Hulp tonen bij een fout', type: 'bool', help: 'Splitsen (8 + 5 → 8 + 2 + 3) en uitleg bij de klok' },
  { key: 'sound', label: 'Geluidjes', type: 'bool' },
  { key: 'dailyCap', label: 'Max punten per dag (0 = onbeperkt)', type: 'number', min: 0, max: 100000 },
];

// ---------- State & opslag ----------
const STORAGE_KEY = 'rekenIdol.v1';

function defaultState() {
  return {
    version: 1,
    childName: '',
    points: 0,
    totalEarned: 0,
    settings: {
      categories: {
        add10: false, sub10: false,
        add20: true, add20b: true, sub20: true, sub20b: true,
        add100t: true, sub100t: true, add100: true, add100b: false, sub100: true, sub100b: false,
        klokUur: true, klokHalf: true, klokKwart: true, klok5: false, klok24: false,
      },
      questionsPerRound: 10,
      timeLimitOn: true,
      timeLimitSec: 10,
      clockTimeLimitSec: 15,
      fastSec: 3,
      maxPoints: 10,
      minPoints: 2,
      streakBonus: 5,
      answerMode: 'choices',
      numChoices: 4,
      repeatMistakes: true,
      adaptive: true,
      showHints: true,
      sound: true,
      dailyCap: 0,
      pin: '',
    },
    rewards: [
      { id: uid(), emoji: '📺', name: '15 minuten extra schermtijd', cost: 100 },
      { id: uid(), emoji: '🍦', name: 'Een ijsje', cost: 150 },
      { id: uid(), emoji: '🎶', name: 'K-pop dansfeestje in de living', cost: 200 },
      { id: uid(), emoji: '🎁', name: 'Klein cadeautje', cost: 500 },
    ],
    redemptions: [],
    facts: {},
    sessions: [],
    daily: { date: '', earned: 0 },
  };
}

function mergeState(s) {
  const def = defaultState();
  return {
    ...def,
    ...s,
    settings: {
      ...def.settings,
      ...(s.settings || {}),
      categories: { ...def.settings.categories, ...((s.settings || {}).categories || {}) },
    },
    daily: { ...def.daily, ...(s.daily || {}) },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? mergeState(JSON.parse(raw)) : defaultState();
  } catch (e) {
    console.warn('Laden mislukt', e);
    return defaultState();
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Opslaan mislukt', e);
  }
}

let state = loadState();
let round = null;
let parentTab = 'rewards';
let app;

// ---------- Geluid (Web Audio, geen bestanden nodig) ----------
const Sound = (() => {
  let ctx = null;
  function tone(freq, start, dur, type = 'sine', vol = 0.12) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(ctx.destination);
    o.start(start);
    o.stop(start + dur + 0.02);
  }
  return {
    play(name) {
      if (!state.settings.sound) return;
      try {
        ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
      } catch (e) {
        return;
      }
      const t = ctx.currentTime;
      switch (name) {
        case 'tap': tone(700, t, 0.05, 'sine', 0.06); break;
        case 'correct': tone(880, t, 0.1); tone(1320, t + 0.08, 0.18); break;
        case 'wrong': tone(260, t, 0.18, 'triangle', 0.14); tone(196, t + 0.14, 0.3, 'triangle', 0.14); break;
        case 'combo': [660, 880, 1100, 1320, 1760].forEach((f, i) => tone(f, t + i * 0.07, 0.14)); break;
        case 'count': tone(520, t, 0.12, 'square', 0.05); break;
        case 'go': tone(1040, t, 0.25, 'square', 0.06); break;
        case 'win': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, t + i * 0.11, 0.2, 'triangle', 0.12)); break;
      }
    },
  };
})();

// ---------- Effecten ----------
function burst(x, y, count = 14, emojis = ['💜', '✨', '⭐', '💖', '🫰']) {
  const fx = $('#fx');
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    p.textContent = pick(emojis);
    const ang = Math.random() * Math.PI * 2;
    const dist = 70 + Math.random() * 170;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    p.style.setProperty('--dy', `${Math.sin(ang) * dist - 60}px`);
    p.style.setProperty('--rot', `${rand(-180, 180)}deg`);
    p.style.fontSize = `${18 + Math.random() * 22}px`;
    fx.appendChild(p);
    setTimeout(() => p.remove(), 1100);
  }
}

function burstFrom(el, count, emojis) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, count, emojis);
}

function floatText(el, text, cls = '') {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = `float-text ${cls}`;
  f.textContent = text;
  f.style.left = `${r.left + r.width / 2}px`;
  f.style.top = `${r.top}px`;
  $('#fx').appendChild(f);
  setTimeout(() => f.remove(), 1300);
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
}

// ---------- Modals ----------
function openModal(html, { onClose, cls = '' } = {}) {
  const root = $('#modal-root');
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal-card ${cls}">${html}</div>`;
  root.appendChild(wrap);
  const close = () => {
    wrap.remove();
    if (onClose) onClose();
  };
  return { el: wrap, close };
}

function closeAllModals() {
  $('#modal-root').innerHTML = '';
}

function confirmModal({ title, text = '', yes = 'Ja', no = 'Nee', onYes }) {
  const m = openModal(`
    <h2>${title}</h2>
    ${text ? `<p class="modal-text">${text}</p>` : ''}
    <div class="modal-actions">
      <button class="btn ghost" data-act="no">${no}</button>
      <button class="btn primary" data-act="yes">${yes}</button>
    </div>`);
  $('[data-act="no"]', m.el).onclick = () => { Sound.play('tap'); m.close(); };
  $('[data-act="yes"]', m.el).onclick = () => { Sound.play('tap'); m.close(); onYes(); };
}

// ---------- Cijferpad (gedeeld door oefenen en ouder-check) ----------
function numpadHtml() {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];
  return `<div class="numpad">${keys.map((k) => {
    const label = k === 'del' ? '⌫' : k === 'ok' ? 'OK' : k;
    return `<button class="key ${k === 'ok' ? 'key-ok' : ''} ${k === 'del' ? 'key-del' : ''}" data-key="${k}">${label}</button>`;
  }).join('')}</div>`;
}

function bindNumpad(root, { maxLen = 3, onChange, onOk }) {
  let input = '';
  $$('.key', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.key;
      if (k === 'del') input = input.slice(0, -1);
      else if (k === 'ok') { if (input !== '') onOk(input); return; }
      else if (input.length < maxLen) input = input === '0' ? k : input + k;
      Sound.play('tap');
      onChange(input);
    });
  });
  return { clear() { input = ''; onChange(input); } };
}

// ---------- Rangen ----------
function getRank(total) {
  let r = RANKS[0];
  for (const rank of RANKS) if (total >= rank.min) r = rank;
  return r;
}

function nextRank(total) {
  return RANKS.find((r) => r.min > total) || null;
}

// ---------- Oefeningen kiezen ----------
function enabledCats(mode) {
  return CATEGORIES.filter((c) => state.settings.categories[c.id] &&
    (mode === 'mix' ? c.group !== 'klok' : c.group === mode));
}

function makeQuestion(cat, a, op, b) {
  return { kind: 'math', a, op, b, answer: op === '+' ? a + b : a - b, key: `${a}${op}${b}`, cat: cat.id, group: cat.group };
}

// Een klokvraag gaat willekeurig in één van twee richtingen:
// digitale klok → woorden, of woorden → digitale klok.
function makeClockQuestion(cat, h, m) {
  const is24 = cat.id === 'klok24';
  const dir = Math.random() < 0.5 ? 'toWords' : 'toDigital';
  const words = clockWords(h, m, is24);
  const digi = digital(h, m);
  return {
    kind: 'clock', cat: cat.id, group: cat.group, h, m, is24, dir, words, digi,
    key: `klok:${digi}`, answer: dir === 'toWords' ? words : digi,
  };
}

function buildQuestion(cat) {
  return cat.kind === 'clock' ? makeClockQuestion(cat, ...cat.gen()) : makeQuestion(cat, ...cat.gen());
}

function factToQuestion(f) {
  const cat = CAT_BY_ID[f.cat];
  if (!cat) return null;
  if (f.kind === 'clock') return makeClockQuestion(cat, f.h, f.m);
  return f.a !== undefined ? makeQuestion(cat, f.a, f.op, f.b) : null;
}

function factLabel(f) {
  if (f.kind === 'clock') return `${digital(f.h, f.m)} = ${clockWords(f.h, f.m, f.cat === 'klok24')}`;
  return `${f.a} ${opSym(f.op)} ${f.b} = ${f.op === '+' ? f.a + f.b : f.a - f.b}`;
}

// Tijdslimiet en "snel"-grens voor een vraag (klokvragen krijgen meer leestijd).
function timing(q) {
  const s = state.settings;
  const scale = q && q.kind === 'clock' ? s.clockTimeLimitSec / s.timeLimitSec : 1;
  const limit = s.timeLimitSec * scale * 1000;
  return { limit, fast: Math.min(s.fastSec * scale * 1000, limit) };
}

function factWeight(key) {
  const f = state.facts[key];
  if (!f) return 2;
  let w = 1 + (f.wrong / f.n) * 4;
  if (f.wrong > 0 && f.streak < 3) w += 2;
  if (f.avgMs > timing(f).fast) w += 1.5;
  if (f.streak >= 5) w *= 0.5;
  return w;
}

function weightedPick(items, weightFn) {
  const weights = items.map(weightFn);
  let r = Math.random() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function generateQuestion() {
  const cats = round.cats;
  const catIds = new Set(cats.map((c) => c.id));

  // Af en toe gericht een som herhalen die eerder moeilijk was.
  if (state.settings.adaptive && Math.random() < 0.35) {
    const weak = Object.entries(state.facts).filter(([key, f]) =>
      catIds.has(f.cat) && f.wrong > 0 && f.streak < 3 && !round.recent.includes(key));
    if (weak.length) {
      const [, f] = weightedPick(weak, ([key]) => factWeight(key));
      const q = factToQuestion(f);
      if (q) return q;
    }
  }

  const wanted = state.settings.adaptive ? 6 : 1;
  const candidates = [];
  for (let i = 0; i < 40 && candidates.length < wanted; i++) {
    const q = buildQuestion(pick(cats));
    if (!round.recent.includes(q.key) && !candidates.some((c) => c.key === q.key)) candidates.push(q);
  }
  if (!candidates.length) return buildQuestion(pick(cats));
  return state.settings.adaptive ? weightedPick(candidates, (q) => factWeight(q.key)) : candidates[0];
}

function makeChoices(answer, n, maxVal) {
  const set = new Set([answer]);
  const near = maxVal > 20 ? shuffle([1, -1, 10, -10, 2, -2]) : shuffle([1, -1, 2, -2]);
  const far = shuffle([3, -3, 10, -10, 9, -9, 11, -11, 4, -4, 5, -5]);
  for (const o of [...near, ...far]) {
    if (set.size >= n) break;
    const v = answer + o;
    if (v >= 0 && v <= maxVal) set.add(v);
  }
  while (set.size < n) set.add(rand(0, maxVal));
  return shuffle([...set]);
}

// Foute keuzes op basis van typische vergissingen:
// half acht ↔ half zeven, kwart over ↔ kwart voor, 14:00 ↔ 04:00 / 02:00.
function makeClockChoices(q, n) {
  const { h, m, is24 } = q;
  const norm = (x) => (is24 ? ((x % 24) + 24) % 24 : ((((x - 1) % 12) + 12) % 12) + 1);
  const mirror = (60 - m) % 60;
  const near = [[h - 1, m], [h + 1, m]];
  if (m % 30 !== 0) near.push([h, mirror], [h + 1, mirror], [h - 1, mirror]);
  else near.push([h, (m + 30) % 60]);
  if (is24) near.push([h - 12, m], [h + 2, m]);
  const far = [[h + 2, m], [h - 2, m], [h, (m + 15) % 60], [h, (m + 45) % 60], [h - 10, m]];

  const show = (hh, mm) => (q.dir === 'toWords' ? clockWords(hh, mm, is24) : digital(hh, mm));
  const set = new Set([q.answer]);
  for (const [hh, mm] of [...shuffle(near), ...shuffle(far)]) {
    if (set.size >= n) break;
    set.add(show(norm(hh), mm));
  }
  const cat = CAT_BY_ID[q.cat];
  for (let i = 0; set.size < n && i < 50; i++) set.add(show(...cat.gen()));
  return shuffle([...set]);
}

function splitHint(a, op, b) {
  const ans = op === '+' ? a + b : a - b;
  const s = opSym(op);
  if (b > 10 && b % 10 !== 0 && a >= 10) {
    const bt = b - (b % 10), bu = b % 10;
    const mid = op === '+' ? a + bt : a - bt;
    return `${a} ${s} ${bt} = ${mid}<br>${mid} ${s} ${bu} = ${ans}`;
  }
  if (b < 10) {
    const u = a % 10;
    if (op === '+' && u + b > 10) {
      const k = 10 - u;
      return `${a} + ${k} + ${b - k}<br>${a + k} + ${b - k} = ${ans}`;
    }
    if (op === '-' && a > 10 && u > 0 && b > u) {
      return `${a} − ${u} − ${b - u}<br>${a - u} − ${b - u} = ${ans}`;
    }
  }
  return '';
}

function recordFact(q, correct, ms) {
  const base = q.kind === 'clock'
    ? { kind: 'clock', cat: q.cat, h: q.h, m: q.m }
    : { cat: q.cat, a: q.a, op: q.op, b: q.b };
  const f = state.facts[q.key] || (state.facts[q.key] = { ...base, n: 0, wrong: 0, streak: 0, avgMs: 0 });
  f.n++;
  if (correct) {
    f.streak++;
    f.avgMs = f.avgMs ? Math.round(f.avgMs * 0.7 + ms * 0.3) : Math.round(ms);
  } else {
    f.wrong++;
    f.streak = 0;
  }
  f.last = Date.now();
}

// ---------- Punten ----------
function calcPoints(ms, q) {
  const s = state.settings;
  const { limit, fast } = timing(q);
  const max = s.maxPoints, min = Math.min(s.minPoints, max);
  if (ms <= fast) return max;
  if (ms >= limit) return min;
  return Math.round(max - (max - min) * (ms - fast) / (limit - fast));
}

function awardPoints(p) {
  const s = state.settings;
  const today = todayStr();
  if (state.daily.date !== today) state.daily = { date: today, earned: 0 };
  if (s.dailyCap > 0) {
    const room = Math.max(0, s.dailyCap - state.daily.earned);
    if (p > room) { p = room; if (round) round.capHit = true; }
  }
  state.points += p;
  state.totalEarned += p;
  state.daily.earned += p;
  return p;
}

// =========================================================
//   SCHERMEN – KIND
// =========================================================

function renderHome() {
  round = null;
  closeAllModals();
  const rank = getRank(state.totalEarned);
  const next = nextRank(state.totalEarned);
  const rankPct = next ? Math.round((state.totalEarned - rank.min) / (next.min - rank.min) * 100) : 100;
  const has20 = enabledCats('20').length > 0;
  const has100 = enabledCats('100').length > 0;
  const hasKlok = enabledCats('klok').length > 0;
  const modes = MODES.filter((m) => ({ 20: has20, 100: has100, mix: has20 && has100, klok: hasKlok })[m.id]);
  const pending = state.redemptions.filter((r) => r.status === 'pending').length;
  const name = state.childName ? `, ${esc(state.childName)}` : '';

  app.innerHTML = `
  <section class="screen home">
    <header class="topbar">
      <div class="rank-badge">
        <span class="rank-emoji">${rank.emoji}</span>
        <div>
          <div class="rank-name">${rank.name}</div>
          <div class="rank-bar"><div style="width:${rankPct}%"></div></div>
          <div class="rank-next">${next ? `nog ${next.min - state.totalEarned} ⭐ tot ${next.name} ${next.emoji}` : 'Hoogste niveau! 👑'}</div>
        </div>
      </div>
      <div class="pill big-pill">⭐ ${state.points}</div>
    </header>

    <div class="hero">
      <div class="logo">Reken<span>Idol</span></div>
      <p class="hello">Hallo${name}! 👋 Klaar om te schitteren?</p>
    </div>

    ${modes.length ? `
    <div class="mode-grid">
      ${modes.map((m) => `
        <button class="mode-tile mode-${m.id}" data-mode="${m.id}">
          <span class="mode-emoji">${m.emoji}</span>
          <span class="mode-title">${m.title}</span>
          <span class="mode-sub">${m.sub}</span>
        </button>`).join('')}
    </div>` : `<p class="empty-note">Vraag mama of papa om oefeningen aan te zetten 💜</p>`}

    <div class="home-actions">
      <button class="btn big secondary" data-act="rewards">🎁 Beloningen${pending ? ` <span class="badge">${pending}</span>` : ''}</button>
    </div>

    <button class="parent-btn" data-act="parent">🔒 Ouders</button>
  </section>`;

  $$('.mode-tile', app).forEach((b) => b.addEventListener('click', () => { Sound.play('tap'); startRound(b.dataset.mode); }));
  $('[data-act="rewards"]', app).onclick = () => { Sound.play('tap'); renderRewards(); };
  $('[data-act="parent"]', app).onclick = openParentGate;
}

// ---------- Ronde ----------
function startRound(mode) {
  const cats = enabledCats(mode);
  if (!cats.length) return;
  round = {
    mode, cats,
    planned: state.settings.questionsPerRound,
    newAsked: 0, done: 0, correct: 0, points: 0,
    streak: 0, bestStreak: 0,
    retries: [], recent: [], times: [],
    q: null, locked: true, raf: 0, t0: 0, input: '',
    capHit: false,
    rankBefore: getRank(state.totalEarned),
  };
  renderCountdown(nextQuestion);
}

function renderCountdown(done) {
  app.innerHTML = `<section class="screen countdown"><div class="count-num" id="count"></div></section>`;
  const steps = ['3', '2', '1', 'Go! 💜'];
  let i = 0;
  const el = $('#count');
  const step = () => {
    if (!round) return;
    if (i >= steps.length) { done(); return; }
    el.textContent = steps[i];
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    Sound.play(i === steps.length - 1 ? 'go' : 'count');
    i++;
    setTimeout(step, i === steps.length ? 500 : 650);
  };
  step();
}

function nextQuestion() {
  if (!round) return;
  if (round.paused) { round.pendingNext = true; return; }
  closeAllModals();
  let q = null;
  const dueIdx = round.retries.findIndex((r) => r.due <= round.done);
  if (dueIdx >= 0) q = round.retries.splice(dueIdx, 1)[0].q;
  else if (round.newAsked < round.planned) { q = generateQuestion(); round.newAsked++; }
  else if (round.retries.length) q = round.retries.shift().q;
  if (!q) { endRound(); return; }

  round.q = q;
  round.recent.push(q.key);
  if (round.recent.length > 4) round.recent.shift();
  renderPlay();
}

function renderPlay() {
  const s = state.settings;
  const q = round.q;
  const isClock = q.kind === 'clock';
  const numpad = s.answerMode === 'numpad' && !isClock;
  const remaining = (round.planned - round.newAsked) + round.retries.length;
  const pct = Math.round(round.done / (round.done + remaining + 1) * 100);
  if (isClock) q.choices = makeClockChoices(q, Math.min(4, s.numChoices));
  else if (!numpad) q.choices = makeChoices(q.answer, s.numChoices, q.group === '100' ? 100 : 20);

  const choiceCls = isClock ? (q.dir === 'toWords' ? 'word-choice' : 'digi-choice') : '';
  const answersHtml = numpad
    ? numpadHtml()
    : `<div class="choices n${q.choices.length}">${q.choices.map((v, i) =>
      `<button class="choice ${choiceCls}" data-idx="${i}">${v}</button>`).join('')}</div>`;

  let questionHtml;
  if (!isClock) {
    questionHtml = `<div class="question">${q.a} ${opSym(q.op)} ${q.b} = <span class="slot" id="slot">?</span></div>`;
  } else if (q.dir === 'toWords') {
    questionHtml = `
      <div class="clock-prompt">Hoe zeg je deze tijd?</div>
      <div class="digi-clock">${pad2(q.h)}<span class="colon">:</span>${pad2(q.m)}</div>
      <div class="slot word-slot" id="slot">?</div>`;
  } else {
    questionHtml = `
      <div class="clock-prompt">Welke klok toont deze tijd?</div>
      <div class="clock-words">${q.words}</div>
      <div class="digi-clock slot digi-slot" id="slot">--<span class="colon">:</span>--</div>`;
  }

  app.innerHTML = `
  <section class="screen play ${numpad ? 'mode-numpad' : 'mode-choices'} ${isClock ? 'mode-clock' : ''}">
    <header class="play-top">
      <button class="icon-btn" data-act="quit" aria-label="Stoppen">✕</button>
      <div class="lightstick"><div class="lightstick-fill" style="width:${pct}%"><span class="lightstick-head">💜</span></div></div>
      <div class="pill" id="round-points">⭐ ${round.points}</div>
    </header>
    <div class="play-main">
      <div class="question-side">
        <div class="status-row">
          ${q.isRetry ? '<span class="tag retry">🔁 Nog eens!</span>' : ''}
          ${round.streak >= 2 ? `<span class="tag combo">🔥 ${round.streak} op rij</span>` : ''}
        </div>
        <div class="question-card" id="qcard">${questionHtml}</div>
        <div class="timer ${s.timeLimitOn ? '' : 'no-limit'}">
          <div class="timer-fill" id="timer-fill"></div>
          <span class="timer-pts" id="timer-pts">+${s.maxPoints} ⭐</span>
        </div>
        <div class="praise" id="praise"></div>
      </div>
      <div class="answer-side">${answersHtml}</div>
    </div>
  </section>`;

  $('[data-act="quit"]', app).onclick = quitRound;

  if (numpad) {
    bindNumpad(app, {
      maxLen: 3,
      onChange: (v) => { if (!round.locked) $('#slot').textContent = v || '?'; },
      onOk: (v) => handleAnswer(Number(v)),
    });
  } else {
    $$('.choice', app).forEach((b) => b.addEventListener('click', () => handleAnswer(q.choices[b.dataset.idx], b)));
  }

  round.locked = false;
  round.t0 = performance.now();
  round.raf = requestAnimationFrame(tick);
}

function tick() {
  if (!round || round.locked) return;
  const s = state.settings;
  const elapsed = performance.now() - round.t0;
  const { limit } = timing(round.q);
  const frac = clamp(1 - elapsed / limit, 0, 1);
  const fill = $('#timer-fill');
  if (fill) {
    fill.style.transform = `scaleX(${frac})`;
    fill.dataset.level = frac > 0.6 ? 'high' : frac > 0.3 ? 'mid' : 'low';
    $('#timer-pts').textContent = `+${calcPoints(elapsed, round.q)} ⭐`;
  }
  if (s.timeLimitOn && elapsed >= limit) { handleAnswer(null); return; }
  round.raf = requestAnimationFrame(tick);
}

function handleAnswer(value, btn) {
  if (!round || round.locked) return;
  round.locked = true;
  cancelAnimationFrame(round.raf);
  const s = state.settings;
  const ms = performance.now() - round.t0;
  const q = round.q;
  const correct = value === q.answer;

  recordFact(q, correct, ms);
  round.done++;

  if (correct) {
    round.correct++;
    round.streak++;
    round.bestStreak = Math.max(round.bestStreak, round.streak);
    round.times.push(ms);
    const bonus = s.streakBonus > 0 && round.streak % 5 === 0 ? s.streakBonus : 0;
    const got = awardPoints(calcPoints(ms, q) + bonus);
    round.points += got;
    save();
    showCorrect(btn, got, bonus, ms);
  } else {
    round.streak = 0;
    const retryCount = q.retryCount || 0;
    if (s.repeatMistakes && retryCount < 2) {
      round.retries.push({ due: round.done + 3, q: { ...q, isRetry: true, retryCount: retryCount + 1 } });
    }
    save();
    showWrong(value, btn);
  }
}

function showCorrect(btn, got, bonus, ms) {
  const slot = $('#slot');
  slot.textContent = round.q.answer;
  slot.classList.add('right');
  if (btn) btn.classList.add('right');
  $$('.choice', app).forEach((b) => { if (b !== btn) b.classList.add('dim'); });

  const fast = ms <= timing(round.q).fast;
  const praise = $('#praise');
  praise.textContent = bonus ? `${pick(COMBO_TEXT)} +${bonus} bonus` : pick(fast ? PRAISE_FAST : PRAISE_OK);
  praise.className = `praise show ${bonus ? 'combo' : ''}`;

  $('#round-points').textContent = `⭐ ${round.points}`;
  if (got > 0) floatText($('#round-points'), `+${got}`);
  burstFrom(btn || $('#qcard'), bonus ? 26 : fast ? 16 : 9);
  Sound.play(bonus ? 'combo' : 'correct');

  setTimeout(nextQuestion, bonus ? 1200 : 800);
}

function showWrong(value, btn) {
  const q = round.q;
  const timedOut = value === null;
  const slot = $('#slot');
  slot.textContent = q.answer;
  slot.classList.add('reveal');
  if (btn) btn.classList.add('wrong');
  $$('.choice', app).forEach((b) => {
    if (q.choices[b.dataset.idx] === q.answer) b.classList.add('right');
    else if (b !== btn) b.classList.add('dim');
  });
  Sound.play('wrong');

  const isClock = q.kind === 'clock';
  const showHints = state.settings.showHints;
  const hint = !showHints ? '' : isClock ? clockHint(q) : splitHint(q.a, q.op, q.b);
  const hintTitle = isClock ? '💡 Zo lees je de klok:' : '💡 Zo kan je het splitsen:';
  const eq = isClock
    ? `<span class="digi-inline">${q.digi}</span> = <b>${q.words}</b>`
    : `${q.a} ${opSym(q.op)} ${q.b} = <b>${q.answer}</b>`;
  const m = openModal(`
    <div class="wrong-panel">
      <div class="wrong-title">${timedOut ? '⏰ Tijd om!' : 'Oei, bijna! 💪'}</div>
      <div class="wrong-eq ${isClock ? 'clock' : ''}">${eq}</div>
      ${!timedOut ? `<div class="wrong-your">Jij koos <s>${value}</s></div>` : ''}
      ${hint ? `<div class="hint"><span>${hintTitle}</span><div>${hint}</div></div>` : ''}
      <button class="btn big primary next-btn" disabled>Verder ▶</button>
    </div>`, { cls: 'wrong-card' });
  const next = $('.next-btn', m.el);
  setTimeout(() => { next.disabled = false; }, 1000);
  next.onclick = () => { Sound.play('tap'); nextQuestion(); };
}

function quitRound() {
  if (!round || round.paused) return;
  Sound.play('tap');
  round.paused = true;
  // Pauzeer de timer als er een vraag open staat.
  const wasTiming = !round.locked;
  if (wasTiming) { round.locked = true; cancelAnimationFrame(round.raf); }
  const pausedAt = performance.now();

  const m = openModal(`
    <h2>Stoppen? 🥺</h2>
    <p class="modal-text">Je verdiende punten blijven bewaard.</p>
    <div class="modal-actions">
      <button class="btn ghost" data-act="stop">Ja, stoppen</button>
      <button class="btn primary" data-act="resume">Verder spelen</button>
    </div>`);
  $('[data-act="stop"]', m.el).onclick = () => {
    Sound.play('tap');
    const r = round;
    round = null;
    saveSession(r);
    renderHome();
  };
  $('[data-act="resume"]', m.el).onclick = () => {
    Sound.play('tap');
    m.close();
    if (!round) return;
    round.paused = false;
    if (round.pendingNext) {
      round.pendingNext = false;
      nextQuestion();
    } else if (wasTiming) {
      round.t0 += performance.now() - pausedAt;
      round.locked = false;
      round.raf = requestAnimationFrame(tick);
    }
  };
}

function saveSession(r) {
  if (!r || r.done === 0) return;
  const avgMs = r.times.length ? Math.round(r.times.reduce((a, b) => a + b, 0) / r.times.length) : 0;
  state.sessions.push({ date: Date.now(), mode: r.mode, done: r.done, correct: r.correct, points: r.points, avgMs, bestStreak: r.bestStreak });
  if (state.sessions.length > 300) state.sessions = state.sessions.slice(-300);
  save();
}

function endRound() {
  const r = round;
  round = null;
  saveSession(r);

  const acc = r.done ? r.correct / r.done : 0;
  const stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : acc >= 0.4 ? 1 : 0;
  const title = stars === 3 ? 'Super goed!! 🤩' : stars === 2 ? 'Knap gedaan! ⭐' : stars === 1 ? 'Goed gewerkt! 💪' : 'Volhouden! 💪';
  const sub = stars === 3 ? 'Je bent een echte rekenster!' : stars >= 1 ? 'Oefenen maakt je een superster!' : 'Elke ronde word je sterker. Probeer nog eens!';
  const rankAfter = getRank(state.totalEarned);
  const rankUp = rankAfter.min > r.rankBefore.min;
  const avg = r.times.length ? r.times.reduce((a, b) => a + b, 0) / r.times.length : 0;

  app.innerHTML = `
  <section class="screen results">
    <div class="stars">${[1, 2, 3].map((i) => `<span class="star ${i <= stars ? 'on' : ''}" style="animation-delay:${i * 0.2}s">★</span>`).join('')}</div>
    <h1 class="result-title">${title}</h1>
    <p class="result-sub">${sub}</p>
    ${rankUp ? `<div class="rank-up">🎉 Een niveau hoger! Je bent nu <b>${rankAfter.name} ${rankAfter.emoji}</b></div>` : ''}
    <div class="result-grid">
      <div class="result-item"><span>⭐</span><b>+${r.points}</b><small>punten</small></div>
      <div class="result-item"><span>✅</span><b>${r.correct}/${r.done}</b><small>juist</small></div>
      <div class="result-item"><span>🔥</span><b>${r.bestStreak}</b><small>op rij</small></div>
      <div class="result-item"><span>⚡</span><b>${avg ? fmtSec(avg) : '–'}</b><small>gemiddeld</small></div>
    </div>
    ${r.capHit ? '<p class="cap-note">Je hebt vandaag het maximum aantal punten verdiend. Morgen kan je weer punten sparen! 🌙</p>' : ''}
    <p class="total-note">Je hebt nu <b>${state.points} ⭐</b></p>
    <div class="result-actions">
      <button class="btn big primary" data-act="again">🔁 Nog een ronde</button>
      <button class="btn big secondary" data-act="rewards">🎁 Beloningen</button>
      <button class="btn big ghost" data-act="home">🏠 Home</button>
    </div>
  </section>`;

  $('[data-act="again"]', app).onclick = () => { Sound.play('tap'); startRound(r.mode); };
  $('[data-act="rewards"]', app).onclick = () => { Sound.play('tap'); renderRewards(); };
  $('[data-act="home"]', app).onclick = () => { Sound.play('tap'); renderHome(); };

  Sound.play('win');
  if (stars >= 1 || rankUp) {
    setTimeout(() => burst(window.innerWidth / 2, window.innerHeight / 3, 20 + stars * 10), 300);
  }
}

// ---------- Beloningen (kind) ----------
function renderRewards() {
  const pending = state.redemptions.filter((r) => r.status === 'pending');
  const rewards = state.rewards.slice().sort((a, b) => a.cost - b.cost);

  app.innerHTML = `
  <section class="screen rewards">
    <header class="topbar">
      <button class="btn ghost" data-act="home">← Terug</button>
      <h1 class="screen-title">🎁 Beloningen</h1>
      <div class="pill big-pill">⭐ ${state.points}</div>
    </header>

    ${rewards.length ? `<div class="reward-grid">
      ${rewards.map((rw) => {
        const can = state.points >= rw.cost;
        const pct = Math.min(100, Math.round(state.points / Math.max(1, rw.cost) * 100));
        return `
        <div class="reward-card ${can ? 'can' : ''}">
          <div class="reward-emoji">${esc(rw.emoji)}</div>
          <div class="reward-name">${esc(rw.name)}</div>
          <div class="reward-cost">${rw.cost} ⭐</div>
          <div class="reward-bar"><div style="width:${pct}%"></div></div>
          <button class="btn ${can ? 'primary' : 'locked'}" data-id="${esc(rw.id)}" ${can ? '' : 'disabled'}>
            ${can ? 'Inwisselen 💜' : `Nog ${rw.cost - state.points} ⭐`}
          </button>
        </div>`;
      }).join('')}
    </div>` : '<p class="empty-note">Er zijn nog geen beloningen. Vraag mama of papa om er toe te voegen! 💜</p>'}

    ${pending.length ? `
    <div class="pending-box">
      <h2>⏳ Wacht op mama of papa</h2>
      ${pending.map((p) => `<div class="pending-item">${esc(p.emoji)} ${esc(p.name)}</div>`).join('')}
    </div>` : ''}
  </section>`;

  $('[data-act="home"]', app).onclick = () => { Sound.play('tap'); renderHome(); };
  $$('.reward-card button[data-id]', app).forEach((b) => {
    b.addEventListener('click', () => {
      const rw = state.rewards.find((x) => x.id === b.dataset.id);
      if (!rw || state.points < rw.cost) return;
      Sound.play('tap');
      confirmModal({
        title: `${esc(rw.emoji)} ${esc(rw.name)}`,
        text: `Wil je dit inwisselen voor <b>${rw.cost} ⭐</b>?`,
        yes: 'Ja, graag!',
        no: 'Nog niet',
        onYes: () => redeem(rw),
      });
    });
  });
}

function redeem(rw) {
  if (state.points < rw.cost) return;
  state.points -= rw.cost;
  state.redemptions.push({ id: uid(), rewardId: rw.id, emoji: rw.emoji, name: rw.name, cost: rw.cost, date: Date.now(), status: 'pending' });
  save();
  renderRewards();
  Sound.play('win');
  burst(window.innerWidth / 2, window.innerHeight / 2, 30);
  const m = openModal(`
    <div class="celebrate">
      <div class="celebrate-emoji">${esc(rw.emoji)}</div>
      <h2>Joepie! 🎉</h2>
      <p class="modal-text">Laat dit zien aan mama of papa om <b>${esc(rw.name)}</b> te krijgen!</p>
      <button class="btn big primary" data-act="ok">Oké! 💜</button>
    </div>`);
  $('[data-act="ok"]', m.el).onclick = () => { Sound.play('tap'); m.close(); };
}

// =========================================================
//   OUDER-CHECK
// =========================================================

function openParentGate() {
  Sound.play('tap');
  const pin = state.settings.pin;
  let a, b;
  const newQuestion = () => { a = rand(12, 19); b = rand(6, 9); };
  newQuestion();

  const m = openModal(`
    <div class="gate">
      <h2>🔒 Alleen voor ouders</h2>
      <p class="gate-q" id="gate-q"></p>
      <div class="gate-display" id="gate-display">&nbsp;</div>
      ${numpadHtml()}
      <button class="btn ghost" data-act="cancel">Annuleren</button>
    </div>`, { cls: 'gate-card' });

  const qEl = $('#gate-q', m.el);
  const disp = $('#gate-display', m.el);
  const showQ = () => { qEl.innerHTML = pin ? 'Geef de pincode in' : `Hoeveel is <b>${a} × ${b}</b>?`; };
  showQ();

  const pad = bindNumpad(m.el, {
    maxLen: pin ? 8 : 4,
    onChange: (v) => { disp.textContent = v ? (pin ? '•'.repeat(v.length) : v) : ' '; },
    onOk: (v) => {
      const ok = pin ? v === pin : Number(v) === a * b;
      if (ok) {
        m.close();
        parentTab = state.redemptions.some((r) => r.status === 'pending') ? 'rewards' : parentTab;
        renderParent();
      } else {
        disp.classList.remove('shake');
        void disp.offsetWidth;
        disp.classList.add('shake');
        Sound.play('wrong');
        if (!pin) newQuestion();
        showQ();
        pad.clear();
      }
    },
  });
  $('[data-act="cancel"]', m.el).onclick = () => { Sound.play('tap'); m.close(); };
}

// =========================================================
//   OUDER-VIEW
// =========================================================

const PARENT_TABS = [
  ['rewards', '🎁 Beloningen'],
  ['practice', '⚙️ Oefeningen'],
  ['progress', '📈 Voortgang'],
  ['general', '👤 Algemeen'],
];

function renderParent() {
  const content = {
    rewards: parentRewardsHtml,
    practice: parentPracticeHtml,
    progress: parentProgressHtml,
    general: parentGeneralHtml,
  }[parentTab]();

  app.innerHTML = `
  <section class="screen parent">
    <header class="parent-top">
      <h1>Ouder-instellingen</h1>
      <button class="btn primary" data-act="close">Klaar ✓</button>
    </header>
    <nav class="tabs">
      ${PARENT_TABS.map(([id, label]) => `<button class="tab ${id === parentTab ? 'active' : ''}" data-tab="${id}">${label}</button>`).join('')}
    </nav>
    <div class="parent-body">${content}</div>
  </section>`;

  $('[data-act="close"]', app).onclick = renderHome;
  $$('.tab', app).forEach((t) => t.addEventListener('click', () => { parentTab = t.dataset.tab; renderParent(); }));
  const body = $('.parent-body', app);
  body.addEventListener('change', onParentChange);
  body.addEventListener('click', onParentClick);
}

function parentRewardsHtml() {
  const s = state.settings;
  const pending = state.redemptions.filter((r) => r.status === 'pending');
  const history = state.redemptions.filter((r) => r.status !== 'pending').slice(-20).reverse();
  const perRound = s.questionsPerRound * s.maxPoints + Math.floor(s.questionsPerRound / 5) * s.streakBonus;

  return `
  <div class="panel">
    <h2>Openstaande aanvragen</h2>
    ${pending.length ? pending.map((r) => `
      <div class="row">
        <span class="row-emoji">${esc(r.emoji)}</span>
        <span class="grow">${esc(r.name)}<small>${r.cost} ⭐ · ${fmtDate(r.date)}</small></span>
        <button class="btn small primary" data-act="give" data-id="${r.id}">✓ Gegeven</button>
        <button class="btn small ghost" data-act="refund" data-id="${r.id}">↩ Punten terug</button>
      </div>`).join('') : '<p class="muted">Geen openstaande aanvragen.</p>'}
  </div>

  <div class="panel">
    <h2>Beloningen instellen</h2>
    <p class="muted">Ter info: met de huidige instellingen levert één ronde maximaal ongeveer <b>${perRound} ⭐</b> op.</p>
    <div class="reward-edit-head"><span>Icoon</span><span class="grow">Beloning</span><span>Kost ⭐</span><span></span></div>
    ${state.rewards.map((rw) => `
      <div class="row reward-edit" data-id="${esc(rw.id)}">
        <input class="emoji-in" data-rfield="emoji" value="${esc(rw.emoji)}" maxlength="8" aria-label="Icoon">
        <input class="grow" data-rfield="name" value="${esc(rw.name)}" maxlength="60" aria-label="Naam">
        <input class="cost-in" type="number" min="1" max="100000" data-rfield="cost" value="${rw.cost}" aria-label="Kost">
        <button class="btn small danger" data-act="del-reward" data-id="${esc(rw.id)}" aria-label="Verwijderen">🗑</button>
      </div>`).join('')}
    <button class="btn secondary" data-act="add-reward">+ Nieuwe beloning</button>
    <p class="muted small">Tip: gebruik een emoji als icoon (bv. 🍕 🎮 🧸 🎬 🛝).</p>
  </div>

  <div class="panel">
    <h2>Geschiedenis</h2>
    ${history.length ? history.map((r) => `
      <div class="row">
        <span class="row-emoji">${esc(r.emoji)}</span>
        <span class="grow">${esc(r.name)}<small>${r.cost} ⭐ · ${fmtDate(r.date)}</small></span>
        <span class="status ${r.status}">${r.status === 'given' ? 'gegeven' : 'terugbetaald'}</span>
      </div>`).join('') : '<p class="muted">Nog niets ingewisseld.</p>'}
  </div>`;
}

function settingFieldHtml(f) {
  const v = state.settings[f.key];
  let input;
  if (f.type === 'bool') {
    input = `<label class="switch"><input type="checkbox" data-setting="${f.key}" ${v ? 'checked' : ''}><span></span></label>`;
  } else if (f.type === 'select') {
    input = `<select data-setting="${f.key}">${f.options.map(([val, label]) => `<option value="${val}" ${String(v) === val ? 'selected' : ''}>${label}</option>`).join('')}</select>`;
  } else {
    input = `<input type="number" data-setting="${f.key}" value="${v}" min="${f.min}" max="${f.max}">`;
  }
  return `
    <div class="setting">
      <div class="setting-label">${f.label}${f.help ? `<small>${f.help}</small>` : ''}</div>
      ${input}
    </div>`;
}

function parentPracticeHtml() {
  const group = (g, title) => `
    <h3>${title}</h3>
    ${CATEGORIES.filter((c) => c.group === g).map((c) => `
      <div class="setting">
        <div class="setting-label">${c.label}<small>bv. ${c.example}</small></div>
        <label class="switch"><input type="checkbox" data-cat="${c.id}" ${state.settings.categories[c.id] ? 'checked' : ''}><span></span></label>
      </div>`).join('')}`;
  const none = !CATEGORIES.some((c) => state.settings.categories[c.id]);

  return `
  <div class="panel">
    <h2>Soorten oefeningen</h2>
    ${none ? '<p class="warn">⚠️ Er staat geen enkele soort oefening aan. Je kind kan nu niet oefenen.</p>' : ''}
    ${group('20', 'Tot 20')}
    ${group('100', 'Tot 100')}
    ${group('klok', 'Digitale klok')}
  </div>
  <div class="panel">
    <h2>Spelregels</h2>
    ${SETTING_FIELDS.map(settingFieldHtml).join('')}
  </div>`;
}

function parentProgressHtml() {
  const facts = Object.entries(state.facts);
  const totalN = facts.reduce((s, [, f]) => s + f.n, 0);
  const totalWrong = facts.reduce((s, [, f]) => s + f.wrong, 0);
  const acc = totalN ? Math.round((1 - totalWrong / totalN) * 100) : 0;

  const perCat = CATEGORIES.map((c) => {
    const fs = facts.filter(([, f]) => f.cat === c.id).map(([, f]) => f);
    const n = fs.reduce((s, f) => s + f.n, 0);
    const wrong = fs.reduce((s, f) => s + f.wrong, 0);
    const timed = fs.filter((f) => f.avgMs);
    const avg = timed.length ? timed.reduce((s, f) => s + f.avgMs, 0) / timed.length : 0;
    return { c, n, acc: n ? Math.round((1 - wrong / n) * 100) : null, avg };
  }).filter((x) => x.n > 0);

  const hardest = facts
    .filter(([, f]) => f.n >= 2 && (f.wrong > 0 || f.avgMs > timing(f).fast))
    .sort(([, x], [, y]) => (y.wrong / y.n - x.wrong / x.n) || (y.avgMs - x.avgMs))
    .slice(0, 15);

  const sessions = state.sessions.slice(-12).reverse();
  const modeTitle = (id) => (MODES.find((m) => m.id === id) || {}).title || id;

  return `
  <div class="stat-cards">
    <div class="stat"><b>${state.sessions.length}</b><span>rondes</span></div>
    <div class="stat"><b>${totalN}</b><span>oefeningen</span></div>
    <div class="stat"><b>${totalN ? acc + '%' : '–'}</b><span>juist</span></div>
    <div class="stat"><b>${state.totalEarned}</b><span>⭐ verdiend</span></div>
  </div>

  <div class="panel">
    <h2>Per soort oefening</h2>
    ${perCat.length ? `<table class="table">
      <thead><tr><th>Soort</th><th>Aantal</th><th>Juist</th><th>Gem. tijd</th></tr></thead>
      <tbody>${perCat.map((x) => `
        <tr>
          <td>${x.c.label}</td>
          <td>${x.n}</td>
          <td><div class="acc-bar"><div style="width:${x.acc}%" class="${x.acc >= 85 ? 'good' : x.acc >= 65 ? 'mid' : 'bad'}"></div><span>${x.acc}%</span></div></td>
          <td>${x.avg ? fmtSec(x.avg) : '–'}</td>
        </tr>`).join('')}</tbody>
    </table>` : '<p class="muted">Nog geen gegevens. Laat je kind eerst een paar rondes spelen.</p>'}
  </div>

  <div class="panel">
    <h2>Moeilijkste oefeningen</h2>
    <p class="muted">Oefeningen die vaak fout gaan of traag zijn. Deze komen automatisch vaker terug als "moeilijke oefeningen vaker vragen" aan staat.</p>
    ${hardest.length ? `<div class="fact-list">${hardest.map(([, f]) => `
      <div class="fact">
        <b>${factLabel(f)}</b>
        <small>${f.wrong}× fout van ${f.n} · ${f.avgMs ? fmtSec(f.avgMs) : 'nog nooit juist'}</small>
      </div>`).join('')}</div>` : '<p class="muted">Nog geen moeilijke oefeningen gevonden. 👍</p>'}
  </div>

  <div class="panel">
    <h2>Laatste rondes</h2>
    ${sessions.length ? `<table class="table">
      <thead><tr><th>Wanneer</th><th>Soort</th><th>Juist</th><th>Gem. tijd</th><th>⭐</th></tr></thead>
      <tbody>${sessions.map((s) => `
        <tr>
          <td>${fmtDate(s.date)}</td>
          <td>${esc(modeTitle(s.mode))}</td>
          <td>${s.correct}/${s.done}</td>
          <td>${s.avgMs ? fmtSec(s.avgMs) : '–'}</td>
          <td>${s.points}</td>
        </tr>`).join('')}</tbody>
    </table>` : '<p class="muted">Nog geen rondes gespeeld.</p>'}
  </div>`;
}

function parentGeneralHtml() {
  return `
  <div class="panel">
    <h2>Naam</h2>
    <div class="setting">
      <div class="setting-label">Naam van je kind<small>Wordt getoond op het startscherm.</small></div>
      <input type="text" data-field="childName" value="${esc(state.childName)}" maxlength="30">
    </div>
  </div>

  <div class="panel">
    <h2>Punten aanpassen</h2>
    <p>Huidige punten: <b>${state.points} ⭐</b></p>
    <div class="row">
      <input type="number" id="adjust-amount" min="1" max="100000" placeholder="Aantal" class="cost-in">
      <button class="btn small primary" data-act="adjust-add">+ Geven</button>
      <button class="btn small ghost" data-act="adjust-sub">− Afnemen</button>
    </div>
  </div>

  <div class="panel">
    <h2>Toegang ouder-view</h2>
    <div class="setting">
      <div class="setting-label">Pincode (4–8 cijfers)<small>Leeg = een rekenvraag (bv. 17 × 8) beschermt de ouder-view.</small></div>
      <input type="password" inputmode="numeric" id="pin-input" maxlength="8" placeholder="${state.settings.pin ? '••••' : 'geen'}">
    </div>
    <div class="row">
      <button class="btn small primary" data-act="save-pin">Pincode opslaan</button>
      ${state.settings.pin ? '<button class="btn small ghost" data-act="clear-pin">Pincode wissen</button>' : ''}
    </div>
  </div>

  <div class="panel">
    <h2>Backup</h2>
    <p class="muted">Alles wordt enkel in deze browser bewaard. Maak af en toe een backup, of gebruik dit om naar een ander toestel te verhuizen.</p>
    <div class="row">
      <button class="btn small secondary" data-act="export">⬇ Backup downloaden</button>
      <label class="btn small secondary file-btn">⬆ Backup terugzetten<input type="file" accept="application/json,.json" id="import-file" hidden></label>
    </div>
  </div>

  <div class="panel">
    <h2>Wissen</h2>
    <div class="row">
      <button class="btn small danger" data-act="reset-stats">Statistieken wissen</button>
      <button class="btn small danger" data-act="reset-all">Alles wissen</button>
    </div>
    <p class="muted small">"Statistieken wissen" behoudt punten en beloningen. "Alles wissen" zet de app volledig terug naar het begin.</p>
  </div>`;
}

function onParentChange(e) {
  const t = e.target;

  if (t.dataset.cat) {
    state.settings.categories[t.dataset.cat] = t.checked;
    save();
    renderParent();
    toast('Opgeslagen ✓');
    return;
  }

  if (t.dataset.setting) {
    const f = SETTING_FIELDS.find((x) => x.key === t.dataset.setting);
    let v;
    if (f.type === 'bool') v = t.checked;
    else if (f.type === 'number') { v = clamp(Math.round(Number(t.value) || 0), f.min, f.max); t.value = v; }
    else v = f.numeric ? Number(t.value) : t.value;
    state.settings[f.key] = v;
    save();
    toast('Opgeslagen ✓');
    return;
  }

  if (t.dataset.rfield) {
    const id = t.closest('[data-id]').dataset.id;
    const rw = state.rewards.find((r) => r.id === id);
    if (!rw) return;
    if (t.dataset.rfield === 'cost') { rw.cost = clamp(Math.round(Number(t.value) || 1), 1, 100000); t.value = rw.cost; }
    else if (t.dataset.rfield === 'emoji') rw.emoji = t.value.trim() || '🎁';
    else rw.name = t.value.trim() || 'Beloning';
    save();
    toast('Opgeslagen ✓');
    return;
  }

  if (t.dataset.field === 'childName') {
    state.childName = t.value.trim();
    save();
    toast('Opgeslagen ✓');
    return;
  }

  if (t.id === 'import-file' && t.files[0]) importBackup(t.files[0]);
}

function onParentClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  const id = btn.dataset.id;

  switch (act) {
    case 'give': {
      const r = state.redemptions.find((x) => x.id === id);
      if (r) { r.status = 'given'; r.doneDate = Date.now(); save(); renderParent(); }
      break;
    }
    case 'refund': {
      const r = state.redemptions.find((x) => x.id === id);
      if (r && confirm(`${r.cost} punten teruggeven voor "${r.name}"?`)) {
        r.status = 'refunded';
        r.doneDate = Date.now();
        state.points += r.cost;
        save();
        renderParent();
      }
      break;
    }
    case 'add-reward':
      state.rewards.push({ id: uid(), emoji: '🎁', name: 'Nieuwe beloning', cost: 100 });
      save();
      renderParent();
      $$('.reward-edit input[data-rfield="name"]', app).pop()?.select();
      break;
    case 'del-reward': {
      const rw = state.rewards.find((x) => x.id === id);
      if (rw && confirm(`Beloning "${rw.name}" verwijderen?`)) {
        state.rewards = state.rewards.filter((x) => x.id !== id);
        save();
        renderParent();
      }
      break;
    }
    case 'adjust-add':
    case 'adjust-sub': {
      const n = Math.round(Number($('#adjust-amount').value) || 0);
      if (n <= 0) { toast('Geef een aantal in'); return; }
      state.points = act === 'adjust-add' ? state.points + n : Math.max(0, state.points - n);
      save();
      renderParent();
      toast(act === 'adjust-add' ? `+${n} ⭐ gegeven` : `${n} ⭐ afgenomen`);
      break;
    }
    case 'save-pin': {
      const v = $('#pin-input').value.trim();
      if (!/^\d{4,8}$/.test(v)) { toast('Pincode moet 4 tot 8 cijfers zijn'); return; }
      state.settings.pin = v;
      save();
      renderParent();
      toast('Pincode opgeslagen ✓');
      break;
    }
    case 'clear-pin':
      state.settings.pin = '';
      save();
      renderParent();
      toast('Pincode gewist');
      break;
    case 'export':
      exportBackup();
      break;
    case 'reset-stats':
      if (confirm('Alle statistieken (sommen en rondes) wissen? Punten en beloningen blijven behouden.')) {
        state.facts = {};
        state.sessions = [];
        save();
        renderParent();
        toast('Statistieken gewist');
      }
      break;
    case 'reset-all':
      if (confirm('ALLES wissen: punten, beloningen, instellingen en statistieken? Dit kan niet ongedaan worden.')) {
        state = defaultState();
        save();
        parentTab = 'rewards';
        renderHome();
      }
      break;
  }
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `reken-idol-backup-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (typeof data !== 'object' || typeof data.points !== 'number' || !data.settings) throw new Error('ongeldig');
      if (!confirm('De huidige gegevens worden vervangen door de backup. Doorgaan?')) return;
      state = mergeState(data);
      save();
      renderParent();
      toast('Backup teruggezet ✓');
    } catch (err) {
      alert('Dit is geen geldig Reken Idol backup-bestand.');
    }
  };
  reader.readAsText(file);
}

// ---------- Start ----------
function init() {
  app = $('#app');
  // Lang indrukken mag geen menu openen op het touchscreen (behalve in invoervelden).
  document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('input, textarea, select')) e.preventDefault();
  });
  renderHome();
}

if (typeof document !== 'undefined') init();

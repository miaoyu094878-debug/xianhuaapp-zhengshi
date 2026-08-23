/* Luminara — Manifest Your Reality */
(function () {
  'use strict';
  if (window.__LUMINARA_APP_INITIALIZED__) return;
  window.__LUMINARA_APP_INITIALIZED__ = true;

  /* ═══════ Starfield Canvas ═══════ */
  var canvas = document.getElementById('starfield');
  var ctx = canvas.getContext('2d');
  var stars = [], W, H;
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  var STAR_PALETTES = {
    'luminara': ['255,220,170', '210,170,240'],
    'manifest-light': ['232,184,109', '244,166,189', '184,161,227'],
    'manifest-dark': ['255,255,255', '220,210,255', '255,230,200'],
    'prism': ['255,255,255', '255,170,190', '255,209,128', '143,195,245'],
    'ios': ['90,200,250', '0,122,255', '255,255,255']
  };
  var starPalette = STAR_PALETTES['luminara'];

  for (var i = 0; i < 140; i++) {
    stars.push({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.8 + 0.3,
      speed: Math.random() * 0.35 + 0.08,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 0.02 + 0.004,
      pi: i % 2
    });
  }

  function drawStars() {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(function (s) {
      var hue = starPalette[s.pi % starPalette.length];
      var alpha = 0.3 + 0.7 * (Math.sin(s.twinkle) * 0.5 + 0.5);
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + hue + ',' + alpha + ')';
      ctx.fill();
      if (s.r > 1.0) {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + hue + ',' + (alpha * 0.06) + ')';
        ctx.fill();
      }
      s.y -= s.speed;
      s.twinkle += s.twinkleSpeed;
      if (s.y < -10) { s.y = H + 10; s.x = Math.random() * W; }
    });
    if (Math.random() < 0.004) {
      var sx = Math.random() * W * 0.8, sy = Math.random() * H * 0.5;
      var len = 60 + Math.random() * 50;
      var grd = ctx.createLinearGradient(sx, sy, sx + len * 1.5, sy + len);
      var sc = starPalette[0];
      grd.addColorStop(0, 'rgba(' + sc + ',0.8)');
      grd.addColorStop(1, 'rgba(' + sc + ',0)');
      ctx.beginPath(); ctx.moveTo(sx, sy);
      ctx.lineTo(sx + len * 1.5, sy + len);
      ctx.strokeStyle = grd; ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    requestAnimationFrame(drawStars);
  }
  drawStars();

  /* ═══════ Data Layer ═══════ */
  var KEY = 'manifest_data_v1';
  var defaults = {
    goals: [], gratitude: {}, affirmFavs: [], affirmCustom: [],
    vision: [], activeDays: [], meditationMin: 0, saved: [],
    profile: { name: '', area: '', desire: '' }
  };

  var db = load();
  function load() {
    try { var raw = localStorage.getItem(KEY); if (raw) return Object.assign({}, defaults, JSON.parse(raw)); } catch (e) {}
    return Object.assign({}, defaults);
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {} }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function markActive() {
    var t = todayStr();
    if (db.activeDays.indexOf(t) === -1) { db.activeDays.push(t); save(); }
  }
  function streak() {
    var set = {};
    db.activeDays.forEach(function (d) { set[d] = 1; });
    var n = 0, d = new Date();
    if (!set[fmt(d)]) d.setDate(d.getDate() - 1);
    while (set[fmt(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function fmt(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ═══════ Affirmation Library ═══════ */
  var AFFIRMATIONS = {
    'Abundance': [
      'Money flows to me effortlessly from expected and unexpected sources.',
      'I am a magnet for wealth, prosperity, and abundance.',
      'I deserve to live a life of financial freedom.',
      'Abundance is my natural state of being.',
      'I am open to receive unlimited abundance from the Universe.'
    ],
    'Love': [
      'I am deeply loved and cherished.',
      'My soulmate is on their way to me right now.',
      'I am worthy of a passionate, healthy, and fulfilling relationship.',
      'Love surrounds me everywhere I go.',
      'I radiate love and attract love effortlessly.'
    ],
    'Career': [
      'My talents are seen, valued, and rewarded.',
      'The perfect opportunity is already making its way to me.',
      'I do what I love and prosper abundantly from it.',
      'Every step I take leads me to my highest purpose.',
      'I am confident, capable, and successful in all I do.'
    ],
    'Wellness': [
      'Every cell in my body vibrates with energy and health.',
      'I am radiant, vibrant, and full of life force.',
      'My body heals, restores, and strengthens each day.',
      'I treat my body with love, and it loves me back.',
      'Perfect health is my birthright.'
    ],
    'Growth': [
      'I trust myself completely and believe in my journey.',
      'Everything is unfolding perfectly for my highest good.',
      'I have the power to create the life of my dreams.',
      'I live in the present moment, peaceful and powerful.',
      'The Universe always has my back.'
    ]
  };
  var QUOTES = [
    'What you focus on, you attract.',
    'Imagination is the beginning of creation.',
    'Gratitude for what you have opens the door to more.',
    'The Universe responds to your frequency, not your words.',
    'Become it first, then you shall have it.',
    'Believe it, and you will see it.',
    'Your beliefs are shaping your reality right now.'
  ];

  /* ═══════ Helpers ═══════ */
  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function el(tag, cls, text) {
    var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e;
  }

  /* ═══════ Tab Navigation ═══════ */
  $$('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { goTab(btn.dataset.tab); });
  });
  function goTab(id) {
    stopFutureAudio();
    var hasNav = false;
    $$('.tab-btn').forEach(function (b) {
      var on = b.dataset.tab === id;
      if (on) hasNav = true;
      b.classList.toggle('active', on);
    });
    if (!hasNav) {
      var more = $$('.tab-btn').filter(function (b) { return b.dataset.tab === 'tab-more'; })[0];
      if (more) more.classList.add('active');
    }
    $$('.side-link').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === id); });
    $$('.tab-page').forEach(function (p) { p.classList.toggle('active', p.id === id); });
    window.scrollTo(0, 0);
  }
  $$('.mini-card, .focus-card, .more-card').forEach(function (c) {
    c.addEventListener('click', function () { goTab(c.dataset.goto); });
  });
  $$('.side-link').forEach(function (b) {
    b.addEventListener('click', function () { goTab(b.dataset.tab); });
  });

  /* ═══════ Dashboard ═══════ */
  function renderToday() {
    var now = new Date();
    var week = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    $('#todayDate').textContent = week[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate();
    var h = now.getHours();
    var base = h < 6 ? 'The stars are still dreaming' : h < 12 ? 'A beautiful morning to create' : h < 18 ? 'The Universe is listening' : 'Reflect on today\'s magic';
    var name = db.profile && db.profile.name ? ', ' + db.profile.name : '';
    $('#greeting').textContent = base + name;
    var doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
    $('#dailyQuote').textContent = '“' + QUOTES[doy % QUOTES.length] + '”';
    $('#statStreak').textContent = streak();
    $('#statGoals').textContent = db.goals.filter(function (g) { return !g.done; }).length;
    $('#statMeditation').textContent = db.meditationMin;

    var g = db.gratitude[todayStr()];
    $('#glanceGratitude').textContent = g && g.length ? g.length + ' blessing' + (g.length > 1 ? 's' : '') + ' recorded ✿' : 'Write 3 things you\'re grateful for';
  }

  /* ═══════ Goals ═══════ */
  $('#goalForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var title = $('#goalTitle').value.trim();
    if (!title) return;
    db.goals.unshift({ id: uid(), title: title, category: $('#goalCategory').value, date: $('#goalDate').value || '', done: false, createdAt: todayStr() });
    $('#goalTitle').value = ''; $('#goalDate').value = '';
    markActive(); save(); renderGoals(); renderToday();
  });

  var CAT_EMOJI = { 'abundance': '💎', 'love': '💖', 'career': '⭐', 'wellness': '🌙', 'growth': '🌱' };
  var CAT_LABEL = { 'abundance': 'Abundance', 'love': 'Love', 'career': 'Purpose', 'wellness': 'Wellness', 'growth': 'Growth' };
  function renderGoals() {
    var wrap = $('#goalList');
    wrap.innerHTML = '';
    if (!db.goals.length) { wrap.appendChild(el('div', 'empty', 'No desires yet. Plant your first seed ✦')); return; }
    db.goals.forEach(function (g) {
      var item = el('div', 'list-item' + (g.done ? ' done' : ''));
      var toggle = el('button', 'icon-btn', g.done ? '✧' : '○');
      toggle.title = g.done ? 'Manifested' : 'Mark as manifested';
      toggle.addEventListener('click', function () { g.done = !g.done; save(); renderGoals(); renderToday(); });
      var mid = el('div', 'grow');
      mid.appendChild(el('div', 'title', g.title));
      var meta = (CAT_EMOJI[g.category] || '✦') + ' ' + (CAT_LABEL[g.category] || g.category) + ' · Planted ' + g.createdAt + (g.date ? ' · By ' + g.date : '');
      mid.appendChild(el('div', 'meta', g.done ? meta + ' · ✦ Manifested' : meta));
      var del = el('button', 'icon-btn', '✕');
      del.addEventListener('click', function () { db.goals = db.goals.filter(function (x) { return x.id !== g.id; }); save(); renderGoals(); renderToday(); });
      item.appendChild(toggle); item.appendChild(mid); item.appendChild(del);
      wrap.appendChild(item);
    });
  }

  /* ═══════ Affirmations (List) ═══════ */
  var curCat = 'Abundance';
  var catsWrap = $('#affirmCats');
  Object.keys(AFFIRMATIONS).forEach(function (c) {
    var b = el('button', 'chip' + (c === curCat ? ' active' : ''), c);
    b.addEventListener('click', function () {
      curCat = c;
      $$('#affirmCats .chip').forEach(function (x) { x.classList.toggle('active', x.textContent === c); });
      renderAffirm();
    });
    catsWrap.appendChild(b);
  });
  $('#affirmAdd').addEventListener('click', function () {
    var t = $('#affirmNew').value.trim();
    if (!t) return;
    if (db.affirmCustom.indexOf(t) === -1) db.affirmCustom.push(t);
    $('#affirmNew').value = '';
    save(); renderAffirm(); initSwipe();
  });
  $('#affirmNew').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); $('#affirmAdd').click(); }
  });
  function renderAffirm() {
    var wrap = $('#affirmList');
    wrap.innerHTML = '';
    if (db.affirmCustom && db.affirmCustom.length) {
      wrap.appendChild(el('div', 'list-head', 'My affirmations'));
      db.affirmCustom.forEach(function (text) {
        var item = el('div', 'list-item');
        var mid = el('div', 'grow');
        mid.appendChild(el('div', 'title', text));
        var delBtn = el('button', 'icon-btn', '✕');
        delBtn.title = 'Remove';
        delBtn.addEventListener('click', function () {
          var i = db.affirmCustom.indexOf(text);
          if (i !== -1) db.affirmCustom.splice(i, 1);
          save(); renderAffirm(); initSwipe();
        });
        item.appendChild(mid); item.appendChild(delBtn);
        wrap.appendChild(item);
      });
      wrap.appendChild(el('div', 'list-sep', ''));
    }
    AFFIRMATIONS[curCat].forEach(function (text) {
      var fav = db.affirmFavs.indexOf(text) !== -1;
      var item = el('div', 'list-item');
      var mid = el('div', 'grow');
      mid.appendChild(el('div', 'title', text));
      var favBtn = el('button', 'icon-btn', fav ? '✦' : '✧');
      favBtn.title = fav ? 'Unfavorite' : 'Favorite';
      favBtn.addEventListener('click', function () {
        var i = db.affirmFavs.indexOf(text);
        if (i === -1) db.affirmFavs.push(text); else db.affirmFavs.splice(i, 1);
        save(); renderAffirm();
      });
      item.appendChild(mid); item.appendChild(favBtn);
      wrap.appendChild(item);
    });
  }

  /* ═══════ Swipe Affirmations (Stella-style) ═══════ */
  var swipeQueue = [];
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function initSwipe() {
    var pool = [];
    Object.keys(AFFIRMATIONS).forEach(function (c) { AFFIRMATIONS[c].forEach(function (t) { pool.push(t); }); });
    (db.affirmCustom || []).forEach(function (t) { pool.push(t); });
    swipeQueue = shuffle(pool);
    renderSwipe();
  }
  function renderSwipe() {
    var deck = $('#swipeDeck'); deck.innerHTML = '';
    if (!swipeQueue.length) {
      deck.appendChild(el('div', 'swipe-empty', "You've collected them all ✧\nTap Reset to begin again"));
      return;
    }
    var card = el('div', 'swipe-card');
    card.innerHTML = '<div class="sc-text">' + swipeQueue[swipeQueue.length - 1] + '</div><div class="sc-hint">♥ save · ✕ skip</div>';
    deck.appendChild(card);
  }
  function swipeOut(dir, after) {
    var card = $('#swipeDeck .swipe-card');
    if (!card) { after(); return; }
    card.classList.add(dir === 'save' ? 'swiped-right' : 'swiped-left');
    if (dir === 'save') card.classList.add('saved-flash');
    setTimeout(after, 320);
  }
  $('#swipeSave').addEventListener('click', function () {
    var text = swipeQueue[swipeQueue.length - 1];
    swipeOut('save', function () {
      swipeQueue.pop();
      if (text && db.affirmFavs.indexOf(text) === -1) db.affirmFavs.push(text);
      save(); renderSwipe(); renderAffirm();
    });
  });
  $('#swipeSkip').addEventListener('click', function () {
    swipeOut('skip', function () { swipeQueue.pop(); renderSwipe(); });
  });
  $('#swipeReset').addEventListener('click', function () { initSwipe(); });

  /* ═══════ Gratitude Journal ═══════ */
  var gratInputs = $$('.grat-input');
  $('#gratForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var items = gratInputs.map(function (i) { return i.value.trim(); }).filter(Boolean);
    if (!items.length) return;
    db.gratitude[todayStr()] = items;
    gratInputs.forEach(function (i) { i.value = ''; });
    markActive(); save(); renderGrat(); renderToday();
  });
  function renderGrat() {
    var wrap = $('#gratHistory');
    wrap.innerHTML = '';
    var days = Object.keys(db.gratitude).sort().reverse();
    if (!days.length) { wrap.appendChild(el('div', 'empty', 'Your gratitude journal awaits ✿')); return; }
    days.slice(0, 14).forEach(function (day) {
      var card = el('div', 'card glass');
      card.appendChild(el('div', 'meta', day + (day === todayStr() ? ' · Today' : '')));
      db.gratitude[day].forEach(function (g) {
        var p = el('div', 'title', '✿  ' + g);
        p.style.marginTop = '8px'; p.style.lineHeight = '1.6';
        card.appendChild(p);
      });
      wrap.appendChild(card);
    });
    var tg = db.gratitude[todayStr()];
    if (tg) gratInputs.forEach(function (inp, i) { inp.value = tg[i] || ''; });
  }

  /* ═══════ Vision Board (with photo) ═══════ */
  $('#visionForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var text = $('#visionText').value.trim();
    if (!text) return;
    var fileInput = $('#visionPhoto');
    var finish = function (photo) {
      db.vision.unshift({ id: uid(), emoji: $('#visionEmoji').value.trim() || '✦', text: text, photo: photo || null });
      $('#visionText').value = ''; $('#visionPhoto').value = '';
      markActive(); save(); renderVision();
    };
    if (fileInput.files && fileInput.files[0]) compressImage(fileInput.files[0], finish);
    else finish(null);
  });
  function compressImage(file, cb) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        var maxW = 600, scale = Math.min(1, maxW / img.width);
        var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        try { cb(c.toDataURL('image/jpeg', 0.7)); } catch (err) { cb(null); }
      };
      img.onerror = function () { cb(null); };
      img.src = ev.target.result;
    };
    reader.onerror = function () { cb(null); };
    reader.readAsDataURL(file);
  }
  function renderVision() {
    var wrap = $('#visionBoard');
    wrap.innerHTML = '';
    if (!db.vision.length) { wrap.appendChild(el('div', 'empty', 'Pin your first vision card ◈')); return; }
    db.vision.forEach(function (v) {
      var card = el('div', 'vision-card');
      card.appendChild(el('div', 've', v.emoji));
      card.appendChild(el('div', 'vt', v.text));
      if (v.photo) {
        card.classList.add('has-photo');
        card.style.backgroundImage = 'url(' + v.photo + ')';
        card.style.backgroundSize = 'cover';
        card.style.backgroundPosition = 'center';
      }
      var del = el('button', 'vdel', '✕');
      del.addEventListener('click', function () { db.vision = db.vision.filter(function (x) { return x.id !== v.id; }); save(); renderVision(); });
      card.appendChild(del);
      wrap.appendChild(card);
    });
  }

  /* ═══════ Future Self (audio manifestation) ═══════ */
  function buildFutureScript(name, desire) {
    var n = name ? name : 'friend';
    var d = desire || (db.profile && db.profile.area ? 'your ' + db.profile.area.toLowerCase() + ' dream' : 'your deepest desire');
    return 'Hello ' + n + '. I am you — from a future where ' + d + ' is already completely real.\n\n' +
      'I want you to know: it happened. Gently, surely, exactly as it was meant to. Every small step you took mattered. The doubt you felt was only the old you loosening its grip.\n\n' +
      'In my reality now, ' + d + ' fills my days with ease and quiet joy. You are already on the way. Keep going — I am already here, waiting for you with open arms.\n\n' +
      'Breathe. You have got this. ✧';
  }
  var fsPlaying = false;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return null;
    var vs = window.speechSynthesis.getVoices();
    if (!vs.length) return null;
    return vs.filter(function (v) { return /en/i.test(v.lang) && /female|samantha|victoria|zira|karen|moira|google US|woman|girl/i.test(v.name); })[0] ||
           vs.filter(function (v) { return /en[-_]US/i.test(v.lang); })[0] ||
           vs.filter(function (v) { return /^en/i.test(v.lang); })[0] || null;
  }
  function fsSpeak(text) {
    if (!('speechSynthesis' in window)) { alert('Text-to-speech is not supported on this device.'); return; }
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9; u.pitch = 1.0;
    var v = pickVoice(); if (v) u.voice = v;
    u.onend = function () { fsPlaying = false; $('#fsPlay').textContent = '▶ Play'; };
    u.onerror = function () { fsPlaying = false; $('#fsPlay').textContent = '▶ Play'; };
    window.speechSynthesis.speak(u);
    fsPlaying = true; $('#fsPlay').textContent = '⏸ Pause';
  }
  $('#fsForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var raw = $('#fsDesire').value.trim();
    var desire = raw || (db.profile && db.profile.desire) || '';
    if (!desire) return;
    var script = buildFutureScript(db.profile && db.profile.name, desire);
    $('#fsScript').textContent = script;
    $('#fsScript').setAttribute('contenteditable', 'true');
    $('#fsPlayer').classList.remove('hidden');
    fsSpeak(script);
  });
  $('#fsPlay').addEventListener('click', function () {
    var txt = $('#fsScript').textContent;
    if (fsPlaying) { window.speechSynthesis.pause(); fsPlaying = false; $('#fsPlay').textContent = '▶ Resume'; }
    else if (window.speechSynthesis && window.speechSynthesis.paused && window.speechSynthesis.speaking) {
      window.speechSynthesis.resume(); fsPlaying = true; $('#fsPlay').textContent = '⏸ Pause';
    } else { if (!txt) return; fsSpeak(txt); }
  });
  /* Ambient pad via Web Audio */
  var ambCtx = null, ambNodes = null, ambOn = false;
  function startAmbient() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      ambCtx = new AC();
      var o1 = ambCtx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 110;
      var o2 = ambCtx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 164.81;
      var filter = ambCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 600;
      var gain = ambCtx.createGain(); gain.gain.value = 0.045;
      o1.connect(filter); o2.connect(filter); filter.connect(gain); gain.connect(ambCtx.destination);
      o1.start(); o2.start();
      ambNodes = { o1: o1, o2: o2 };
      ambOn = true;
      $('#fsAmbient').textContent = 'Ambient: On'; $('#fsAmbient').setAttribute('aria-pressed', 'true');
    } catch (e) { /* ignore */ }
  }
  function stopAmbient() {
    if (ambNodes) { try { ambNodes.o1.stop(); ambNodes.o2.stop(); } catch (e) {} ambNodes = null; }
    if (ambCtx) { try { ambCtx.close(); } catch (e) {} ambCtx = null; }
    ambOn = false;
    var b = $('#fsAmbient'); if (b) { b.textContent = 'Ambient: Off'; b.setAttribute('aria-pressed', 'false'); }
  }
  $('#fsAmbient').addEventListener('click', function () { if (ambOn) stopAmbient(); else startAmbient(); });
  function stopFutureAudio() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (fsPlaying) { fsPlaying = false; var p = $('#fsPlay'); if (p) p.textContent = '▶ Play'; }
    if (ambOn) stopAmbient();
  }

  /* ═══════ Cosmic Meditation ═══════ */
  var medState = { min: 5, left: 300, timer: null, breathTimer: null, running: false };
  $$('.dur-chip').forEach(function (c) {
    c.addEventListener('click', function () {
      if (medState.running) return;
      medState.min = parseInt(c.dataset.min, 10);
      medState.left = medState.min * 60;
      $$('.dur-chip').forEach(function (x) { x.classList.toggle('active', x === c); });
      renderMedTime();
    });
  });
  function renderMedTime() {
    var m = Math.floor(medState.left / 60), s = medState.left % 60;
    $('#medTimer').textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  function breathLoop() {
    var circle = $('#breathCircle'), txt = $('#breathText');
    var phases = [
      { label: 'Breathe in', cls: 'inhale', dur: 4000 },
      { label: 'Hold', cls: 'inhale', dur: 4000 },
      { label: 'Release', cls: 'exhale', dur: 6000 }
    ];
    var i = 0;
    function next() {
      if (!medState.running) return;
      var p = phases[i % phases.length];
      txt.textContent = p.label;
      circle.className = 'breath-circle ' + p.cls;
      medState.breathTimer = setTimeout(next, p.dur);
      i++;
    }
    next();
  }
  $('#medStart').addEventListener('click', function () {
    if (medState.running) { stopMed(false); return; }
    medState.running = true;
    medState.left = medState.min * 60;
    $('#medStart').textContent = 'End Journey ✦';
    renderMedTime();
    breathLoop();
    medState.timer = setInterval(function () {
      medState.left--;
      renderMedTime();
      if (medState.left <= 0) stopMed(true);
    }, 1000);
  });
  function stopMed(completed) {
    clearInterval(medState.timer);
    clearTimeout(medState.breathTimer);
    medState.running = false;
    var doneMin = completed ? medState.min : Math.round((medState.min * 60 - medState.left) / 60);
    if (doneMin > 0) { db.meditationMin += doneMin; markActive(); save(); }
    medState.left = medState.min * 60;
    $('#medStart').textContent = 'Begin Journey ✦';
    $('#breathText').textContent = completed ? '✦ Complete' : 'Ready';
    $('#breathCircle').className = 'breath-circle';
    renderMedTime(); renderToday();
    if (completed) setTimeout(function () { $('#breathText').textContent = 'Ready'; }, 3000);
  }

  /* ═══════ Onboarding Quiz ═══════ */
  var qStep = 1;
  function setQuizStep(n) {
    qStep = n;
    $$('.quiz-step').forEach(function (s) { s.classList.toggle('hidden', parseInt(s.dataset.step, 10) !== n); });
    $$('.qdot').forEach(function (d, i) { d.classList.toggle('active', i === n - 1); });
  }
  function showQuiz() { $('#quizModal').classList.remove('hidden'); setQuizStep(1); }
  function maybeShowQuiz() { if (!db.profile || !db.profile.name) { if (!db.quizSkipped) showQuiz(); } }
  $('#qSkip').addEventListener('click', function () {
    db.quizSkipped = true; save();
    $('#quizModal').classList.add('hidden');
  });
  $$('.q-next').forEach(function (b) {
    b.addEventListener('click', function () { setQuizStep(Math.min(3, qStep + 1)); });
  });
  $$('#qCats .chip').forEach(function (c) {
    c.addEventListener('click', function () {
      $$('#qCats .chip').forEach(function (x) { x.classList.remove('active'); });
      c.classList.add('active');
      db.profile = db.profile || {}; db.profile.area = c.dataset.cat;
    });
  });
  $('#qFinish').addEventListener('click', function () {
    db.profile = db.profile || {};
    db.profile.name = $('#qName').value.trim();
    db.profile.desire = $('#qDesire').value.trim();
    save();
    $('#quizModal').classList.add('hidden');
    renderToday();
  });

  /* ═══════ Theme Switcher ═══════ */
  var THEME_KEY = 'luminara_theme_v1';
  var THEMES = ['luminara', 'manifest-light', 'manifest-dark', 'prism', 'ios'];
  function applyTheme(t) {
    if (THEMES.indexOf(t) === -1) t = 'luminara';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    starPalette = STAR_PALETTES[t] || STAR_PALETTES['luminara'];
    $$('.theme-opt').forEach(function (o) { o.classList.toggle('active', o.dataset.theme === t); });
    $$('.ds-theme').forEach(function (o) { o.classList.toggle('active', o.dataset.theme === t); });
  }
  var savedTheme = null;
  try { savedTheme = localStorage.getItem(THEME_KEY); } catch (e) {}
  if (savedTheme) applyTheme(savedTheme);

  var fab = $('#themeFab'), panel = $('#themePanel');
  fab.addEventListener('click', function (e) { e.stopPropagation(); panel.classList.toggle('hidden'); });
  document.addEventListener('click', function (e) {
    if (!panel.contains(e.target) && e.target !== fab) panel.classList.add('hidden');
  });
  $$('.theme-opt').forEach(function (o) {
    o.addEventListener('click', function () { applyTheme(o.dataset.theme); panel.classList.add('hidden'); });
  });
  $$('.ds-theme').forEach(function (o) {
    o.addEventListener('click', function () { applyTheme(o.dataset.theme); });
  });

  /* ═══════ AI Vision (Kling AI) ═══════ */
  var AI_BASE = 'https://api.klingai.com';
  var aiKeys = db.aiKeys || {};
  var aiPhotoB64 = null, aiB64Raw = null;

  function b64url(buf) {
    var bin = '';
    var bytes = new Uint8Array(buf);
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function makeJwt(ak, sk) {
    var enc = new TextEncoder();
    var header = b64url(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
    var now = Math.floor(Date.now() / 1000);
    var payload = b64url(enc.encode(JSON.stringify({ iss: ak, exp: now + 1800, nbf: now - 5 })));
    var data = enc.encode(header + '.' + payload);
    return crypto.subtle.importKey('raw', enc.encode(sk), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      .then(function (key) { return crypto.subtle.sign('HMAC', key, data); })
      .then(function (sig) { return header + '.' + payload + '.' + b64url(sig); });
  }
  function aiAuthHeaders() {
    if (aiKeys.key) return Promise.resolve({ 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aiKeys.key });
    return makeJwt(aiKeys.ak, aiKeys.sk).then(function (t) { return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t }; });
  }
  function klingReq(path, method, body) {
    return aiAuthHeaders().then(function (headers) {
      return fetch(AI_BASE + path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined });
    }).then(function (res) { return res.json(); }).then(function (j) {
      if (j.code !== 0) throw new Error(j.message || ('API error ' + j.code));
      return j.data;
    });
  }
  function pollTask(path, taskId, statusEl, done) {
    var tries = 0, start = Date.now();
    var timer = setInterval(function () {
      tries++;
      var secs = Math.round((Date.now() - start) / 1000);
      klingReq(path + '/' + taskId, 'GET').then(function (d) {
        var st = d.task_status;
        if (st === 'succeed') { clearInterval(timer); done(null, d); }
        else if (st === 'failed') { clearInterval(timer); done(d.task_status_msg || 'Task failed', null); }
        else {
          statusEl.textContent = 'Creating… ' + fmtSec(secs) + ' (status: ' + st + ')';
          if (tries >= 90) { clearInterval(timer); done('Timed out after ~15 min', null); }
        }
      }).catch(function (e) { clearInterval(timer); done(e.message, null); });
    }, 10000);
  }
  function fmtSec(s) { var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  function aiHasKeys() { return !!(aiKeys.key || (aiKeys.ak && aiKeys.sk)); }
  function aiStatus(msg) { $('#aiStatus').textContent = msg; }
  function aiKeyStateTxt() { return aiHasKeys() ? (aiKeys.key ? 'API key ✓' : 'AK/SK ✓') : 'not set'; }

  $('#aiDrop').addEventListener('click', function () { $('#aiPhoto').click(); });
  $('#aiPhoto').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    compressImage(f, function (data) {
      if (!data) { aiStatus('Could not read that image.'); return; }
      aiPhotoB64 = data; aiB64Raw = data.split(',')[1];
      $('#aiPrevImg').src = data;
      $('#aiPrevBox').classList.remove('hidden');
      aiStatus('Photo ready ✓');
    });
  });
  $('#aiPrevClear').addEventListener('click', function () {
    aiPhotoB64 = null; aiB64Raw = null;
    $('#aiPrevBox').classList.add('hidden');
    $('#aiPhoto').value = '';
    aiStatus('');
  });
  $('#aiKeyToggle').addEventListener('click', function () { $('#aiKeyBox').classList.toggle('hidden'); });
  $('#aiKeySave').addEventListener('click', function () {
    aiKeys.ak = $('#aiAk').value.trim(); aiKeys.sk = $('#aiSk').value.trim();
    aiKeys.key = $('#aiKey').value.trim();
    if (!aiKeys.ak && !aiKeys.key) aiKeys.sk = '';
    db.aiKeys = aiKeys; save();
    $('#aiKeyState').textContent = aiKeyStateTxt();
    aiStatus(aiHasKeys() ? 'Keys saved ✓' : 'Keys cleared.');
    $('#aiKeyBox').classList.add('hidden');
  });

  function aiGenerate(kind) {
    var prompt = $('#aiPrompt').value.trim();
    if (!prompt) { aiStatus('Describe the self you are becoming first ✍️'); return; }
    if (!aiHasKeys()) { aiStatus('Set your AI service key first ⚙ — tap the key section above'); return; }
    var srcInput = aiB64Raw;
    if (!srcInput) {
      var lastPhoto = (db.aiVision || []).filter(function (v) { return v.kind === 'photo'; })[0];
      if (lastPhoto && lastPhoto.url) srcInput = lastPhoto.url;
    }
    if (!srcInput) { aiStatus(kind === 'video' ? 'Add a photo to animate 📷' : 'Add your photo first 📷'); return; }
    $('#aiBtnPhoto').disabled = true; $('#aiBtnVideo').disabled = true;

    var body, path, pollPath;
    if (kind === 'photo') {
      body = { model_name: 'kling-v1', prompt: prompt, image: srcInput, aspect_ratio: '1:1', mode: 'std' };
      path = '/v1/images/generations'; pollPath = path;
      aiStatus('Sending to Kling AI…');
    } else {
      body = { model_name: 'kling-v1-6', image: srcInput, prompt: prompt, duration: '5', aspect_ratio: '9:16' };
      path = '/v1/videos/image2video'; pollPath = path;
      aiStatus('Sending photo to Kling AI…');
    }

    klingReq(path, 'POST', body).then(function (d) {
      aiStatus(kind === 'photo' ? 'Generating photo… (≈30 s)' : 'Generating video… (5–15 min, you can leave)');
      pollTask(pollPath, d.task_id, $('#aiStatus'), function (err, res) {
        $('#aiBtnPhoto').disabled = false; $('#aiBtnVideo').disabled = false;
        if (err) { aiStatus('❌ ' + err); return; }
        var url = kind === 'photo' ? res.task_result.images[0].url : res.task_result.videos[0].url;
        db.aiVision = db.aiVision || [];
        db.aiVision.unshift({ id: uid(), kind: kind, ts: Date.now(), prompt: prompt, url: url });
        save();
        aiStatus('Done ✓ — links expire in a few hours, download now ↓');
        renderAiResults();
      });
    }).catch(function (e) {
      $('#aiBtnPhoto').disabled = false; $('#aiBtnVideo').disabled = false;
      aiStatus('❌ ' + e.message);
    });
  }
  $('#aiBtnFree').addEventListener('click', function () {
    var prompt = $('#aiPrompt').value.trim();
    if (!prompt) { aiStatus('Describe the self you are becoming first ✍️'); return; }
    $('#aiBtnPhoto').disabled = true; $('#aiBtnFree').disabled = true; $('#aiBtnVideo').disabled = true;
    aiStatus('Generating with free AI (Pollinations)… ~10 s');
    var url = 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt + ', photorealistic portrait, elegant, soft cinematic light') + '?width=768&height=768&nologo=true&seed=' + Math.floor(Math.random() * 1e6);
    var img = new Image();
    img.onload = function () {
      db.aiVision = db.aiVision || [];
      db.aiVision.unshift({ id: uid(), kind: 'photo', ts: Date.now(), prompt: prompt, url: url, source: 'free' });
      save();
      $('#aiBtnPhoto').disabled = false; $('#aiBtnFree').disabled = false; $('#aiBtnVideo').disabled = false;
      aiStatus('Done ✓ — free photo below ↓');
      renderAiResults();
    };
    img.onerror = function () {
      $('#aiBtnPhoto').disabled = false; $('#aiBtnFree').disabled = false; $('#aiBtnVideo').disabled = false;
      aiStatus('❌ Free AI is busy right now — retry, or use ✦ Generate Photo (Kling key).');
    };
    img.src = url;
  });
  $('#aiBtnPhoto').addEventListener('click', function () { aiGenerate('photo'); });
  $('#aiBtnVideo').addEventListener('click', function () { aiGenerate('video'); });

  function renderAiResults() {
    var wrap = $('#aiResults');
    wrap.innerHTML = '';
    if (!db.aiVision || !db.aiVision.length) { wrap.appendChild(el('div', 'empty', 'Your future self will appear here 🪞')); return; }
    db.aiVision.forEach(function (v) {
      var card = el('div', 'card glass ai-result');
      var badgeTxt = v.kind === 'video' ? 'Video' : (v.source === 'free' ? 'Free Photo' : 'Photo');
      card.appendChild(el('span', 'ai-badge ' + (v.source === 'free' ? 'video' : v.kind), badgeTxt));
      if (v.kind === 'photo') {
        var img = document.createElement('img'); img.src = v.url; card.appendChild(img);
      } else {
        var vid = document.createElement('video'); vid.src = v.url; vid.controls = true; vid.playsInline = true; card.appendChild(vid);
      }
      var when = new Date(v.ts).toLocaleString();
      card.appendChild(el('p', 'ai-rl', '“' + v.prompt + '” · ' + when));
      var dl = el('a', 'ai-rl', 'Download ' + (v.kind === 'photo' ? 'photo' : 'video') + ' ↓');
      dl.href = v.url;
      dl.setAttribute('download', 'luminara-future-self-' + v.id + (v.kind === 'photo' ? '.jpg' : '.mp4'));
      dl.addEventListener('click', function (e) {
        e.preventDefault();
        fetch(v.url).then(function (r) { return r.blob(); }).then(function (b) {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(b);
          a.download = 'luminara-future-self-' + v.id + (v.kind === 'photo' ? '.jpg' : '.mp4');
          document.body.appendChild(a); a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
        }).catch(function () { window.open(v.url, '_blank'); });
      });
      card.appendChild(dl);
      wrap.appendChild(card);
    });
  }
  renderAiResults();
  $('#aiKeyState').textContent = aiKeyStateTxt();

  /* ═══════ Affirmation Wallpaper ═══════ */
  var WP_QUOTES = [
    'I am becoming who I am meant to be',
    'Everything I desire is already on its way',
    'I am worthy of my wildest dreams',
    'Abundance flows to me with ease',
    'I trust the timing of my life',
    'Today I choose peace and clarity',
    'I am aligned with the universe',
    'My energy attracts my desires',
    'I release what no longer serves me',
    'Every breath renews my power',
    'I am grateful for this beautiful life',
    'I am enough, exactly as I am',
    'Magic happens when I believe',
    'I radiate confidence and love',
    'My future self is proud of me',
    'I open my heart to endless possibilities'
  ];

  var wpState = {
    preset: 0,
    ratio: 'phone',
    pos: 'center',
    tone: 'light',
    size: 48,
    photo: null,
    textNX: 0.5,
    textNY: 0.5,
    photoScale: 1.0,
    photoOffsetX: 0,
    photoOffsetY: 0,
    activeLayer: 'text', // 'text' | 'photo'
    _dragging: false,
    _dragTarget: null,
    _activeHandle: null,
    _box: null
  };

  var WP_RATIOS = {
    phone: { w: 1080, h: 1920 },
    desktop: { w: 1920, h: 1080 }
  };

  function wpBlob(c, x, y, r, col) {
    var g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  // 确定性伪随机：保证每次重绘（含拖拽）星点位置不抖动
  function wpRand(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function wpStars(c, w, h, n, opts) {
    opts = opts || {};
    for (var i = 0; i < n; i++) {
      var rx = wpRand(i * 3 + 1), ry = wpRand(i * 3 + 2), rb = wpRand(i * 3 + 3);
      var x = rx * w, y = ry * h, rad = rb * 1.7 + 0.5, a = rb * 0.55 + 0.28;
      if (opts.dim) a *= 0.6;
      c.fillStyle = 'rgba(255,255,255,' + a + ')';
      c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fill();
      if (opts.spark && rad > 1.7) {
        c.save(); c.globalAlpha = a * 0.85;
        c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = Math.max(1, rad * 0.45);
        var s = rad * 4.5;
        c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.moveTo(x, y - s); c.lineTo(x, y + s); c.stroke();
        c.restore();
      }
    }
  }
  function wpVignette(c, w, h, amt) {
    var g = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.22, w / 2, h / 2, Math.max(w, h) * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + amt + ')');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }
  var WP_PRESETS = [
    // 1 · Aurora Veil 极光纱幔（浅色）
    function (c, w, h) {
      var g = c.createLinearGradient(0, 0, w * 0.4, h);
      g.addColorStop(0, '#eef7ff'); g.addColorStop(0.55, '#f4f0ff'); g.addColorStop(1, '#fff8ee');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      wpBlob(c, w * 0.5, h * 0.22, w * 0.85, 'rgba(72,216,188,0.40)');
      wpBlob(c, w * 0.3, h * 0.34, w * 0.70, 'rgba(130,150,245,0.34)');
      wpBlob(c, w * 0.72, h * 0.30, w * 0.60, 'rgba(210,130,235,0.30)');
      wpVignette(c, w, h, 0.10);
    },
    // 2 · Midnight Bloom 晨光花瓣（浅色）
    function (c, w, h) {
      var g = c.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, Math.max(w, h) * 0.9);
      g.addColorStop(0, '#ffeef7'); g.addColorStop(1, '#f5eeff');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      wpBlob(c, w * 0.72, h * 0.26, w * 0.70, 'rgba(240,140,195,0.45)');
      wpBlob(c, w * 0.22, h * 0.82, w * 0.60, 'rgba(170,130,235,0.40)');
      wpVignette(c, w, h, 0.10);
    },
    // 3 · Cosmic Drift 晨星流云（浅色）
    function (c, w, h) {
      var g = c.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#eef4ff'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, '#eef1ff');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      wpBlob(c, w * 0.20, h * 0.30, w * 0.50, 'rgba(160,180,255,0.30)');
      wpBlob(c, w * 0.50, h * 0.46, w * 0.55, 'rgba(190,165,245,0.28)');
      wpBlob(c, w * 0.82, h * 0.62, w * 0.50, 'rgba(140,190,255,0.30)');
      wpVignette(c, w, h, 0.10);
    },
    // 4 · Ember Glow 暖阳余晖（浅色）
    function (c, w, h) {
      var g = c.createRadialGradient(w * 0.3, h * 0.9, 0, w * 0.5, h * 0.6, Math.max(w, h));
      g.addColorStop(0, '#fff4e6'); g.addColorStop(1, '#ffe9e2');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      wpBlob(c, w * 0.28, h * 0.86, w * 0.80, 'rgba(255,185,105,0.45)');
      wpBlob(c, w * 0.82, h * 0.20, w * 0.50, 'rgba(255,150,135,0.32)');
      wpVignette(c, w, h, 0.10);
    },
    // 5 · Ocean Depths 浅海波光（浅色）
    function (c, w, h) {
      var g = c.createLinearGradient(0, h, 0, 0);
      g.addColorStop(0, '#e6fffb'); g.addColorStop(1, '#e4f2ff');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      wpBlob(c, w * 0.5, h * 0.64, w * 0.95, 'rgba(88,220,215,0.42)');
      wpBlob(c, w * 0.32, h * 0.30, w * 0.50, 'rgba(110,170,240,0.36)');
      wpVignette(c, w, h, 0.10);
    },
    // 6 · Rose Quartz Night 玫瑰晨光（浅色）
    function (c, w, h) {
      var g = c.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, Math.max(w, h) * 0.85);
      g.addColorStop(0, '#fff0f6'); g.addColorStop(1, '#f7efff');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      wpBlob(c, w * 0.5, h * 0.34, w * 0.85, 'rgba(243,170,205,0.42)');
      wpBlob(c, w * 0.74, h * 0.80, w * 0.50, 'rgba(182,140,230,0.40)');
      wpVignette(c, w, h, 0.10);
    }
  ];

  function wpThumb(preset) {
    var cnv = document.createElement('canvas'); cnv.width = 180; cnv.height = 320;
    WP_PRESETS[preset](cnv.getContext('2d'), 180, 320);
    return cnv;
  }
  function renderWpPresets() {
    var wrap = $('#wpBgs'); if (!wrap) return;
    wrap.innerHTML = '';
    WP_PRESETS.forEach(function (p, i) {
      var btn = document.createElement('button');
      btn.className = 'wp-bg' + (wpState.preset === i && !wpState.photo ? ' active' : '');
      btn.type = 'button'; btn.dataset.preset = i;
      btn.appendChild(wpThumb(i));
      btn.addEventListener('click', function () {
        wpState.preset = i; wpState.photo = null;
        $('#wpPrevBox').classList.add('hidden'); $('#wpPhoto').value = '';
        $('#wpPhotoControls').classList.add('hidden');
        $('#wpLayerPhoto').classList.add('hidden');
        $('#wpResetPhotoBtn').classList.add('hidden');
        setActiveLayer('text');
        $$('.wp-bg').forEach(function (b) { b.classList.toggle('active', +b.dataset.preset === i); });
        renderWallpaper();
      });
      wrap.appendChild(btn);
    });
  }

  function setActiveLayer(layer) {
    wpState.activeLayer = layer;
    var btnT = $('#wpLayerText');
    var btnP = $('#wpLayerPhoto');
    if (btnT) btnT.classList.toggle('active', layer === 'text');
    if (btnP) btnP.classList.toggle('active', layer === 'photo');
    var hint = $('#wpGestureHint');
    if (hint) {
      if (layer === 'photo' && wpState.photo) {
        hint.textContent = '🖼 Photo active: Drag to pan · Pinch, scroll wheel, or use slider to zoom';
      } else {
        hint.textContent = '✦ Text active: Drag to move · Drag corners, pinch, scroll, or use slider to resize';
      }
    }
    renderWallpaper();
  }

  if ($('#wpLayerText')) {
    $('#wpLayerText').addEventListener('click', function () { setActiveLayer('text'); });
  }
  if ($('#wpLayerPhoto')) {
    $('#wpLayerPhoto').addEventListener('click', function () { setActiveLayer('photo'); });
  }

  function loadWpHighResPhoto(file, cb) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        var maxDim = 2560;
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        if (w <= maxDim && h <= maxDim) {
          cb(ev.target.result);
          return;
        }
        var scale = Math.min(maxDim / w, maxDim / h);
        var targetW = Math.round(w * scale);
        var targetH = Math.round(h * scale);
        var c = document.createElement('canvas');
        c.width = targetW; c.height = targetH;
        var ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, targetW, targetH);
        try {
          cb(c.toDataURL('image/jpeg', 0.92));
        } catch (err) {
          cb(ev.target.result);
        }
      };
      img.onerror = function () { cb(null); };
      img.src = ev.target.result;
    };
    reader.onerror = function () { cb(null); };
    reader.readAsDataURL(file);
  }

  $('#wpDrop').addEventListener('click', function () { $('#wpPhoto').click(); });
  $('#wpPhoto').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    loadWpHighResPhoto(f, function (data) {
      if (!data) return;
      wpState.photo = data;
      wpState.photoScale = 1.0;
      wpState.photoOffsetX = 0;
      wpState.photoOffsetY = 0;
      $('#wpPrevImg').src = data;
      $('#wpPrevBox').classList.remove('hidden');
      $('#wpPhotoControls').classList.remove('hidden');
      $('#wpLayerPhoto').classList.remove('hidden');
      $('#wpResetPhotoBtn').classList.remove('hidden');
      $$('.wp-bg').forEach(function (b) { b.classList.remove('active'); });
      updateWpPhotoControls();
      setActiveLayer('photo');
      renderWallpaper();
      saveWpSettings();
    });
  });

  $('#wpPrevClear').addEventListener('click', function () {
    wpState.photo = null;
    wpState.photoScale = 1.0;
    wpState.photoOffsetX = 0;
    wpState.photoOffsetY = 0;
    $('#wpPrevBox').classList.add('hidden');
    $('#wpPhoto').value = '';
    $('#wpPhotoControls').classList.add('hidden');
    $('#wpLayerPhoto').classList.add('hidden');
    $('#wpResetPhotoBtn').classList.add('hidden');
    setActiveLayer('text');
    renderWpPresets();
    renderWallpaper();
    saveWpSettings();
  });

  $('#wpShuffle').addEventListener('click', function () {
    $('#wpText').value = WP_QUOTES[Math.floor(Math.random() * WP_QUOTES.length)];
    renderWallpaper();
  });
  $('#wpText').addEventListener('input', renderWallpaper);

  $$('.wp-ratio').forEach(function (b) {
    b.addEventListener('click', function () {
      wpState.ratio = b.dataset.ratio;
      $$('.wp-ratio').forEach(function (x) { x.classList.toggle('active', x === b); });
      renderWallpaper();
      saveWpSettings();
    });
  });

  $$('.wp-pos').forEach(function (b) {
    b.addEventListener('click', function () {
      wpState.pos = b.dataset.pos;
      $$('.wp-pos').forEach(function (x) { x.classList.toggle('active', x === b); });
      if (b.dataset.pos === 'top') { wpState.textNX = 0.5; wpState.textNY = 0.18; }
      else if (b.dataset.pos === 'bottom') { wpState.textNX = 0.5; wpState.textNY = 0.72; }
      else { wpState.textNX = 0.5; wpState.textNY = 0.5; }
      renderWallpaper();
      saveWpSettings();
    });
  });

  $$('.wp-tone').forEach(function (b) {
    b.addEventListener('click', function () {
      wpState.tone = b.dataset.tone;
      $$('.wp-tone').forEach(function (x) { x.classList.toggle('active', x === b); });
      renderWallpaper();
      saveWpSettings();
    });
  });

  function updateWpSizeControls() {
    var sz = Math.round(wpState.size);
    var input = $('#wpSize'); if (input) input.value = sz;
    var badge = $('#wpSizeVal'); if (badge) badge.textContent = sz + 'px';
  }

  function updateWpPhotoControls() {
    var pct = Math.round(wpState.photoScale * 100);
    var input = $('#wpPhotoZoom'); if (input) input.value = pct;
    var badge = $('#wpPhotoZoomVal'); if (badge) badge.textContent = pct + '%';
  }

  $('#wpSize').addEventListener('input', function () {
    wpState.size = +this.value;
    updateWpSizeControls();
    renderWallpaper();
    saveWpSettings();
  });

  if ($('#wpSizeMinus')) {
    $('#wpSizeMinus').addEventListener('click', function () {
      wpState.size = Math.max(20, wpState.size - 4);
      updateWpSizeControls();
      renderWallpaper();
      saveWpSettings();
    });
  }
  if ($('#wpSizePlus')) {
    $('#wpSizePlus').addEventListener('click', function () {
      wpState.size = Math.min(100, wpState.size + 4);
      updateWpSizeControls();
      renderWallpaper();
      saveWpSettings();
    });
  }

  if ($('#wpPhotoZoom')) {
    $('#wpPhotoZoom').addEventListener('input', function () {
      wpState.photoScale = (+this.value) / 100;
      updateWpPhotoControls();
      renderWallpaper();
      saveWpSettings();
    });
  }
  if ($('#wpZoomMinus')) {
    $('#wpZoomMinus').addEventListener('click', function () {
      wpState.photoScale = Math.max(0.3, wpState.photoScale - 0.1);
      updateWpPhotoControls();
      renderWallpaper();
      saveWpSettings();
    });
  }
  if ($('#wpZoomPlus')) {
    $('#wpZoomPlus').addEventListener('click', function () {
      wpState.photoScale = Math.min(3.5, wpState.photoScale + 0.1);
      updateWpPhotoControls();
      renderWallpaper();
      saveWpSettings();
    });
  }

  if ($('#wpFitPhoto')) {
    $('#wpFitPhoto').addEventListener('click', function () {
      if (!wpImgCache) return;
      var ratio = WP_RATIOS[wpState.ratio];
      var ir = wpImgCache.width / wpImgCache.height, cr = ratio.w / ratio.h;
      var fitScale = (ir > cr) ? (cr / ir) : (ir / cr);
      wpState.photoScale = Math.max(0.3, Math.min(1.0, fitScale));
      wpState.photoOffsetX = 0;
      wpState.photoOffsetY = 0;
      updateWpPhotoControls();
      renderWallpaper();
      saveWpSettings();
    });
  }
  if ($('#wpFillPhoto')) {
    $('#wpFillPhoto').addEventListener('click', function () {
      wpState.photoScale = 1.0;
      wpState.photoOffsetX = 0;
      wpState.photoOffsetY = 0;
      updateWpPhotoControls();
      renderWallpaper();
      saveWpSettings();
    });
  }
  function resetPhotoTransform() {
    wpState.photoScale = 1.0;
    wpState.photoOffsetX = 0;
    wpState.photoOffsetY = 0;
    updateWpPhotoControls();
    renderWallpaper();
    saveWpSettings();
  }
  if ($('#wpResetPhoto')) $('#wpResetPhoto').addEventListener('click', resetPhotoTransform);
  if ($('#wpResetPhotoBtn')) $('#wpResetPhotoBtn').addEventListener('click', resetPhotoTransform);

  /* ---- Persistence ---- */
  function saveWpSettings() {
    try {
      localStorage.setItem('luminara_wp_settings', JSON.stringify({
        textNX: wpState.textNX,
        textNY: wpState.textNY,
        size: wpState.size,
        photoScale: wpState.photoScale,
        photoOffsetX: wpState.photoOffsetX,
        photoOffsetY: wpState.photoOffsetY,
        ratio: wpState.ratio,
        tone: wpState.tone
      }));
    } catch (e) {}
  }
  (function () {
    try {
      var s = JSON.parse(localStorage.getItem('luminara_wp_settings') || 'null');
      if (s) {
        if (typeof s.textNX === 'number') wpState.textNX = s.textNX;
        if (typeof s.textNY === 'number') wpState.textNY = s.textNY;
        if (typeof s.size === 'number') wpState.size = s.size;
        if (typeof s.photoScale === 'number') wpState.photoScale = s.photoScale;
        if (typeof s.photoOffsetX === 'number') wpState.photoOffsetX = s.photoOffsetX;
        if (typeof s.photoOffsetY === 'number') wpState.photoOffsetY = s.photoOffsetY;
        if (s.ratio && WP_RATIOS[s.ratio]) wpState.ratio = s.ratio;
        if (s.tone) wpState.tone = s.tone;
      }
    } catch (e) {}
  })();

  /* ---- Interactive Canvas (Direct Mouse & Touch Gestures) ---- */
  var wpCanvas = $('#wpCanvas');
  var wpCanvasWrap = $('#wpCanvasWrap');
  var wpCanvasInlineInput = $('#wpCanvasInlineInput');
  var wpIsEditingInline = false;

  function wpOpenInlineEditor() {
    if (!wpCanvasInlineInput || !wpCanvas || !wpState._box) return;
    var b = wpState._box;
    var ratio = WP_RATIOS[wpState.ratio];
    var rect = wpCanvas.getBoundingClientRect();
    var wrapRect = wpCanvasWrap ? wpCanvasWrap.getBoundingClientRect() : rect;

    var scale = rect.width / ratio.w;
    var textVal = $('#wpText') ? $('#wpText').value : '';

    // Calculate position relative to wpCanvasWrap
    var leftInCanvas = b.x * scale;
    var topInCanvas = b.y * scale;
    var widthInCanvas = Math.max(160, Math.min(rect.width * 0.94, b.w * scale + 24));
    var heightInCanvas = Math.max(60, b.h * scale + 20);

    var offsetLeft = (rect.left - wrapRect.left) + (b.cx * scale) - (widthInCanvas / 2);
    var offsetTop = (rect.top - wrapRect.top) + (b.cy * scale) - (heightInCanvas / 2);

    // Keep within bounds
    offsetLeft = Math.max(8, Math.min(wrapRect.width - widthInCanvas - 8, offsetLeft));
    offsetTop = Math.max(8, Math.min(wrapRect.height - heightInCanvas - 8, offsetTop));

    var fontSize = Math.max(14, Math.round(b.px * scale * 0.95));

    wpCanvasInlineInput.style.left = offsetLeft + 'px';
    wpCanvasInlineInput.style.top = offsetTop + 'px';
    wpCanvasInlineInput.style.width = widthInCanvas + 'px';
    wpCanvasInlineInput.style.minHeight = heightInCanvas + 'px';
    wpCanvasInlineInput.style.fontSize = fontSize + 'px';
    wpCanvasInlineInput.value = textVal;

    wpCanvasInlineInput.classList.remove('hidden');
    wpIsEditingInline = true;
    wpCanvasInlineInput.focus();
    wpCanvasInlineInput.select();
  }

  function wpCloseInlineEditor(save) {
    if (!wpIsEditingInline || !wpCanvasInlineInput) return;
    if (save !== false) {
      var newVal = wpCanvasInlineInput.value;
      var ta = $('#wpText');
      if (ta) {
        ta.value = newVal;
        renderWallpaper();
      }
    }
    wpCanvasInlineInput.classList.add('hidden');
    wpIsEditingInline = false;
  }

  if (wpCanvasInlineInput) {
    wpCanvasInlineInput.addEventListener('input', function () {
      var ta = $('#wpText');
      if (ta) {
        ta.value = this.value;
        renderWallpaper();
      }
    });
    wpCanvasInlineInput.addEventListener('blur', function () {
      wpCloseInlineEditor(true);
    });
    wpCanvasInlineInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        wpCloseInlineEditor(false);
        renderWallpaper();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        wpCloseInlineEditor(true);
      }
    });
  }

  function wpCanvasPoint(clientX, clientY) {
    var ratio = WP_RATIOS[wpState.ratio];
    var rect = wpCanvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * ratio.w,
      y: ((clientY - rect.top) / rect.height) * ratio.h
    };
  }

  var WP_SNAP = 0.035;
  function wpSnap(v) {
    var targets = [1 / 3, 0.5, 2 / 3];
    for (var i = 0; i < targets.length; i++) {
      if (Math.abs(v - targets[i]) < WP_SNAP) return targets[i];
    }
    return null;
  }

  function wpHitTest(p) {
    if (wpState._box) {
      var b = wpState._box;
      var handleHitR = Math.max(45, b.px * 0.65);
      var corners = [
        { id: 'tl', x: b.x, y: b.y },
        { id: 'tr', x: b.x + b.w, y: b.y },
        { id: 'br', x: b.x + b.w, y: b.y + b.h },
        { id: 'bl', x: b.x, y: b.y + b.h }
      ];
      for (var i = 0; i < corners.length; i++) {
        var c = corners[i];
        if (Math.hypot(p.x - c.x, p.y - c.y) <= handleHitR) {
          return { target: 'text-handle', handle: c.id, box: b };
        }
      }
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) {
        return { target: 'text', box: b };
      }
    }
    if (wpState.photo) {
      return { target: 'photo' };
    }
    return { target: 'text' };
  }

  // Update canvas hover cursor
  wpCanvas.addEventListener('pointermove', function (e) {
    if (!wpState._dragging && wpActivePointers.size === 0) {
      var p = wpCanvasPoint(e.clientX, e.clientY);
      var hit = wpHitTest(p);
      if (hit.target === 'text-handle') {
        wpCanvas.style.cursor = (hit.handle === 'tl' || hit.handle === 'br') ? 'nwse-resize' : 'nesw-resize';
      } else if (hit.target === 'text') {
        wpCanvas.style.cursor = 'move';
      } else if (wpState.photo) {
        wpCanvas.style.cursor = 'grab';
      } else {
        wpCanvas.style.cursor = 'default';
      }
    }
  });

  // Pointer tracking & multi-touch pinch state
  var wpActivePointers = new Map();
  var wpDragStartData = null;
  var wpPinchStart = null;
  var wpPointerDownMeta = null;

  wpCanvas.addEventListener('pointerdown', function (e) {
    wpActivePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (wpActivePointers.size === 1) {
      var p = wpCanvasPoint(e.clientX, e.clientY);
      var ratio = WP_RATIOS[wpState.ratio];
      var hit = wpHitTest(p);

      wpPointerDownMeta = {
        startX: e.clientX,
        startY: e.clientY,
        time: Date.now(),
        target: hit.target,
        handle: hit.handle || null,
        box: hit.box || null,
        moved: false
      };

      wpState._dragging = true;
      wpState._dragTarget = hit.target;
      wpState._activeHandle = hit.handle || null;

      if (hit.target === 'text-handle') {
        wpCanvas.classList.add('resizing');
        wpDragStartData = {
          initP: p,
          initSize: wpState.size,
          cx: hit.box.cx,
          cy: hit.box.cy,
          initDist: Math.hypot(p.x - hit.box.cx, p.y - hit.box.cy) || 1
        };
        setActiveLayer('text');
      } else if (hit.target === 'text') {
        wpCanvas.classList.add('dragging');
        wpDragStartData = {
          offX: p.x - wpState.textNX * ratio.w,
          offY: p.y - wpState.textNY * ratio.h
        };
        setActiveLayer('text');
      } else if (hit.target === 'photo') {
        wpCanvas.classList.add('dragging');
        wpDragStartData = {
          startP: p,
          startOffX: wpState.photoOffsetX,
          startOffY: wpState.photoOffsetY,
          rw: ratio.w,
          rh: ratio.h
        };
        setActiveLayer('photo');
      }

      if (wpCanvas.setPointerCapture) {
        try { wpCanvas.setPointerCapture(e.pointerId); } catch (_) {}
      }
    } else if (wpActivePointers.size === 2) {
      // 2-finger Pinch to zoom
      var pts = Array.from(wpActivePointers.values());
      var dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      wpPinchStart = {
        dist: dist || 1,
        initSize: wpState.size,
        initPhotoScale: wpState.photoScale,
        layer: wpState.activeLayer
      };
    }

    e.preventDefault();
    renderWallpaper();
  });

  wpCanvas.addEventListener('pointermove', function (e) {
    if (!wpActivePointers.has(e.pointerId)) return;
    wpActivePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (wpPointerDownMeta) {
      var distMove = Math.hypot(e.clientX - wpPointerDownMeta.startX, e.clientY - wpPointerDownMeta.startY);
      if (distMove > 6) {
        wpPointerDownMeta.moved = true;
      }
    }

    // Handle 2-finger pinch
    if (wpActivePointers.size === 2 && wpPinchStart) {
      var pts = Array.from(wpActivePointers.values());
      var dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      var pinchFactor = dist / wpPinchStart.dist;

      if (wpPinchStart.layer === 'photo' && wpState.photo) {
        wpState.photoScale = Math.max(0.3, Math.min(3.5, wpPinchStart.initPhotoScale * pinchFactor));
        updateWpPhotoControls();
      } else {
        wpState.size = Math.round(Math.max(20, Math.min(100, wpPinchStart.initSize * pinchFactor)));
        updateWpSizeControls();
      }
      renderWallpaper();
      return;
    }

    if (!wpState._dragging || !wpDragStartData) return;
    var p = wpCanvasPoint(e.clientX, e.clientY);
    var ratio = WP_RATIOS[wpState.ratio];

    if (wpState._dragTarget === 'text-handle') {
      var currDist = Math.hypot(p.x - wpDragStartData.cx, p.y - wpDragStartData.cy);
      var factor = currDist / wpDragStartData.initDist;
      wpState.size = Math.round(Math.max(20, Math.min(100, wpDragStartData.initSize * factor)));
      updateWpSizeControls();
      renderWallpaper();
    } else if (wpState._dragTarget === 'text') {
      var nx = (p.x - wpDragStartData.offX) / ratio.w;
      var ny = (p.y - wpDragStartData.offY) / ratio.h;
      var sx = wpSnap(nx), sy = wpSnap(ny);
      if (sx !== null) nx = sx;
      if (sy !== null) ny = sy;
      wpState.textNX = Math.max(0.04, Math.min(0.96, nx));
      wpState.textNY = Math.max(0.04, Math.min(0.96, ny));
      renderWallpaper();
    } else if (wpState._dragTarget === 'photo') {
      var dx = (p.x - wpDragStartData.startP.x) / wpDragStartData.rw;
      var dy = (p.y - wpDragStartData.startP.y) / wpDragStartData.rh;
      wpState.photoOffsetX = Math.max(-1.5, Math.min(1.5, wpDragStartData.startOffX + dx));
      wpState.photoOffsetY = Math.max(-1.5, Math.min(1.5, wpDragStartData.startOffY + dy));
      renderWallpaper();
    }
  });

  function wpEndPointer(e) {
    var wasClick = false;
    if (wpPointerDownMeta && !wpPointerDownMeta.moved && (Date.now() - wpPointerDownMeta.time < 500)) {
      wasClick = true;
      if (wpPointerDownMeta.target === 'text') {
        setTimeout(function () {
          wpOpenInlineEditor();
        }, 10);
      }
    }
    wpPointerDownMeta = null;

    wpActivePointers.delete(e.pointerId);
    if (wpActivePointers.size === 0) {
      wpState._dragging = false;
      wpState._dragTarget = null;
      wpState._activeHandle = null;
      wpDragStartData = null;
      wpPinchStart = null;
      wpCanvas.classList.remove('dragging', 'resizing');
      renderWallpaper();
      saveWpSettings();
    }
  }

  wpCanvas.addEventListener('pointerup', wpEndPointer);
  wpCanvas.addEventListener('pointercancel', wpEndPointer);
  wpCanvas.addEventListener('pointerleave', function (e) {
    if (wpActivePointers.size === 0) wpEndPointer(e);
  });

  // Mouse wheel zoom on canvas
  wpCanvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    var delta = e.deltaY < 0 ? 1 : -1;
    var p = wpCanvasPoint(e.clientX, e.clientY);
    var hit = wpHitTest(p);

    if (hit.target === 'photo' || (wpState.activeLayer === 'photo' && wpState.photo)) {
      var factor = delta > 0 ? 1.08 : 0.92;
      wpState.photoScale = Math.max(0.3, Math.min(3.5, wpState.photoScale * factor));
      updateWpPhotoControls();
      setActiveLayer('photo');
    } else {
      wpState.size = Math.max(20, Math.min(100, wpState.size + delta * 2));
      updateWpSizeControls();
      setActiveLayer('text');
    }
    renderWallpaper();
    saveWpSettings();
  }, { passive: false });

  $('#wpResetPos').addEventListener('click', function () {
    wpState.textNX = 0.5; wpState.textNY = 0.5;
    renderWallpaper(); saveWpSettings();
  });

  /* ---- Scaled Cover Rendering for Uploaded Image ---- */
  function drawCoverScaled(c, img, w, h, scale, offX, offY) {
    var ir = img.width / img.height, cr = w / h;
    var baseW, baseH;
    if (ir > cr) {
      baseH = h;
      baseW = baseH * ir;
    } else {
      baseW = w;
      baseH = baseW / ir;
    }
    var drawW = baseW * (scale || 1.0);
    var drawH = baseH * (scale || 1.0);
    var drawX = (w - drawW) / 2 + ((offX || 0) * w);
    var drawY = (h - drawH) / 2 + ((offY || 0) * h);

    c.save();
    c.fillStyle = '#000000';
    c.fillRect(0, 0, w, h);
    c.beginPath();
    c.rect(0, 0, w, h);
    c.clip();
    c.drawImage(img, drawX, drawY, drawW, drawH);
    c.restore();
  }

  /* ---- Render Text & Interactive Overlays ---- */
  function drawWpText(c, ratio, forExport) {
    var text = $('#wpText').value.trim();
    var w = ratio.w, h = ratio.h;
    if (!wpState.photo) {
      var scrim = c.createLinearGradient(0, 0, 0, h);
      scrim.addColorStop(0, 'rgba(0,0,0,0.10)');
      scrim.addColorStop(0.5, 'rgba(0,0,0,0.24)');
      scrim.addColorStop(1, 'rgba(0,0,0,0.10)');
      c.fillStyle = scrim; c.fillRect(0, 0, w, h);
    }

    if (!text) { wpState._box = null; return; }

    var px = Math.round(wpState.size * (w / 1080));
    c.font = '600 ' + px + 'px "Cinzel", "Georgia", serif';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    var maxW = w * 0.82;
    var words = text.split(/\s+/), lines = [], cur = '';
    words.forEach(function (wd) {
      var t = cur ? cur + ' ' + wd : wd;
      if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = wd; }
      else cur = t;
    });
    if (cur) lines.push(cur);

    var maxLineWidth = 0;
    lines.forEach(function (ln) {
      var mw = c.measureText(ln).width;
      if (mw > maxLineWidth) maxLineWidth = mw;
    });
    if (maxLineWidth === 0) maxLineWidth = maxW * 0.6;

    var lh = px * 1.35, total = lines.length * lh;
    var cx = wpState.textNX * w, cy = wpState.textNY * h;
    var y0 = cy - total / 2;
    var fill = wpState.tone === 'light' ? '#ffffff' : '#241a3a';

    lines.forEach(function (ln, i) {
      var y = y0 + i * lh + lh / 2;
      if (wpState.tone === 'light') {
        c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = px * 0.12; c.strokeText(ln, cx, y);
      }
      c.fillStyle = fill;
      c.shadowColor = wpState.tone === 'light' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.25)';
      c.shadowBlur = px * 0.25;
      c.fillText(ln, cx, y);
      c.shadowBlur = 0;
    });

    var pad = px * 0.35;
    wpState._box = {
      x: cx - maxLineWidth / 2 - pad,
      y: y0 - pad,
      w: maxLineWidth + pad * 2,
      h: total + pad * 2,
      cx: cx,
      cy: cy,
      px: px
    };

    if (!forExport) {
      if (wpState._dragging) {
        wpDrawGuides(c, ratio);
      }
      if (wpState.activeLayer === 'text' || wpState._dragging) {
        c.save();
        c.strokeStyle = 'rgba(255,255,255,0.92)';
        c.lineWidth = Math.max(3, px * 0.05);
        c.setLineDash([px * 0.24, px * 0.18]);
        c.strokeRect(wpState._box.x, wpState._box.y, wpState._box.w, wpState._box.h);
        c.setLineDash([]);

        // 4 corner handles
        var handleR = Math.max(16, px * 0.28);
        var corners = [
          [wpState._box.x, wpState._box.y],
          [wpState._box.x + wpState._box.w, wpState._box.y],
          [wpState._box.x + wpState._box.w, wpState._box.y + wpState._box.h],
          [wpState._box.x, wpState._box.y + wpState._box.h]
        ];
        corners.forEach(function (pt) {
          c.fillStyle = '#ffffff';
          c.strokeStyle = '#9a63d2';
          c.lineWidth = Math.max(3, px * 0.06);
          c.beginPath();
          c.arc(pt[0], pt[1], handleR, 0, Math.PI * 2);
          c.fill();
          c.stroke();
        });
        c.restore();
      }
    }
  }

  function wpDrawGuides(c, ratio) {
    var w = ratio.w, h = ratio.h;
    var xs = [1 / 3, 0.5, 2 / 3], ys = [1 / 3, 0.5, 2 / 3];
    function line(x1, y1, x2, y2, active) {
      c.setLineDash([]);
      c.lineWidth = active ? Math.max(4, w * 0.003) : Math.max(2.5, w * 0.0018);
      c.strokeStyle = 'rgba(0,0,0,0.32)'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      c.strokeStyle = active ? 'rgba(130,240,180,0.98)' : 'rgba(255,255,255,0.55)';
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    }
    xs.forEach(function (gx) { line(gx * w, 0, gx * w, h, Math.abs(wpState.textNX - gx) < 0.002); });
    ys.forEach(function (gy) { line(0, gy * h, w, gy * h, Math.abs(wpState.textNY - gy) < 0.002); });
    c.setLineDash([]);
  }

  var wpImgCache = null, wpImgSrc = null;
  function renderWallpaper(forExport) {
    var ratio = WP_RATIOS[wpState.ratio];
    var cnv = $('#wpCanvas');
    if (!cnv) return;
    cnv.width = ratio.w; cnv.height = ratio.h;
    cnv.style.aspectRatio = ratio.w + ' / ' + ratio.h;
    var c = cnv.getContext('2d');

    function paint() {
      if (wpState.photo) {
        if (wpImgCache) {
          drawCoverScaled(c, wpImgCache, ratio.w, ratio.h, wpState.photoScale, wpState.photoOffsetX, wpState.photoOffsetY);
        }
      } else {
        WP_PRESETS[wpState.preset](c, ratio.w, ratio.h);
      }
      drawWpText(c, ratio, !!forExport);
    }

    if (wpState.photo) {
      if (wpImgCache && wpImgSrc === wpState.photo) {
        paint();
      } else {
        var img = new Image();
        img.onload = function () {
          wpImgCache = img;
          wpImgSrc = wpState.photo;
          paint();
        };
        img.src = wpState.photo;
      }
    } else {
      paint();
    }
  }

  var wpExportBtn = $('#wpExport');
  if (wpExportBtn) {
    wpExportBtn.addEventListener('click', function () {
      // 1. Render clean canvas without UI selection boxes or handles
      renderWallpaper(true);
      var cnv = $('#wpCanvas');
      if (!cnv) return;

      var fileName = 'luminara-affirmation-' + (wpState.ratio || '9:16') + '.png';
      var dataUrl = cnv.toDataURL('image/png');

      // 2. Restore interactive editing state
      renderWallpaper(false);

      // 3. Immediately & directly trigger download in background
      var a = document.createElement('a');
      a.href = dataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        a.remove();
      }, 800);
    });
  }

  /* Studio Tab Switcher (Mobile) */
  function switchToWpTab(tabName) {
    $$('.wp-studio-tab').forEach(function (t) { t.classList.toggle('active', t.dataset.wptab === tabName); });
    var panelMap = {
      bg: '#wpPanelBg',
      quote: '#wpPanelQuote',
      style: '#wpPanelStyle'
    };
    $$('.wp-tab-panel').forEach(function (p) { p.classList.remove('active'); });
    var activePanel = $(panelMap[tabName]);
    if (activePanel) activePanel.classList.add('active');
  }

  $$('.wp-studio-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      switchToWpTab(this.dataset.wptab);
    });
  });

  /* Quick Upload Button (Top Left of Preview Editor) */
  var wpQuickUploadBtn = $('#wpQuickUploadBtn');
  if (wpQuickUploadBtn) {
    wpQuickUploadBtn.addEventListener('click', function () {
      var fileInput = $('#wpPhoto');
      if (fileInput) fileInput.click();
    });
  }

  /* Quick Presets Button (Top Right of Preview Editor) */
  var wpQuickPresetBtn = $('#wpQuickPresetBtn');
  if (wpQuickPresetBtn) {
    wpQuickPresetBtn.addEventListener('click', function () {
      switchToWpTab('bg');
      var bgPanel = $('#wpBgs');
      if (bgPanel) {
        bgPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  renderWpPresets();
  $('#wpText').value = WP_QUOTES[0];
  updateWpSizeControls();
  updateWpPhotoControls();
  renderWallpaper();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { renderWallpaper(); });

  /* ═══════ AI Avatar Speaker ═══════ */
  var AV_PRESETS = [
    { ico: '👩', name: 'Warm Woman', prompt: 'portrait of a warm, friendly woman in her 30s with soft brown hair and kind brown eyes, gentle smile, soft studio light' },
    { ico: '👨', name: 'Kind Man', prompt: 'portrait of a kind, wise man in his 40s with short dark hair and a gentle smile, warm lighting' },
    { ico: '🧑', name: 'Peaceful Guide', prompt: 'portrait of a calm, serene person with a peaceful expression, soft natural light' },
    { ico: '👵', name: 'Elder Sage', prompt: 'portrait of a wise elderly woman with silver hair and sparkling eyes, sage energy, soft light' },
    { ico: '🧕', name: 'Cosmic Muse', prompt: 'portrait of a mystical woman with flowing hair and luminous eyes, ethereal glow' },
    { ico: '🧔', name: 'Strong Mentor', prompt: 'portrait of a confident mentor with a reassuring smile, cinematic light' }
  ];
  var AV_BASE = 'https://image.pollinations.ai/prompt/';
  var avStateImg = db.avatarImg || null;

  function avPollUrl(prompt) {
    return AV_BASE + encodeURIComponent(prompt + ', photorealistic portrait, upper body') + '?width=512&height=512&nologo=true&seed=' + Math.floor(Math.random() * 100000);
  }
  function renderAvPresets() {
    var wrap = $('#avPresets'); wrap.innerHTML = '';
    AV_PRESETS.forEach(function (p, i) {
      var b = document.createElement('button');
      b.className = 'av-preset'; b.type = 'button'; b.dataset.i = i;
      b.innerHTML = '<span class="ap-ico">' + p.ico + '</span>' + p.name;
      b.addEventListener('click', function () {
        $('#avPrompt').value = p.prompt;
        $$('.av-preset').forEach(function (x) { x.classList.toggle('active', x === b); });
      });
      wrap.appendChild(b);
    });
  }
  function setAvImg(src, label) {
    avStateImg = src;
    db.avatarImg = src; save();
    $('#avImg').src = src;
    $('#avState').textContent = label || 'Your avatar is ready ✨ Press ▶ Speak It';
  }
  $('#avGen').addEventListener('click', function () {
    var p = $('#avPrompt').value.trim();
    if (!p) { $('#avState').textContent = 'Pick a preset or describe your avatar first ✍️'; return; }
    $('#avState').textContent = 'Creating your avatar… (free AI, ~10 s)';
    setAvImg(avPollUrl(p), 'Your avatar is ready ✨ Press ▶ Speak It');
  });
  $('#avUsePhoto').addEventListener('click', function () { $('#avPhoto').click(); });
  $('#avPhoto').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    compressImage(f, function (data) {
      if (!data) return;
      setAvImg(data, 'Using your photo — press ▶ Speak It');
    });
  });

  var avVoices = [];
  function fillVoices() {
    if (!window.speechSynthesis) return;
    avVoices = window.speechSynthesis.getVoices().filter(function (v) { return /^en/i.test(v.lang); });
    var sel = $('#avVoice'); sel.innerHTML = '';
    if (!avVoices.length) {
      var d = document.createElement('option'); d.value = -1; d.textContent = 'Default voice'; sel.appendChild(d); return;
    }
    avVoices.forEach(function (v, i) {
      var o = document.createElement('option'); o.value = i; o.textContent = v.name.replace(/Microsoft |Google |Natural /g, '');
      sel.appendChild(o);
    });
  }
  if (window.speechSynthesis) {
    fillVoices();
    window.speechSynthesis.onvoiceschanged = fillVoices;
  }
  function avStopTalk() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    $('#avFace').classList.remove('talking');
    $('#avState').textContent = 'Stopped. Press ▶ Speak It to hear it again.';
  }
  $('#avStop').addEventListener('click', avStopTalk);
  $('#avSpeak').addEventListener('click', function () {
    if (!window.speechSynthesis) { $('#avState').textContent = 'Speech is not supported on this device.'; return; }
    var text = $('#avText').value.trim();
    if (!text) { $('#avState').textContent = 'Write an affirmation to speak first ✍️'; return; }
    if (!avStateImg) { $('#avState').textContent = 'Generate your avatar first — see step 1 ✨'; return; }
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    var vi = $('#avVoice').value;
    if (avVoices[vi]) u.voice = avVoices[vi];
    u.rate = 0.95; u.pitch = 1.0;
    u.onstart = function () { $('#avFace').classList.add('talking'); $('#avState').textContent = 'Speaking… your guide is with you ✨'; };
    u.onend = function () { $('#avFace').classList.remove('talking'); $('#avState').textContent = 'Done. That affirmation is now yours. ✨'; };
    u.onerror = function () { $('#avFace').classList.remove('talking'); };
    window.speechSynthesis.speak(u);
  });
  $('#avShuffle').addEventListener('click', function () {
    $('#avText').value = WP_QUOTES[Math.floor(Math.random() * WP_QUOTES.length)];
  });

  renderAvPresets();
  if (avStateImg) { $('#avImg').src = avStateImg; $('#avState').textContent = 'Your avatar is ready ✨ Press ▶ Speak It'; }
  $('#avText').value = WP_QUOTES[0];

  /* ═══════ Saved Inspiration (collect from any app) ═══════ */
  function renderSaved() {
    var wrap = $('#savedList');
    wrap.innerHTML = '';
    if (!db.saved || !db.saved.length) {
      wrap.appendChild(el('div', 'empty', 'Nothing saved yet — share or paste something inspiring ✨'));
      return;
    }
    db.saved.forEach(function (s) {
      var item = el('div', 'list-item');
      var mid = el('div', 'grow');
      if (s.title) mid.appendChild(el('div', 'title', s.title));
      var isLink = s.link || /^https?:\/\//i.test(s.text);
      if (isLink) {
        var a = document.createElement('a');
        a.className = 'saved-link';
        a.href = s.link || s.text;
        a.target = '_blank'; a.rel = 'noopener';
        a.textContent = s.link || s.text;
        mid.appendChild(a);
      } else {
        mid.appendChild(el('div', 'title', s.text));
      }
      var when = new Date(s.ts).toLocaleDateString();
      mid.appendChild(el('div', 'meta', (s.from === 'share' ? '🔗 Shared' : '🔖 Saved') + ' · ' + when));
      var delBtn = el('button', 'icon-btn', '✕');
      delBtn.title = 'Remove';
      delBtn.addEventListener('click', function () {
        db.saved = db.saved.filter(function (x) { return x.id !== s.id; });
        save(); renderSaved();
      });
      item.appendChild(mid); item.appendChild(delBtn);
      wrap.appendChild(item);
    });
  }
  function addSaved(text, title, from) {
    text = (text || '').trim();
    if (!text) return;
    db.saved = db.saved || [];
    db.saved.unshift({
      id: uid(),
      text: text,
      title: (title || '').trim(),
      link: /^https?:\/\//i.test(text) ? text : '',
      ts: Date.now(),
      from: from || 'paste'
    });
    save(); renderSaved();
  }
  $('#savedAdd').addEventListener('click', function () {
    var text = $('#savedInput').value.trim();
    if (!text) { $('#savedInput').focus(); return; }
    addSaved(text, $('#savedTitle').value);
    $('#savedInput').value = ''; $('#savedTitle').value = '';
  });
  $('#savedInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#savedAdd').click(); }
  });
  function handleShared() {
    try {
      var q = new URLSearchParams(location.search);
      var text = (q.get('text') || '').trim();
      var title = (q.get('title') || '').trim();
      var url = (q.get('url') || '').trim();
      var content = text || url || '';
      if (!content) return;
      addSaved(content, title, 'share');
      goTab('tab-saved');
    } catch (e) {}
  }
  renderSaved();
  handleShared();

  /* ═══════ Manifest Song (Web Audio, zero cost) ═══════ */
  var SONG_STYLES = {
    calm:      { bpm: 72, wave: 'sine',     vol: 0.30, chords: [['C3','G3','E4'],['A2','E3','C4'],['F2','C3','A3'],['G2','D3','B3']] },
    uplifting: { bpm: 98, wave: 'triangle', vol: 0.26, chords: [['C3','E3','G3'],['G2','B2','D3'],['A2','C3','E3'],['F2','A2','C3']] },
    dreamy:    { bpm: 62, wave: 'sine',     vol: 0.28, chords: [['A2','E3','C4'],['F2','C3','A3'],['C3','G3','E4'],['G2','D3','B3']] }
  };
  var SONG_THEMES = {
    abundance: { ico: '💎', obj: 'abundance', img: 'golden light', affirms: ['I am worthy of every gift', 'Abundance pours into my days'] },
    love:      { ico: '💖', obj: 'love', img: 'a warm glow', affirms: ['I am ready to receive love', 'My heart is soft and open'] },
    career:    { ico: '⭐', obj: 'purpose', img: 'a rising sun', affirms: ['My work is my joy', 'I walk the path of my purpose'] },
    wellness:  { ico: '🌿', obj: 'health', img: 'morning air', affirms: ['My body is my temple', 'I feel light and whole'] },
    dream:     { ico: '🌟', obj: 'the life I dream of', img: 'a quiet shore', affirms: ['I am becoming who I am', 'My dream is already true'] }
  };
  var songStyle = 'calm';
  var songLines = [];
  function songTheme(input) {
    var t = (input || '').toLowerCase();
    if (/(money|wealth|rich|abundan|financ|prosper)/.test(t)) return 'abundance';
    if (/(love|lover|partner|marry|soulmate|heart)/.test(t)) return 'love';
    if (/(job|career|business|work|success|promot|studio)/.test(t)) return 'career';
    if (/(health|heal|strong|energ|fit|well|body)/.test(t)) return 'wellness';
    return 'dream';
  }
  function buildLyrics(input, theme) {
    var th = SONG_THEMES[theme];
    var dream = (input || 'the life I dream of').replace(/\s+/g, ' ').trim();
    if (dream.length > 46) dream = dream.slice(0, 46).trim() + '…';
    return [
      'Verse 1',
      'I dream of ' + dream,
      'A future already mine',
      'Every morning calls it closer',
      'Light is tracing every line',
      'Chorus',
      'And I feel it now, ' + th.obj,
      'Rising in my chest',
      'I am becoming ' + dream,
      'With every golden breath',
      'Verse 2',
      th.affirms[0],
      'I breathe it in, I let it grow',
      th.affirms[1],
      'The universe already knows',
      'Chorus',
      'And I feel it now, ' + th.obj,
      'Rising in my chest',
      'I am becoming ' + dream,
      'With every golden breath',
      'Bridge',
      'I hold this truth like a flame',
      'A sky of ' + th.img + ' opens wide',
      'It was always mine to claim'
    ];
  }
  function renderSongLines() {
    var wrap = $('#songLyrics');
    wrap.innerHTML = '';
    songLines.forEach(function (line) {
      if (line.section) wrap.appendChild(el('div', 'sl-section', line.section));
      else wrap.appendChild(el('p', 'sl-line', line.text));
    });
    $('#songPlay').classList.remove('hidden');
    $('#songStop').classList.add('hidden');
  }
  function noteFreq(n) {
    var semis = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
    var m = n.match(/^([A-G]#?)(\d)$/);
    if (!m) return 440;
    var midi = (parseInt(m[2], 10) + 1) * 12 + semis[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  function playTone(ctx, t0, freq, dur, wave, vol) {
    var o = ctx.createOscillator(); o.type = wave; o.frequency.value = freq;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.12);
    g.gain.setValueAtTime(vol, t0 + dur * 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  var songCtx = null, songTimer = null;
  function playSong() {
    if (!songLines.length) return;
    stopSong();
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw new Error('no-audio');
      var ctx = songCtx = new AC();
      var st = SONG_STYLES[songStyle] || SONG_STYLES.calm;
      var beat = 60 / st.bpm;
      var lineDur = beat * 8;
      var startT = ctx.currentTime + 0.15;
      var li = 0;
      songLines.forEach(function (line) {
        if (line.section) return;
        var ch = st.chords[li % st.chords.length];
        var t0 = startT + li * lineDur;
        ch.forEach(function (n) { playTone(ctx, t0, noteFreq(n), lineDur * 1.1, st.wave, st.vol); });
        playTone(ctx, t0, noteFreq(ch[0]) / 2, lineDur, 'sine', st.vol * 0.7);
        for (var b = 0; b < 4; b++) {
          playTone(ctx, t0 + b * beat * 2, noteFreq(ch[b % ch.length]) * 2, beat * 1.6, st.wave, st.vol * 0.5);
        }
        (function (idx) {
          setTimeout(function () {
            $$('#songLyrics .sl-line').forEach(function (p, j) { p.classList.toggle('active', j === idx); });
            var cur = document.querySelector('#songLyrics .sl-line.active');
            if (cur && cur.scrollIntoView) cur.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, (startT - ctx.currentTime) * 1000 + idx * lineDur * 1000);
        })(li);
        li++;
      });
      var total = (startT - ctx.currentTime) * 1000 + songLines.filter(function (l) { return !l.section; }).length * lineDur * 1000;
      songTimer = setTimeout(function () {
        $$('#songLyrics .sl-line').forEach(function (p) { p.classList.remove('active'); });
        $('#songPlay').classList.remove('hidden'); $('#songStop').classList.add('hidden');
      }, total + 1500);
      $('#songPlay').classList.add('hidden'); $('#songStop').classList.remove('hidden');
    } catch (e) {
      $('#songLyrics').appendChild(el('div', 'meta', 'Playback needs audio support — try a desktop browser.'));
    }
  }
  function stopSong() {
    if (songTimer) { clearTimeout(songTimer); songTimer = null; }
    if (songCtx) { try { songCtx.close(); } catch (e) {} songCtx = null; }
    $$('#songLyrics .sl-line').forEach(function (p) { p.classList.remove('active'); });
    $('#songPlay').classList.remove('hidden'); $('#songStop').classList.add('hidden');
  }
  $('#songGen').addEventListener('click', function () {
    var input = $('#songInput').value.trim();
    if (!input) { $('#songInput').focus(); return; }
    var raw = buildLyrics(input, songTheme(input));
    songLines = raw.map(function (s) { return /^(Verse|Chorus|Bridge)/.test(s) ? { section: s } : { text: s }; });
    stopSong();
    renderSongLines();
  });
  $('#songInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('#songGen').click(); }
  });
  $('#songPlay').addEventListener('click', playSong);
  $('#songStop').addEventListener('click', stopSong);
  $$('#songStyles .chip').forEach(function (c) {
    c.addEventListener('click', function () {
      songStyle = c.dataset.style;
      $$('#songStyles .chip').forEach(function (x) { x.classList.toggle('active', x === c); });
    });
  });

  /* ═══════ PWA ═══════ */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      if (reg) reg.update();
    }).catch(function () {});
  }
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferredPrompt = e;
    $('#installBtn').classList.remove('hidden');
  });
  $('#installBtn').addEventListener('click', function () {
    if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
    $('#installBtn').classList.add('hidden');
  });

  /* ═══════ Init ═══════ */
  renderToday(); renderGoals(); renderAffirm(); renderGrat(); renderVision(); renderMedTime();
  initSwipe();
  maybeShowQuiz();
})();

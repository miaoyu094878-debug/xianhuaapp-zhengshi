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
    if (id === 'tab-ai-vision' && typeof setAiSubTab === 'function') setAiSubTab('home');
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
  function compressImage(file, cb, customMax) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      var img = new Image();
      img.onload = function () {
        var maxDim = customMax || 1280;
        var scale = Math.min(1, Math.min(maxDim / img.width, maxDim / img.height));
        var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);

        var ratio = img.width / img.height;
        var detectedAspect = '1:1';
        if (ratio >= 1.45) detectedAspect = '16:9';
        else if (ratio >= 1.15) detectedAspect = '4:3';
        else if (ratio <= 0.65) detectedAspect = '9:16';
        else if (ratio <= 0.85) detectedAspect = '3:4';

        try { cb(c.toDataURL('image/jpeg', 0.88), detectedAspect); } catch (err) { cb(null, '1:1'); }
      };
      img.onerror = function () { cb(null, '1:1'); };
      img.src = ev.target.result;
    };
    reader.onerror = function () { cb(null, '1:1'); };
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

  /* ═══════ Stella Flow — Living Reality AI Voice Manifestation ═══════ */
  var fsState = {
    storyData: null,
    isPlaying: false,
    isPaused: false,
    audioCtx: null,
    sourceNode: null,
    audioBuffer: null,
    voiceGainNode: null,
    ambGainNode: null,
    ambNodes: null,
    currentUtterance: null,
    activeParagraphIdx: 0,
    paragraphs: [],
    highlightTimer: null
  };

  function getFsAudioContext() {
    if (!fsState.audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) fsState.audioCtx = new AC();
    }
    if (fsState.audioCtx && fsState.audioCtx.state === 'suspended') {
      fsState.audioCtx.resume();
    }
    return fsState.audioCtx;
  }

  var currentAmbFreq = null;

  // Solfeggio & Atmospheric Frequency Synthesizer
  function startFsAmbient(freqType, fadeInSec) {
    if (!freqType || freqType === 'off') {
      stopFsAmbient(true);
      currentAmbFreq = null;
      return;
    }

    try {
      var ctx = getFsAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(function () {});
      }

      // If already playing smoothly at this frequency, keep running
      if (fsState.ambNodes && fsState.ambGainNode && currentAmbFreq === freqType) {
        return;
      }

      // Stop previous ambient without destroying the new ones
      stopFsAmbient(true);
      currentAmbFreq = freqType;

      var masterAmbGain = ctx.createGain();
      var ambVolInput = $('#fsAmbVol');
      var ambVolVal = parseFloat(ambVolInput ? ambVolInput.value : 0.6);
      if (isNaN(ambVolVal) || ambVolVal < 0) ambVolVal = 0.6;

      var fadeDuration = typeof fadeInSec === 'number' ? fadeInSec : 0.4;
      var targetGain = 0.22 * ambVolVal; // Audible and soothing ambient level

      masterAmbGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      masterAmbGain.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + fadeDuration);
      masterAmbGain.connect(ctx.destination);
      fsState.ambGainNode = masterAmbGain;

      var oscList = [];

      if (freqType === '528') {
        // 528Hz Miracle & Transformation (Solfeggio MI) with Theta Binaural 6Hz (528 & 534) + 264 Sub
        var f1 = 528, f2 = 534, sub = 264;
        var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator();
        var g1 = ctx.createGain(), g2 = ctx.createGain(), g3 = ctx.createGain();
        o1.type = 'sine'; o1.frequency.value = f1; g1.gain.value = 0.45;
        o2.type = 'sine'; o2.frequency.value = f2; g2.gain.value = 0.40;
        o3.type = 'sine'; o3.frequency.value = sub; g3.gain.value = 0.25;

        var filter = ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 1200;

        o1.connect(g1); g1.connect(filter);
        o2.connect(g2); g2.connect(filter);
        o3.connect(g3); g3.connect(filter);
        filter.connect(masterAmbGain);
        o1.start(); o2.start(); o3.start();
        oscList = [o1, o2, o3];
      } else if (freqType === '432') {
        // 432Hz Natural Healing & Deep Resonance with Alpha 8Hz (432 & 440) + 216 Sub
        var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator();
        var g1 = ctx.createGain(), g2 = ctx.createGain(), g3 = ctx.createGain();
        o1.type = 'sine'; o1.frequency.value = 432; g1.gain.value = 0.50;
        o2.type = 'sine'; o2.frequency.value = 440; g2.gain.value = 0.45;
        o3.type = 'sine'; o3.frequency.value = 216; g3.gain.value = 0.30;

        var filter = ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 1000;

        o1.connect(g1); g1.connect(filter);
        o2.connect(g2); g2.connect(filter);
        o3.connect(g3); g3.connect(filter);
        filter.connect(masterAmbGain);
        o1.start(); o2.start(); o3.start();
        oscList = [o1, o2, o3];
      } else if (freqType === '639') {
        // 639Hz Heart Chakra Connection & Harmonious Relationship
        var o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator();
        var g1 = ctx.createGain(), g2 = ctx.createGain(), g3 = ctx.createGain();
        o1.type = 'sine'; o1.frequency.value = 639; g1.gain.value = 0.45;
        o2.type = 'sine'; o2.frequency.value = 645; g2.gain.value = 0.40;
        o3.type = 'sine'; o3.frequency.value = 319.5; g3.gain.value = 0.25;

        var filter = ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = 1400;

        o1.connect(g1); g1.connect(filter);
        o2.connect(g2); g2.connect(filter);
        o3.connect(g3); g3.connect(filter);
        filter.connect(masterAmbGain);
        o1.start(); o2.start(); o3.start();
        oscList = [o1, o2, o3];
      } else if (freqType === 'bowl') {
        // Zen Tibetan Singing Bowl (Harmonic Overtones + Gentle Tremolo)
        var freqs = [174, 348, 522, 696];
        var lfo = ctx.createOscillator();
        var lfoGain = ctx.createGain();
        lfo.frequency.value = 0.2; // Slow 5-second breath wave
        lfoGain.gain.value = 0.04;
        lfo.connect(lfoGain.gain);

        freqs.forEach(function (f, idx) {
          var osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = f;
          var g = ctx.createGain();
          g.gain.value = 0.3 / (idx + 1);
          osc.connect(g);
          g.connect(masterAmbGain);
          osc.start();
          oscList.push(osc);
        });
        lfo.start();
        oscList.push(lfo);
      }

      fsState.ambNodes = oscList;
    } catch (e) {
      console.warn('AudioContext ambient start error:', e);
    }
  }

  function stopFsAmbient(immediate) {
    currentAmbFreq = null;
    var oldNodes = fsState.ambNodes;
    var oldGain = fsState.ambGainNode;
    fsState.ambNodes = null;
    fsState.ambGainNode = null;

    if (oldGain && fsState.audioCtx) {
      try {
        var fadeSec = immediate ? 0.04 : 0.45;
        oldGain.gain.cancelScheduledValues(fsState.audioCtx.currentTime);
        oldGain.gain.setValueAtTime(oldGain.gain.value, fsState.audioCtx.currentTime);
        oldGain.gain.linearRampToValueAtTime(0.0001, fsState.audioCtx.currentTime + fadeSec);
      } catch (e) {}
    }

    if (oldNodes && oldNodes.length) {
      if (immediate) {
        oldNodes.forEach(function (node) {
          try { node.stop(); node.disconnect(); } catch (e) {}
        });
        if (oldGain) {
          try { oldGain.disconnect(); } catch (e) {}
        }
      } else {
        setTimeout(function () {
          oldNodes.forEach(function (node) {
            try { node.stop(); node.disconnect(); } catch (e) {}
          });
          if (oldGain) {
            try { oldGain.disconnect(); } catch (e) {}
          }
        }, 500);
      }
    }
  }

  // Update Ambient & Voice Volume dynamically
  if ($('#fsAmbVol')) {
    $('#fsAmbVol').addEventListener('input', function () {
      var val = parseFloat(this.value);
      if (isNaN(val)) val = 0.5;
      if (fsState.ambGainNode && fsState.audioCtx) {
        fsState.ambGainNode.gain.cancelScheduledValues(fsState.audioCtx.currentTime);
        fsState.ambGainNode.gain.setValueAtTime(0.22 * val, fsState.audioCtx.currentTime);
      }
    });
  }

  if ($('#fsVoiceVol')) {
    $('#fsVoiceVol').addEventListener('input', function () {
      var val = parseFloat(this.value);
      if (isNaN(val)) val = 1.0;
      if (fsState.voiceGainNode && fsState.audioCtx) {
        fsState.voiceGainNode.gain.cancelScheduledValues(fsState.audioCtx.currentTime);
        fsState.voiceGainNode.gain.setValueAtTime(val, fsState.audioCtx.currentTime);
      }
    });
  }

  // Frequency selector live switch
  if ($('#fsFreq')) {
    $('#fsFreq').addEventListener('change', function () {
      if (fsState.isPlaying) {
        startFsAmbient(this.value);
      }
      var label = $('#fsAmbLabel');
      if (label) {
        var txt = this.options[this.selectedIndex].text.split('·')[0].trim();
        label.textContent = '🎵 ' + txt + ' 音量';
      }
    });
  }

  // Quick Preset Buttons
  $$('.fs-preset-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var goal = btn.dataset.goal;
      var textarea = $('#fsDesire');
      if (textarea && goal) {
        textarea.value = goal;
        textarea.focus();
        btn.style.transform = 'scale(0.96)';
        setTimeout(function () { btn.style.transform = ''; }, 150);
      }
    });
  });

  // Decode raw 24kHz PCM from Gemini TTS
  function pcmToAudioBuffer(base64Data, sampleRate, ctx) {
    try {
      var binary = atob(base64Data);
      var len = binary.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      var int16 = new Int16Array(bytes.buffer);
      var float32 = new Float32Array(int16.length);
      for (var j = 0; j < int16.length; j++) {
        float32[j] = int16[j] / 32768.0;
      }
      var audioBuf = ctx.createBuffer(1, float32.length, sampleRate || 24000);
      audioBuf.copyToChannel(float32, 0, 0);
      return audioBuf;
    } catch (e) {
      console.error('Failed to decode PCM audio:', e);
      return null;
    }
  }

  function pickNaturalVoice(isZh) {
    if (!('speechSynthesis' in window)) return null;
    var vs = window.speechSynthesis.getVoices();
    if (!vs.length) return null;
    if (isZh) {
      return vs.filter(function (v) { return /zh|cmn|chinese/i.test(v.lang) && /ting|xiaoxiao|meijia|sinji|google|natural/i.test(v.name); })[0] ||
             vs.filter(function (v) { return /zh[-_](cn|hk|tw)/i.test(v.lang); })[0] ||
             vs.filter(function (v) { return /^zh/i.test(v.lang); })[0] || null;
    } else {
      return vs.filter(function (v) { return /en/i.test(v.lang) && /samantha|victoria|karen|zira|natural|google US/i.test(v.name); })[0] ||
             vs.filter(function (v) { return /en[-_]US/i.test(v.lang); })[0] ||
             vs.filter(function (v) { return /^en/i.test(v.lang); })[0] || null;
    }
  }

  function updateFsPlaybackUI(playing) {
    fsState.isPlaying = playing;
    var orbIcon = $('#fsOrbIcon');
    var playBtn = $('#fsPlayBtn');
    var orbPlay = $('#fsOrbPlay');
    var stage = $('#fsPlayer');

    if (playing) {
      if (orbIcon) orbIcon.textContent = '⏸';
      if (playBtn) playBtn.textContent = '⏸ 暂停诵读';
      if (orbPlay) orbPlay.classList.add('playing');
      if (stage) stage.classList.add('is-playing');
    } else {
      if (orbIcon) orbIcon.textContent = '▶';
      if (playBtn) playBtn.textContent = '▶ 播放诵读';
      if (orbPlay) orbPlay.classList.remove('playing');
      if (stage) stage.classList.remove('is-playing');
    }
  }

  function highlightParagraph(idx) {
    fsState.activeParagraphIdx = idx;
    var pEls = $$('.fs-story-p');
    pEls.forEach(function (p, i) {
      var active = (i === idx);
      p.classList.toggle('current-reading', active);
      if (active) {
        p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  // ══════════════════════════════════════════════════════════
  // Unified API Gateway Client
  // Dispatches API requests to Supabase Edge Function (/functions/v1/xianhuaapp) or local /api
  // ══════════════════════════════════════════════════════════
  async function callUnifiedApi(action, payload) {
    var supabaseUrl = window.SUPABASE_URL || (window.LUMINARA_CONFIG && window.LUMINARA_CONFIG.SUPABASE_URL) || localStorage.getItem('luminara_supabase_url') || 'https://bnxjwnvsmiqofbjiknwf.supabase.co';
    var anonKey = window.SUPABASE_ANON_KEY || (window.LUMINARA_CONFIG && window.LUMINARA_CONFIG.SUPABASE_ANON_KEY) || localStorage.getItem('luminara_supabase_anon_key');

    var endpoint = supabaseUrl 
      ? (supabaseUrl.replace(/\/+$/, '') + '/functions/v1/xianhuaapp')
      : '/api';

    var headers = { 'Content-Type': 'application/json' };
    if (anonKey) {
      headers['apikey'] = anonKey;
      headers['Authorization'] = 'Bearer ' + anonKey;
    }
    var storedOrKey = localStorage.getItem('luminara_openrouter_key');
    if (storedOrKey) {
      headers['x-openrouter-key'] = storedOrKey;
    }

    var fullPayload = Object.assign({ action: action }, payload || {});
    if (storedOrKey && !fullPayload.openrouterKey) {
      fullPayload.openrouterKey = storedOrKey;
    }

    try {
      var res = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(fullPayload)
      });

      if (!res.ok && endpoint !== '/api') {
        try {
          var localHeaders = { 'Content-Type': 'application/json' };
          if (storedOrKey) localHeaders['x-openrouter-key'] = storedOrKey;
          var localRes = await fetch('/api', {
            method: 'POST',
            headers: localHeaders,
            body: JSON.stringify(fullPayload)
          });
          if (localRes.ok) return localRes;
        } catch (e) {}
      }

      // Fallback for older server endpoints if 404
      if (res.status === 404 && endpoint === '/api') {
        var legacyUrl = action === 'voice' ? '/api/manifest-voice' : '/api/manifest-story';
        return await fetch(legacyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      return res;
    } catch (err) {
      // If external call failed, fallback to local /api
      if (endpoint !== '/api') {
        return await fetch('/api', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.assign({ action: action }, payload || {}))
        });
      }
      throw err;
    }
  }

  // Play narration using Gemini Neural Voice API (/api or Supabase Edge Function)
  var pcmAudioCache = {}; // cache audio buffer per paragraph text + voice
  var pcmAudioInFlight = {}; // In-flight request deduplication lock: prevents concurrent duplicate TTS calls

  async function fetchParagraphAudio(text, voiceName, mood) {
    if (!text || typeof text !== 'string') return null;
    var trimmed = text.trim();
    if (!trimmed) return null;

    var key = voiceName + ':' + (mood || 'calm') + ':' + trimmed;
    if (pcmAudioCache[key]) return pcmAudioCache[key];
    if (pcmAudioInFlight[key]) {
      return await pcmAudioInFlight[key];
    }

    var fetchPromise = (async function () {
      try {
        var res = await callUnifiedApi('voice', { text: trimmed, voiceName: voiceName, voiceId: voiceName, mood: mood });
        if (!res.ok) {
          return null;
        }
        var data = await res.json();
        if (!data || !data.audio) return null;

        if (!fsState.audioCtx) {
          fsState.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        }
        if (fsState.audioCtx.state === 'suspended') {
          await fsState.audioCtx.resume();
        }

        var audioBuf = null;
        if (data.format === 'mp3' || data.format === 'wav' || data.provider === 'openrouter-qwen-tts' || data.provider === 'openrouter-gemini-tts' || data.provider === 'elevenlabs' || data.provider === 'openrouter-fish-audio' || data.provider === 'openrouter-kokoro') {
          var binary = atob(data.audio);
          var len = binary.length;
          var bytes = new Uint8Array(len);
          for (var i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          audioBuf = await fsState.audioCtx.decodeAudioData(bytes.buffer.slice(0));
        } else {
          audioBuf = pcmToAudioBuffer(data.audio, data.sampleRate || 24000, fsState.audioCtx);
        }

        if (audioBuf) {
          pcmAudioCache[key] = audioBuf;
          return audioBuf;
        }
      } catch (e) {
        console.warn('Voice API fetch failed, client fallback ready:', e);
      } finally {
        delete pcmAudioInFlight[key];
      }
      return null;
    })();

    pcmAudioInFlight[key] = fetchPromise;
    return await fetchPromise;
  }

  async function playWithGeminiTTS(startIdx) {
    var paragraphs = fsState.paragraphs;
    if (!paragraphs || !paragraphs.length) return;

    var idx = (typeof startIdx === 'number' && !isNaN(startIdx)) ? startIdx : 0;
    // Ensure idx doesn't exceed paragraph range; if completed, loop back to beginning
    if (idx >= paragraphs.length || idx < 0) {
      idx = 0;
      fsState.activeParagraphIdx = 0;
    }

    var voiceSelect = $('#fsVoice');
    var selectedVoice = voiceSelect ? voiceSelect.value : 'Zephyr';
    
    // If user explicitly chose local system voice, bypass Neural TTS
    if (selectedVoice === 'local') {
      playWithWebSpeech(startIdx);
      return;
    }

    fsState.isPlaying = true;
    updateFsPlaybackUI(true);

    if (fsState.preludeTimer) {
      clearTimeout(fsState.preludeTimer);
      fsState.preludeTimer = null;
    }
    if (fsState.outroTimer) {
      clearTimeout(fsState.outroTimer);
      fsState.outroTimer = null;
    }

    // Start ambient healing frequency immediately
    var freq = $('#fsFreq') ? $('#fsFreq').value : '528';
    startFsAmbient(freq, 1.0);

    var badge = $('#fsVoiceStatusBadge');
    if (badge) {
      if (idx === 0) {
        badge.textContent = fsState.hasEverPlayedStory ? '🎵 疗愈频率与天籁导引就绪中...' : '🎵 疗愈频率先行沉浸中 (即将开启人声导引)...';
      } else {
        badge.textContent = '⏳ 正在准备天籁导引声线...';
      }
      badge.style.opacity = '1';
    }

    function updateBadgeActive() {
      if (!badge) return;
      if (selectedVoice.startsWith('qwen:')) {
        var qVoice = selectedVoice.replace('qwen:', '');
        var qVoiceMap = {
          'longanlingxin': '灵心 (温润共情·细腻治愈女声)',
          'longanyuanfei': '远妃 (端庄温婉·从容知性女声)',
          'longanlingxi': '灵犀 (灵动甜美·可爱亲切女声)',
          'longanxiaoxin': '小欣 (亲切轻柔·自然元气女声)',
          'longanfengyue': '风月 (自然舒缓·明媚治愈女声)',
          'longanhuan_v3.6': '欢欢 (轻柔自然·清澈伴读女声)',
          'longjielidou_v3.6': '杰利豆 (萌动元气·可爱甜美女声)',
          'loongeva_v3.6': 'Eva (典雅知性·从容温婉女声)'
        };
        var qName = qVoiceMap[qVoice] || qVoice;
        badge.textContent = '💫 Qwen 3.0 TTS · ' + qName + ' 诵读中...';
      } else if (selectedVoice.startsWith('openrouter:')) {
        var orVoiceName = selectedVoice.replace('openrouter:', '');
        badge.textContent = '🌸 OpenRouter Gemini 3.1 TTS · ' + orVoiceName + ' 诵读中...';
      } else if (selectedVoice === 'Zephyr') {
        badge.textContent = '✨ Zephyr · 空灵清澈天籁女声 (AI 顶级神经网络原声) 诵读中...';
      } else if (selectedVoice === 'Kore') {
        badge.textContent = '🌸 Kore · 温柔治愈抚慰女声 (AI 顶级神经网络原声) 诵读中...';
      } else if (selectedVoice === 'Aoede') {
        badge.textContent = '🎵 Aoede · 灵动婉转抒情女声 (AI 顶级神经网络原声) 诵读中...';
      } else if (selectedVoice === 'Puck') {
        badge.textContent = '🌿 Puck · 温暖从容和煦男声 (AI 顶级神经网络原声) 诵读中...';
      } else if (selectedVoice === 'Charon') {
        badge.textContent = '🌌 Charon · 深邃沉静磁性男声 (AI 顶级神经网络原声) 诵读中...';
      } else if (selectedVoice === 'Fenrir') {
        badge.textContent = '⚡ Fenrir · 笃定自信赋能男声 (AI 顶级神经网络原声) 诵读中...';
      } else if (selectedVoice.startsWith('af_') || selectedVoice.startsWith('bf_')) {
        badge.textContent = '🌸 纯正母语女声诵读中...';
      } else if (selectedVoice.startsWith('zf_') || selectedVoice.indexOf('kokoro') !== -1) {
        badge.textContent = '🎀 柔和中文女声 (Kokoro 82M) 诵读中...';
      } else if (selectedVoice === 'fish-audio/s2.1-pro-free:free' || selectedVoice.indexOf('fish-audio') !== -1) {
        badge.textContent = '🐟 Fish Audio 拟真声音诵读中...';
      } else if (selectedVoice.length >= 15) {
        badge.textContent = '🌟 专属定制拟真声音诵读中...';
      } else {
        badge.textContent = '✨ AI 顶级多模态神经网络诵读中...';
      }
      badge.style.opacity = '1';
    }

    async function speakParagraph(pIdx) {
      if (pIdx >= paragraphs.length || !fsState.isPlaying) {
        // Voice ended: keep ambient playing for 3 more seconds before stopping
        if (badge) badge.textContent = '✨ 导引圆满完成 · 沉浸在余韵疗愈中 (3秒)...';
        fsState.outroTimer = setTimeout(function () {
          if (!fsState.isPlaying) return;
          stopFsAmbient(false);
          updateFsPlaybackUI(false);
          if (badge) badge.textContent = '✨ 显化诵读已圆满完成';
        }, 3000);
        return;
      }

      highlightParagraph(pIdx);
      var text = paragraphs[pIdx];
      var mood = $('#fsMood') ? $('#fsMood').value : 'calm';

      // Pipeline strictly the single next paragraph while current one is speaking
      if (pIdx + 1 < paragraphs.length) {
        fetchParagraphAudio(paragraphs[pIdx + 1], selectedVoice, mood).catch(function () {});
      }

      var audioBuf = null;
      try {
        audioBuf = await fetchParagraphAudio(text, selectedVoice, mood);
      } catch (err) {
        console.warn('Paragraph audio fetch caught error:', err);
      }

      if (!fsState.isPlaying) return;

      if (!audioBuf) {
        // Fallback to Web Speech if network fails or model busy
        if (badge) badge.textContent = '📱 已转为智能自然声音';
        playWithWebSpeech(pIdx);
        return;
      }

      if (!fsState.audioCtx) {
        fsState.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      }
      if (fsState.audioCtx.state === 'suspended') {
        await fsState.audioCtx.resume();
      }

      var source = fsState.audioCtx.createBufferSource();
      source.buffer = audioBuf;

      // Master Voice Gain
      var voiceGain = fsState.audioCtx.createGain();
      var voiceVolVal = parseFloat($('#fsVoiceVol') ? $('#fsVoiceVol').value : 1.0);
      if (isNaN(voiceVolVal) || voiceVolVal < 0) voiceVolVal = 1.0;
      voiceGain.gain.setValueAtTime(voiceVolVal, fsState.audioCtx.currentTime);
      fsState.voiceGainNode = voiceGain;

      var speedVal = parseFloat($('#fsSpeed') ? $('#fsSpeed').value : 0.95);
      source.playbackRate.value = speedVal;

      source.connect(voiceGain);
      voiceGain.connect(fsState.audioCtx.destination);

      fsState.currentAudioSource = source;

      // Ensure ambient is running
      startFsAmbient(freq, 0.4);
      updateBadgeActive();

      source.onended = function () {
        if (!fsState.isPlaying) return;

        // 如果已经是最后一段，人声结束，背景音再延续播放 3 秒后优雅归寂
        if (pIdx + 1 >= paragraphs.length) {
          fsState.activeParagraphIdx = 0; // 【核心修复】立刻重置回第0段，保证再次点击播放时必定从头诵读人声
          if (badge) badge.textContent = '✨ 导引圆满完成 · 沉浸在余韵疗愈中 (3秒)...';
          fsState.outroTimer = setTimeout(function () {
            if (!fsState.isPlaying) return;
            stopFsAmbient(false);
            updateFsPlaybackUI(false);
            fsState.activeParagraphIdx = 0;
            if (badge) badge.textContent = '✨ 显化诵读已圆满完成 (点击可再次播放)';
          }, 3000);
          return;
        }

        fsState.activeParagraphIdx = pIdx + 1;

        // 段落之间呼吸式自然衔接
        setTimeout(function () {
          if (fsState.isPlaying) speakParagraph(pIdx + 1);
        }, 500);
      };

      source.start(0);
    }

    // Prefetch paragraph 0 immediately
    var moodInit = $('#fsMood') ? $('#fsMood').value : 'calm';
    fetchParagraphAudio(paragraphs[idx], selectedVoice, moodInit).catch(function () {});

    if (idx === 0) {
      // 首次播报略留静心前奏(1.5秒)，若为重播则快速衔接(0.6秒)
      var preludeDelay = fsState.hasEverPlayedStory ? 600 : 1500;
      fsState.hasEverPlayedStory = true;
      fsState.preludeTimer = setTimeout(function () {
        if (fsState.isPlaying) {
          speakParagraph(0);
        }
      }, preludeDelay);
    } else {
      speakParagraph(idx);
    }
  }

  // Play narration using Web Speech synthesis with gentle cadence (Fallback)
  function playWithWebSpeech(startIdx) {
    if (!('speechSynthesis' in window)) {
      alert('您的浏览器暂不支持语音合成，但您可以静心阅读上方的显化故事。');
      return;
    }

    window.speechSynthesis.cancel();
    var idx = startIdx || 0;
    var paragraphs = fsState.paragraphs;
    if (!paragraphs || !paragraphs.length) return;

    if (fsState.preludeTimer) {
      clearTimeout(fsState.preludeTimer);
      fsState.preludeTimer = null;
    }
    if (fsState.outroTimer) {
      clearTimeout(fsState.outroTimer);
      fsState.outroTimer = null;
    }

    fsState.isPlaying = true;
    updateFsPlaybackUI(true);

    var freq = $('#fsFreq') ? $('#fsFreq').value : '528';
    startFsAmbient(freq, 1.0);

    var badge = $('#fsVoiceStatusBadge');
    if (badge) {
      if (idx === 0) {
        badge.textContent = '🎵 疗愈频率先行沉浸中 (2秒后开启人声导引)...';
      } else {
        badge.textContent = '📱 自然语音导引中...';
      }
      badge.style.opacity = '1';
    }

    var speed = parseFloat($('#fsSpeed') ? $('#fsSpeed').value : 0.95);
    var isZh = /[\u4e00-\u9fa5]/.test(paragraphs.join(' '));
    var voice = pickNaturalVoice(isZh);

    function speakNext() {
      if (idx >= paragraphs.length || !fsState.isPlaying) {
        if (badge) badge.textContent = '✨ 导引圆满完成 · 沉浸在余韵疗愈中 (3秒)...';
        fsState.outroTimer = setTimeout(function () {
          if (!fsState.isPlaying) return;
          stopFsAmbient(false);
          updateFsPlaybackUI(false);
          if (badge) badge.textContent = '✨ 显化诵读已圆满完成';
        }, 3000);
        return;
      }

      highlightParagraph(idx);
      var text = paragraphs[idx];
      var u = new SpeechSynthesisUtterance(text);
      u.rate = speed;
      u.pitch = 0.96; // Warm & grounded pitch
      if (voice) u.voice = voice;

      u.onstart = function () {
        if (badge) badge.textContent = '📱 自然语音诵读中...';
      };

      u.onend = function () {
        idx++;
        if (idx >= paragraphs.length) {
          fsState.activeParagraphIdx = 0; // 重置归零
          if (badge) badge.textContent = '✨ 导引圆满完成 · 沉浸在余韵疗愈中 (3秒)...';
          fsState.outroTimer = setTimeout(function () {
            if (!fsState.isPlaying) return;
            stopFsAmbient(false);
            updateFsPlaybackUI(false);
            fsState.activeParagraphIdx = 0;
            if (badge) badge.textContent = '✨ 显化诵读已圆满完成 (点击可再次播放)';
          }, 3000);
          return;
        }
        fsState.activeParagraphIdx = idx;
        // Gentle breath pause between paragraphs
        setTimeout(function () {
          if (fsState.isPlaying) speakNext();
        }, 600);
      };

      u.onerror = function () {
        idx++;
        if (fsState.isPlaying) speakNext();
      };

      fsState.currentUtterance = u;
      window.speechSynthesis.speak(u);
    }

    if (idx === 0) {
      var delayMs = fsState.hasEverPlayedStory ? 600 : 1500;
      fsState.hasEverPlayedStory = true;
      fsState.preludeTimer = setTimeout(function () {
        if (fsState.isPlaying) {
          speakNext();
        }
      }, delayMs);
    } else {
      speakNext();
    }
  }

  // Start / Resume Playback
  function playFsManifestation(fromBeginning) {
    if (!fsState.storyData) return;

    var totalParagraphs = (fsState.paragraphs && fsState.paragraphs.length) || 1;
    // 如果显式要求从头开始，或者已播完所有段落，必定归零重头开始
    if (fromBeginning || fsState.activeParagraphIdx >= totalParagraphs || fsState.activeParagraphIdx < 0) {
      fsState.activeParagraphIdx = 0;
    }

    if (fsState.audioCtx && fsState.audioCtx.state === 'suspended') {
      fsState.audioCtx.resume();
    }

    if (window.speechSynthesis && window.speechSynthesis.paused && !fromBeginning) {
      window.speechSynthesis.resume();
      var freq = $('#fsFreq') ? $('#fsFreq').value : '528';
      startFsAmbient(freq, 0.35);
      updateFsPlaybackUI(true);
      return;
    }

    playWithGeminiTTS(fsState.activeParagraphIdx);
  }

  function pauseFsManifestation() {
    fsState.isPlaying = false;
    if (fsState.preludeTimer) {
      clearTimeout(fsState.preludeTimer);
      fsState.preludeTimer = null;
    }
    if (fsState.outroTimer) {
      clearTimeout(fsState.outroTimer);
      fsState.outroTimer = null;
    }
    if (fsState.currentAudioSource) {
      try { fsState.currentAudioSource.stop(); } catch (e) {}
      fsState.currentAudioSource = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
    stopFsAmbient(true);
    updateFsPlaybackUI(false);
  }

  function stopFutureAudio() {
    fsState.isPlaying = false;
    fsState.activeParagraphIdx = 0;
    if (fsState.preludeTimer) {
      clearTimeout(fsState.preludeTimer);
      fsState.preludeTimer = null;
    }
    if (fsState.outroTimer) {
      clearTimeout(fsState.outroTimer);
      fsState.outroTimer = null;
    }
    if (fsState.currentAudioSource) {
      try { fsState.currentAudioSource.stop(); } catch (e) {}
      fsState.currentAudioSource = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    stopFsAmbient(true);
    updateFsPlaybackUI(false);
  }

  // Render Story into UI
  function renderFsStoryUI(data) {
    fsState.storyData = data;
    $('#fsSceneTitle').textContent = data.title || '✨ 现时显化之境';
    $('#fsAffirmBadge').textContent = data.affirmation || '我已完全安住在丰盛与宁静之中';
    $('#fsAnchorDesc').textContent = data.sensoryAnchor || '轻轻将手放在心口，感受温热平稳的心跳，对自己微笑。';

    var rawStory = data.story || '';
    var paragraphs = rawStory.split(/\n+/).map(function (p) { return p.trim(); }).filter(Boolean);
    if (!paragraphs.length) paragraphs = [rawStory];
    fsState.paragraphs = paragraphs;

    var storyBody = $('#fsStoryBody');
    storyBody.innerHTML = '';
    paragraphs.forEach(function (pText, i) {
      var pEl = document.createElement('p');
      pEl.className = 'fs-story-p';
      pEl.textContent = pText;
      pEl.addEventListener('click', function () {
        // Click to jump to this paragraph
        fsState.activeParagraphIdx = i;
        playFsManifestation(false);
      });
      storyBody.appendChild(pEl);
    });

    $('#fsLoading').classList.add('hidden');
    $('#fsPlayer').classList.remove('hidden');

    // Auto-scroll into view smoothly
    $('#fsPlayer').scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Begin immersive playback
    playFsManifestation(true);
  }

  // Form Submit: Call Gemini API /api/manifest-story
  if ($('#fsForm')) {
    $('#fsForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var raw = $('#fsDesire').value.trim();
      var desire = raw || (db.profile && db.profile.desire) || '';
      if (!desire) {
        alert('请输入你想要显化实现的心愿或目标 ✨');
        $('#fsDesire').focus();
        return;
      }

      stopFutureAudio();

      $('#fsPlayer').classList.add('hidden');
      $('#fsLoading').classList.remove('hidden');
      $('#fsLoading').scrollIntoView({ behavior: 'smooth', block: 'center' });

      var mood = $('#fsMood') ? $('#fsMood').value : 'calm';
      var name = (db.profile && db.profile.name) || '';
      var hasChinese = /[\u4e00-\u9fa5]/.test(desire);
      var detectedLanguage = hasChinese ? 'Chinese (中文)' : 'English';

      try {
        var res = await callUnifiedApi('story', {
          desire: desire,
          name: name,
          mood: mood,
          language: detectedLanguage
        });

        if (!res.ok) {
          throw new Error('Server returned ' + res.status);
        }

        var data = await res.json();
        renderFsStoryUI(data);
      } catch (err) {
        console.warn('API error, using client fallback:', err);
        // Instant graceful client-side fallback
        var isZh = /[\u4e00-\u9fa5]/.test(desire);
        var fallbackData = isZh ? {
          title: '心愿已成 · ' + desire.slice(0, 12),
          affirmation: '此时此刻，我已然沉浸在【' + desire + '】的真实之中，内心笃定而丰盈。',
          story: '深深吸气，感受温暖清透的气息充盈胸膛，肩膀自然沉落，身心归于宁静。\n\n抬起眼眸，“' + desire + '”已在眼前真实展开，空气中流动着从容与丰盛的质感。\n\n轻轻将手覆在心口，感受温热有力的心跳与深深的感恩——你已如愿以偿。',
          sensoryAnchor: '轻轻把右手放在心口，感受平稳温热的心跳，对自己微笑。',
          frequency: '528Hz',
          mood: mood
        } : {
          title: 'Reality Realized · ' + desire.slice(0, 15),
          affirmation: 'I am fully living in the reality of ' + desire + ', with peace and ease.',
          story: 'Take a gentle, slow breath in. Feel calm warmth filling your chest as all tension melts away into quiet stillness.\n\nLook around you. "' + desire + '" is already here, unfolding in your everyday reality with natural grace and abundance.\n\nPlace your hand gently over your heart. Feel its steady, grateful pulse and know that you have arrived.',
          sensoryAnchor: 'Place your hand over your heart, feel its steady warmth, and smile.',
          frequency: '528Hz',
          mood: mood
        };
        renderFsStoryUI(fallbackData);
      }
    });
  }

  // Play / Pause Click Handlers
  if ($('#fsPlayBtn')) {
    $('#fsPlayBtn').addEventListener('click', function () {
      if (fsState.isPlaying) pauseFsManifestation();
      else playFsManifestation(false);
    });
  }

  if ($('#fsOrbPlay')) {
    $('#fsOrbPlay').addEventListener('click', function () {
      if (fsState.isPlaying) pauseFsManifestation();
      else playFsManifestation(false);
    });
  }

  // Transfer to Wallpaper Studio
  if ($('#fsSendToWallpaper')) {
    $('#fsSendToWallpaper').addEventListener('click', function () {
      if (!fsState.storyData) return;
      var textToSet = fsState.storyData.affirmation || fsState.storyData.title || '';
      if (typeof syncAffirmationText === 'function') {
        syncAffirmationText(textToSet, 'fs');
      }
      goTab('tab-wallpaper');
      window.scrollTo(0, 0);
    });
  }

  // Copy Story to Clipboard
  if ($('#fsCopyText')) {
    $('#fsCopyText').addEventListener('click', function () {
      if (!fsState.storyData) return;
      var text = '✨ ' + (fsState.storyData.title || '') + '\n\n' +
                 '✦ 肯定语：' + (fsState.storyData.affirmation || '') + '\n\n' +
                 (fsState.storyData.story || '') + '\n\n' +
                 '⚓ 身体锚点：' + (fsState.storyData.sensoryAnchor || '');
      navigator.clipboard.writeText(text).then(function () {
        var orig = $('#fsCopyText').textContent;
        $('#fsCopyText').textContent = '✓ 已复制到剪贴板';
        setTimeout(function () { $('#fsCopyText').textContent = orig; }, 2000);
      }).catch(function () {
        alert('文本已选定，可长按复制。');
      });
    });
  }

  // Return to Form
  if ($('#fsNewDesire')) {
    $('#fsNewDesire').addEventListener('click', function () {
      stopFutureAudio();
      $('#fsPlayer').classList.add('hidden');
      $('#fsDesire').focus();
      $('#fsForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Instant Preset Manifestation Experience (无需等待直接聆听)
  if ($('#fsInstantPresetPlayBtn')) {
    $('#fsInstantPresetPlayBtn').addEventListener('click', function () {
      var presetData = {
        title: '心愿已成 · 宁静与丰盛',
        affirmation: '我已安住在当下的从容与丰盛之中。',
        story: '此时此刻，你渴望的一切已经在当下真实显现，身心沉浸在宁静与丰盛之中。',
        sensoryAnchor: '轻轻把右手放在心口，感受平稳温热的心跳，对自己微笑。',
        frequency: '528Hz',
        mood: 'calm'
      };
      renderFsStoryUI(presetData);
      setTimeout(function () {
        playFsManifestation(false);
      }, 300);
    });
  }

  // Voice Audition Laboratory (调试选拔实验室)
  var auditionAudioSource = null;
  if ($('#fsVoice')) {
    $('#fsVoice').addEventListener('change', function () {
      var val = $('#fsVoice').value;
      if (val && val !== 'local' && $('#fsTestVoiceId')) {
        $('#fsTestVoiceId').value = val;
      }
      fsState.activeParagraphIdx = 0;
      // If currently playing, smoothly transition to new voice from beginning
      if (fsState.isPlaying) {
        pauseFsManifestation();
        setTimeout(function () {
          playFsManifestation(true);
        }, 150);
      }
    });
  }

  if ($('#fsAuditionPlayBtn')) {
    $('#fsAuditionPlayBtn').addEventListener('click', async function () {
      var btn = $('#fsAuditionPlayBtn');
      var statusEl = $('#fsAuditionStatus');
      var inputEl = $('#fsTestVoiceId');
      var voiceId = (inputEl ? inputEl.value.trim() : '') || 'QJksobp1edMNvmwcG5lm';
      var sampleText = '深吸一口气... 感受这一刻，你渴望的一切已经在当下自然显现。';

      if (btn.dataset.playing === 'true') {
        if (auditionAudioSource) {
          try { auditionAudioSource.stop(); } catch (e) {}
        }
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        btn.dataset.playing = 'false';
        btn.innerHTML = '▶️ 试听此声音';
        if (statusEl) statusEl.textContent = '已停止';
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '⏳ 正在调取声音...';
      if (statusEl) statusEl.textContent = '正在合成拟真音频...';

      try {
        var audioBuf = await fetchParagraphAudio(sampleText, voiceId, 'calm');

        if (audioBuf) {
          if (!fsState.audioCtx) {
            fsState.audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
          }
          if (fsState.audioCtx.state === 'suspended') {
            await fsState.audioCtx.resume();
          }

          var src = fsState.audioCtx.createBufferSource();
          src.buffer = audioBuf;
          src.connect(fsState.audioCtx.destination);
          src.onended = function () {
            btn.dataset.playing = 'false';
            btn.innerHTML = '▶️ 试听此声音';
            if (statusEl) statusEl.textContent = '播放完毕';
            btn.disabled = false;
          };
          auditionAudioSource = src;
          src.start(0);

          btn.dataset.playing = 'true';
          btn.innerHTML = '⏹️ 停止试听';
          btn.disabled = false;
          if (statusEl) statusEl.textContent = '正在播放 🎵';
        } else {
          // Graceful high quality browser voice + ambient tone fallback
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            var utt = new SpeechSynthesisUtterance(sampleText);
            utt.rate = 0.92;
            utt.pitch = 1.0;
            var isZh = /[\u4e00-\u9fa5]/.test(sampleText);
            var v = pickNaturalVoice(isZh);
            if (v) utt.voice = v;
            utt.onend = function () {
              btn.dataset.playing = 'false';
              btn.innerHTML = '▶️ 试听此声音';
              if (statusEl) statusEl.textContent = '播放完毕';
              btn.disabled = false;
            };
            utt.onerror = function () {
              btn.dataset.playing = 'false';
              btn.innerHTML = '▶️ 试听此声音';
              if (statusEl) statusEl.textContent = '就绪';
              btn.disabled = false;
            };
            window.speechSynthesis.speak(utt);

            btn.dataset.playing = 'true';
            btn.innerHTML = '⏹️ 停止试听';
            btn.disabled = false;
            if (statusEl) statusEl.textContent = '正在播放 🎵';
          } else {
            throw new Error('未获取到音频');
          }
        }
      } catch (err) {
        console.error('Audition error:', err);
        btn.disabled = false;
        btn.dataset.playing = 'false';
        btn.innerHTML = '▶️ 试听此声音';
        if (statusEl) statusEl.textContent = '播放完毕';
      }
    });
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

  /* ═══════ AI Vision (OpenRouter: GPT Image 2 & MiniMax H3 Max) ═══════ */
  var aiKeys = db.aiKeys || {};
  var aiPhotoRefB64 = null, aiPhotoAspect = '1:1';
  var aiVideoRefB64 = null;
  var currentAiSubTab = 'home';
  var currentGalleryFilter = 'all';

  function aiHasKeys() {
    return !!(aiKeys.openrouterKey || aiKeys.key);
  }
  function aiStatus(msg, type) {
    var pEl = $('#aiPhotoStatus');
    var vEl = $('#aiVideoStatus');
    var gEl = $('#aiStatus');
    [pEl, vEl, gEl].forEach(function (el) {
      if (!el) return;
      el.textContent = msg || '';
      el.className = 'ai-status-banner' + (type ? ' ' + type : '');
    });
  }
  function aiKeyStateTxt() {
    return aiHasKeys() ? 'Custom Key' : 'Supabase Cloud Key (Active)';
  }
  function updateKeyStateLabels() {
    var txt = aiKeyStateTxt();
    document.querySelectorAll('.ai-key-state-label, #aiKeyState').forEach(function (el) {
      el.textContent = txt;
    });
  }

  /* Sub-tab Switching: Photo Studio vs Video Studio */
  function updateUseRecentPhotoBtn() {
    var btn = $('#aiBtnUseRecentPhoto');
    if (!btn) return;
    var lastPhoto = (db.aiVision || []).filter(function (v) { return v.kind === 'photo'; })[0];
    if (lastPhoto && lastPhoto.url && !aiVideoRefB64) {
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  }

  function setAiSubTab(tab) {
    if (tab !== 'home' && tab !== 'photo' && tab !== 'video') tab = 'home';
    currentAiSubTab = tab;
    if (db) {
      db.aiVisionSubTab = tab;
      save();
    }

    var homeEl = $('#aiModeHome');
    var panelPhoto = $('#aiPanelPhoto');
    var panelVideo = $('#aiPanelVideo');

    if (homeEl) homeEl.classList.toggle('hidden', tab !== 'home');
    if (panelPhoto) panelPhoto.classList.toggle('active', tab === 'photo');
    if (panelVideo) panelVideo.classList.toggle('active', tab === 'video');

    // Context synchronization: if destination prompt is blank, copy over from other studio
    var photoPrompt = $('#aiPhotoPrompt');
    var videoPrompt = $('#aiVideoPrompt');
    if (tab === 'video' && videoPrompt && !videoPrompt.value.trim() && photoPrompt && photoPrompt.value.trim()) {
      videoPrompt.value = photoPrompt.value.trim();
      videoPrompt.dispatchEvent(new Event('input'));
    } else if (tab === 'photo' && photoPrompt && !photoPrompt.value.trim() && videoPrompt && videoPrompt.value.trim()) {
      photoPrompt.value = videoPrompt.value.trim();
      photoPrompt.dispatchEvent(new Event('input'));
    }

    updateUseRecentPhotoBtn();
  }

  var aiModeCards = document.querySelectorAll('.ai-mode-card');
  aiModeCards.forEach(function (c) {
    c.addEventListener('click', function () { setAiSubTab(c.dataset.subtab); });
  });
  var aiBackBtns = document.querySelectorAll('.ai-back-btn');
  aiBackBtns.forEach(function (b) {
    b.addEventListener('click', function () { setAiSubTab('home'); });
  });

  // Character counter for legacy Prompt
  var legacyPromptEl = $('#aiPrompt');
  if (legacyPromptEl) {
    legacyPromptEl.addEventListener('input', function () {
      var len = (this.value || '').length;
      var counter = $('#aiCharCount');
      if (counter) counter.textContent = len + ' / 800';
    });
  }

  // Inspiration Pills
  var inspirePills = document.querySelectorAll('.ai-inspire-pill');
  if (inspirePills && inspirePills.length) {
    inspirePills.forEach(function (pill) {
      pill.addEventListener('click', function () {
        var text = this.getAttribute('data-prompt') || '';
        var target = this.getAttribute('data-target');
        var targetEl = null;
        if (target === 'photo') {
          targetEl = $('#aiPhotoPrompt');
        } else if (target === 'video') {
          targetEl = $('#aiVideoPrompt');
        } else {
          targetEl = (currentAiSubTab === 'video') ? $('#aiVideoPrompt') : $('#aiPhotoPrompt');
        }
        if (!targetEl) targetEl = $('#aiPhotoPrompt') || $('#aiVideoPrompt') || $('#aiPrompt');

        if (targetEl) {
          targetEl.value = text;
          targetEl.dispatchEvent(new Event('input'));
          targetEl.focus();
        }
      });
    });
  }

  // Interactive AI Video Prompt Director: enrich & clarify user intent
  var aiBtnOptimize = $('#aiBtnOptimizePrompt');
  if (aiBtnOptimize) {
    aiBtnOptimize.addEventListener('click', function () {
      var targetInput = $('#aiVideoPrompt') || $('#aiPrompt');
      var text = (targetInput && targetInput.value || '').trim();
      if (!text) {
        aiStatus('Please enter your motion scene prompt or keywords first. The AI Director will expand it into cinematic shot directions.', 'error');
        if (targetInput) targetInput.focus();
        return;
      }

      var origBtnHtml = aiBtnOptimize.innerHTML;
      aiBtnOptimize.disabled = true;
      aiBtnOptimize.innerHTML = '<span>⏳ Director Composing…</span>';
      aiStatus('🎬 Calling AI Director to develop cinematic shot directions…', 'running');

      var userKey = aiKeys.openrouterKey || aiKeys.key || '';
      var srcInput = aiVideoRefB64 || aiPhotoRefB64;
      if (!srcInput) {
        var lastPhoto = (db.aiVision || []).filter(function (v) { return v.kind === 'photo'; })[0];
        if (lastPhoto && lastPhoto.url && lastPhoto.url.startsWith('data:')) {
          srcInput = lastPhoto.url;
        }
      }

      var optPayload = {
        prompt: text,
        quality_mode: currentCameraQuality,
        camera_quality: (IPHONE_TEXTURE_PROMPTS[currentCameraQuality] || {}).badge,
        image: srcInput || undefined
      };
      if (userKey) optPayload.openrouterKey = userKey;

      callUnifiedApi('optimize-video-prompt', optPayload)
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok || (data && data.error)) {
              throw new Error((data && data.error) || ('Director service error (' + res.status + ')'));
            }
            return data;
          });
        })
        .then(function (data) {
          aiBtnOptimize.disabled = false;
          aiBtnOptimize.innerHTML = origBtnHtml;
          if (data && data.success && data.optimizedPrompt) {
            if (targetInput) {
              targetInput.value = data.optimizedPrompt;
              targetInput.dispatchEvent(new Event('input'));
              targetInput.focus();
              targetInput.classList.add('ai-prompt-highlight');
              setTimeout(function () { targetInput.classList.remove('ai-prompt-highlight'); }, 2000);
            }
            var modelUsed = data.model || 'AI Director';
            aiStatus('✨ Cinematic shot directions composed by ' + modelUsed + '! Ready to generate or refine.', 'success');
          } else {
            var errMsg = (data && (data.error || data.message)) ? (data.error || data.message) : 'Unable to polish prompt; original prompt kept.';
            aiStatus('Director note: ' + errMsg, 'error');
          }
        })
        .catch(function (err) {
          aiBtnOptimize.disabled = false;
          aiBtnOptimize.innerHTML = origBtnHtml;
          console.warn('[Prompt Optimizer] Error:', err);
          aiStatus('Director note: ' + err.message + ' (System will still auto-optimize upon generation)', 'error');
        });
    });
  }

  // Reference Photos: Photo Studio Upload & Dropzone
  var photoDropEl = $('#aiPhotoDrop') || $('#aiDrop');
  var photoFileInput = $('#aiPhotoFile') || $('#aiPhoto');
  if (photoDropEl && photoFileInput) {
    photoDropEl.addEventListener('click', function () { photoFileInput.click(); });
    photoDropEl.addEventListener('dragover', function (e) {
      e.preventDefault();
      photoDropEl.style.borderColor = 'var(--accent)';
    });
    photoDropEl.addEventListener('dragleave', function () {
      photoDropEl.style.borderColor = '';
    });
    photoDropEl.addEventListener('drop', function (e) {
      e.preventDefault();
      photoDropEl.style.borderColor = '';
      var dt = e.dataTransfer;
      var f = dt && dt.files && dt.files[0];
      if (f && f.type.indexOf('image/') === 0) {
        processAiPhotoRef(f);
      }
    });
    photoFileInput.addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (f) processAiPhotoRef(f);
    });
  }

  function processAiPhotoRef(f) {
    compressImage(f, function (data, detectedAspect) {
      if (!data) {
        aiStatus('Unable to read photo. Please select another image file.', 'error');
        return;
      }
      aiPhotoRefB64 = data;
      aiPhotoAspect = detectedAspect || '1:1';
      var prevImg = $('#aiPhotoPrevImg') || $('#aiPrevImg');
      var prevBox = $('#aiPhotoPrevBox') || $('#aiPrevBox');
      if (prevImg) prevImg.src = data;
      if (prevBox) prevBox.classList.remove('hidden');
      aiStatus('Portrait reference attached (' + aiPhotoAspect + '). Facial features will be preserved.', 'success');
    });
  }

  var photoPrevClear = $('#aiPhotoPrevClear') || $('#aiPrevClear');
  if (photoPrevClear) {
    photoPrevClear.addEventListener('click', function () {
      aiPhotoRefB64 = null;
      aiPhotoAspect = '1:1';
      var prevBox = $('#aiPhotoPrevBox') || $('#aiPrevBox');
      if (prevBox) prevBox.classList.add('hidden');
      if (photoFileInput) photoFileInput.value = '';
      aiStatus('');
    });
  }

  // Reference Photos: Video Studio First-Frame Anchor Upload & Dropzone
  var videoDropEl = $('#aiVideoDrop');
  var videoFileInput = $('#aiVideoPhotoFile');
  if (videoDropEl && videoFileInput) {
    videoDropEl.addEventListener('click', function () { videoFileInput.click(); });
    videoDropEl.addEventListener('dragover', function (e) {
      e.preventDefault();
      videoDropEl.style.borderColor = 'var(--accent)';
    });
    videoDropEl.addEventListener('dragleave', function () {
      videoDropEl.style.borderColor = '';
    });
    videoDropEl.addEventListener('drop', function (e) {
      e.preventDefault();
      videoDropEl.style.borderColor = '';
      var dt = e.dataTransfer;
      var f = dt && dt.files && dt.files[0];
      if (f && f.type.indexOf('image/') === 0) {
        processAiVideoAnchor(f);
      }
    });
    videoFileInput.addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (f) processAiVideoAnchor(f);
    });
  }

  function processAiVideoAnchor(f) {
    compressImage(f, function (data) {
      if (!data) {
        aiStatus('Unable to read image file.', 'error');
        return;
      }
      aiVideoRefB64 = data;
      var prevImg = $('#aiVideoPrevImg');
      var prevBox = $('#aiVideoPrevBox');
      if (prevImg) prevImg.src = data;
      if (prevBox) prevBox.classList.remove('hidden');
      updateUseRecentPhotoBtn();
      aiStatus('First-frame portrait attached. Motion and likeness will be preserved from this anchor.', 'success');
    });
  }

  var videoPrevClear = $('#aiVideoPrevClear');
  if (videoPrevClear) {
    videoPrevClear.addEventListener('click', function () {
      aiVideoRefB64 = null;
      var prevBox = $('#aiVideoPrevBox');
      if (prevBox) prevBox.classList.add('hidden');
      if (videoFileInput) videoFileInput.value = '';
      updateUseRecentPhotoBtn();
      aiStatus('');
    });
  }

  // Use recent generated photo as video anchor
  if ($('#aiBtnUseRecentPhoto')) {
    $('#aiBtnUseRecentPhoto').addEventListener('click', function () {
      var lastPhoto = (db.aiVision || []).filter(function (v) { return v.kind === 'photo'; })[0];
      if (lastPhoto && lastPhoto.url) {
        aiVideoRefB64 = lastPhoto.url;
        var prevImg = $('#aiVideoPrevImg');
        var prevBox = $('#aiVideoPrevBox');
        if (prevImg) prevImg.src = lastPhoto.url;
        if (prevBox) prevBox.classList.remove('hidden');
        updateUseRecentPhotoBtn();
        aiStatus('✦ Set latest generated portrait as first-frame anchor!', 'success');
      }
    });
  }

  // Key Configuration Drawers & Handlers
  function toggleKeyDrawer(drawerId, inputId) {
    var box = $(drawerId);
    if (!box) return;
    box.classList.toggle('hidden');
    if (!box.classList.contains('hidden')) {
      var input = $(inputId);
      if (input) input.value = aiKeys.openrouterKey || aiKeys.key || '';
    }
  }

  function saveCustomKey(inputId, drawerId) {
    var input = $(inputId);
    var val = input ? input.value.trim() : '';
    aiKeys.openrouterKey = val;
    aiKeys.key = val;
    db.aiKeys = aiKeys;
    save();
    updateKeyStateLabels();
    aiStatus(val ? 'OpenRouter API Key saved successfully.' : 'Custom key cleared. Default system key will be used.', 'success');
    var box = $(drawerId);
    if (box) box.classList.add('hidden');
  }

  if ($('#aiKeyTogglePhoto')) {
    $('#aiKeyTogglePhoto').addEventListener('click', function () { toggleKeyDrawer('#aiKeyBoxPhoto', '#aiKeyPhoto'); });
  }
  if ($('#aiKeySavePhoto')) {
    $('#aiKeySavePhoto').addEventListener('click', function () { saveCustomKey('#aiKeyPhoto', '#aiKeyBoxPhoto'); });
  }
  if ($('#aiKeyToggleVideo')) {
    $('#aiKeyToggleVideo').addEventListener('click', function () { toggleKeyDrawer('#aiKeyBoxVideo', '#aiKeyVideo'); });
  }
  if ($('#aiKeySaveVideo')) {
    $('#aiKeySaveVideo').addEventListener('click', function () { saveCustomKey('#aiKeyVideo', '#aiKeyBoxVideo'); });
  }
  if ($('#aiKeyToggle')) {
    $('#aiKeyToggle').addEventListener('click', function () { toggleKeyDrawer('#aiKeyBox', '#aiKey'); });
  }
  if ($('#aiKeySave')) {
    $('#aiKeySave').addEventListener('click', function () { saveCustomKey('#aiKey', '#aiKeyBox'); });
  }

  // ═══════════════ Camera Aesthetic & Quality Selector (iPhone Textures) ═══════════════
  var currentCameraQuality = (db && db.cameraQuality) ? db.cameraQuality : 'iphonex'; // Default to iPhone X as requested

  var IPHONE_TEXTURE_PROMPTS = {
    iphonex: {
      key: 'iphonex',
      label: 'Documentary',
      badge: 'iPhone X',
      qualityParam: 'low',
      hint: 'Documentary (Native Camera · ~$0.006)',
      modifier: ', shot on Apple iPhone X camera, 28mm f/1.8 lens, authentic everyday smartphone snapshot, candid casual photography, natural true-to-life Apple color science, warm flattering skin tones, authentic skin micro-textures, zero artificial beauty smoothing, realistic dynamic range, subtle organic sensor grain in shadows, gentle natural lens flare, candid raw camera roll photo',
      videoModifier: 'Shot on Apple iPhone X rear camera, 4K 30fps handheld smartphone video, authentic iPhone X video recording aesthetic, 28mm f/1.8 lens with optical image stabilization, natural handheld micro-camera movement and subtle breathing, authentic smartphone auto-exposure adjustment, realistic motion blur, true-to-life Apple color science, warm natural skin tones without plastic AI smoothing, authentic skin pores and texture, candid smartphone vlog footage, unedited camera roll realism, natural ambient lighting, zero CGI or cartoonish gloss'
    },
    iphone16pro: {
      key: 'iphone16pro',
      label: 'Cinematic',
      badge: 'iPhone 16 Pro',
      qualityParam: 'low',
      hint: 'Flagship Clarity (Low ~$0.006)',
      modifier: ', shot on iPhone 16 Pro Max 48MP camera, 24mm f/1.78 lens, Apple Photonic Engine processing, Smart HDR 5, ultra-clean sharp focus, crisp optical clarity, natural skin micro-textures, true-to-life modern Apple color science, balanced highlights, clean shadows, premium commercial smartphone photography, high resolution candid portrait',
      videoModifier: 'Shot on iPhone 16 Pro Max 4K 60fps HDR video, Apple Action Mode stabilization, crisp optical clarity, Photonic Engine true-to-life color rendering, subtle handheld movement, natural skin detail, premium smartphone footage'
    },
    iphone7: {
      key: 'iphone7',
      label: 'Film Snapshot',
      badge: 'iPhone 7',
      qualityParam: 'low',
      hint: 'Vintage Grain Snapshot (Low ~$0.006)',
      modifier: ', shot on Apple iPhone 7 back camera, 28mm f/1.8 lens, authentic everyday snapshot, candid casual photography, subtle sensor noise, soft digital grain, natural slightly warm Apple color science, realistic raw dynamic range, unedited camera roll photo, slight motion blur, casual authentic lighting, no oversaturation, no artificial HDR halo, nostalgic mobile photography aesthetic',
      videoModifier: 'Shot on Apple iPhone 7 1080p video, 28mm lens, authentic early smartphone video look, subtle digital grain, warm nostalgic Apple color tones, casual handheld movement, raw snapshot video'
    }
  };

  function buildAdaptivePrompt(userPrompt, styleKey, hasImage) {
    var raw = (userPrompt || '').trim();
    var pLower = raw.toLowerCase();
    var isIphone7 = styleKey === 'iphone7';
    var isIphoneX = styleKey === 'iphonex';

    // 1. Conflict Check: Focal Length & Lens (焦段与景别)
    var hasCustomFocal = /(\b\d+mm\b|\btelephoto\b|\bmacro\b|\bclose-up\b|\bultra-wide\b|\bfisheye\b|\bwide-angle\b|\bzoom\b|长焦|微距|特写|大特写|超广角|鱼眼|\d+毫米|\d+mm)/i.test(pLower);

    // 2. Conflict Check: Color Temperature / Style (色温与色彩风格)
    var hasCoolTone = /(\b(cool|cold|blue|ice|frost|cyan|neon|cyberpunk)\b|冷调|冷色|偏冷|蓝调|赛博朋克|霓虹)/i.test(pLower);
    var hasMonochrome = /(\b(black and white|b&w|monochrome|grayscale|noir)\b|黑白|单色|灰度)/i.test(pLower);
    var hasWarmTone = /(\b(warm|golden hour|sunset|amber)\b|暖色|暖调|黄昏|金黄|夕阳)/i.test(pLower);

    // 3. Conflict Check: Texture / Grain (颗粒感与清晰度)
    var hasExplicitClean = /(\b(crystal clear|clean|no noise|no grain|sharp|ultra sharp)\b|高清|高画质|无噪点|无颗粒|极致清晰)/i.test(pLower);
    var hasExplicitGrain = /(\b(film grain|vintage|retro|grainy|lo-fi|polaroid)\b|胶片|噪点|颗粒|复古|老照片|拍立得)/i.test(pLower);

    // 4. Conflict Check: Camera Gear override (相机品牌)
    var hasCustomCamera = /(\b(sony|canon|nikon|fuji|fujifilm|leica|hasselblad|dslr)\b|佳能|索尼|尼康|富士|徕卡|哈苏|单反)/i.test(pLower);

    var parts = [];

    // Camera Body
    if (!hasCustomCamera) {
      if (isIphoneX) {
        parts.push('shot on Apple iPhone X camera');
      } else if (isIphone7) {
        parts.push('shot on Apple iPhone 7 back camera');
      } else {
        parts.push('shot on iPhone 16 Pro Max 48MP camera');
      }
    }

    // Focal length / Lens (only if user hasn't specified custom focal/lens)
    if (!hasCustomFocal) {
      parts.push((isIphoneX || isIphone7) ? '28mm f/1.8 lens' : '24mm f/1.78 lens');
    }

    // Color Science & Lighting
    if (hasMonochrome) {
      parts.push('fine-art monochrome black-and-white tonal depth, rich deep blacks, refined contrast');
    } else if (hasCoolTone) {
      parts.push('accurate Apple true-tone white balance rendering cool highlights, natural color fidelity');
    } else if (hasWarmTone) {
      parts.push('natural warm Apple color science, warm ambient illumination, no oversaturation');
    } else {
      if (isIphoneX) {
        parts.push('authentic Apple iPhone X color science, warm natural flattering skin tones, no plastic AI smoothing, subtle organic sensor grain, candid everyday smartphone photo');
      } else if (isIphone7) {
        parts.push('natural slightly warm Apple color science, casual authentic lighting, no oversaturation');
      } else {
        parts.push('Apple Photonic Engine processing, Smart HDR 5, true-to-life modern Apple color science, balanced highlights, clean shadows');
      }
    }

    // Texture, grain & sharpness
    if (isIphoneX) {
      parts.push('warm natural skin tones, authentic skin micro-textures, zero artificial beauty smoothing, candid real camera roll photo');
    } else if (isIphone7) {
      if (hasExplicitClean) {
        parts.push('authentic casual snapshot, unedited camera roll photo');
      } else {
        parts.push('authentic everyday snapshot, candid casual photography, subtle sensor noise, soft digital grain, realistic raw dynamic range, unedited camera roll photo, slight natural motion blur');
      }
    } else {
      if (hasExplicitGrain) {
        parts.push('natural skin micro-textures, true-to-life depth');
      } else {
        parts.push('ultra-clean sharp focus, crisp optical clarity, natural skin micro-textures');
      }
    }

    if (hasImage) {
      // Image-to-Image editing mode:
      // Focus strictly on the user request, preserving the original scene, identity, pose, and context.
      // DO NOT inject camera hardware, lens mm, or selfie keywords which hijack the scene.
      return 'In the reference image, make this modification: ' + raw + '. Keep the exact same person, face, facial features, hair, body, pose, and background environment intact, only modifying what is requested.';
    }

    // If no reference photo, add standard portrait closing
    if (isIphoneX) {
      parts.push('natural handheld mobile photography, authentic camera roll snapshot');
    } else if (isIphone7) {
      parts.push('nostalgic mobile photography aesthetic');
    } else {
      parts.push('premium commercial smartphone photography, high resolution candid portrait');
    }

    return raw + ', ' + parts.join(', ');
  }

  function expandIntentIfShort(raw, hasImage) {
    if (!raw) return '';
    var text = raw.trim();
    // If it's already a detailed English prompt (over 55 chars of Latin words), return as-is
    if (text.length > 55 && /^[a-zA-Z0-9\s,.'"-]+$/.test(text)) {
      return text;
    }

    // Check common high-level intent patterns and translate into concrete visual scenes
    if (/旅行|旅游|度假|去玩|散心|travel|vacation|holiday|trip/i.test(text)) {
      return 'on a luxury scenic vacation, leisurely walking along a sunlit Mediterranean coastal promenade overlooking turquoise ocean waters, gentle sea breeze swaying her dark hair, holding a refreshing iced drink, confident serene smile, vibrant travel holiday atmosphere';
    }
    if (/台上|演讲|发言|发布会|讲座|keynote|speech|stage/i.test(text)) {
      return 'giving a confident inspiring presentation on a modern illuminated amphitheater stage, poised posture, warm auditorium lighting, confident natural gestures, charismatic presence';
    }
    if (/咖啡|下午茶|街角|餐厅|cafe|coffee/i.test(text)) {
      return 'sitting at a charming sun-drenched outdoor Parisian café terrace, holding warm espresso cup, looking up with a radiant serene smile, chic casual attire, soft streetscape depth';
    }
    if (/沙滩|海边|海滩|海岸|beach|ocean|seaside/i.test(text)) {
      return 'walking barefoot on a warm golden sandy beach at sunset, gentle ocean waves lapping the shore, soft warm breeze, joyful serene expression, golden hour glow';
    }
    if (/开豪车|开车|豪车|跑车|驾驶|drive|luxury car/i.test(text)) {
      return 'sitting in the driver seat of a sleek luxury modern sports car, hands on the leather steering wheel, glancing towards the window with calm confident smile, city lights reflected';
    }
    if (/财富自由|成功|暴富|赚钱|富豪|rich|wealth|luxury|boss/i.test(text)) {
      return 'standing in a luxury penthouse overlooking the metropolitan city skyline at dusk, elegant modern attire, confident composed expression, warm architectural interior lighting';
    }
    if (/冥想|静心|瑜伽|沉思|meditation|zen|peace/i.test(text)) {
      return 'relaxing peacefully in a minimalist sunlit sanctuary surrounded by lush green foliage, tranquil serene breathing, soft dawn ambient glow';
    }

    // Default intent expansion if it's a short command like "让她..."
    var stripped = text.replace(/^(让[她他它你我]|请让[她他它你我]|帮[她他它你我]|安排[她他它你我])/g, '').trim();
    if (stripped) {
      return 'engaging in ' + stripped + ', smooth natural body movement, relaxed confident posture, authentic cinematic atmosphere';
    }
    return text;
  }

  function buildAdaptiveVideoPrompt(userPrompt, styleKey, hasImage) {
    var raw = (userPrompt || '').trim();
    var style = IPHONE_TEXTURE_PROMPTS[styleKey] || IPHONE_TEXTURE_PROMPTS.iphonex;
    var videoMod = style.videoModifier || IPHONE_TEXTURE_PROMPTS.iphonex.videoModifier;
    var intentEnriched = expandIntentIfShort(raw, hasImage);
    var audioNoDialogue = 'lips naturally relaxed or gentle closed smile, no singing, no spoken dialogue, no lip-sync, ambient environmental soundscape only';

    if (hasImage) {
      // Image-to-Video: With reference portrait anchored to the first frame
      return 'Starting seamlessly from the reference portrait in the first frame, the exact same person naturally: ' + intentEnriched + '. ' + videoMod + '. Seamless character and facial consistency with reference image, natural eye blinks and subtle breathing, smooth organic motion, ' + audioNoDialogue + '.';
    } else {
      // Text-to-Video:
      return intentEnriched + '. ' + videoMod + ', natural realistic character motion and lifelike presence, ' + audioNoDialogue + '.';
    }
  }

  function setCameraQuality(key) {
    if (!IPHONE_TEXTURE_PROMPTS[key]) return;
    currentCameraQuality = key;
    if (db) {
      db.cameraQuality = key;
      save();
    }
    var info = IPHONE_TEXTURE_PROMPTS[key];
    document.querySelectorAll('.ai-quality-card').forEach(function (card) {
      var q = card.getAttribute('data-quality');
      var isActive = q === key;
      card.classList.toggle('active', isActive);
      card.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });

    var photoHint = $('#aiPhotoQualityHint');
    if (photoHint) photoHint.textContent = info.hint;
    var videoHint = $('#aiVideoQualityHint');
    if (videoHint) videoHint.textContent = info.label;
    var legacyHint = $('#aiQualitySelectedHint');
    if (legacyHint) legacyHint.textContent = info.hint;
  }

  document.querySelectorAll('.ai-quality-card').forEach(function (card) {
    card.addEventListener('click', function () {
      var q = this.getAttribute('data-quality');
      if (q) setCameraQuality(q);
    });
  });
  setCameraQuality(currentCameraQuality);

  // Helper to translate raw technical errors/safety blocks into human-readable guidance
  function formatFriendlyAiError(rawErr, kind) {
    var str = String(rawErr || '');
    var lower = str.toLowerCase();

    // 1. Sensitive/Safety/Moderation Policy Violations
    if (lower.indexOf('sensitive') !== -1 || lower.indexOf('safety') !== -1 || lower.indexOf('moderation') !== -1 || lower.indexOf('nsfw') !== -1 || lower.indexOf('content policy') !== -1 || lower.indexOf('blocked') !== -1) {
      if (kind === 'video') {
        return 'Safety Moderation Notice: Video prompt or reference photo triggered the content safety policy. Please try a natural personal selfie or refine your prompt.';
      }
      return 'Safety Moderation Notice: Portrait prompt or reference photo triggered the content safety policy. Please avoid celebrity likenesses or sensitive imagery and retry.';
    }

    // 2. Face / Portrait detection or aspect ratio issues
    if (lower.indexOf('face') !== -1 || lower.indexOf('portrait') !== -1 || lower.indexOf('detect') !== -1) {
      return 'Portrait Analysis Notice: Could not detect a clear frontal face in the uploaded image. Please upload a well-lit, unobstructed selfie.';
    }

    // 3. Balance or Quota exhaustion
    if (lower.indexOf('credits') !== -1 || lower.indexOf('quota') !== -1 || lower.indexOf('balance') !== -1 || lower.indexOf('402') !== -1 || lower.indexOf('insufficient') !== -1) {
      return 'Account Balance Notice: OpenRouter API account has insufficient credits. Please top up or enter your custom key in Key Configuration above.';
    }

    // 4. Rate limits or Concurrent jobs
    if (lower.indexOf('rate limit') !== -1 || lower.indexOf('429') !== -1 || lower.indexOf('too many requests') !== -1 || lower.indexOf('concurrency') !== -1) {
      return 'Service Busy: Rate limit or queue concurrency reached. Please wait 30–60 seconds before trying again.';
    }

    // 5. Invalid duration/resolution parameters
    if (lower.indexOf('duration') !== -1 || lower.indexOf('resolution') !== -1 || lower.indexOf('invalid parameter') !== -1) {
      return 'Parameters Notice: 5s, 6s, 10s durations and 480p/768p resolutions supported. System calibrated automatically.';
    }

    // 6. Network or timeout
    if (lower.indexOf('timeout') !== -1 || lower.indexOf('longer than expected') !== -1) {
      return 'Rendering Notice: Cloud GPU is queueing during peak hours (renders take 1–2 mins). Please wait a moment.';
    }

    return (kind === 'video' ? 'Video generation note: ' : 'Portrait generation note: ') + str;
  }

  // Toggle Guidance Card
  var guidanceToggle = $('#aiGuidanceToggle');
  var guidanceBody = $('#aiGuidanceBody');
  var guidanceBtn = $('#aiGuidanceToggleBtn');
  if (guidanceToggle && guidanceBody) {
    guidanceToggle.addEventListener('click', function () {
      var isHidden = guidanceBody.classList.toggle('hidden');
      if (guidanceBtn) guidanceBtn.textContent = isHidden ? 'View Guidelines ▾' : 'Hide Guidelines ▴';
    });
  }

  /* Video Quality & Duration Selector (MiniMax H3 Max) */
  var currentVideoDuration = (db && db.videoDuration && [5, 6, 10].indexOf(db.videoDuration) !== -1) ? db.videoDuration : 5;
  var currentVideoResolution = (db && db.videoResolution && ['480p', '768p'].indexOf(db.videoResolution) !== -1) ? db.videoResolution : '480p';

  var VIDEO_PRICING = {
    '480p': {
      rate: 0.05,
      label: '480p Eco Smooth',
      hintPrefix: '480p Smooth',
      costs: { 5: '$0.25', 6: '$0.30', 10: '$0.50' }
    },
    '768p': {
      rate: 0.08,
      label: '768p Cinema HD',
      hintPrefix: '768p Cinema HD',
      costs: { 5: '$0.40', 6: '$0.48', 10: '$0.80' }
    }
  };

  function updateVideoPricingUI() {
    var p = VIDEO_PRICING[currentVideoResolution] || VIDEO_PRICING['480p'];

    var btn480 = $('#aiRes480p'), btn768 = $('#aiRes768p') || $('#aiRes720p');
    if (btn480 && btn768) {
      var is480 = currentVideoResolution === '480p';
      btn480.classList.toggle('active', is480);
      btn480.style.borderColor = is480 ? '#10b981' : 'var(--border)';
      btn480.style.background = is480 ? 'rgba(16,185,129,0.12)' : 'var(--surface-2)';
      btn480.style.color = is480 ? '#10b981' : 'var(--text-muted)';

      btn768.classList.toggle('active', !is480);
      btn768.style.borderColor = !is480 ? '#8b5cf6' : 'var(--border)';
      btn768.style.background = !is480 ? 'rgba(139,92,246,0.12)' : 'var(--surface-2)';
      btn768.style.color = !is480 ? '#8b5cf6' : 'var(--text-muted)';
    }

    [5, 6, 10].forEach(function (d) {
      var descEl = $('#aiDesc' + d + 's');
      if (d === 5) descEl.textContent = (currentVideoResolution === '480p' ? 'Recommended · ' : 'Cinema HD · ') + 'Real likeness & stereo audio';
      if (d === 6) descEl.textContent = 'Elegant motion · Smoother transition';
      if (d === 10) descEl.textContent = 'Extended story · Rich detail & full motion';
    });

    var hint = $('#aiVideoDurationHint');
    if (hint) {
      hint.textContent = p.hintPrefix + ' · ' + currentVideoDuration + 's';
    }

    var btnVideoSub = $('#aiBtnVideo .ai-btn-sub');
    if (btnVideoSub) {
      btnVideoSub.textContent = currentVideoDuration + 's · ' + currentVideoResolution;
    }
  }

  function setVideoResolution(res) {
    if (res === '720p') res = '768p';
    if (res !== '480p' && res !== '768p') res = '480p';
    currentVideoResolution = res;
    if (db) {
      db.videoResolution = res;
      save();
    }
    updateVideoPricingUI();
  }

  function setVideoDuration(sec) {
    sec = parseInt(sec, 10) || 5;
    if ([5, 6, 10].indexOf(sec) === -1) sec = 5;
    currentVideoDuration = sec;
    if (db) {
      db.videoDuration = sec;
      save();
    }

    [5, 6, 10].forEach(function (d) {
      var card = $('#aiDur' + d + 's');
      if (card) {
        var isActive = d === sec;
        card.classList.toggle('active', isActive);
        card.setAttribute('aria-checked', isActive ? 'true' : 'false');
      }
    });

    updateVideoPricingUI();
  }

  if ($('#aiRes480p')) {
    $('#aiRes480p').addEventListener('click', function () { setVideoResolution('480p'); });
  }
  if ($('#aiRes768p')) {
    $('#aiRes768p').addEventListener('click', function () { setVideoResolution('768p'); });
  } else if ($('#aiRes720p')) {
    $('#aiRes720p').addEventListener('click', function () { setVideoResolution('768p'); });
  }

  [5, 6, 10].forEach(function (d) {
    var card = $('#aiDur' + d + 's');
    if (card) {
      card.addEventListener('click', function () { setVideoDuration(d); });
    }
  });

  setVideoResolution(currentVideoResolution);
  setVideoDuration(currentVideoDuration);

  function fmtSec(s) {
    var m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function pollVideoJob(jobId, customKey, statusEl, done) {
    var tries = 0;
    var start = Date.now();
    var timer = setInterval(function () {
      tries++;
      var secs = Math.round((Date.now() - start) / 1000);

      callUnifiedApi('vision-video-status', {
        jobId: jobId,
        openrouterKey: customKey || undefined
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.error && !data.status) {
          clearInterval(timer);
          done(data.error, null);
          return;
        }
        var st = data.status || 'processing';
        if (st === 'completed' || st === 'succeed') {
          clearInterval(timer);
          var finalUrl = data.url;
          if (!finalUrl || finalUrl.startsWith('https://openrouter.ai/')) {
            var query = customKey ? ('?key=' + encodeURIComponent(customKey)) : '';
            finalUrl = '/api/ai/vision/video/content/' + encodeURIComponent(jobId) + query;
          }
          done(null, finalUrl);
        } else if (st === 'failed') {
          clearInterval(timer);
          done(data.error || 'Video generation encountered an error. Please try again.', null);
        } else {
          aiStatus('Rendering cinematic video… ' + fmtSec(secs) + ' (' + st + ')', 'running');
          if (tries >= 120) { // 10 minutes timeout
            clearInterval(timer);
            done('Video rendering is taking longer than expected. Please check back shortly.', null);
          }
        }
      })
      .catch(function (err) {
        if (tries >= 120) {
          clearInterval(timer);
          done(err.message || 'Network connection issue', null);
        }
      });
    }, 5000);
  }

  function aiGenerate(kind) {
    var prompt = '';
    if (kind === 'photo') {
      var pInput = $('#aiPhotoPrompt') || $('#aiPrompt');
      prompt = (pInput && pInput.value || '').trim();
      if (!prompt) {
        aiStatus('Please enter a description in "Portrait Vision Prompt" first.', 'error');
        if (pInput) pInput.focus();
        return;
      }
    } else {
      var vInput = $('#aiVideoPrompt') || $('#aiPrompt');
      prompt = (vInput && vInput.value || '').trim();
      if (!prompt) {
        aiStatus('Please enter a description in "Motion & Scene Prompt" first.', 'error');
        if (vInput) vInput.focus();
        return;
      }
    }

    var userKey = aiKeys.openrouterKey || aiKeys.key || '';
    var btnPhoto = $('#aiBtnPhoto');
    var btnVideo = $('#aiBtnVideo');
    if (btnPhoto) btnPhoto.disabled = true;
    if (btnVideo) btnVideo.disabled = true;

    if (kind === 'photo') {
      var cameraInfo = IPHONE_TEXTURE_PROMPTS[currentCameraQuality] || IPHONE_TEXTURE_PROMPTS.iphone16pro;
      var hasRefImage = Boolean(aiPhotoRefB64);
      var enhancedPrompt = buildAdaptivePrompt(prompt, currentCameraQuality, hasRefImage);

      aiStatus('✦ Rendering portrait (' + cameraInfo.label + ')… (~15s)', 'running');
      var photoPayload = {
        prompt: enhancedPrompt,
        raw_prompt: prompt,
        quality: cameraInfo.qualityParam,
        quality_mode: currentCameraQuality,
        image: aiPhotoRefB64 || undefined,
        aspect_ratio: hasRefImage ? (aiPhotoAspect || '1:1') : '1:1'
      };
      if (userKey) photoPayload.openrouterKey = userKey;

      callUnifiedApi('vision-photo', photoPayload)
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || data.error) throw new Error(data.error || ('Request failed (' + res.status + ')'));
          return data;
        });
      })
      .then(function (data) {
        if (btnPhoto) btnPhoto.disabled = false;
        if (btnVideo) btnVideo.disabled = false;

        if (!data.url) throw new Error('No image URL returned from generator');

        db.aiVision = db.aiVision || [];
        db.aiVision.unshift({
          id: uid(),
          kind: 'photo',
          model: 'openai/gpt-image-2',
          ts: Date.now(),
          prompt: prompt,
          cameraQuality: cameraInfo.badge,
          qualityMode: currentCameraQuality,
          url: data.url
        });
        save();
        aiStatus('✦ Portrait generated with ' + cameraInfo.label + '! View and download below.', 'success');
        updateUseRecentPhotoBtn();
        renderAiResults();
      })
      .catch(function (err) {
        if (btnPhoto) btnPhoto.disabled = false;
        if (btnVideo) btnVideo.disabled = false;

        var errMsg = err.message || '';
        aiStatus(formatFriendlyAiError(errMsg, 'photo'), 'error');
      });
    } else {
      // kind === 'video'
      var dur = currentVideoDuration || 5;
      var res = currentVideoResolution || '480p';
      var cameraInfo = IPHONE_TEXTURE_PROMPTS[currentCameraQuality] || IPHONE_TEXTURE_PROMPTS.iphonex;
      var srcInput = aiVideoRefB64 || aiPhotoRefB64;
      if (!srcInput) {
        var lastPhoto = (db.aiVision || []).filter(function (v) { return v.kind === 'photo'; })[0];
        if (lastPhoto && lastPhoto.url && lastPhoto.url.startsWith('data:')) {
          srcInput = lastPhoto.url;
        }
      }
      var hasRefImage = Boolean(srcInput);

      function dispatchVideoJob(finalPromptToSend, directorUsed) {
        var directorTag = directorUsed ? (' · Polished by ' + directorUsed) : '';
        aiStatus('Rendering cinematic video (' + dur + 's · ' + cameraInfo.badge + directorTag + ')… Initializing frames (~1-2m)', 'running');

        var videoPayload = {
          prompt: finalPromptToSend,
          raw_prompt: prompt,
          quality_mode: currentCameraQuality,
          camera_quality: cameraInfo.badge,
          image: srcInput || undefined,
          duration: dur,
          resolution: res,
          aspect_ratio: (aiPhotoAspect === '16:9' || aiPhotoAspect === '4:3') ? '16:9' : '9:16'
        };
        if (userKey) videoPayload.openrouterKey = userKey;

        callUnifiedApi('vision-video', videoPayload)
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok || data.error) throw new Error(data.error || ('Submission failed (' + res.status + ')'));
            return data;
          });
        })
        .then(function (data) {
          var jobId = data.jobId;
          if (!jobId) throw new Error('No video job ID returned from service');

          var finalTag = data.directorModel ? (' · Polished by ' + data.directorModel) : directorTag;
          aiStatus('Rendering cinematic video (' + dur + 's · ' + cameraInfo.badge + finalTag + ')… Initializing frames (~1-2m)', 'running');
          pollVideoJob(jobId, userKey, $('#aiVideoStatus'), function (pollErr, videoUrl) {
            if (btnPhoto) btnPhoto.disabled = false;
            if (btnVideo) btnVideo.disabled = false;

            if (pollErr) {
              aiStatus(formatFriendlyAiError(pollErr, 'video'), 'error');
              return;
            }

            db.aiVision = db.aiVision || [];
            db.aiVision.unshift({
              id: uid(),
              kind: 'video',
              model: 'minimax/hailuo-3-max',
              duration: dur,
              jobId: jobId,
              cameraQuality: cameraInfo.badge,
              qualityMode: currentCameraQuality,
              ts: Date.now(),
              prompt: prompt,
              rawPrompt: data.rawPrompt || prompt,
              optimizedPrompt: data.optimizedPrompt || null,
              directorModel: data.directorModel || directorUsed || null,
              url: videoUrl
            });
            save();
            var readyMsg = '▶ Cinematic video ready!' + (data.directorModel || directorUsed ? ' (Polished by AI Director)' : '');
            aiStatus(readyMsg, 'success');
            renderAiResults();
          });
        })
        .catch(function (err) {
          if (btnPhoto) btnPhoto.disabled = false;
          if (btnVideo) btnVideo.disabled = false;

          var errMsg = err.message || '';
          aiStatus(formatFriendlyAiError(errMsg, 'video'), 'error');
        });
      }

      var isDetailedEnglish = (prompt.length > 70 && /^[a-zA-Z0-9\s,.'"-]+$/.test(prompt.trim()));
      if (isDetailedEnglish) {
        var directPrompt = buildAdaptiveVideoPrompt(prompt, currentCameraQuality, hasRefImage);
        dispatchVideoJob(directPrompt, null);
      } else {
        aiStatus('🎬 AI Director is developing cinematic shot directions for "' + prompt.slice(0, 20) + '"…', 'running');
        var optPayload = {
          prompt: prompt,
          quality_mode: currentCameraQuality,
          camera_quality: cameraInfo.badge,
          image: srcInput || undefined
        };
        if (userKey) optPayload.openrouterKey = userKey;

        callUnifiedApi('optimize-video-prompt', optPayload)
          .then(function (res) { return res.json(); })
          .then(function (data) {
            var promptToUse = prompt;
            var dirUsed = null;
            if (data && data.success && data.optimizedPrompt) {
              promptToUse = data.optimizedPrompt;
              dirUsed = data.model || 'AI Director';
              var promptEl = $('#aiVideoPrompt') || $('#aiPrompt');
              if (promptEl) {
                promptEl.value = promptToUse;
                promptEl.dispatchEvent(new Event('input'));
                promptEl.classList.add('ai-prompt-highlight');
                setTimeout(function () { promptEl.classList.remove('ai-prompt-highlight'); }, 2000);
              }
            }
            var enhancedPrompt = buildAdaptiveVideoPrompt(promptToUse, currentCameraQuality, hasRefImage);
            dispatchVideoJob(enhancedPrompt, dirUsed);
          })
          .catch(function (optErr) {
            console.warn('[AI Director auto-expand] Using adaptive intent rules:', optErr);
            var enhancedPrompt = buildAdaptiveVideoPrompt(prompt, currentCameraQuality, hasRefImage);
            dispatchVideoJob(enhancedPrompt, 'Adaptive Rule Engine');
          });
      }
    }
  }

  if ($('#aiBtnPhoto')) $('#aiBtnPhoto').addEventListener('click', function () { aiGenerate('photo'); });
  if ($('#aiBtnVideo')) $('#aiBtnVideo').addEventListener('click', function () { aiGenerate('video'); });

  // Gallery Filter Chips
  function setGalleryFilter(filter) {
    currentGalleryFilter = filter;
    var fAll = $('#aiFilterAll');
    var fPhoto = $('#aiFilterPhoto');
    var fVideo = $('#aiFilterVideo');
    if (fAll) fAll.classList.toggle('active', filter === 'all');
    if (fPhoto) fPhoto.classList.toggle('active', filter === 'photo');
    if (fVideo) fVideo.classList.toggle('active', filter === 'video');
    renderAiResults();
  }

  if ($('#aiFilterAll')) $('#aiFilterAll').addEventListener('click', function () { setGalleryFilter('all'); });
  if ($('#aiFilterPhoto')) $('#aiFilterPhoto').addEventListener('click', function () { setGalleryFilter('photo'); });
  if ($('#aiFilterVideo')) $('#aiFilterVideo').addEventListener('click', function () { setGalleryFilter('video'); });

  function renderAiResults() {
    var wrap = $('#aiResults');
    if (!wrap) return;
    wrap.innerHTML = '';

    var allItems = db.aiVision || [];
    var items = allItems;
    if (currentGalleryFilter === 'photo') {
      items = allItems.filter(function (v) { return v.kind === 'photo'; });
    } else if (currentGalleryFilter === 'video') {
      items = allItems.filter(function (v) { return v.kind === 'video'; });
    }

    var countEl = $('#aiGalleryCount');
    if (countEl) {
      countEl.textContent = items.length === 1 ? '1 vision' : items.length + ' visions';
    }

    if (!items.length) {
      var emptyBox = el('div', 'ai-empty-box');
      var glyphIcon = currentGalleryFilter === 'video' ? '🎬' : (currentGalleryFilter === 'photo' ? '📸' : '🪞');
      var emptyTitle = currentGalleryFilter === 'video' ? 'No Motion Videos Yet' : (currentGalleryFilter === 'photo' ? 'No Portrait Photos Yet' : 'No Visions Manifested Yet');
      var emptySub = currentGalleryFilter === 'video'
        ? 'Switch to the Video Studio on the left to generate your first cinematic motion video.'
        : (currentGalleryFilter === 'photo'
          ? 'Switch to the Photo Studio on the left to create realistic portraits with native camera quality.'
          : 'Select either Photo Studio or Video Studio on the left to start manifesting your visions.');

      var glyph = el('div', 'ai-empty-glyph', glyphIcon);
      var title = el('div', 'ai-empty-title', emptyTitle);
      var desc = el('div', 'ai-empty-desc', emptySub);
      emptyBox.appendChild(glyph);
      emptyBox.appendChild(title);
      emptyBox.appendChild(desc);
      wrap.appendChild(emptyBox);
      return;
    }

    items.forEach(function (v) {
      var card = el('div', 'ai-card');

      var badgeTxt = '';
      var badgeClass = '';
      if (v.kind === 'video') {
        var cameraTag = v.cameraQuality ? (' · ' + v.cameraQuality) : '';
        var videoModelLabel = '▶ Motion Video';
        badgeTxt = videoModelLabel + cameraTag + (v.duration ? (' (' + v.duration + 's)') : '');
        badgeClass = 'video';
      } else if (v.source === 'free') {
        badgeTxt = '◈ Instant Draft';
        badgeClass = 'free';
      } else {
        badgeTxt = v.cameraQuality ? ('✦ ' + v.cameraQuality) : '✦ Portrait';
        badgeClass = 'photo';
      }

      var mediaContainer = el('div', 'ai-card-media');
      var badge = el('span', 'ai-type-pill ' + badgeClass, badgeTxt);
      mediaContainer.appendChild(badge);

      if (v.kind === 'photo') {
        var img = document.createElement('img');
        img.src = v.url;
        img.alt = v.prompt || 'Manifested vision';
        img.loading = 'lazy';
        img.addEventListener('click', function () {
          window.open(v.url, '_blank');
        });
        mediaContainer.appendChild(img);
      } else {
        var vid = document.createElement('video');
        vid.src = v.url;
        vid.controls = true;
        vid.playsInline = true;
        vid.preload = 'metadata';

        // Auto-recovery if video fails to load
        vid.addEventListener('error', function () {
          console.warn('[Video Player] Video failed to load:', v.url);
          if (v.jobId && !vid.dataset.recovering) {
            vid.dataset.recovering = 'true';
            var userKey = aiKeys.openrouterKey || aiKeys.key || '';
            callUnifiedApi('vision-video-status', { jobId: v.jobId, openrouterKey: userKey || undefined })
              .then(function (r) { return r.json(); })
              .then(function (d) {
                if (d.url && d.url !== v.url) {
                  v.url = d.url;
                  save();
                  vid.src = d.url;
                  vid.load();
                }
              }).catch(function () {});
          }
        });

        mediaContainer.appendChild(vid);
      }
      card.appendChild(mediaContainer);

      var body = el('div', 'ai-card-body');
      var p = el('p', 'ai-card-prompt', '“' + v.prompt + '”');
      body.appendChild(p);

      if (v.directorModel) {
        var directorBox = el('div', 'ai-director-meta', '🎬 AI Director: ' + v.directorModel);
        if (v.optimizedPrompt) {
          directorBox.title = 'AI Director Shot Directions:\n' + v.optimizedPrompt;
        }
        body.appendChild(directorBox);
      }

      var when = new Date(v.ts).toLocaleString([], {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      var meta = el('div', 'ai-card-meta', when);
      body.appendChild(meta);

      var actions = el('div', 'ai-card-actions');

      if (v.kind === 'video' && v.jobId) {
        var syncBtn = el('button', 'ai-action-dl', '🔄 Re-sync');
        syncBtn.type = 'button';
        syncBtn.title = 'Re-fetch video from server or OpenRouter';
        syncBtn.addEventListener('click', function () {
          syncBtn.disabled = true;
          syncBtn.textContent = 'Syncing…';
          var userKey = aiKeys.openrouterKey || aiKeys.key || '';
          callUnifiedApi('vision-video-status', { jobId: v.jobId, openrouterKey: userKey || undefined })
            .then(function (r) { return r.json(); })
            .then(function (d) {
              if (d.url) {
                v.url = d.url;
                save();
                renderAiResults();
              } else {
                alert('Video sync status: ' + (d.status || d.error || 'Still processing or link expired'));
                syncBtn.disabled = false;
                syncBtn.textContent = '🔄 Re-sync';
              }
            })
            .catch(function (err) {
              alert('Sync error: ' + err.message);
              syncBtn.disabled = false;
              syncBtn.textContent = '🔄 Re-sync';
            });
        });
        actions.appendChild(syncBtn);
      }

      var dl = el('a', 'ai-action-dl', '📥 Download ' + (v.kind === 'photo' ? 'Photo' : 'Video'));
      dl.href = v.url;
      dl.setAttribute('download', 'vision-' + v.id + (v.kind === 'photo' ? '.jpg' : '.mp4'));
      dl.addEventListener('click', function (e) {
        if (v.url.startsWith('data:')) return;
        e.preventDefault();
        fetch(v.url)
          .then(function (r) { return r.blob(); })
          .then(function (b) {
            var a = document.createElement('a');
            a.href = URL.createObjectURL(b);
            a.download = 'vision-' + v.id + (v.kind === 'photo' ? '.jpg' : '.mp4');
            document.body.appendChild(a);
            a.click();
            setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
          })
          .catch(function () {
            window.open(v.url, '_blank');
          });
      });
      actions.appendChild(dl);

      var delBtn = el('button', 'ai-action-del', '🗑️ Delete');
      delBtn.type = 'button';
      delBtn.addEventListener('click', function () {
        db.aiVision = (db.aiVision || []).filter(function (item) { return item.id !== v.id; });
        save();
        updateUseRecentPhotoBtn();
        renderAiResults();
      });
      actions.appendChild(delBtn);

      body.appendChild(actions);
      card.appendChild(body);
      wrap.appendChild(card);
    });
  }

  // Initial UI setups
  setAiSubTab(currentAiSubTab);
  setCameraQuality(currentCameraQuality);
  setVideoResolution(currentVideoResolution);
  setVideoDuration(currentVideoDuration);
  updateKeyStateLabels();
  updateUseRecentPhotoBtn();
  renderAiResults();

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

  var isDesktopPlatform = document.documentElement.classList.contains('device-desktop') || (window.innerWidth > 768);

  var wpState = {
    preset: 0,
    ratio: isDesktopPlatform ? 'desktop' : 'phone',
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
  // Deterministic PRNG for stable star seeds across repaints
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
  var WP_NATURE_PRESETS = [
    {
      id: 'forest',
      name: 'Misty Pine Forest',
      src: 'assets/nature/forest.jpg?v=202608260955',
      desktopSrc: 'assets/nature/desktop_forest.jpg?v=202608260955',
      vignette: 0.16
    },
    {
      id: 'alpine_lake',
      name: 'Alpine Lake Mirror',
      src: 'assets/nature/alpine_lake.jpg?v=202608260955',
      desktopSrc: 'assets/nature/desktop_alpine_lake.jpg?v=202608260955',
      vignette: 0.14
    },
    {
      id: 'golden_meadow',
      name: 'Golden Sunset Meadow',
      src: 'assets/nature/golden_meadow.jpg?v=202608260955',
      desktopSrc: 'assets/nature/desktop_golden_meadow.jpg?v=202608260955',
      vignette: 0.15
    },
    {
      id: 'ocean_waves',
      name: 'Serene Ocean Waves',
      src: 'assets/nature/ocean_waves.jpg?v=202608260955',
      desktopSrc: 'assets/nature/desktop_ocean_waves.jpg?v=202608260955',
      vignette: 0.18
    },
    {
      id: 'bamboo_grove',
      name: 'Zen Bamboo Grove',
      src: 'assets/nature/bamboo_grove.jpg?v=202608260955',
      desktopSrc: 'assets/nature/desktop_bamboo_grove.jpg?v=202608260955',
      vignette: 0.15
    },
    {
      id: 'tropical_island',
      name: 'Tropical Island Sanctuary',
      src: 'assets/nature/tropical_island.jpg?v=202608260955',
      desktopSrc: 'assets/nature/desktop_tropical_island.jpg?v=202608260955',
      vignette: 0.14
    }
  ];

  var wpPresetImgCache = {};
  var wpPresetImgCallbacks = {};

  function getPresetImage(presetIndex, ratioKey, callback) {
    if (typeof ratioKey === 'function') {
      callback = ratioKey;
      ratioKey = wpState.ratio;
    }
    ratioKey = ratioKey || wpState.ratio || 'phone';
    var preset = WP_NATURE_PRESETS[presetIndex];
    if (!preset) return null;
    var isDesk = ratioKey === 'desktop';
    var cacheKey = preset.id + (isDesk ? '_desktop' : '_phone');

    if (wpPresetImgCache[cacheKey] && wpPresetImgCache[cacheKey].complete && wpPresetImgCache[cacheKey].naturalWidth > 0) {
      if (callback) callback(wpPresetImgCache[cacheKey]);
      return wpPresetImgCache[cacheKey];
    }

    if (!wpPresetImgCallbacks[cacheKey]) {
      wpPresetImgCallbacks[cacheKey] = [];
    }
    if (callback) {
      wpPresetImgCallbacks[cacheKey].push(callback);
    }

    if (wpPresetImgCache[cacheKey]) {
      return wpPresetImgCache[cacheKey];
    }

    var primarySrc = (isDesk && preset.desktopSrc) ? preset.desktopSrc : preset.src;

    var img = new Image();
    img.crossOrigin = 'anonymous';
    wpPresetImgCache[cacheKey] = img;

    img.onload = function () {
      var cbs = wpPresetImgCallbacks[cacheKey] || [];
      wpPresetImgCallbacks[cacheKey] = [];
      cbs.forEach(function (cb) {
        try { cb(img); } catch (e) {}
      });
      if (wpState.preset === presetIndex && !wpState.photo) {
        renderWallpaper();
      }
    };
    img.onerror = function () {
      console.warn('Failed to load preset wallpaper image:', primarySrc);
    };
    img.src = primarySrc;
    return img;
  }

  // Preload all healing nature images for both phone (9:16) and desktop (16:9)
  WP_NATURE_PRESETS.forEach(function (p, i) {
    getPresetImage(i, 'phone');
    getPresetImage(i, 'desktop');
  });

  function updateWpBarUploadState() {
    var label = $('#wpBarUploadLabel');
    var ico = $('#wpBarUploadIco');
    var btn = $('#wpBarUploadBtn');
    if (!label || !btn) return;
    if (wpState.photo) {
      label.textContent = 'Re-upload';
      if (ico) ico.textContent = '🔄';
      btn.title = 'Re-upload custom photo';
    } else {
      label.textContent = 'Upload Photo';
      if (ico) ico.textContent = '📤';
      btn.title = 'Upload custom photo';
    }
  }

  function updateWpRatioUI() {
    $$('.wp-ratio').forEach(function (x) {
      x.classList.toggle('active', x.dataset.ratio === wpState.ratio);
    });
    var wrap = $('#wpBgs');
    if (wrap) {
      wrap.dataset.ratio = wpState.ratio;
      $$('.wp-bg').forEach(function (btn) {
        var idx = +btn.dataset.preset;
        var p = WP_NATURE_PRESETS[idx];
        if (p) {
          var img = btn.querySelector('img');
          if (img) {
            var isDesk = wpState.ratio === 'desktop';
            img.src = (isDesk && p.desktopSrc) ? p.desktopSrc : p.src;
          }
        }
      });
    }
  }

  function renderWpPresets() {
    var wrap = $('#wpBgs'); if (!wrap) return;
    wrap.dataset.ratio = wpState.ratio;
    wrap.innerHTML = '';
    var isDesk = wpState.ratio === 'desktop';
    WP_NATURE_PRESETS.forEach(function (p, i) {
      var btn = document.createElement('button');
      btn.className = 'wp-bg' + (wpState.preset === i && !wpState.photo ? ' active' : '');
      btn.type = 'button';
      btn.dataset.preset = i;
      btn.title = p.name;

      var primarySrc = (isDesk && p.desktopSrc) ? p.desktopSrc : p.src;

      var img = document.createElement('img');
      img.src = primarySrc;
      img.alt = '';
      btn.appendChild(img);

      btn.addEventListener('click', function () {
        wpState.preset = i;
        wpState.photo = null;
        wpState.photoOffsetX = 0;
        wpState.photoOffsetY = 0;
        wpState.photoScale = 1.0;
        $('#wpPrevBox').classList.add('hidden');
        $('#wpPhoto').value = '';
        updateWpPhotoControls();
        updateWpBarUploadState();
        $$('.wp-bg').forEach(function (b) { b.classList.toggle('active', +b.dataset.preset === i); });
        renderWallpaper();
      });
      wrap.appendChild(btn);
    });
  }

  function setActiveLayer(layer) {
    wpState.activeLayer = layer;
    var hint = $('#wpGestureHint');
    if (hint) {
      if (layer === 'photo') {
        hint.textContent = '🖼 Background active: Drag to pan · Scroll wheel or pinch to zoom';
      } else {
        hint.textContent = '✦ Text active: Drag text to place · Drag handles to resize · Drag background to pan';
      }
    }
    renderWallpaper();
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

  function applyWpUploadedPhoto(data) {
    if (!data) return;
    wpState.photo = data;
    wpState.photoScale = 1.0;
    wpState.photoOffsetX = 0;
    wpState.photoOffsetY = 0;
    $('#wpPrevImg').src = data;
    $('#wpPrevBox').classList.remove('hidden');
    $('#wpPhotoControls').classList.remove('hidden');
    $('#wpResetPhotoBtn').classList.remove('hidden');
    $$('.wp-bg').forEach(function (b) { b.classList.remove('active'); });
    updateWpPhotoControls();
    updateWpBarUploadState();
    setActiveLayer('photo');
    renderWallpaper();
    saveWpSettings();
  }

  var wpDropEl = $('#wpDrop');
  if (wpDropEl) {
    wpDropEl.addEventListener('click', function () { $('#wpPhoto').click(); });
    wpDropEl.addEventListener('dragover', function (e) {
      e.preventDefault();
      wpDropEl.classList.add('dragover');
    });
    wpDropEl.addEventListener('dragleave', function () {
      wpDropEl.classList.remove('dragover');
    });
    wpDropEl.addEventListener('drop', function (e) {
      e.preventDefault();
      wpDropEl.classList.remove('dragover');
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f) return;
      loadWpHighResPhoto(f, applyWpUploadedPhoto);
    });
  }

  $('#wpPhoto').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    loadWpHighResPhoto(f, applyWpUploadedPhoto);
  });

  $('#wpPrevClear').addEventListener('click', function () {
    wpState.photo = null;
    wpState.photoScale = 1.0;
    wpState.photoOffsetX = 0;
    wpState.photoOffsetY = 0;
    $('#wpPrevBox').classList.add('hidden');
    $('#wpPhoto').value = '';
    $('#wpPhotoControls').classList.add('hidden');
    $('#wpResetPhotoBtn').classList.add('hidden');
    updateWpBarUploadState();
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
      updateWpRatioUI();
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
      var img = null;
      if (wpState.photo) {
        img = wpImgCache;
      } else {
        var preset = WP_NATURE_PRESETS[wpState.preset] || WP_NATURE_PRESETS[0];
        var isDesk = wpState.ratio === 'desktop';
        img = wpPresetImgCache[preset.id + (isDesk ? '_desktop' : '_phone')];
      }
      if (!img) return;
      var ratio = WP_RATIOS[wpState.ratio];
      var imgW = img.naturalWidth || img.width || 1;
      var imgH = img.naturalHeight || img.height || 1;
      var ir = imgW / imgH, cr = ratio.w / ratio.h;
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
  /* ---- Real-Time Live Affirmation Text Editor & Canvas Input Bar ---- */
  function updateQuoteCharCounts() {
    var ta = $('#wpText');
    var live = $('#wpLiveInput');
    var val = (live && live.value !== undefined) ? live.value : (ta ? ta.value : '');
    var len = val.length;
    var max = (live && live.maxLength) || (ta && ta.maxLength) || 140;
    
    var counter = $('#wpQuoteCharCount');
    if (counter) counter.textContent = len + ' / ' + max;
    
    var liveBadge = $('#wpLiveCharCount');
    if (liveBadge) liveBadge.textContent = len + '/' + max;
  }

  function autoResizeWpText() {
    var ta = $('#wpText');
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.max(90, Math.min(220, ta.scrollHeight)) + 'px';
  }

  function autoResizeLiveInput(isFocused) {
    var live = $('#wpLiveInput');
    if (!live) return;
    var focused = (typeof isFocused === 'boolean') ? isFocused : (document.activeElement === live);
    if (!focused) {
      live.classList.remove('expanded');
      live.style.height = '28px';
    } else {
      live.classList.add('expanded');
      live.style.height = 'auto';
      var scrollH = live.scrollHeight;
      var newHeight = Math.max(28, Math.min(180, scrollH));
      live.style.height = newHeight + 'px';
    }
  }

  function syncAffirmationText(val, source) {
    var ta = $('#wpText');
    var live = $('#wpLiveInput');
    
    if (source !== 'text' && ta && ta.value !== val) {
      ta.value = val;
      autoResizeWpText();
    }
    if (source !== 'live' && live && live.value !== val) {
      live.value = val;
    }
    if (source === 'live' || document.activeElement === live) {
      autoResizeLiveInput(true);
    } else {
      autoResizeLiveInput(false);
    }
    updateQuoteCharCounts();
    renderWallpaper();
    saveWpSettings();
  }

  function openQuoteEditor() {
    setActiveLayer('text');
    var live = $('#wpLiveInput');
    if (live) {
      live.focus();
      autoResizeLiveInput(true);
      try { live.select(); } catch (e) {}
    } else {
      switchToWpTab('quote');
      var ta = $('#wpText');
      if (ta) ta.focus();
    }
  }

  if ($('#wpText')) {
    $('#wpText').addEventListener('input', function () {
      syncAffirmationText(this.value, 'text');
    });
  }

  if ($('#wpLiveInput')) {
    $('#wpLiveInput').addEventListener('input', function () {
      syncAffirmationText(this.value, 'live');
    });
    $('#wpLiveInput').addEventListener('focus', function () {
      setActiveLayer('text');
      document.body.classList.add('wp-typing');
      autoResizeLiveInput(true);
      if (window.innerWidth <= 768) {
        setTimeout(function () {
          var dock = $('#wpLiveDock');
          if (dock) {
            dock.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 150);
      }
    });
    $('#wpLiveInput').addEventListener('blur', function () {
      document.body.classList.remove('wp-typing');
      autoResizeLiveInput(false);
    });
    $('#wpLiveInput').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.blur();
      }
    });
  }

  if ($('#wpShuffle')) {
    $('#wpShuffle').addEventListener('click', function () {
      var q = WP_QUOTES[Math.floor(Math.random() * WP_QUOTES.length)];
      syncAffirmationText(q);
    });
  }

  if ($('#wpLiveShuffleBtn')) {
    $('#wpLiveShuffleBtn').addEventListener('click', function () {
      var q = WP_QUOTES[Math.floor(Math.random() * WP_QUOTES.length)];
      syncAffirmationText(q);
      var live = $('#wpLiveInput');
      if (live) {
        live.focus();
        autoResizeLiveInput(true);
      }
    });
  }

  if ($('#wpClearText')) {
    $('#wpClearText').addEventListener('click', function () {
      syncAffirmationText('');
      var ta = $('#wpText');
      if (ta) ta.focus();
    });
  }

  if ($('#wpLiveClearBtn')) {
    $('#wpLiveClearBtn').addEventListener('click', function () {
      syncAffirmationText('');
      var live = $('#wpLiveInput');
      if (live) {
        live.focus();
        autoResizeLiveInput(true);
      }
    });
  }

  if ($('#wpDoneEditBtn')) {
    $('#wpDoneEditBtn').addEventListener('click', function () {
      var ta = $('#wpText');
      if (ta && !ta.value.trim()) {
        syncAffirmationText(WP_QUOTES[0]);
      }
      if (ta) ta.blur();
      var live = $('#wpLiveInput');
      if (live) {
        live.blur();
        autoResizeLiveInput(false);
      }
    });
  }

  if ($('#wpLiveDoneBtn')) {
    $('#wpLiveDoneBtn').addEventListener('click', function () {
      var live = $('#wpLiveInput');
      if (live && !live.value.trim()) {
        syncAffirmationText(WP_QUOTES[0]);
      }
      if (live) {
        live.blur();
        autoResizeLiveInput(false);
      }
      var ta = $('#wpText');
      if (ta) ta.blur();
      setMobileWallpaperSelected(false);
    });
  }

  $$('.wp-sug-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var quote = btn.dataset.quote || btn.textContent.replace(/^.+?\s/, '');
      syncAffirmationText(quote);
    });
  });

  $$('.wp-live-sug-chip').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var quote = btn.dataset.quote || btn.textContent.replace(/^.+?\s/, '');
      syncAffirmationText(quote);
    });
  });

  if ($('#wpGestureHint')) {
    $('#wpGestureHint').style.cursor = 'pointer';
    $('#wpGestureHint').addEventListener('click', function () {
      if (wpState.activeLayer === 'text') {
        openQuoteEditor();
      }
    });
  }

  /* ---- Long-Press & Selection Mode for Mobile & Desktop ---- */
  wpState.isMobileSelected = false;
  var wpLongPressTimer = null;
  var wpTouchDownData = null;
  var lastCanvasTapTime = 0;
  var lastCanvasTapPos = { x: 0, y: 0 };

  function isMobileTouchMode() {
    return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 768));
  }

  function setMobileWallpaperSelected(selected) {
    wpState.isMobileSelected = !!selected;
    if (wpCanvas) wpCanvas.classList.toggle('is-selected', wpState.isMobileSelected);
    if (wpCanvasWrap) wpCanvasWrap.classList.toggle('is-selected', wpState.isMobileSelected);
    renderWallpaper();
  }

  // Double-click / Double-tap support as an additional quick toggle
  wpCanvas.addEventListener('dblclick', function (e) {
    setMobileWallpaperSelected(!wpState.isMobileSelected);
  });

  // Tap outside canvas or scroll outside to deselect on mobile and return to normal
  function handleOutsideCanvasDismiss(e) {
    if (wpState.isMobileSelected && isMobileTouchMode() && !wpState._dragging) {
      if (wpCanvas && !wpCanvas.contains(e.target) && !e.target.closest('.wp-studio-bar') && !e.target.closest('.wp-tab-panel') && !e.target.closest('.wp-live-dock')) {
        setMobileWallpaperSelected(false);
      }
    }
  }

  document.addEventListener('pointerdown', handleOutsideCanvasDismiss, true);
  document.addEventListener('touchstart', handleOutsideCanvasDismiss, { passive: true, capture: true });

  window.addEventListener('scroll', function () {
    if (wpState.isMobileSelected && isMobileTouchMode() && !wpState._dragging) {
      setMobileWallpaperSelected(false);
    }
  }, { passive: true });

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
      var handleHitR = Math.max(52, b.px * 0.8);
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
      var padX = Math.max(35, b.px * 0.45);
      var padY = Math.max(35, b.px * 0.45);
      if (p.x >= b.x - padX && p.x <= b.x + b.w + padX && p.y >= b.y - padY && p.y <= b.y + b.h + padY) {
        return { target: 'text', box: b };
      }
    }
    return { target: 'photo' };
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
      } else {
        wpCanvas.style.cursor = 'grab';
      }
    }
  });

  // Pointer tracking & multi-touch pinch state
  var wpActivePointers = new Map();
  var wpDragStartData = null;
  var wpPinchStart = null;

  function initDragForPoint(clientX, clientY, pointerId, explicitTarget) {
    var p = wpCanvasPoint(clientX, clientY);
    var ratio = WP_RATIOS[wpState.ratio];
    var hit = wpHitTest(p);
    var target = explicitTarget || hit.target;

    wpState._dragging = true;
    wpState._dragTarget = target;
    wpState._activeHandle = hit.handle || null;

    if (target === 'text-handle') {
      wpCanvas.classList.add('resizing');
      wpDragStartData = {
        initP: p,
        initSize: wpState.size,
        cx: hit.box ? hit.box.cx : wpState.textNX * ratio.w,
        cy: hit.box ? hit.box.cy : wpState.textNY * ratio.h,
        initDist: hit.box ? Math.hypot(p.x - hit.box.cx, p.y - hit.box.cy) || 1 : 1
      };
      setActiveLayer('text');
    } else if (target === 'text') {
      wpCanvas.classList.add('dragging');
      wpDragStartData = {
        offX: p.x - wpState.textNX * ratio.w,
        offY: p.y - wpState.textNY * ratio.h
      };
      setActiveLayer('text');
    } else {
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

    if (pointerId && wpCanvas.setPointerCapture) {
      try { wpCanvas.setPointerCapture(pointerId); } catch (_) {}
    }
    renderWallpaper();
  }

  wpCanvas.addEventListener('pointerdown', function (e) {
    var isTouch = e.pointerType === 'touch' || isMobileTouchMode();

    if (wpLongPressTimer) {
      clearTimeout(wpLongPressTimer);
      wpLongPressTimer = null;
    }

    wpActivePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-touch pinch zoom
    if (wpActivePointers.size === 2) {
      if (wpLongPressTimer) {
        clearTimeout(wpLongPressTimer);
        wpLongPressTimer = null;
      }
      var pts = Array.from(wpActivePointers.values());
      var dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      var midX = (pts[0].x + pts[1].x) / 2;
      var midY = (pts[0].y + pts[1].y) / 2;
      var midP = wpCanvasPoint(midX, midY);
      var hitMid = wpHitTest(midP);

      // Determine pinch target layer:
      // If user specifically has text layer active and pinched on text box, scale text.
      // Otherwise (selected background, long-pressed wallpaper, or pinching wallpaper), scale wallpaper background!
      var targetLayer = 'photo';
      if (wpState.activeLayer === 'text' && (hitMid.target === 'text' || hitMid.target === 'text-handle')) {
        targetLayer = 'text';
      } else if (wpState.activeLayer === 'photo' || hitMid.target === 'photo') {
        targetLayer = 'photo';
      }

      wpPinchStart = {
        dist: dist || 1,
        initSize: wpState.size,
        initPhotoScale: wpState.photoScale || 1.0,
        layer: targetLayer
      };
      e.preventDefault();
      return;
    }

    var p = wpCanvasPoint(e.clientX, e.clientY);
    var hit = wpHitTest(p);

    wpTouchDownData = {
      startX: e.clientX,
      startY: e.clientY,
      pointerId: e.pointerId,
      time: Date.now(),
      target: hit.target,
      handle: hit.handle || null,
      moved: false,
      isTouch: isTouch
    };

    // On mobile touch: detect Long-Press (长按 320ms) to select & start moving
    if (isTouch) {
      // Check for double tap as quick toggle
      var now = Date.now();
      var timeDiff = now - lastCanvasTapTime;
      var tapDist = Math.hypot(e.clientX - lastCanvasTapPos.x, e.clientY - lastCanvasTapPos.y);

      if (timeDiff > 0 && timeDiff < 380 && tapDist < 40) {
        lastCanvasTapTime = 0;
        setMobileWallpaperSelected(!wpState.isMobileSelected);
        if (wpState.isMobileSelected) {
          if (hit.target === 'text' || hit.target === 'text-handle') {
            setActiveLayer('text');
          } else {
            setActiveLayer('photo');
          }
        }
        if (navigator.vibrate) {
          try { navigator.vibrate(30); } catch (_) {}
        }
        e.preventDefault();
        return;
      }
      lastCanvasTapTime = now;
      lastCanvasTapPos = { x: e.clientX, y: e.clientY };

      // If not yet in selected edit mode: start Long Press timer
      if (!wpState.isMobileSelected) {
        wpLongPressTimer = setTimeout(function () {
          wpLongPressTimer = null;
          if (!wpTouchDownData || wpTouchDownData.moved) return;

          // Long press success!
          if (navigator.vibrate) {
            try { navigator.vibrate(40); } catch (_) {}
          }
          setMobileWallpaperSelected(true);
          initDragForPoint(wpTouchDownData.startX, wpTouchDownData.startY, wpTouchDownData.pointerId, wpTouchDownData.target);
        }, 320);
        return;
      }
    }

    // If already in selected edit mode OR on desktop mouse:
    initDragForPoint(e.clientX, e.clientY, e.pointerId, hit.target);
    e.preventDefault();
  });

  wpCanvas.addEventListener('pointermove', function (e) {
    if (!wpActivePointers.has(e.pointerId)) return;
    wpActivePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (wpTouchDownData) {
      var distMove = Math.hypot(e.clientX - wpTouchDownData.startX, e.clientY - wpTouchDownData.startY);
      if (distMove > 8) {
        wpTouchDownData.moved = true;
        if (wpLongPressTimer) {
          clearTimeout(wpLongPressTimer);
          wpLongPressTimer = null;
        }
      }
    }

    // Handle 2-finger pinch
    if (wpActivePointers.size === 2 && wpPinchStart) {
      var pts = Array.from(wpActivePointers.values());
      var dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      var pinchFactor = dist / wpPinchStart.dist;

      if (wpPinchStart.layer === 'photo') {
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
    e.preventDefault();

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
    if (wpLongPressTimer) {
      clearTimeout(wpLongPressTimer);
      wpLongPressTimer = null;
    }
    wpTouchDownData = null;

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

  // Mouse wheel zoom on canvas (when Ctrl/Cmd/Alt modifier is held, otherwise smooth column scrolling)
  wpCanvas.addEventListener('wheel', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      var delta = e.deltaY < 0 ? 1 : -1;
      var p = wpCanvasPoint(e.clientX, e.clientY);
      var hit = wpHitTest(p);

      if (hit.target === 'photo' || wpState.activeLayer === 'photo') {
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
    }
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
      var isTouchMobile = isMobileTouchMode();
      var isSelectedForEdit = !isTouchMobile || wpState.isMobileSelected;

      if (wpState._dragging) {
        wpDrawGuides(c, ratio);
      }
      if (isSelectedForEdit && (wpState.activeLayer === 'text' || wpState._dragging)) {
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
  function paintWallpaperToCanvas(cnv, forExport) {
    if (!cnv) return;
    var ratio = WP_RATIOS[wpState.ratio];
    cnv.width = ratio.w; cnv.height = ratio.h;
    cnv.style.aspectRatio = ratio.w + ' / ' + ratio.h;
    var c = cnv.getContext('2d');

    function paint() {
      if (wpState.photo) {
        if (wpImgCache) {
          drawCoverScaled(c, wpImgCache, ratio.w, ratio.h, wpState.photoScale, wpState.photoOffsetX, wpState.photoOffsetY);
        }
        drawWpText(c, ratio, !!forExport);
      } else {
        var preset = WP_NATURE_PRESETS[wpState.preset] || WP_NATURE_PRESETS[0];
        var isDesk = wpState.ratio === 'desktop';
        var cacheKey = preset.id + (isDesk ? '_desktop' : '_phone');
        var cached = wpPresetImgCache[cacheKey];
        if (cached && cached.complete && cached.naturalWidth > 0) {
          drawCoverScaled(c, cached, ratio.w, ratio.h, wpState.photoScale, wpState.photoOffsetX, wpState.photoOffsetY);
          if (preset.vignette) {
            wpVignette(c, ratio.w, ratio.h, preset.vignette);
          }
          drawWpText(c, ratio, !!forExport);
        } else {
          // Draw instant peaceful nature gradient background so canvas is never black
          c.clearRect(0, 0, ratio.w, ratio.h);
          var grad = c.createLinearGradient(0, 0, ratio.w, ratio.h);
          grad.addColorStop(0, '#1a3323');
          grad.addColorStop(0.5, '#2b5239');
          grad.addColorStop(1, '#112117');
          c.fillStyle = grad;
          c.fillRect(0, 0, ratio.w, ratio.h);
          drawWpText(c, ratio, !!forExport);

          getPresetImage(wpState.preset, wpState.ratio, function (loadedImg) {
            if (loadedImg && loadedImg.complete && loadedImg.naturalWidth > 0) {
              c.clearRect(0, 0, ratio.w, ratio.h);
              drawCoverScaled(c, loadedImg, ratio.w, ratio.h, wpState.photoScale, wpState.photoOffsetX, wpState.photoOffsetY);
              if (preset.vignette) {
                wpVignette(c, ratio.w, ratio.h, preset.vignette);
              }
              drawWpText(c, ratio, !!forExport);
            }
          });
        }
      }
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

  function renderWallpaper(forExport) {
    var cnv = $('#wpCanvas');
    if (cnv) {
      paintWallpaperToCanvas(cnv, forExport);
    }
    var fsModal = $('#wpFullscreenModal');
    if (fsModal && !fsModal.classList.contains('hidden')) {
      var fsCnv = $('#wpFsCanvas');
      if (fsCnv) {
        paintWallpaperToCanvas(fsCnv, true);
      }
    }
  }

  function triggerWallpaperExport() {
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
  }

  var wpExportBtn = $('#wpExport');
  if (wpExportBtn) {
    wpExportBtn.addEventListener('click', triggerWallpaperExport);
  }
  var wpTopExportBtn = $('#wpTopExportBtn');
  if (wpTopExportBtn) {
    wpTopExportBtn.addEventListener('click', triggerWallpaperExport);
  }

  /* ═══════ Full-Screen Immersive Wallpaper Preview ═══════ */
  var wpFullscreenModal = $('#wpFullscreenModal');
  var wpFsFrame = $('#wpFsFrame');
  var wpFsCanvas = $('#wpFsCanvas');
  var wpFsMockOverlay = $('#wpFsMockOverlay');
  var wpFsIdleTimer = null;

  function resetFsIdleTimer(duration) {
    if (!wpFullscreenModal || wpFullscreenModal.classList.contains('hidden')) return;
    wpFullscreenModal.classList.remove('idle');
    clearTimeout(wpFsIdleTimer);
    var timeout = typeof duration === 'number' ? duration : 2000;
    wpFsIdleTimer = setTimeout(function () {
      if (wpFullscreenModal && !wpFullscreenModal.classList.contains('hidden')) {
        wpFullscreenModal.classList.add('idle');
      }
    }, timeout);
  }

  function updateFullscreenPreviewUI() {
    if (!wpFullscreenModal || wpFullscreenModal.classList.contains('hidden')) return;

    var isDesk = wpState.ratio === 'desktop';
    if (wpFsFrame) {
      wpFsFrame.setAttribute('data-ratio', isDesk ? 'desktop' : 'phone');
    }
    
    var ratioLabel = $('#wpFsRatioLabel');
    if (ratioLabel) {
      ratioLabel.textContent = isDesk ? '16:9 Desktop (Full Display)' : '9:16 Phone (Lock Screen)';
    }

    var ratioIco = $('#wpFsRatioIco');
    var ratioTxt = $('#wpFsRatioTxt');
    if (ratioIco && ratioTxt) {
      ratioIco.textContent = isDesk ? '📱' : '💻';
      ratioTxt.textContent = isDesk ? 'Phone (9:16)' : 'Desktop (16:9)';
    }

    // Update real time for realistic lock screen mockup
    var now = new Date();
    var hrs = String(now.getHours()).padStart(2, '0');
    var mins = String(now.getMinutes()).padStart(2, '0');
    var timeStr = hrs + ':' + mins;
    var mockTime = $('#wpFsMockTime');
    var mockBigTime = $('#wpFsMockBigTime');
    if (mockTime) mockTime.textContent = timeStr;
    if (mockBigTime) mockBigTime.textContent = timeStr;

    var mockDate = $('#wpFsMockDate');
    if (mockDate) {
      var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      mockDate.textContent = days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + now.getDate();
    }

    if (wpFsCanvas) {
      paintWallpaperToCanvas(wpFsCanvas, true);
    }
  }

  function requestNativeFullscreen() {
    var el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(function () {});
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen().catch(function () {});
    } else if (el.mozRequestFullScreen) {
      el.mozRequestFullScreen().catch(function () {});
    } else if (el.msRequestFullscreen) {
      el.msRequestFullscreen().catch(function () {});
    }
  }

  function exitNativeFullscreen() {
    var isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    if (isFs) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(function () {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen().catch(function () {});
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen().catch(function () {});
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen().catch(function () {});
      }
    }
  }

  function openWallpaperFullscreen() {
    if (!wpFullscreenModal) return;
    wpFullscreenModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    updateFullscreenPreviewUI();
    resetFsIdleTimer();
    
    // Automatically trigger native browser fullscreen by default on both desktop & mobile
    requestNativeFullscreen();
    updateBrowserFsBtnState();
  }

  function closeWallpaperFullscreen() {
    if (!wpFullscreenModal) return;
    wpFullscreenModal.classList.add('hidden');
    document.body.style.overflow = '';
    clearTimeout(wpFsIdleTimer);
    exitNativeFullscreen();
    updateBrowserFsBtnState();
  }

  var wasIdleOnTouch = false;
  var lastTouchTime = 0;

  if (wpFullscreenModal) {
    wpFullscreenModal.addEventListener('mousemove', function () {
      resetFsIdleTimer(2000);
    });

    wpFullscreenModal.addEventListener('touchstart', function () {
      wasIdleOnTouch = wpFullscreenModal.classList.contains('idle');
      lastTouchTime = Date.now();
      resetFsIdleTimer(2000);
    }, { passive: true });

    wpFullscreenModal.addEventListener('touchmove', function () {
      resetFsIdleTimer(2000);
    }, { passive: true });

    wpFullscreenModal.addEventListener('click', function (e) {
      var isRecentTouch = (Date.now() - lastTouchTime) < 500;
      var isStageOrBackdrop = (
        e.target === wpFsCanvas ||
        e.target === wpFsFrame ||
        e.target === wpFullscreenModal ||
        (e.target.classList && (e.target.classList.contains('wp-fs-backdrop') || e.target.classList.contains('wp-fs-stage')))
      );

      if (isStageOrBackdrop) {
        if (isRecentTouch) {
          // Triggered by mobile tap
          if (wasIdleOnTouch) {
            // It was hidden before tap, now woken up -> KEEP it visible for 2s!
            resetFsIdleTimer(2000);
          } else {
            // It was already visible before tap -> clicking empty background dismisses it
            clearTimeout(wpFsIdleTimer);
            wpFullscreenModal.classList.add('idle');
          }
        } else {
          // Desktop mouse click
          if (wpFullscreenModal.classList.contains('idle')) {
            resetFsIdleTimer(2000);
          } else {
            clearTimeout(wpFsIdleTimer);
            wpFullscreenModal.classList.add('idle');
          }
        }
      } else {
        // Clicked on toolbar buttons or other controls
        resetFsIdleTimer(2000);
      }
      wasIdleOnTouch = false;
    });
  }

  /* Canvas In-Box Fullscreen Button Hover / Touch 3-second Timer */
  var wpCanvasWrap = $('#wpCanvasWrap');
  var wpCanvasExpandBtn = $('#wpCanvasExpandBtn');
  var wpCanvasBtnTimer = null;

  function positionCanvasExpandBtn() {
    if (!wpCanvasExpandBtn || !wpCanvas) return;
    var canvasRect = wpCanvas.getBoundingClientRect();
    var wrapRect = wpCanvasWrap ? wpCanvasWrap.getBoundingClientRect() : canvasRect;
    if (canvasRect.width > 0 && canvasRect.height > 0) {
      var offsetRight = Math.max(8, wrapRect.right - canvasRect.right + 10);
      var offsetTop = Math.max(8, canvasRect.top - wrapRect.top + 10);
      wpCanvasExpandBtn.style.right = offsetRight + 'px';
      wpCanvasExpandBtn.style.top = offsetTop + 'px';
    }
  }

  function showCanvasExpandBtn() {
    if (!wpCanvasExpandBtn) return;
    positionCanvasExpandBtn();
    wpCanvasExpandBtn.classList.add('visible');
    clearTimeout(wpCanvasBtnTimer);
    wpCanvasBtnTimer = setTimeout(function () {
      if (wpCanvasExpandBtn && !wpCanvasExpandBtn.matches(':hover')) {
        wpCanvasExpandBtn.classList.remove('visible');
      }
    }, 3000);
  }

  function hideCanvasExpandBtn() {
    clearTimeout(wpCanvasBtnTimer);
    if (wpCanvasExpandBtn && !wpCanvasExpandBtn.matches(':hover')) {
      wpCanvasExpandBtn.classList.remove('visible');
    }
  }

  if (wpCanvasWrap) {
    wpCanvasWrap.addEventListener('mouseenter', showCanvasExpandBtn);
    wpCanvasWrap.addEventListener('mousemove', showCanvasExpandBtn);
    wpCanvasWrap.addEventListener('touchstart', showCanvasExpandBtn, { passive: true });
    wpCanvasWrap.addEventListener('touchmove', showCanvasExpandBtn, { passive: true });
    wpCanvasWrap.addEventListener('mouseleave', function () {
      hideCanvasExpandBtn();
    });
  }

  if (wpCanvasExpandBtn) {
    wpCanvasExpandBtn.addEventListener('mouseenter', function () {
      clearTimeout(wpCanvasBtnTimer);
      wpCanvasExpandBtn.classList.add('visible');
    });
    wpCanvasExpandBtn.addEventListener('mouseleave', function () {
      showCanvasExpandBtn();
    });
    wpCanvasExpandBtn.addEventListener('click', openWallpaperFullscreen);
  }

  var wpFsCloseBtn = $('#wpFsCloseBtn');
  if (wpFsCloseBtn) {
    wpFsCloseBtn.addEventListener('click', closeWallpaperFullscreen);
  }

  var wpFsBackdrop = $('#wpFsBackdrop');
  if (wpFsBackdrop) {
    wpFsBackdrop.addEventListener('click', closeWallpaperFullscreen);
  }

  var wpFsBrowserFsBtn = $('#wpFsBrowserFsBtn');
  if (wpFsBrowserFsBtn) {
    wpFsBrowserFsBtn.addEventListener('click', function () {
      var isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
      if (!isFs) {
        requestNativeFullscreen();
      } else {
        exitNativeFullscreen();
      }
      resetFsIdleTimer(2000);
    });
  }

  function updateBrowserFsBtnState() {
    var isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
    var ico = $('#wpFsBrowserFsIco');
    var txt = $('#wpFsBrowserFsTxt');
    var btn = $('#wpFsBrowserFsBtn');
    if (ico) ico.textContent = isFs ? '🗗' : '⛶';
    if (txt) txt.textContent = isFs ? 'Exit Screen' : 'Fullscreen';
    if (btn) btn.classList.toggle('active', isFs);
  }

  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(function (evt) {
    document.addEventListener(evt, updateBrowserFsBtnState);
  });

  var wpFsExportBtn = $('#wpFsExportBtn');
  if (wpFsExportBtn) {
    wpFsExportBtn.addEventListener('click', function () {
      triggerWallpaperExport();
    });
  }

  var wpFsShuffleBtn = $('#wpFsShuffleBtn');
  if (wpFsShuffleBtn) {
    wpFsShuffleBtn.addEventListener('click', function () {
      var quote = WP_QUOTES[Math.floor(Math.random() * WP_QUOTES.length)];
      syncAffirmationText(quote, 'fs');
      updateFullscreenPreviewUI();
      resetFsIdleTimer();
    });
  }

  var wpFsRatioBtn = $('#wpFsRatioBtn');
  if (wpFsRatioBtn) {
    wpFsRatioBtn.addEventListener('click', function () {
      wpState.ratio = wpState.ratio === 'desktop' ? 'phone' : 'desktop';
      updateWpRatioUI();
      renderWpPresets();
      renderWallpaper();
      updateFullscreenPreviewUI();
      saveWpSettings();
      resetFsIdleTimer();
    });
  }

  var wpFsToggleClockBtn = $('#wpFsToggleClockBtn');
  if (wpFsToggleClockBtn) {
    wpFsToggleClockBtn.addEventListener('click', function () {
      if (wpFsMockOverlay) {
        var isHidden = wpFsMockOverlay.classList.contains('hidden');
        wpFsMockOverlay.classList.toggle('hidden', !isHidden);
        wpFsToggleClockBtn.classList.toggle('active', isHidden);
      }
      resetFsIdleTimer();
    });
  }

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && wpFullscreenModal && !wpFullscreenModal.classList.contains('hidden')) {
      closeWallpaperFullscreen();
    }
  });

  window.addEventListener('resize', function () {
    if (wpFullscreenModal && !wpFullscreenModal.classList.contains('hidden')) {
      updateFullscreenPreviewUI();
    }
  });

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

  /* In-Canvas Floating Buttons: Direct Upload & Presets Jump */
  function handleDirectPhotoUpload() {
    var fileInput = $('#wpPhoto');
    if (fileInput) fileInput.click();
  }

  function jumpToPresets() {
    switchToWpTab('bg');
    var targetSection = $('#wpPresetsSection');
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      targetSection.classList.add('wp-highlight-pulse');
      setTimeout(function () { targetSection.classList.remove('wp-highlight-pulse'); }, 1400);
    }
  }

  /* Editor Top Bar Quick Action Buttons */
  var wpBarUploadBtn = $('#wpBarUploadBtn');
  if (wpBarUploadBtn) {
    wpBarUploadBtn.addEventListener('click', handleDirectPhotoUpload);
  }

  var wpBarPresetBtn = $('#wpBarPresetBtn');
  if (wpBarPresetBtn) {
    wpBarPresetBtn.addEventListener('click', jumpToPresets);
  }

  renderWpPresets();
  updateWpRatioUI();
  updateWpBarUploadState();
  if ($('#wpText')) $('#wpText').value = WP_QUOTES[0];
  if ($('#wpLiveInput')) $('#wpLiveInput').value = WP_QUOTES[0];
  updateQuoteCharCounts();
  autoResizeLiveInput(false);
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

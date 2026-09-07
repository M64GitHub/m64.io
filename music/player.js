/* m64 — music renderer + neon player (vanilla JS, no dependencies).

   Tracks with a `src` (see music-data.js) play real audio through an <audio> element.
   Tracks without one fall back to a synthesized Web Audio chiptune (square/triangle arps,
   very Game Boy / SID) so the kernel preview stays audible without any audio files.   */
(function () {
  'use strict';

  var ACC = {
    cyan:    ['#00ffff', 'rgba(0,255,255,.22)'],
    magenta: ['#ff40c0', 'rgba(255,64,192,.22)'],
    amber:   ['#ffa032', 'rgba(255,160,50,.22)'],
    violet:  ['#a070ff', 'rgba(160,112,255,.22)'],
    green:   ['#40ff80', 'rgba(64,255,128,.22)'],
    blue:    ['#40b0ff', 'rgba(64,176,255,.22)']
  };
  function acc(a) { return ACC[a] || ACC.cyan; }
  function byId(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function parseDur(d) { var p = String(d).split(':').map(Number); return (p[0] || 0) * 60 + (p[1] || 0); }
  function fmt(t) { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
  function seedFrom(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  var WAVE = '<div class="cwave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>';

  function coverHTML(al) {
    var a = acc(al.accent), title = esc(al.cover || al.title).replace(/\n/g, '<br>');
    return '<div class="cover ' + (al.locked ? 'locked' : '') + '" style="--cv:' + a[0] + ';--cvt:' + a[1] + '">' +
      '<div class="cgrid"></div>' + WAVE +
      '<div class="cmark">m64</div>' +
      '<div class="ctitle">' + title + '</div>' +
      '<div class="clock"><span style="font-size:20px">&#128274;</span><span>' + esc(al.lockMsg || 'coming soon') + '</span></div>' +
      '</div>';
  }

  /* ---- music index ------------------------------------------------------- */
  function renderIndex(containerId) {
    var data = window.M64_MUSIC, root = byId(containerId);
    if (!root || !data) return;
    root.innerHTML = data.albums.map(function (al) {
      var a = acc(al.accent), n = al.tracks.length;
      var meta = al.locked ? 'locked' : (n + (n === 1 ? ' track' : ' tracks'));
      return '<a class="album-card" href="album.html?id=' + encodeURIComponent(al.id) + '">' +
        coverHTML(al) +
        '<div class="acap"><div class="aname" style="color:' + a[0] + '">' + esc(al.title) + '</div>' +
        '<div class="ameta">' + esc(al.artist) + ' · ' + al.year + ' · ' + meta + '</div></div></a>';
    }).join('');
  }

  /* ---- album page -------------------------------------------------------- */
  function renderAlbum(containerId) {
    var data = window.M64_MUSIC, root = byId(containerId);
    if (!root || !data) return;
    var q = new URLSearchParams(location.search).get('id');
    var al = data.albums.filter(function (a) { return a.id === q; })[0] || data.albums[0];
    var a = acc(al.accent);
    document.title = 'm64 — ' + al.title;
    var gear = (al.gear || []).map(function (g) { return '<span class="gearchip">' + esc(g) + '</span>'; }).join('');
    var links = (al.links || []).map(function (l) {
      return '<a class="link" href="' + esc(l.href) + '">' + esc(l.label) + '</a>';
    }).join('<span style="color:var(--text-dim);margin:0 10px">·</span>');

    var html = '<p style="font-family:var(--font-mono);font-size:13px;color:var(--text-dim)"><a class="link" href="index.html">&larr; music</a></p>' +
      '<section class="album-hero" style="--cv:' + a[0] + ';--cvt:' + a[1] + '">' +
        '<div>' + coverHTML(al) + '</div>' +
        '<div class="ainfo"><h1>' + esc(al.title) + '</h1>' +
          '<div class="asub">' + esc(al.artist) + ' · ' + al.year + '</div>' +
          '<div class="adesc">' + esc(al.desc || '') + '</div>' +
          '<div class="gear">' + gear + '</div>' +
          (links ? '<div style="margin-top:16px;font-family:var(--font-mono);font-size:13px">' + links + '</div>' : '') +
        '</div>' +
      '</section>';

    if (al.locked) {
      html += '<div class="player" style="--cv:' + a[0] + ';text-align:center">' +
        '<div class="pnow"><span style="font-size:16px">&#128274;</span> ' + esc(al.lockMsg || 'Coming soon') + '</div>' +
        '<p class="note" style="display:inline-block;border:none;margin:0">Tracklist sealed until release.</p></div>';
      root.innerHTML = html;
      return;
    }

    html += '<div class="player" id="np" style="--cv:' + a[0] + '">' +
        '<div class="pnow">Now playing — <b id="np-title">&mdash;</b></div>' +
        '<div class="pctrls">' +
          '<button class="pbtn" id="np-prev" title="previous">&#9198;</button>' +
          '<button class="pbtn big" id="np-play" title="play / pause">&#9654;</button>' +
          '<button class="pbtn" id="np-next" title="next">&#9197;</button>' +
          '<div class="seekwrap"><span class="ptime" id="np-cur">0:00</span>' +
            '<div class="seek" id="np-seek"><div class="fill" id="np-fill"></div><div class="knob" id="np-knob"></div></div>' +
            '<span class="ptime" id="np-dur">0:00</span></div>' +
          '<div class="vol"><span style="color:var(--text-dim);font-size:13px">&#128266;</span>' +
            '<input id="np-vol" type="range" min="0" max="100" value="60"></div>' +
        '</div></div>' +
      '<div class="tracklist" id="np-list" style="--cv:' + a[0] + '">' +
        al.tracks.map(function (t, i) {
          return '<div class="trow" data-i="' + i + '"><div class="tnum">' +
            '<span class="tn">' + String(i + 1).padStart(2, '0') + '</span>' +
            '<span class="eq"><i></i><i></i><i></i></span></div>' +
            '<div class="ttitle">' + esc(t.t) + '</div><div class="tdur">' + esc(t.d) + '</div></div>';
        }).join('') +
      '</div>';

    root.innerHTML = html;
    new NeonPlayer(al);
  }

  /* ---- chiptune synth (preview fallback for tracks without a src) --------- */
  function Synth() { this.ctx = null; this.master = null; this.timer = null; this.vol = 0.6; }
  Synth.prototype.ensure = function () {
    if (!this.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16 * this.vol;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  };
  Synth.prototype.setVolume = function (v) { this.vol = v; if (this.master) this.master.gain.value = 0.16 * v; };
  Synth.prototype.start = function (seed) {
    if (!this.ensure()) return;
    this.stop();
    var s = (seed >>> 0) || 1;
    function rnd() { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }
    var scale = [0, 2, 3, 5, 7, 10, 12, 14, 15];
    var roots = [110, 130.81, 146.83, 164.81, 196];
    var root = roots[Math.floor(rnd() * roots.length)];
    var seq = []; for (var k = 0; k < 16; k++) seq.push(scale[Math.floor(rnd() * scale.length)] + (rnd() < 0.2 ? 12 : 0));
    var bass = [0, 0, 7, 5, 0, 0, -2, 5];
    var i = 0, step = 0.15, self = this;
    function tick() {
      if (!self.ctx) return;
      var t = self.ctx.currentTime + 0.02;
      self.voice(root * Math.pow(2, seq[i % 16] / 12), 'square', t, step * 0.85, 0.42, 1300);
      if (i % 2 === 0) self.voice(root / 2 * Math.pow(2, bass[(i / 2) % bass.length] / 12), 'triangle', t, step * 1.7, 0.55, 800);
      if (i % 8 === 4) self.voice(root * 2 * Math.pow(2, seq[i % 16] / 12), 'square', t, step * 0.5, 0.16, 2800);
      i++;
    }
    tick();
    this.timer = setInterval(tick, step * 1000);
  };
  Synth.prototype.voice = function (freq, type, t, dur, vel, cut) {
    var o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    o.type = type; o.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.value = cut || 1500;
    o.connect(f); f.connect(g); g.connect(this.master);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.03);
  };
  Synth.prototype.stop = function () { if (this.timer) { clearInterval(this.timer); this.timer = null; } };

  /* ---- the player -------------------------------------------------------- */
  function NeonPlayer(al) {
    this.al = al; this.tr = al.tracks; this.i = 0; this.playing = false;
    this.elapsed = 0; this.dur = 0; this.vol = 0.6;
    this.synth = new Synth(); this.audio = null; this.loadedSrc = null; this.raf = null; this.last = 0;
    var self = this;
    byId('np-play').onclick = function () { self.toggle(); };
    byId('np-prev').onclick = function () { self.prev(); };
    byId('np-next').onclick = function () { self.next(); };
    byId('np-seek').onclick = function (e) {
      var r = this.getBoundingClientRect(); self.seek((e.clientX - r.left) / r.width);
    };
    byId('np-vol').oninput = function (e) { self.setVolume(e.target.value / 100); };
    this.setVolume(byId('np-vol').value / 100);
    byId('np-list').querySelectorAll('.trow').forEach(function (row) {
      row.onclick = function () { self.load(+row.dataset.i, true); };
    });
    this.load(0, false);
  }
  NeonPlayer.prototype.isAudio = function () { return !!(this.tr[this.i] && this.tr[this.i].src); };
  NeonPlayer.prototype.ensureAudio = function () {
    if (this.audio) return this.audio;
    var a = new Audio(), self = this;
    a.preload = 'metadata'; a.volume = this.vol;
    a.addEventListener('loadedmetadata', function () {
      if (isFinite(a.duration) && a.duration > 0) { self.dur = a.duration; byId('np-dur').textContent = fmt(a.duration); }
    });
    a.addEventListener('ended', function () { self.next(); });
    a.addEventListener('error', function () {
      byId('np-title').textContent = self.tr[self.i].t + ' — could not load audio';
      self.playing = false; self.setIcon(); self.markRows();
    });
    this.audio = a;
    return a;
  };
  NeonPlayer.prototype.setVolume = function (v) {
    this.vol = v; this.synth.setVolume(v); if (this.audio) this.audio.volume = v;
  };
  NeonPlayer.prototype.load = function (i, autoplay) {
    var wasPlaying = this.playing;
    this.stopSound();
    this.i = i; this.elapsed = 0;
    var t = this.tr[i]; this.dur = parseDur(t.d);
    byId('np-title').textContent = t.t;
    byId('np-dur').textContent = t.d;
    byId('np-cur').textContent = '0:00';
    this.setFill(0);
    if (t.src) {
      var a = this.ensureAudio();
      if (this.loadedSrc !== t.src) { a.src = t.src; this.loadedSrc = t.src; }
      else if (a.readyState > 0) { a.currentTime = 0; }
    }
    if (autoplay || wasPlaying) { this.play(); }
    else { this.playing = false; this.setIcon(); this.markRows(); }
  };
  NeonPlayer.prototype.startSound = function () {
    if (this.isAudio()) {
      var a = this.ensureAudio(), self = this;
      var p = a.play();
      if (p && p.catch) p.catch(function () { self.playing = false; self.setIcon(); self.markRows(); });
    } else {
      this.synth.start(seedFrom(this.al.id + '#' + this.i));
    }
    this.last = performance.now();
  };
  NeonPlayer.prototype.stopSound = function () {
    if (this.audio) this.audio.pause();
    this.synth.stop();
    cancelAnimationFrame(this.raf);
  };
  NeonPlayer.prototype.play = function () {
    this.playing = true; this.startSound(); this.markRows(); this.setIcon(); this.runLoop();
  };
  NeonPlayer.prototype.pause = function () {
    this.playing = false; this.stopSound(); this.markRows(); this.setIcon();
  };
  NeonPlayer.prototype.toggle = function () { this.playing ? this.pause() : this.play(); };
  NeonPlayer.prototype.runLoop = function () {
    cancelAnimationFrame(this.raf);
    this.last = performance.now();
    var self = this;
    function step() {
      if (!self.playing) return;
      var now = performance.now();
      if (self.isAudio()) {
        self.elapsed = self.audio ? self.audio.currentTime : 0;   /* `ended` advances the track */
      } else {
        self.elapsed += (now - self.last) / 1000;
        if (self.elapsed >= self.dur) { self.next(); return; }
      }
      self.last = now;
      byId('np-cur').textContent = fmt(self.elapsed);
      self.setFill(self.dur ? self.elapsed / self.dur : 0);
      self.raf = requestAnimationFrame(step);
    }
    this.raf = requestAnimationFrame(step);
  };
  NeonPlayer.prototype.seek = function (f) {
    f = Math.min(1, Math.max(0, f)); this.elapsed = f * this.dur;
    if (this.isAudio() && this.audio && isFinite(this.audio.duration)) this.audio.currentTime = f * this.audio.duration;
    byId('np-cur').textContent = fmt(this.elapsed); this.setFill(f);
  };
  NeonPlayer.prototype.setFill = function (f) {
    var p = Math.min(1, Math.max(0, f)) * 100;
    byId('np-fill').style.width = p + '%'; byId('np-knob').style.left = p + '%';
  };
  NeonPlayer.prototype.next = function () {
    if (this.i + 1 < this.tr.length) { this.load(this.i + 1); }
    else { this.pause(); this.load(0, false); }
  };
  NeonPlayer.prototype.prev = function () {
    if (this.elapsed > 2) this.load(this.i);
    else this.load(Math.max(0, this.i - 1));
  };
  NeonPlayer.prototype.setIcon = function () {
    byId('np-play').innerHTML = this.playing ? '&#10073;&#10073;' : '&#9654;';
  };
  NeonPlayer.prototype.markRows = function () {
    var self = this;
    byId('np-list').querySelectorAll('.trow').forEach(function (r) {
      var on = (+r.dataset.i === self.i);
      r.classList.toggle('active', on);
      r.classList.toggle('playing', on && self.playing);
    });
  };

  window.M64 = { renderIndex: renderIndex, renderAlbum: renderAlbum };
})();

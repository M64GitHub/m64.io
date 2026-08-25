// duet-player.js — THE PAGE (XXII.d): the main thread. Loads duet.wasm,
// hosts it in the worklet (duet-worklet.js), feeds it FILES — a drop, the
// file dialog, the gallery, ?song= — and draws what the event ring says:
// the live note strip (a row appears the instant it is heard), the HUD,
// and a movy-style glow visualiser over the master mix. Nothing here
// knows a format; the page speaks include/duet.h's words. The palette
// is src/app/ui/theme.zig's; the meter ballistics are ui/vizmath.zig's.

const $ = (s) => document.querySelector(s);
const T = {
  bg: '#000', header: '#030a1a', text: '#a8d0f8', dim: '#587eb4', bright: '#ecf6ff', off: '#4e525c', accent: '#56a8ff', hot: '#96e0ff',
  pink: '#e080ff', pinkdim: '#9e62c0', sep: '#2e5a94', note: '#ecf6ff', ins: '#78c8ff', vol: '#8cb4f0', fx: '#6496dc', fxduet: '#78e6aa',
  dots: '#2e4a76', rownum: '#587eb4', rowbeat: '#96c8ff', playhead: '#0a1c3a', playheadSid: '#072628', rowbeatbg: '#090f1c',
  chanhdr: '#466eaa', sidhdr: '#ffc460', mute: '#eb544a', solo: '#5ce080', marker: '#966418', paperbeat: '#5c1c68', papernote: '#164a8e', papersid: '#8a5214',
};
const DIALECT = ['IT', 'SD', 'DUST', 'DUSK', 'SW'];
const TARGET = { CHANNEL: 0, IT_SUM: 1, CHIP: 2, DUST: 3, DUSK: 4, VOICE: 5, FX: 6 };
const NOTE_NAMES = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];
const QUALITY = ['fast', 'interpolate', 'resample'];
const VIZ_MODES = ['vu', 'spectrum', 'scope', 'plasma', 'copper'];
const BAR_STYLES = ['normal', 'scanlines', 'gap'];
const MAX_CELLS = 64, SONG_EXT = /\.(it|swm|sws|swt|swq|zon)$/i;
const DESIGN_W = 1280, DESIGN_H = 720; // THE FIT: the page's design size; the window scales it uniformly
const params = new URLSearchParams(location.search);

const S = {
  ctx: null, node: null, gain: null, analyser: null, anL: null, anR: null, ready: false, version: '',
  info: null, position: null, load: 0, dropped: 0, ended: false, loop: -1,
  columns: new Map(), queue: [], viz: 'scope', bars: 'normal', gallery: [], eventsSeen: 0, rowsSeen: 0,
  beat: 0, bar: 0, markerFlash: 0, lastOrder: -1, badgeCo: false, frames: 0, scale: 1,
  spec: new Float32Array(30), specPeak: new Float32Array(30), specVel: new Float32Array(30), specHold: new Float32Array(30),
  vu: [0, 0], vuPeak: [0, 0], vuVel: [0, 0], vuHold: [0, 0], time: 0,
};

// ------------------------------------------------------------- words
const hex2 = (n) => n.toString(16).toUpperCase().padStart(2, '0');
function itNote(n) { return n < 120 ? NOTE_NAMES[n % 12] + Math.floor(n / 12) : '???'; }           // C-5 = 60
function swNote(n) { return n >= 1 && n <= 120 ? NOTE_NAMES[(n - 1) % 12] + (Math.floor((n - 1) / 12) + 1) : '???'; } // C-1 = 1
function noteOff(a) { return a === 255 ? '===' : a === 254 ? '^^^' : '~~~'; }
function fxText(dialect, a, b) {
  if (dialect === 0 && a >= 1 && a <= 26) return String.fromCharCode(64 + a) + hex2(b); // the IT letter and its byte
  return hex2(a) + hex2(b);                                                                // a dialect's own two bytes
}
function setStatus(text, bad) { const el = $('#status'); el.textContent = text; el.classList.toggle('bad', !!bad); }
function kindBadge(info) { return info.kind === 0 ? '[IT]' : info.kind === 1 ? '[SWM]' : S.badgeCo ? '[CO]' : '[DUET]'; }
function mmss(frames, rate) { const s = Math.floor(frames / rate); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }

// ---------------------------------------------------------- columns
// A column per (group, channel): the IT grid's columns share the IT
// clock (IT, SD, DUST 48..51 and DUSK 40..47 all sit in the one pattern);
// a SID-Wizard track has its own row count, so SW columns are their own group.
function columnFor(dialect, channel, create) {
  const group = dialect === 4 ? 'sw' : 'it';
  const key = group + ':' + channel;
  let col = S.columns.get(key);
  if (!col && create) {
    let label, color;
    if (dialect === 4) { label = 'T' + (channel + 1); color = T.sidhdr; }
    else if (dialect === 2 || (channel >= 48 && channel <= 51)) { label = 'D' + (channel - 47); color = T.fxduet; }
    else if (dialect === 3 || (channel >= 40 && channel <= 47)) { label = 'K' + (channel - 39); color = T.pink; }
    else if (dialect === 1) { label = String(channel + 1).padStart(2, '0'); color = T.sidhdr; }
    else { label = String(channel + 1).padStart(2, '0'); color = T.chanhdr; }
    col = { group, dialect, channel, label, color, cells: [], muted: false, level: 0, order: 0 };
    S.columns.set(key, col);
    sortColumns();
  }
  return col;
}
function sortColumns() {
  const sorted = [...S.columns.values()].sort((a, b) => (a.group === b.group ? a.channel - b.channel : a.group === 'it' ? -1 : 1));
  S.columns = new Map(sorted.map((c) => [c.group + ':' + c.channel, c]));
}
function muteTarget(col) {
  if (col.group === 'sw') return [TARGET.VOICE, col.channel];           // a track is a chip voice: chip*3 + voice
  if (col.channel >= 48 && col.channel <= 51) return [TARGET.DUST, col.channel - 48];
  if (col.channel >= 40 && col.channel <= 47) return [TARGET.DUSK, col.channel - 40];
  return [TARGET.CHANNEL, col.channel];
}
function pushCell(col, ev) {
  col.cells.push({ row: ev.row, pattern: ev.pattern, order: ev.order, note: '', ins: '', fx: '' });
  if (col.cells.length > MAX_CELLS) col.cells.shift();
}
function lastCell(col, ev) { if (!col.cells.length) pushCell(col, ev); return col.cells[col.cells.length - 1]; }

// ------------------------------------------------------------ events
function apply(ev) {
  S.eventsSeen++;
  switch (ev.kind) {
    case 'row':
      if (ev.dialect === 4) { pushCell(columnFor(4, ev.channel, true), ev); }
      else { S.rowsSeen++; for (const col of S.columns.values()) if (col.group === 'it') pushCell(col, ev); if (ev.row % 4 === 0) S.beat = 1; if (ev.row % 16 === 0) S.bar = 1; }
      break;
    case 'note_on': {
      const col = columnFor(ev.dialect, ev.channel, true), cell = lastCell(col, ev);
      cell.note = ev.dialect === 4 ? swNote(ev.a) : itNote(ev.a); cell.ins = hex2(ev.b); col.level = 1; break;
    }
    case 'note_off': { const col = columnFor(ev.dialect, ev.channel, true); lastCell(col, ev).note = noteOff(ev.a); break; }
    case 'effect': { const col = columnFor(ev.dialect, ev.channel, true); lastCell(col, ev).fx = fxText(ev.dialect, ev.a, ev.b); break; }
    case 'volcol': { const col = columnFor(ev.dialect, ev.channel, true); const c = lastCell(col, ev); if (!c.fx) c.fx = 'v' + hex2(ev.b); break; }
    case 'marker': S.markerFlash = 1; $('#p-marker').textContent = 'marker ' + (ev.a | (ev.b << 8)) + ' (ch ' + (ev.channel + 1) + ')'; break;
    case 'song_end': case 'ended': S.ended = true; setStatus('the song ended'); break;
  }
  if (ev.dialect === 4 && S.info && S.info.kind === 2 && !S.badgeCo) { S.badgeCo = true; $('#badge').textContent = kindBadge(S.info); }
}
function heardTime() { const c = S.ctx; return c.currentTime - (c.outputLatency || c.baseLatency || 0); }
function drainDue() {
  const now = heardTime(); let i = 0;
  while (i < S.queue.length && S.queue[i].t <= now) apply(S.queue[i++]);
  if (i) S.queue.splice(0, i);
}

// ---------------------------------------------------------- the strip
const strip = $('#strip'), sctx = strip.getContext('2d');
function drawStrip() {
  const dpr = window.devicePixelRatio || 1, W = strip.clientWidth, H = strip.clientHeight;
  if (strip.width !== Math.floor(W * dpr) || strip.height !== Math.floor(H * dpr)) { strip.width = Math.floor(W * dpr); strip.height = Math.floor(H * dpr); }
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  sctx.fillStyle = T.bg; sctx.fillRect(0, 0, W, H);
  const cols = [...S.columns.values()];
  if (!cols.length) {
    sctx.fillStyle = T.dim; sctx.font = Math.round(13 * S.scale) + 'px "JetBrains Mono", monospace';
    sctx.fillText(S.info ? 'playing — the rows appear here as they sound' : 'drop a song here, open files, or pick one from the gallery', 12 * S.scale, 24 * S.scale);
    return;
  }
  const CW = 15; // "rr C#5 01 5A70 " — the row, the note, the instrument, the effect (an IT letter + byte, or a dialect's two bytes)
  const k = S.scale, charW = Math.min(8 * k, Math.max(5 * k, (W - 8 * k) / (cols.length * CW)));
  const font = Math.round(charW / 0.6), rowH = Math.round(font * 1.25);
  sctx.font = font + 'px "JetBrains Mono", monospace'; sctx.textBaseline = 'top';
  const rows = Math.floor((H - rowH) / rowH), playhead = rowH + (rows - 1) * rowH;
  cols.forEach((col, ci) => {
    const x = 4 * k + ci * CW * charW;
    sctx.fillStyle = col.muted ? T.mute : col.color;
    sctx.fillText(col.muted ? col.label + ' MUTE' : col.label, x, 2 * k);
    const n = col.cells.length;
    for (let k = 0; k < rows && k < n; k++) {
      const cell = col.cells[n - 1 - k], y = playhead - k * rowH, age = k / rows;
      if (k === 0) { sctx.fillStyle = col.group === 'sw' ? T.playheadSid : T.playhead; sctx.fillRect(x - 2, y - 1, CW * charW, rowH); }
      else if (cell.row % 4 === 0) { sctx.fillStyle = T.rowbeatbg; sctx.fillRect(x - 2, y - 1, CW * charW, rowH); }
      sctx.globalAlpha = 1 - age * 0.75;
      sctx.fillStyle = cell.row % 4 === 0 ? T.rowbeat : T.rownum; sctx.fillText(hex2(cell.row), x, y);
      sctx.fillStyle = cell.note ? (cell.note[0] === '=' || cell.note[0] === '^' || cell.note[0] === '~' ? T.pinkdim : T.note) : T.dots;
      sctx.fillText(cell.note || '···', x + 3 * charW, y);
      sctx.fillStyle = cell.ins ? T.ins : T.dots; sctx.fillText(cell.ins || '··', x + 7 * charW, y);
      sctx.fillStyle = cell.fx ? (col.dialect === 0 ? T.fx : T.fxduet) : T.dots; sctx.fillText(cell.fx || '····', x + 10 * charW, y);
      sctx.globalAlpha = 1;
    }
  });
  strip.dataset.charW = charW; strip.dataset.cw = CW;
}
strip.addEventListener('click', (e) => {
  const charW = Number(strip.dataset.charW || 8), CW = Number(strip.dataset.cw || 15);
  const ci = Math.floor((e.offsetX - 4 * S.scale) / (CW * charW)), cols = [...S.columns.values()];
  if (e.offsetY > 18 * S.scale || ci < 0 || ci >= cols.length || !S.node) return;
  const col = cols[ci]; col.muted = !col.muted;
  const [target, index] = muteTarget(col);
  S.node.port.postMessage({ type: 'mute', target, index, on: col.muted });
  setStatus((col.muted ? 'muted ' : 'unmuted ') + col.label);
});

// ------------------------------------------------------ the visualiser
// vizmath.zig's ballistics: fast attack, exponential release; a peak cap
// that rides up, holds ~0.7 s, then falls accelerating.
function follow(cur, target) { return target >= cur ? cur + (target - cur) * 0.55 : (cur * 0.86 < 0.004 ? 0 : cur * 0.86); }
function peakCap(st, i, cur) {
  let peak = st.peak[i], vel = st.vel[i], hold = st.hold[i];
  if (cur >= peak) { peak = cur; vel = 0; hold = 42; } else if (hold > 0) hold--; else { vel += 0.0022; peak -= vel; if (peak < cur) { peak = cur; vel = 0; } }
  st.peak[i] = Math.max(0, peak); st.vel[i] = vel; st.hold[i] = hold;
}
const tame = (r) => Math.min(Math.pow(r * 4.2, 0.65), 1);
const viz = $('#viz'), vctx = viz.getContext('2d');
const VW = 320, VH = 120;
const trail = document.createElement('canvas'); trail.width = VW; trail.height = VH; const tctx = trail.getContext('2d');
const timeBuf = new Float32Array(2048), freqBuf = new Uint8Array(1024), sideBuf = new Float32Array(1024);
const plasmaImg = tctx.createImageData(VW / 2, VH / 2);
function bandEdges() { const e = []; for (let i = 0; i <= 30; i++) e.push(Math.round(Math.pow(1024, i / 30) * 1.0)); return e; }
const EDGES = bandEdges();
function drawBar(ctx, x, w, base, h, style, color) {
  ctx.fillStyle = color;
  if (style === 'normal') { ctx.fillRect(x, base - h, w, h); return; }
  const seg = style === 'gap' ? 4 : 2;
  for (let y = 0; y < h; y += seg) ctx.fillRect(x, base - y - (seg - 1), w, style === 'gap' ? seg - 1 : 1);
}
function drawViz() {
  const st = S, an = S.analyser;
  tctx.globalCompositeOperation = 'source-over';
  tctx.fillStyle = 'rgba(0,0,0,0.32)'; tctx.fillRect(0, 0, VW, VH); // the persistence
  if (an) { an.getFloatTimeDomainData(timeBuf); an.getByteFrequencyData(freqBuf); }
  // meters
  for (let k = 0; k < 2; k++) {
    const a = k ? S.anR : S.anL; let rms = 0;
    if (a) { a.getFloatTimeDomainData(sideBuf); for (let i = 0; i < sideBuf.length; i++) rms += sideBuf[i] * sideBuf[i]; rms = Math.sqrt(rms / sideBuf.length); }
    st.vu[k] = follow(st.vu[k], tame(rms)); peakCap({ peak: st.vuPeak, vel: st.vuVel, hold: st.vuHold }, k, st.vu[k]);
  }
  const level = (st.vu[0] + st.vu[1]) / 2;
  st.beat *= 0.85; st.bar *= 0.9; st.markerFlash *= 0.9; st.time += 1 / 60;
  const cols = [...S.columns.values()];
  for (const c of cols) c.level = follow(c.level, 0);
  switch (S.viz) {
    case 'vu': {
      const base = VH - 14;
      drawBar(tctx, 8, 14, base, Math.round(st.vu[0] * (VH - 28)), S.bars, T.accent); drawBar(tctx, 26, 14, base, Math.round(st.vu[1] * (VH - 28)), S.bars, T.accent);
      tctx.fillStyle = T.hot; tctx.fillRect(8, base - Math.round(st.vuPeak[0] * (VH - 28)), 14, 1); tctx.fillRect(26, base - Math.round(st.vuPeak[1] * (VH - 28)), 14, 1);
      const w = cols.length ? Math.max(3, Math.min(14, Math.floor(260 / cols.length))) : 0;
      cols.forEach((c, i) => drawBar(tctx, 52 + i * (w + 2), w, base, Math.round(c.level * (VH - 28)), S.bars, c.muted ? T.mute : c.color));
      break;
    }
    case 'spectrum': {
      const base = VH - 8, n = 30, w = Math.floor((VW - 16) / n);
      for (let i = 0; i < n; i++) {
        let sum = 0, cnt = 0; for (let b = Math.max(1, EDGES[i]); b < Math.max(EDGES[i] + 1, EDGES[i + 1]) && b < 1024; b++) { sum += freqBuf[b]; cnt++; }
        const v = cnt ? Math.pow(sum / cnt / 255, 1.4) : 0;
        st.spec[i] = follow(st.spec[i], v); peakCap({ peak: st.specPeak, vel: st.specVel, hold: st.specHold }, i, st.spec[i]);
        const h = Math.round(st.spec[i] * (VH - 16)), x = 8 + i * w;
        drawBar(tctx, x, w - 2, base, h, S.bars, i % 2 ? T.accent : T.hot);
        tctx.fillStyle = T.pink; tctx.fillRect(x, base - Math.round(st.specPeak[i] * (VH - 16)), w - 2, 1);
      }
      break;
    }
    case 'scope': {
      // trigger on a rising zero crossing so the trace stands still on a tone
      let start = 0; for (let i = 1; i < 1024; i++) if (timeBuf[i - 1] < 0 && timeBuf[i] >= 0) { start = i; break; }
      tctx.strokeStyle = T.hot; tctx.lineWidth = 1.2; tctx.beginPath();
      for (let x = 0; x < VW; x++) { const v = timeBuf[start + Math.floor(x * 3)] || 0; const y = VH / 2 - v * (VH / 2) * 0.9; x ? tctx.lineTo(x, y) : tctx.moveTo(x, y); }
      tctx.stroke();
      tctx.fillStyle = T.dots; tctx.fillRect(0, VH / 2, VW, 1);
      break;
    }
    case 'plasma': {
      const d = plasmaImg.data, w = VW / 2, h = VH / 2, t = st.time * 1.6, amp = 0.55 + level * 0.9;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = Math.sin(x / 14 + t) + Math.sin(y / 9 - t * 0.7) + Math.sin((x + y) / 18 + t * 0.5) + Math.sin(Math.hypot(x - w / 2, y - h / 2) / 7 - t);
        const u = (v + 4) / 8, i = (y * w + x) * 4;
        d[i] = Math.min(255, 40 + 200 * Math.pow(u, 3) * amp + st.beat * 120); d[i + 1] = 30 + 110 * u * amp; d[i + 2] = Math.min(255, 90 + 160 * (1 - u) * amp); d[i + 3] = 255;
      }
      const tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h; tmp.getContext('2d').putImageData(plasmaImg, 0, 0);
      tctx.imageSmoothingEnabled = false; tctx.drawImage(tmp, 0, 0, VW, VH);
      break;
    }
    case 'copper': {
      const bars = 7;
      for (let i = 0; i < bars; i++) {
        const yc = VH / 2 + Math.sin(st.time * 1.3 + i * 0.9) * (VH / 2 - 12) * (0.6 + 0.4 * Math.sin(st.time * 0.4));
        const colr = [T.accent, T.pink, T.sidhdr, T.hot, T.fxduet, T.pinkdim, T.solo][i];
        const g = tctx.createLinearGradient(0, yc - 8, 0, yc + 8); g.addColorStop(0, '#000'); g.addColorStop(0.5, colr); g.addColorStop(1, '#000');
        tctx.globalAlpha = 0.55 + st.beat * 0.45 + level * 0.3; tctx.fillStyle = g; tctx.fillRect(0, yc - 8, VW, 16); tctx.globalAlpha = 1;
      }
      break;
    }
  }
  if (st.markerFlash > 0.05) { tctx.fillStyle = T.sidhdr; tctx.globalAlpha = st.markerFlash * 0.6; tctx.fillRect(0, 0, VW, 3); tctx.globalAlpha = 1; }
  // the glow: the trail blurred under itself (movy's persistent glow buffer)
  vctx.globalCompositeOperation = 'source-over'; vctx.fillStyle = '#000'; vctx.fillRect(0, 0, VW, VH);
  vctx.globalCompositeOperation = 'lighter'; vctx.filter = 'blur(3px)'; vctx.drawImage(trail, 0, 0); vctx.drawImage(trail, 0, 0);
  vctx.filter = 'none'; vctx.drawImage(trail, 0, 0);
}

// --------------------------------------------------------------- HUD
function drawHud() {
  const p = S.position; if (!p || !S.ctx) return;
  $('#p-order').textContent = hex2(p.order); $('#p-pattern').textContent = hex2(p.pattern); $('#p-row').textContent = hex2(p.row);
  $('#p-speed').textContent = p.speed || '—'; $('#p-tempo').textContent = p.tempo || '—';
  $('#p-time').textContent = mmss(p.frames, S.ctx.sampleRate); $('#p-load').textContent = Math.round(S.load * 100) + '%' + (S.dropped ? ' (dropped ' + S.dropped + ')' : '');
  $('#b-pause').textContent = p.paused ? '‖ UNPAUSE' : '‖ PAUSE';
  $('#b-pause').classList.toggle('on', !!p.paused);
  $('#b-play').classList.toggle('on', !!p.playing && !p.paused);
}
function frame() {
  if (S.ctx) { drainDue(); drawStrip(); drawViz(); drawHud(); }
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------- audio
async function boot() {
  const ctx = new AudioContext({ sampleRate: 48000, latencyHint: 'playback' }); // the tracker's rate: the render is --render's
  S.ctx = ctx;
  window.duet = S; // the page's state, for the browser console and tools/webplay-smoke.mjs
  if (params.get('autotest')) { ctx.resume(); setTimeout(selfTest, Number(params.get('autotest')) > 1 ? Number(params.get('autotest')) : 4000); }
  // the worklet script and the module are fetched fresh (revalidated) on every load: a browser once kept
  // serving a Debug module a check had installed for a minute, and the page could not tell (s136d)
  S.stage = 'context up'; await ctx.audioWorklet.addModule('duet-worklet.js?v=' + Date.now()); S.stage = 'worklet added';
  const node = new AudioWorkletNode(ctx, 'duet-processor', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
  const gain = ctx.createGain(); gain.gain.value = 0.8;
  const analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.6;
  const split = ctx.createChannelSplitter(2), anL = ctx.createAnalyser(), anR = ctx.createAnalyser(); anL.fftSize = 1024; anR.fftSize = 1024;
  node.connect(gain); gain.connect(ctx.destination); gain.connect(analyser); gain.connect(split); split.connect(anL, 0); split.connect(anR, 1);
  Object.assign(S, { node, gain, analyser, anL, anR });
  node.port.onmessage = (e) => onWorklet(e.data);
  const bytes = await (await fetch('duet.wasm', { cache: 'no-cache' })).arrayBuffer(); // revalidated; the worklet compiles it itself
  S.stage = 'wasm fetched';
  node.port.postMessage({ type: 'module', bytes }, [bytes]);
  S.stage = 'module posted';
  setTimeout(() => { if (!S.ready && !S.lastError) setStatus('the worklet did not answer in 10 s — is this browser blocking AudioWorklet or WebAssembly?', true); }, 10000);
  const resume = () => { if (ctx.state !== 'running') ctx.resume(); };
  document.addEventListener('pointerdown', resume); document.addEventListener('keydown', resume);
}
function send(m) { if (S.node) S.node.port.postMessage(m); }
function onWorklet(m) {
  switch (m.type) {
    case 'ready': {
      S.ready = true; S.version = m.version; S.mode = m.mode; S.moduleBytes = m.bytes;
      const mb = (m.bytes / 1048576).toFixed(1) + ' MB';
      $('#version').textContent = 'libduet ' + m.version + ' · ' + m.mode + ' ' + mb + ' · web player';
      if (m.mode === 'Debug') setStatus('this is a DEBUG module (' + mb + '): it cannot keep up with a heavy song — run `zig build wasm` for the fast one and reload', true);
      else setStatus('ready (' + m.mode + ', ' + mb + ') — drop a song, open files, or pick one from the gallery');
      afterReady(); break;
    }
    case 'opened': {
      const info = m.info; S.info = info; S.ended = false; S.columns.clear(); S.queue.length = 0; S.badgeCo = false; S.rowsSeen = 0;
      $('#title').textContent = info.title || info.name; $('#author').textContent = info.author ? '(' + info.author + ')' : '';
      $('#badge').textContent = kindBadge(info); $('#p-chips').textContent = info.chips;
      $('#p-subtune').textContent = (info.subtune + 1) + '/' + info.subtunes; $('#b-sub-prev').disabled = $('#b-sub-next').disabled = info.subtunes < 2;
      $('#b-model').textContent = info.model === 1 ? '8580' : '6581'; $('#b-quality').textContent = QUALITY[info.quality] || 'interpolate';
      $('#p-marker').textContent = info.markers.length ? info.markers.length + ' marker(s)' : '';
      if (info.channels <= 16 && info.kind !== 1) for (let c = 0; c < info.channels; c++) columnFor(0, c, true);
      setStatus(`opened ${info.name}: ${info.channels} channels, ${info.orders} orders, ${info.patterns} patterns, ${info.chips} chip(s)` + (info.message ? ' — ' + info.message.split('\n')[0] : ''));
      if (S.pendingPlay) { S.pendingPlay = false; send({ type: 'play' }); }
      break;
    }
    case 'error': S.lastError = (m.name ? m.name + ': ' : '') + m.message; setStatus(S.lastError, true); break;
    case 'tick': S.position = m.position; S.load = m.load; S.dropped += m.dropped; S.frames = m.position.frames; for (const ev of m.events) S.queue.push(ev); break;
    case 'log': console.log('[libduet]', m.text); break;
  }
}

// ------------------------------------------------------------- files
function pickMain(files, preferred) {
  if (preferred) { const f = files.find((f) => f.name === preferred); if (f) return f.name; }
  const zon = files.find((f) => /\.zon$/i.test(f.name)); if (zon) return zon.name;
  const song = files.find((f) => SONG_EXT.test(f.name)); return song ? song.name : null;
}
function openFiles(files, preferred, thenPlay) {
  const main = pickMain(files, preferred);
  if (!main) return setStatus('nothing to open: a .it, .swm/.sws/.swt/.swq or .zon (a .zon with its song files)', true);
  S.pendingPlay = !!thenPlay;
  if (S.ctx && S.ctx.state !== 'running') S.ctx.resume(); // a drop or a file pick is a gesture too: a suspended context never runs the worklet
  setStatus('opening ' + main + ' …');
  const enc = new TextEncoder();
  const wire = files.map((f) => ({ nameBytes: enc.encode(f.name).buffer, bytes: f.bytes }));
  send({ type: 'open', files: wire, main: { name: main, nameBytes: enc.encode(main).buffer } });
}
async function readFileList(list) {
  const out = [];
  for (const f of list) if (SONG_EXT.test(f.name) || /\.(swi)$/i.test(f.name)) out.push({ name: f.webkitRelativePath || f.name, bytes: await f.arrayBuffer() });
  return out;
}
async function walkEntry(entry, out) {
  if (entry.isFile) { const f = await new Promise((res, rej) => entry.file(res, rej)); if (SONG_EXT.test(f.name)) out.push({ name: entry.fullPath.replace(/^\//, ''), bytes: await f.arrayBuffer() }); }
  else if (entry.isDirectory) {
    const reader = entry.createReader(); let batch;
    do { batch = await new Promise((res, rej) => reader.readEntries(res, rej)); for (const e of batch) await walkEntry(e, out); } while (batch.length);
  }
}
document.addEventListener('dragover', (e) => { e.preventDefault(); document.body.classList.add('dragging'); });
document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('dragging'); });
document.addEventListener('drop', async (e) => {
  e.preventDefault(); document.body.classList.remove('dragging');
  const out = [], items = [...(e.dataTransfer.items || [])];
  if (items.length && items[0].webkitGetAsEntry) { for (const it of items) { const en = it.webkitGetAsEntry(); if (en) await walkEntry(en, out); } }
  else out.push(...await readFileList(e.dataTransfer.files));
  // a dropped folder: names relative to the folder the song sits in, so the .zon's spellings resolve
  const main = pickMain(out); if (main && main.includes('/')) { const dir = main.slice(0, main.lastIndexOf('/') + 1); for (const f of out) if (f.name.startsWith(dir)) f.name = f.name.slice(dir.length); }
  openFiles(out, null, true);
});
$('#b-open').addEventListener('click', () => $('#files').click());
$('#files').addEventListener('change', async (e) => openFiles(await readFileList(e.target.files), null, true));

// the gallery: songs.json + the files under songs/ in the corpus's layout
async function loadGallery() {
  try { S.gallery = await (await fetch('songs.json')).json(); } catch { S.gallery = []; return; }
  const sel = $('#gallery');
  for (const g of S.gallery) { const o = document.createElement('option'); o.value = g.main; o.textContent = g.title + ' — ' + g.by; sel.appendChild(o); }
  sel.addEventListener('change', () => { const g = S.gallery.find((g) => g.main === sel.value); if (g) openGallery(g, true); });
}
async function openGallery(g, thenPlay) {
  const base = new URL('songs/' + g.main, location.href), name = g.main.split('/').pop();
  setStatus('fetching ' + g.main + ' …');
  const r = await fetch(base); if (!r.ok) return setStatus('cannot fetch ' + g.main, true);
  const files = [{ name, bytes: await r.arrayBuffer() }];
  if (/\.zon$/i.test(name)) { // the .zon names its song files; fetch them by its spelling, against its folder
    const text = new TextDecoder().decode(files[0].bytes);
    for (const m of text.matchAll(/\.(it|swm)\s*=\s*"([^"]+)"/g)) {
      const rel = m[2], rr = await fetch(new URL(rel, base));
      if (rr.ok) files.push({ name: rel, bytes: await rr.arrayBuffer() }); else setStatus('missing ' + rel, true);
    }
  }
  openFiles(files, name, thenPlay);
}

// ---------------------------------------------------------- controls
function loopToggle() { S.loop = S.loop === -1 ? 0 : -1; send({ type: 'loop', times: S.loop }); $('#b-loop').textContent = S.loop === -1 ? 'LOOP ∞' : 'LOOP once'; $('#b-loop').classList.toggle('on', S.loop === -1); }
$('#b-play').addEventListener('click', () => { send({ type: 'play' }); S.ended = false; });
$('#b-pause').addEventListener('click', () => { const p = S.position; if (!p) return; if (p.paused) send({ type: 'unpause' }); else if (p.playing) send({ type: 'pause' }); else send({ type: 'resume' }); });
$('#b-stop').addEventListener('click', () => send({ type: 'stop' }));
$('#b-rewind').addEventListener('click', () => send({ type: 'rewind' }));
$('#b-loop').addEventListener('click', loopToggle);
$('#b-sub-prev').addEventListener('click', () => S.info && send({ type: 'subtune', subtune: (S.info.subtune + S.info.subtunes - 1) % S.info.subtunes }));
$('#b-sub-next').addEventListener('click', () => S.info && send({ type: 'subtune', subtune: (S.info.subtune + 1) % S.info.subtunes }));
$('#b-model').addEventListener('click', () => S.info && send({ type: 'model', model: S.info.model === 1 ? 0 : 1 }));
$('#b-quality').addEventListener('click', () => S.info && send({ type: 'quality', quality: (S.info.quality + 1) % 3 }));
$('#vol').addEventListener('input', (e) => { if (S.gain) S.gain.gain.value = e.target.value / 100; });
document.querySelectorAll('#modes span[data-viz]').forEach((el) => el.addEventListener('click', () => setViz(el.dataset.viz)));
function setViz(mode) { S.viz = mode; document.querySelectorAll('#modes span[data-viz]').forEach((el) => el.classList.toggle('on', el.dataset.viz === mode)); }
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
  const p = S.position || {};
  switch (e.key) {
    case ' ': e.preventDefault(); $('#b-pause').click(); break;
    case 'Enter': $('#b-play').click(); break;
    case 'Escape': $('#b-stop').click(); break;
    case 'l': case 'L': loopToggle(); break;
    case 'ArrowLeft': setViz(VIZ_MODES[(VIZ_MODES.indexOf(S.viz) + VIZ_MODES.length - 1) % VIZ_MODES.length]); break;
    case 'ArrowRight': setViz(VIZ_MODES[(VIZ_MODES.indexOf(S.viz) + 1) % VIZ_MODES.length]); break;
    case 'ArrowUp': S.bars = BAR_STYLES[(BAR_STYLES.indexOf(S.bars) + BAR_STYLES.length - 1) % BAR_STYLES.length]; break;
    case 'ArrowDown': S.bars = BAR_STYLES[(BAR_STYLES.indexOf(S.bars) + 1) % BAR_STYLES.length]; break;
  }
  void p;
});

// ------------------------------------------------- ?song= and the self-test
async function afterReady() {
  await loadGallery();
  const want = params.get('song');
  // ?song= names a gallery entry, or any file under songs/ (a .zon fetches its song files beside it)
  const g = want ? (S.gallery.find((g) => g.main === want || g.main.endsWith('/' + want)) || { main: want, title: want, by: '' }) : null;
  if (g) { $('#gallery').value = g.main; openGallery(g, !!params.get('autotest')); }
  else if (params.get('autotest') && S.gallery.length) { $('#gallery').value = S.gallery[0].main; openGallery(S.gallery[0], true); }
}
function selfTest() {
  const p = S.position || {}, line = `SELFTEST ${S.info && S.frames > 0 && S.eventsSeen > 0 ? 'ok' : 'FAIL'} version=${S.version} mode=${S.mode} bytes=${S.moduleBytes} title="${S.info ? S.info.title : ''}" kind=${S.info ? S.info.kind : '-'} frames=${S.frames} events=${S.eventsSeen} rows=${S.rowsSeen} columns=${S.columns.size} load=${Math.round(S.load * 100)}% ready=${S.ready} ctx=${S.ctx ? S.ctx.state : '-'} status="${$('#status').textContent}"`;
  $('#selftest').textContent = line; console.log(line);
}

// THE FIT (m64, s136e): a bigger window scales the whole page — the same rows, the same
// effects, larger — instead of showing more rows or blowing the effects up alone. The
// design is 1280x720 CSS px at 13px; html's font-size carries the scale and every size
// in the stylesheet is in em. ?scale=1 pins it (screenshots, a debug look).
function fit() {
  const pinned = Number(params.get('scale'));
  const s = pinned > 0 ? pinned : Math.max(0.6, Math.min(3, Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H)));
  S.scale = s;
  document.documentElement.style.fontSize = (13 * s).toFixed(3) + 'px';
}
window.addEventListener('resize', fit);
fit();
setViz('scope');
requestAnimationFrame(frame);
boot().catch((e) => { S.lastError = 'the page could not start: ' + e.message; setStatus(S.lastError, true); });

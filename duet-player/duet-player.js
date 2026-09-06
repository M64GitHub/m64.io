// duet-player.js — THE PAGE (XXII.d): the main thread. Everything a PLAYER
// is — the file roads (a drop, the file dialog, a whole FOLDER, the gallery,
// ?song=), the live note strip (a row appears the instant it is heard), the
// pattern grid, the HUD, the help box and a movy-style glow visualiser over
// the master mix — drawn over the ENGINE, which is duet-web.js's DuetEngine
// (XXIII.e): the AudioContext, the worklet that owns duet.wasm, the verbs,
// the event ring re-stamped into the audio clock, the playing time. Nothing
// here knows a format; the page speaks include/duet.h's words. The palette
// is src/app/ui/theme.zig's; the meter ballistics are ui/vizmath.zig's.
//
// THE STAMP: index.html imports this file with `?v=<build stamp>` and the
// engine's files are fetched with the same one (duet-web.js reads it off its
// own URL) — a browser can never pair a new page with an old script, and an
// unchanged file stays cached. Served straight from the source tree there is
// no stamp, and every file is revalidated on each load instead.

const STAMP = new URL(import.meta.url).searchParams.get('v') || '';
const { DuetEngine, TARGET, QUALITY, SW_PATTERN } = await import('./duet-web.js' + (STAMP ? '?v=' + STAMP : ''));

const $ = (s) => document.querySelector(s);
if (!STAMP) $('footer .build').textContent = 'unstamped — served from the source tree';
const T = {
  bg: '#000', header: '#030a1a', text: '#a8d0f8', dim: '#587eb4', bright: '#ecf6ff', off: '#4e525c', accent: '#56a8ff', hot: '#96e0ff',
  pink: '#e080ff', pinkdim: '#9e62c0', sep: '#2e5a94', note: '#ecf6ff', ins: '#78c8ff', vol: '#8cb4f0', fx: '#6496dc', fxduet: '#78e6aa',
  dots: '#2e4a76', rownum: '#587eb4', rowbeat: '#96c8ff', playhead: '#0a1c3a', playheadSid: '#072628', rowbeatbg: '#090f1c',
  chanhdr: '#466eaa', sidhdr: '#ffc460', mute: '#eb544a', solo: '#5ce080', marker: '#966418', paperbeat: '#5c1c68', papernote: '#164a8e', papersid: '#8a5214',
};
const DIALECT = ['IT', 'SD', 'DUST', 'DUSK', 'SW'];
const NOTE_NAMES = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];
const VIZ_MODES = ['vu', 'spectrum', 'scope', 'plasma', 'copper'];
const BAR_STYLES = ['normal', 'scanlines', 'gap'];
const MAX_CELLS = 64, SONG_EXT = /\.(it|swm|sws|swt|swq|zon)$/i;
const FACE = [                                            // the character layout per dialect face, XXIII.d
  { w: 14, note: [0, 3], ins: [4, 6], vol: [7, 10], fx: [11, 14] },   // IT
  { w: 11, note: [0, 3], ins: [4, 6], vol: null, fx: [7, 11] },       // SD
  { w: 11, note: [0, 3], ins: [4, 6], vol: null, fx: [7, 11] },       // SW
];
const LOADABLE = /\.(it|swm|sws|swt|swq|zon|swi)$/i;      // what a folder listing keeps (a v10 project may still name a .swi)
const FOLDER_MAX = 4096, FOLDER_DEPTH = 6, PEEK_MAX = 512; // a folder can be enormous: the walk and the header peek are bounded
const DESIGN_W = 1280, DESIGN_H = 720; // THE FIT: the page's design size; the window scales it uniformly
const params = new URLSearchParams(location.search);
const duet = new DuetEngine({ sampleRate: 48000 });   // the tracker's rate: the render is --render's
const S = {
  analyser: null, anL: null, anR: null,
  columns: new Map(), viz: 'scope', bars: 'normal', rowsSeen: 0,
  gallery: [], folder: [], folderTitle: '', rows: [], sel: 0, filter: '', panelOpen: false, pendingFolder: null, playing: '',
  view: 'strip', gridFrom: 0,
  helpOpen: false, helpAt: 0,
  beat: 0, bar: 0, markerFlash: 0, badgeCo: false, scale: 1, pageError: '',
  spec: new Float32Array(30), specPeak: new Float32Array(30), specVel: new Float32Array(30), specHold: new Float32Array(30),
  vu: [0, 0], vuPeak: [0, 0], vuVel: [0, 0], vuHold: [0, 0], time: 0,
  // the engine's state, read through: the browser console and tools/webplay-smoke.mjs look here
  engine: duet, stamp: STAMP,
  get ctx() { return duet.context; }, get node() { return duet.node; }, get ready() { return duet.isReady; }, get stage() { return duet.stage; },
  get lastError() { return duet.lastError || S.pageError; }, get frames() { return duet.frames; }, get eventsSeen() { return duet.eventsSeen; },
  get info() { return duet.info; }, get position() { return duet.position; }, get load() { return duet.load; },
};
window.duet = S; // the page's state, for the browser console and tools/webplay-smoke.mjs

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
// The engine fires each ring event the moment it is HEARD (duet-web.js re-stamps
// the engine's output clock into the context's); this only draws what it says.
function apply(ev) {
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
    case 'song_end': setStatus('the song ended'); break;
  }
  if (ev.dialect === 4 && duet.info && duet.info.kind === 2 && !S.badgeCo) { S.badgeCo = true; $('#badge').textContent = kindBadge(duet.info); }
}
duet.on('event', apply);
duet.on('ended', () => setStatus('the song ended'));

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
    sctx.fillText(duet.info ? 'playing — the rows appear here as they sound' : 'drop a song here, or press F for your files and the gallery', 12 * S.scale, 24 * S.scale);
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
  if (e.offsetY > 18 * S.scale || ci < 0 || ci >= cols.length || !duet.info) return;
  const col = cols[ci]; col.muted = !col.muted;
  const [target, index] = muteTarget(col);
  duet.mute(target, index, col.muted);
  setStatus((col.muted ? 'muted ' : 'unmuted ') + col.label);
});

// ------------------------------------------------------------ the grid
// XXIII.d THE GRID VIEW — the tracker's pattern view as a SECOND view
// over the same columns the strip draws (m64's ruling: the strip stays
// the default). Nothing is spelled here: the library formats every cell
// (`duet_song_format_cell`, through the worklet), and this file slices
// the fixed character layout back into fields to colour them.
//
// WHERE THE PLAYHEAD IS comes from the same due-event clock the strip
// reads — each column's last cell carries its pattern and row — so the
// two views are audio-synced to the same frame, and a SID-Wizard track
// stands where ITS transport stands, not where the IT one does.
const grid = $('#grid'), gctx = grid.getContext('2d');

function patternId(col) {
  const c = col.cells[col.cells.length - 1];
  if (!c) return -1;
  return col.group === 'sw' ? SW_PATTERN + c.pattern : c.pattern;
}
/// The pattern as the library spells it, if it has arrived — the engine keeps
/// the cache and asks the worklet once per pattern; until then, nothing to draw.
function patFor(id) {
  if (id < 0) return null;
  const p = duet.patternNow(id);
  if (p === undefined) { duet.pattern(id); return null; }
  return p;
}

/// A field's colour: dots stay dots, a note that is a stop glyph goes
/// dim, and the rest wear the column's own hues.
function fieldColor(text, kind) {
  if (!text || text[0] === '·' || text[0] === ' ') return T.dots;
  if (kind === 'note') return '=^~'.includes(text[0]) ? T.pinkdim : T.note;
  if (kind === 'ins') return T.ins;
  if (kind === 'vol') return T.vol;
  return T.fx;
}

function drawGrid() {
  const dpr = window.devicePixelRatio || 1, W = grid.clientWidth, H = grid.clientHeight;
  if (grid.width !== Math.floor(W * dpr) || grid.height !== Math.floor(H * dpr)) { grid.width = Math.floor(W * dpr); grid.height = Math.floor(H * dpr); }
  gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  gctx.fillStyle = T.bg; gctx.fillRect(0, 0, W, H);
  const k = S.scale, cols = [...S.columns.values()];
  if (!cols.length) {
    gctx.fillStyle = T.dim; gctx.font = Math.round(13 * k) + 'px "JetBrains Mono", monospace';
    gctx.fillText(duet.info ? 'playing — the pattern appears here as it sounds' : 'drop a song here, or press F for your files and the gallery', 12 * k, 24 * k);
    return;
  }
  // the widths every column asks for, and the ones that fit
  const faceOf = (col) => FACE[col.group === 'sw' ? 2 : col.dialect === 1 ? 1 : 0];
  const GUT = 3;                                   // the row number and its space
  const want = cols.map((c) => faceOf(c).w + 1);   // a cell plus one column of air
  const total = want.reduce((a, b) => a + b, GUT);
  const charW = Math.min(8 * k, Math.max(4.2 * k, (W - 8 * k) / total));
  const font = Math.round(charW / 0.6), rowH = Math.round(font * 1.25);
  gctx.font = font + 'px "JetBrains Mono", monospace'; gctx.textBaseline = 'top';
  const head = rowH, rows = Math.max(Math.floor((H - head) / rowH), 1);
  // A CHANNEL WINDOW when they do not fit (58 of them is a real song):
  // it follows the column that sounded last, and never scrolls past an end.
  let fit = 0, used = GUT;
  while (fit < cols.length && used + want[fit] <= (W - 8 * k) / charW) { used += want[fit]; fit++; }
  if (fit < cols.length) {
    const live = cols.reduce((best, c, i) => (c.level > cols[best].level ? i : best), 0);
    if (live < S.gridFrom) S.gridFrom = live;
    else if (live >= S.gridFrom + fit) S.gridFrom = live - fit + 1;
    S.gridFrom = Math.max(0, Math.min(S.gridFrom, cols.length - fit));
  } else S.gridFrom = 0;
  const shown = cols.slice(S.gridFrom, S.gridFrom + Math.max(fit, 1));
  // the row numbers ride the IT block's playhead (a pure SWM has none:
  // track 0's own row stands in, which is what its transport counts)
  const anchor = shown.find((c) => c.group === 'it') || shown[0];
  const anchorRow = anchor.cells.length ? anchor.cells[anchor.cells.length - 1].row : 0;
  const anchorPat = patFor(patternId(anchor));
  // WHERE THE PLAYING ROW SITS: a pattern taller than the view scrolls
  // under a fixed playhead just above the middle; a pattern that FITS
  // is drawn whole from its first row and the playhead moves through it
  // — anything else would park a short pattern under eight empty rows.
  const whole = anchorPat && anchorPat.rows <= rows;
  const mid = whole ? anchorRow : Math.floor((rows - 1) * 0.45);
  gctx.fillStyle = T.dim;
  for (let r = 0; r < rows; r++) {
    const row = anchorRow - mid + r;
    if (row < 0 || (anchorPat && row >= anchorPat.rows)) continue;
    const y = head + r * rowH;
    if (r === mid) { gctx.fillStyle = T.playhead; gctx.fillRect(0, y - 1, W, rowH); }
    else if (row % 4 === 0) { gctx.fillStyle = T.rowbeatbg; gctx.fillRect(0, y - 1, W, rowH); }
    gctx.globalAlpha = r > mid ? 0.5 : 1;
    gctx.fillStyle = row % 4 === 0 ? T.rowbeat : T.rownum;
    gctx.fillText(hex2(row), 4 * k, y);
    gctx.globalAlpha = 1;
  }
  let x = 4 * k + GUT * charW;
  for (const col of shown) {
    const face = faceOf(col), id = patternId(col), pat = patFor(id);
    const cur = col.cells.length ? col.cells[col.cells.length - 1].row : 0;
    gctx.fillStyle = col.muted ? T.mute : col.color;
    gctx.fillText(col.muted ? col.label + ' MUTE' : col.label, x, 1 * k);
    for (let r = 0; r < rows; r++) {
      const row = cur - mid + r, y = head + r * rowH;
      if (row < 0 || !pat || row >= pat.rows) continue;
      const ch = col.group === 'sw' ? 0 : Math.min(col.channel, pat.channels - 1);
      const text = pat.cells[row * pat.channels + ch] || '';
      if (!text) continue;
      gctx.globalAlpha = r > mid ? 0.5 : 1;
      for (const [kind, span] of [['note', face.note], ['ins', face.ins], ['vol', face.vol], ['fx', face.fx]]) {
        if (!span) continue;
        const piece = text.slice(span[0], span[1]);
        gctx.fillStyle = col.muted ? T.off : fieldColor(piece, kind);
        gctx.fillText(piece, x + span[0] * charW, y);
      }
      gctx.globalAlpha = 1;
    }
    x += want[cols.indexOf(col)] * charW;
  }
  grid.dataset.charW = charW; grid.dataset.gut = GUT;
  grid.dataset.cols = shown.map((c) => faceOf(c).w + 1).join(',');
}
/// The grid's headers mute like the strip's.
grid.addEventListener('click', (e) => {
  const charW = Number(grid.dataset.charW || 8), GUT = Number(grid.dataset.gut || 3);
  const widths = String(grid.dataset.cols || '').split(',').filter(Boolean).map(Number);
  const cols = [...S.columns.values()].slice(S.gridFrom);
  if (e.offsetY > 18 * S.scale || !duet.info) return;
  let x = 4 * S.scale + GUT * charW;
  for (let i = 0; i < widths.length; i++) {
    const w = widths[i] * charW;
    if (e.offsetX >= x && e.offsetX < x + w) {
      const col = cols[i]; if (!col) return;
      col.muted = !col.muted;
      const [target, index] = muteTarget(col);
      duet.mute(target, index, col.muted);
      setStatus((col.muted ? 'muted ' : 'unmuted ') + col.label);
      return;
    }
    x += w;
  }
});
function setView(v) {
  S.view = v;
  document.body.classList.toggle('grid', v === 'grid');
  $('#b-view').textContent = v === 'grid' ? 'VIEW GRID' : 'VIEW STRIP';
  $('#b-view').classList.toggle('on', v === 'grid');
}
function toggleView() { setView(S.view === 'grid' ? 'strip' : 'grid'); }

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
  const p = duet.position; if (!p) return;
  $('#p-order').textContent = hex2(p.order); $('#p-pattern').textContent = hex2(p.pattern); $('#p-row').textContent = hex2(p.row);
  $('#p-speed').textContent = p.speed || '—'; $('#p-tempo').textContent = p.tempo || '—';
  $('#p-time').textContent = mmss(duet.playFrames, duet.context.sampleRate); $('#p-load').textContent = Math.round(duet.load * 100) + '%' + (duet.dropped ? ' (dropped ' + duet.dropped + ')' : '');
  $('#b-pause').textContent = p.paused ? '‖ UNPAUSE' : '‖ PAUSE';
  $('#b-pause').classList.toggle('on', !!p.paused);
  $('#b-play').classList.toggle('on', !!p.playing && !p.paused);
}
function frame() {
  duet.drain(); // the events due this frame, before anything is drawn
  if (S.view === 'grid') drawGrid(); else drawStrip();
  drawViz(); drawHud();
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------- audio
// THE ENGINE IS duet-web.js's: it made the context, added the worklet and posted
// the module; `ready` settles when the module is instantiated. The page hangs its
// analysers off the engine's gain and reports what the module says it is.
if (params.get('autotest')) { duet.context.resume(); setTimeout(selfTest, Number(params.get('autotest')) > 1 ? Number(params.get('autotest')) : 4000); }
duet.ready.then((m) => {
  const ctx = duet.context, gain = duet.gain;
  const analyser = ctx.createAnalyser(); analyser.fftSize = 2048; analyser.smoothingTimeConstant = 0.6;
  const split = ctx.createChannelSplitter(2), anL = ctx.createAnalyser(), anR = ctx.createAnalyser(); anL.fftSize = 1024; anR.fftSize = 1024;
  gain.connect(analyser); gain.connect(split); split.connect(anL, 0); split.connect(anR, 1);
  Object.assign(S, { analyser, anL, anR });
  duet.volume = $('#vol').value / 100;
  const mb = (m.bytes / 1048576).toFixed(1) + ' MB';
  $('#version').textContent = 'libduet ' + m.version + ' · ' + m.mode + ' ' + mb + ' · web player';
  if (m.mode === 'Debug') setStatus('this is a DEBUG module (' + mb + '): it cannot keep up with a heavy song — run `zig build wasm` for the fast one and reload', true);
  else setStatus('ready (' + m.mode + ', ' + mb + ') — pick a song below, drop one on the page, or open your own folder');
  afterReady();
}).catch((e) => setStatus(e.message, true));
duet.on('error', (message) => setStatus(message, true));
duet.on('opened', (info) => {   // a fresh song, or the same one rebuilt for a subtune / model / quality change
  S.columns.clear(); S.badgeCo = false; S.rowsSeen = 0;
  $('#title').textContent = info.title || info.name; $('#author').textContent = info.author ? '(' + info.author + ')' : '';
  $('#badge').textContent = kindBadge(info); $('#p-chips').textContent = info.chips;
  $('#p-subtune').textContent = (info.subtune + 1) + '/' + info.subtunes; $('#b-sub-prev').disabled = $('#b-sub-next').disabled = info.subtunes < 2;
  $('#b-model').textContent = info.model === 1 ? '8580' : '6581'; $('#b-quality').textContent = QUALITY[info.quality] || 'interpolate';
  $('#p-marker').textContent = info.markers.length ? info.markers.length + ' marker(s)' : '';
  if (info.channels <= 16 && info.kind !== 1) for (let c = 0; c < info.channels; c++) columnFor(0, c, true);
  setStatus(`opened ${info.name}: ${info.channels} channels, ${info.orders} orders, ${info.patterns} patterns, ${info.chips} chip(s)` + (info.message ? ' — ' + info.message.split('\n')[0] : ''));
  if (S.panelOpen) showPanel(false); // the song has the space now; [FILES] brings the list back
});

// ----------------------------------------------------------- the listing
// THE FOLDER IS THE UNIT (XXIII.a). A browser never shows a picked file's
// siblings, so no page can do what DUET's open dialog does from one project
// pick: the unit is the FOLDER, and the page keeps a LISTING of it — entries,
// never bytes. A song's bytes are read when you pick it; a project's song
// files are read with it, resolved by the project's OWN spelling against its
// folder, then by name anywhere in the listing (the file table's own law).
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const extOf = (name) => { const m = /\.([a-z0-9]+)$/i.exec(name); return m ? m[1].toLowerCase() : ''; };
const dirOf = (path) => { const i = path.lastIndexOf('/'); return i < 0 ? '' : path.slice(0, i + 1); };
const baseOf = (path) => path.slice(path.lastIndexOf('/') + 1);
const normPath = (p) => { const out = []; for (const part of p.split('/')) { if (!part || part === '.') continue; if (part === '..') out.pop(); else out.push(part); } return out.join('/'); };
function entryOf(path, src, extra) {
  const name = baseOf(path), ext = extOf(name);
  return Object.assign({ path, name, ext, kind: ext === 'zon' ? 'PROJECT' : ext.toUpperCase(), src, title: '', by: '', meta: '', bad: false }, extra);
}
async function entryBytes(e) {
  if (e.file) return await e.file.arrayBuffer();
  if (e.handle) return await (await e.handle.getFile()).arrayBuffer();
  const r = await fetch(e.url); if (!r.ok) throw new Error('the server answered ' + r.status);
  return await r.arrayBuffer();
}
function pickMainEntry(entries) { return entries.find((e) => e.ext === 'zon') || entries.find((e) => SONG_EXT.test(e.name)) || null; }
// a project names its song files; each is looked for where the project came from
function resolveSongFiles(entry, text) {
  const rels = [...text.matchAll(/\.(it|swm)\s*=\s*"([^"]+)"/g)].map((m) => m[2]);
  const dir = dirOf(entry.path);
  return rels.map((rel) => {
    if (entry.src === 'gallery') return { rel, found: entryOf(normPath(dir + rel), 'gallery', { url: new URL(rel, entry.url).href }) };
    const full = normPath(dir + rel), base = baseOf(rel).toLowerCase();
    return { rel, found: S.folder.find((e) => e.path === full) || S.folder.find((e) => e.name.toLowerCase() === base) || null };
  });
}
function openEntry(e, thenPlay) {
  if (!e) return;
  setStatus('opening ' + e.name + ' …');
  return (async () => {
    const files = [];
    try {
      const bytes = await entryBytes(e);
      files.push({ name: e.name, bytes });
      if (e.ext === 'zon') { // the project's song files travel under the project's own spelling
        const missing = [];
        for (const s of resolveSongFiles(e, new TextDecoder().decode(new Uint8Array(bytes)))) {
          if (!s.found) { missing.push(s.rel); continue; }
          try { files.push({ name: s.rel, bytes: await entryBytes(s.found) }); } catch { missing.push(s.rel); }
        }
        if (missing.length) setStatus('this project names ' + missing.join(', ') + ' — ' + (e.src === 'gallery' ? 'not on the server' : 'not in the folder you opened'), true);
      }
    } catch (err) { return setStatus('cannot read ' + e.name + ': ' + err.message, true); }
    S.playing = e.src + ':' + e.path;
    // the engine takes the set under the project's own spellings; a newer pick resolves this one null
    duet.open({ files, main: e.name }, { play: thenPlay }).catch((err) => setStatus(err.message, true));
  })();
}
// ------------------------------------------------------ your own folder
function setFolder(entries, title) {
  entries.sort((a, b) => a.path.localeCompare(b.path));
  S.folder = entries; S.folderTitle = title; S.sel = 0;
  peekFolder(entries);
  renderPanel();
}
// WHAT EACH ROW SAYS, before you pick it. A song's title sits in the first
// bytes of its header, so a 70-byte slice is all it takes: an .it spells its
// title at 4, a SID-Wizard module its "AUTHOR:TITLE" at the offset its magic
// picks (src/sid/swmod.zig's layout table). A project is read whole — a few
// KB — for its name and to look its song files up in the listing. Bounded:
// a folder may hold thousands.
const SW_LOAD = 2, SW_AUTHOR = { SWM1: 24, SWMS: 24, SWMT: 25, SWMQ: 29 }; // the 40-char field, per magic; a module opens with its C64 load address
const latin1 = (b) => { let s = ''; for (const c of b) s += String.fromCharCode(c); return s.replace(/[\0-\x1f]/g, ' ').trim(); };
async function headOf(e, n) {
  if (e.file) return new Uint8Array(await e.file.slice(0, n).arrayBuffer());
  if (e.handle) return new Uint8Array(await (await e.handle.getFile()).slice(0, n).arrayBuffer());
  return new Uint8Array(await entryBytes(e));
}
async function peekFolder(entries) {
  let n = 0;
  for (const e of entries) {
    if (n++ >= PEEK_MAX) break;
    try {
      if (e.ext === 'zon') {
        const text = new TextDecoder().decode(new Uint8Array(await entryBytes(e)));
        const want = resolveSongFiles(e, text), miss = want.filter((s) => !s.found);
        e.bad = miss.length > 0;
        e.meta = miss.length ? 'missing ' + miss.map((s) => baseOf(s.rel)).join(' ') : want.length ? want.length + (want.length === 1 ? ' song file' : ' song files') : 'no song file';
        const t = /\.name\s*=\s*"([^"]*)"/.exec(text); if (t) e.title = t[1];
      } else if (e.ext === 'it') {
        const h = await headOf(e, 32);
        if (latin1(h.subarray(0, 4)) === 'IMPM') e.title = latin1(h.subarray(4, 30));
      } else if (e.ext !== 'swi') {
        const h = await headOf(e, 72), off = SW_AUTHOR[latin1(h.subarray(SW_LOAD, SW_LOAD + 4))];
        if (off) { // "AUTHOR:TITLE", and a field with no colon is all title
          const field = latin1(h.subarray(SW_LOAD + off, SW_LOAD + off + 40)), i = field.indexOf(':');
          e.title = i < 0 ? field : field.slice(i + 1).trim();
          e.by = i < 0 ? '' : field.slice(0, i).trim();
        }
      }
    } catch { /* unreadable: the row still opens, and says why then */ }
    if (entries === S.folder && n % 16 === 0) renderPanel();
  }
  if (entries === S.folder) renderPanel();
}
async function walkEntry(entry, out, depth) {
  if (out.length >= FOLDER_MAX || depth > FOLDER_DEPTH) return;
  if (entry.isFile) {
    if (!LOADABLE.test(entry.name)) return;
    out.push(entryOf(entry.fullPath.replace(/^\//, ''), 'folder', { file: await new Promise((res, rej) => entry.file(res, rej)) }));
  } else if (entry.isDirectory) {
    const reader = entry.createReader(); let batch;
    do { batch = await new Promise((res, rej) => reader.readEntries(res, rej)); for (const e of batch) await walkEntry(e, out, depth + 1); } while (batch.length);
  }
}
function fromFileList(list, title) {
  const files = [...list].filter((f) => LOADABLE.test(f.name));
  if (!files.length) { setStatus('nothing to open there — a song (.it .swm .sws .swt .swq) or a project (.zon) with its song files', true); return null; }
  // a folder pick spells every name under the folder itself; drop that first part
  const root = files[0].webkitRelativePath ? files[0].webkitRelativePath.split('/')[0] + '/' : '';
  const entries = files.map((f) => {
    const p = f.webkitRelativePath || f.name;
    return entryOf(root && p.startsWith(root) ? p.slice(root.length) : p, 'folder', { file: f });
  });
  setFolder(entries, title || (root ? 'YOUR FOLDER — ' + root.slice(0, -1) : 'THE FILES YOU PICKED'));
  return entries;
}
// a folder that holds ONE song is the song you meant; a folder of many is a list
function afterFolder(entries) {
  const songs = entries.filter((e) => SONG_EXT.test(e.name) && (e.ext !== 'it' || !entries.some((z) => z.ext === 'zon')));
  if (songs.length === 1) return openEntry(songs[0], true);
  showPanel(true);
  setStatus(entries.length + (entries.length === 1 ? ' file' : ' files') + ' — pick one and press Enter');
}

// THE FOLDER THE BROWSER REMEMBERS (Chrome/Edge): showDirectoryPicker hands
// back a HANDLE, which survives in IndexedDB. On the next visit the folder is
// one click away instead of one dialog — the permission is re-asked once, and
// only on a gesture. Firefox/Safari have no handle: their folder is the
// one-shot snapshot the <input webkitdirectory> makes.
const IDB_DB = 'duet-web', IDB_STORE = 'folders';
function idb(mode, fn) {
  return new Promise((res, rej) => {
    const rq = indexedDB.open(IDB_DB, 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore(IDB_STORE);
    rq.onerror = () => rej(rq.error);
    rq.onsuccess = () => {
      const tx = rq.result.transaction(IDB_STORE, mode), r = fn(tx.objectStore(IDB_STORE));
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    };
  });
}
async function listHandle(dir) {
  setStatus('reading ' + dir.name + ' …');
  const out = [];
  await walkHandle(dir, '', out, 0);
  S.pendingFolder = null;
  setFolder(out, 'YOUR FOLDER — ' + dir.name);
  if (!out.length) return setStatus('no songs in ' + dir.name + ' — DUET opens .it, .swm/.sws/.swt/.swq and .zon projects', true);
  afterFolder(out);
}
async function walkHandle(dir, prefix, out, depth) {
  if (depth > FOLDER_DEPTH || out.length >= FOLDER_MAX) return;
  for await (const [name, h] of dir.entries()) {
    if (out.length >= FOLDER_MAX) break;
    if (h.kind === 'directory') await walkHandle(h, prefix + name + '/', out, depth + 1);
    else if (LOADABLE.test(name)) out.push(entryOf(prefix + name, 'folder', { handle: h }));
  }
}
async function pickFolder() {
  if (!window.showDirectoryPicker) return $('#folder').click(); // Firefox, Safari: the input's snapshot
  let dir;
  try { dir = await window.showDirectoryPicker({ id: 'duet-songs', mode: 'read' }); } catch { return; } // closed the dialog
  try { await idb('readwrite', (st) => st.put(dir, 'last')); } catch { /* private window: it just is not remembered */ }
  await listHandle(dir);
}
// a handle's permission verbs are Chrome's own: if they are missing, try the
// folder and let the walk say no
const askPerm = async (dir, verb) => (dir[verb] ? await dir[verb]({ mode: 'read' }).catch(() => 'denied') : 'granted');
async function restoreFolder() {
  if (!window.showDirectoryPicker) return;
  let dir; try { dir = await idb('readonly', (st) => st.get('last')); } catch { return; }
  if (!dir) return;
  const perm = await askPerm(dir, 'queryPermission');
  if (perm === 'granted') return listHandle(dir).catch(() => { S.pendingFolder = dir; renderPanel(); });
  if (perm === 'prompt') { S.pendingFolder = dir; renderPanel(); } // the browser asks once per visit, and only on a click
}

// ------------------------------------------------------ the files panel
function showPanel(on) {
  S.panelOpen = on;
  document.body.classList.toggle('panel', on);
  $('#b-files').classList.toggle('on', on);
  if (on) { renderPanel(); $('#panel-filter').focus(); } else $('#panel-filter').blur();
}
function panelGroups() {
  const f = S.filter.trim().toLowerCase();
  const match = (e) => !f || (e.name + ' ' + e.title + ' ' + e.by).toLowerCase().includes(f);
  const groups = [];
  if (S.folder.length) groups.push({ label: S.folderTitle, items: S.folder.filter(match) });
  const gal = S.gallery.filter(match), seen = [];
  for (const e of gal) if (!seen.includes(e.group)) seen.push(e.group);
  for (const g of seen) {
    const items = gal.filter((e) => e.group === g);
    // a licence every song in the group shares is the GROUP's, said once; where
    // it differs song by song (the IT modules) each row carries its own
    const one = items.every((e) => e.license === items[0].license) ? items[0].license : '';
    for (const e of items) e.meta = one ? '' : e.license;
    groups.push({ label: g, note: one, items });
  }
  return groups;
}
function renderPanel() {
  if (!S.panelOpen) return;
  const groups = panelGroups();
  S.rows = [];
  let html = '';
  if (S.pendingFolder) html += `<div class="note">the folder <b>${esc(S.pendingFolder.name)}</b> is remembered — <button id="b-regrant">OPEN IT AGAIN</button></div>`;
  for (const g of groups) {
    if (!g.items.length) continue;
    html += `<div class="group">${esc(g.label)} <span class="n">${g.items.length}</span>${g.note ? ' <span class="src">· ' + esc(g.note) + '</span>' : ''}</div>`;
    for (const e of g.items) {
      const i = S.rows.push(e) - 1, cls = e.ext === 'zon' ? 'project' : e.ext === 'it' ? 'it' : 'sw';
      html += `<div class="row${i === S.sel ? ' sel' : ''}${S.playing === e.src + ':' + e.path ? ' on' : ''}" data-i="${i}">` +
        `<span class="kind ${cls}">${esc(e.kind)}</span><span class="name">${esc(e.name)}</span>` +
        `<span class="title">${esc(e.title)}</span><span class="by">${esc(e.by)}</span>` +
        `<span class="meta${e.bad ? ' bad' : ''}">${esc(e.meta)}</span></div>`;
    }
  }
  if (!S.rows.length) html += `<div class="note">${S.filter ? 'nothing here matches “' + esc(S.filter) + '”' : 'no songs yet — open a folder, or drop one on the page'}</div>`;
  $('#panel-list').innerHTML = html;
  const n = S.folder.length + S.gallery.length;
  $('#panel-count').textContent = n + (n === 1 ? ' song' : ' songs') + (S.folder.length ? ' — your folder and the gallery' : ' — the gallery');
  const sel = $('#panel-list .row.sel'); if (sel) sel.scrollIntoView({ block: 'nearest' });
  const re = $('#b-regrant');
  if (re) re.addEventListener('click', async () => {
    const dir = S.pendingFolder;
    if (await askPerm(dir, 'requestPermission') === 'granted') listHandle(dir).catch((err) => setStatus('cannot read ' + dir.name + ': ' + err.message, true));
    else setStatus('the browser did not let the page read ' + dir.name + ' — open it again with [OPEN FOLDER…]', true);
  });
}
function moveSel(d) {
  if (!S.rows.length) return;
  S.sel = Math.max(0, Math.min(S.rows.length - 1, S.sel + d));
  renderPanel();
}
$('#panel-list').addEventListener('click', (e) => {
  const row = e.target.closest('.row'); if (!row) return;
  S.sel = Number(row.dataset.i);
  openEntry(S.rows[S.sel], true);
});
$('#panel-filter').addEventListener('input', (e) => { S.filter = e.target.value; S.sel = 0; renderPanel(); });

// ------------------------------------------------------------- the help
// THE HELP (XXIII.j) — the tracker's own help box, in a page: a framed panel
// whose title sits on the top border, a topic strip you page with ←/→, one
// scrolling section at a time, `? or Esc closes` on the bottom border. The
// prose lives in index.html, where prose belongs; this only pages it.
const helpSections = [...document.querySelectorAll('#help section')];
function showHelp(on, page) {
  S.helpOpen = on;
  document.body.classList.toggle('help', on);
  $('#b-help').classList.toggle('on', on);
  if (on) helpPage(page === undefined ? S.helpAt : page);
}
function helpPage(i) {
  S.helpAt = (i + helpSections.length) % helpSections.length;
  helpSections.forEach((s, k) => s.classList.toggle('on', k === S.helpAt));
  $('#help-tabs').innerHTML = '<span class="arrow">◀</span>' +
    helpSections.map((s, k) => `<span data-i="${k}"${k === S.helpAt ? ' class="on"' : ''}>${esc(s.dataset.title)}</span>`).join('<span class="arrow">·</span>') +
    '<span class="arrow">▶</span>';
  $('#help-body').scrollTop = 0;
}
$('#help-tabs').addEventListener('click', (e) => { const t = e.target.closest('[data-i]'); if (t) helpPage(Number(t.dataset.i)); });
$('#b-help').addEventListener('click', () => showHelp(!S.helpOpen));
// the keys the help box takes while it is up; everything else is refused so a
// stray Space cannot pause the song you are reading about
function helpKey(e) {
  const body = $('#help-body'), step = body.clientHeight * 0.85;
  switch (e.key) {
    case 'ArrowRight': helpPage(S.helpAt + 1); return true;
    case 'ArrowLeft': helpPage(S.helpAt - 1); return true;
    case 'ArrowDown': body.scrollTop += 40; return true;
    case 'ArrowUp': body.scrollTop -= 40; return true;
    case 'PageDown': body.scrollTop += step; return true;
    case 'PageUp': body.scrollTop -= step; return true;
    case 'Home': body.scrollTop = 0; return true;
    case 'End': body.scrollTop = body.scrollHeight; return true;
    case 'Escape': case '?': case 'F1': showHelp(false); return true;
  }
  return false;
}

// ----------------------------------------------------------- the roads
document.addEventListener('dragover', (e) => { e.preventDefault(); document.body.classList.add('dragging'); });
document.addEventListener('dragleave', (e) => { if (!e.relatedTarget) document.body.classList.remove('dragging'); });
document.addEventListener('drop', async (e) => {
  e.preventDefault(); document.body.classList.remove('dragging');
  const out = [], items = [...(e.dataTransfer.items || [])];
  if (items.length && items[0].webkitGetAsEntry) { for (const it of items) { const en = it.webkitGetAsEntry(); if (en) await walkEntry(en, out, 0); } }
  else for (const f of e.dataTransfer.files) if (LOADABLE.test(f.name)) out.push(entryOf(f.name, 'folder', { file: f }));
  if (!out.length) return setStatus('nothing to open there — a song (.it .swm .sws .swt .swq), a project (.zon) with its song files, or a folder', true);
  // a dropped folder: the names go relative to the folder the song sits in, so a project's spellings resolve
  const main = pickMainEntry(out), dir = main ? dirOf(main.path) : '';
  if (dir) for (const en of out) if (en.path.startsWith(dir)) en.path = en.path.slice(dir.length);
  setFolder(out, dir ? 'YOUR FOLDER — ' + dir.replace(/\/$/, '').split('/').pop() : 'THE FILES YOU DROPPED');
  if (main) openEntry(main, true); else afterFolder(out);
});
$('#b-open').addEventListener('click', () => $('#files').click());
$('#files').addEventListener('change', (e) => { const en = fromFileList(e.target.files, 'THE FILES YOU PICKED'); if (en) { const m = pickMainEntry(en); if (m) openEntry(m, true); else afterFolder(en); } });
$('#b-folder').addEventListener('click', pickFolder);
$('#folder').addEventListener('change', (e) => { const en = fromFileList(e.target.files, null); if (en) afterFolder(en); });
$('#b-files').addEventListener('click', () => showPanel(!S.panelOpen));

// the gallery: songs.json names every song it ships, with who made it and
// under what licence; the files sit under songs/ in the gallery's own layout
async function loadGallery() {
  let list = [];
  try { list = await (await fetch('songs.json')).json(); } catch { list = []; }
  if (list && list.songs) list = list.songs;
  S.gallery = (list || []).map((g) => entryOf(g.main, 'gallery', {
    url: new URL('songs/' + g.main, location.href).href,
    title: g.title || '', by: g.by || '', group: g.group || 'THE GALLERY',
    license: g.license || '', source: g.source || '', meta: g.license || '',
  }));
  renderPanel();
}
// ---------------------------------------------------------- controls
function loopToggle() { duet.loop = duet.loop !== -1; $('#b-loop').textContent = duet.loop === -1 ? 'LOOP ∞' : 'LOOP once'; $('#b-loop').classList.toggle('on', duet.loop === -1); }
$('#b-play').addEventListener('click', () => duet.play());            // from the top: the clock starts again
$('#b-pause').addEventListener('click', () => duet.togglePause());
$('#b-stop').addEventListener('click', () => duet.stop());            // m64's ruling: STOP puts the time back to 0:00
$('#b-rewind').addEventListener('click', () => duet.rewind());
$('#b-loop').addEventListener('click', loopToggle);
$('#b-view').addEventListener('click', toggleView);
$('#b-sub-prev').addEventListener('click', () => { const i = duet.info; if (i) duet.subtune = (i.subtune + i.subtunes - 1) % i.subtunes; });
$('#b-sub-next').addEventListener('click', () => { const i = duet.info; if (i) duet.subtune = (i.subtune + 1) % i.subtunes; });
$('#b-model').addEventListener('click', () => { const i = duet.info; if (i) duet.model = i.model === 1 ? 0 : 1; });
$('#b-quality').addEventListener('click', () => { const i = duet.info; if (i) duet.quality = (i.quality + 1) % 3; });
$('#vol').addEventListener('input', (e) => { duet.volume = e.target.value / 100; });
document.querySelectorAll('#modes span[data-viz]').forEach((el) => el.addEventListener('click', () => setViz(el.dataset.viz)));
function setViz(mode) { S.viz = mode; document.querySelectorAll('#modes span[data-viz]').forEach((el) => el.classList.toggle('on', el.dataset.viz === mode)); }
document.addEventListener('keydown', (e) => {
  const inField = e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT';
  if (S.helpOpen) { if (helpKey(e)) e.preventDefault(); return; } // the help is on top: it takes its keys and swallows the rest
  if (S.panelOpen) { // the panel takes the four keys that move it; the filter box takes the rest
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); return moveSel(1);
      case 'ArrowUp': e.preventDefault(); return moveSel(-1);
      case 'Enter': e.preventDefault(); return void openEntry(S.rows[S.sel], true);
      case 'Escape': e.preventDefault(); return showPanel(false);
    }
    if (inField) return;
  }
  if (inField) return;
  switch (e.key) {
    case ' ': e.preventDefault(); $('#b-pause').click(); break;
    case 'Enter': $('#b-play').click(); break;
    case 'Escape': $('#b-stop').click(); break;
    case 'f': case 'F': e.preventDefault(); showPanel(true); break; // the panel takes the filter's focus: the f must not land in it
    case '?': case 'F1': e.preventDefault(); showHelp(true); break;
    case 'l': case 'L': loopToggle(); break;
    case 'v': case 'V': toggleView(); break;
    case 'ArrowLeft': setViz(VIZ_MODES[(VIZ_MODES.indexOf(S.viz) + VIZ_MODES.length - 1) % VIZ_MODES.length]); break;
    case 'ArrowRight': setViz(VIZ_MODES[(VIZ_MODES.indexOf(S.viz) + 1) % VIZ_MODES.length]); break;
    case 'ArrowUp': S.bars = BAR_STYLES[(BAR_STYLES.indexOf(S.bars) + BAR_STYLES.length - 1) % BAR_STYLES.length]; break;
    case 'ArrowDown': S.bars = BAR_STYLES[(BAR_STYLES.indexOf(S.bars) + 1) % BAR_STYLES.length]; break;
  }
});

// ------------------------------------------------- ?song= and the self-test
async function afterReady() {
  await loadGallery();
  restoreFolder();
  const want = params.get('song');
  // ?song= names a gallery entry, or any file under songs/ (a project fetches its song files beside it)
  const e = want
    ? S.gallery.find((g) => g.path === want || g.path.endsWith('/' + want))
      || entryOf(want, 'gallery', { url: new URL('songs/' + want, location.href).href, title: want, group: 'THE GALLERY' })
    : null;
  if (e) return void openEntry(e, !!params.get('autotest'));
  if (params.get('autotest') && S.gallery.length) return void openEntry(S.gallery[0], true);
  showPanel(true); // nothing named: the page opens on its files
}
function selfTest() {
  const info = duet.info, line = `SELFTEST ${info && duet.frames > 0 && duet.eventsSeen > 0 ? 'ok' : 'FAIL'} version=${duet.version} mode=${duet.mode} bytes=${duet.moduleBytes} build=${STAMP || '-'} title="${info ? info.title : ''}" kind=${info ? info.kind : '-'} frames=${duet.frames} events=${duet.eventsSeen} rows=${S.rowsSeen} columns=${S.columns.size} view=${S.view} gallery=${S.gallery.length} files=${S.folder.length} folders=${window.showDirectoryPicker ? 'handle' : 'snapshot'} help=${S.helpOpen ? 'p' + S.helpAt : 'closed'}/${helpSections.length} time=${duet.time.toFixed(1)} load=${Math.round(duet.load * 100)}% ready=${duet.isReady} ctx=${duet.context.state} status="${$('#status').textContent}"`;
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

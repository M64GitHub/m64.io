// duet-web.js — THE ENGINE AS A DROP-IN (XXIII.e). One class, `DuetEngine`,
// over the two files that ARE the engine in a browser: duet-worklet.js (an
// AudioWorkletProcessor that owns the WebAssembly instance and renders every
// 128-frame quantum on the audio thread) and duet.wasm (libduet, the DUET
// engine — Impulse Tracker, SID-Wizard through real reSID chips, the two
// synths, the mixer). A page embeds it the way a C program uses duet.h:
//
//   import { DuetEngine } from './duet-web.js';
//   const duet = new DuetEngine();                 // the AudioContext + the worklet; the module beside this script
//   await duet.ready;                              // the module compiled in the worklet
//   await duet.open('songs/swm/congabeat.swm');    // a URL, a File, a FileList, or [{ name, bytes }]
//   duet.play(); duet.stop(); duet.pause(); duet.seek(order, row); duet.loop = true;
//   duet.mute(TARGET.CHANNEL, 2, true); duet.subtune = 1; duet.model = '8580'; duet.quality = 'resample';
//   duet.on('row' | 'note_on' | 'marker' | 'ended' | 'position', fn);   // stamped in the context's clock: fired when HEARD
//   duet.gain.connect(yourAnalyser); duet.info; duet.position; duet.time;
//
// The three files sit beside each other; `base` moves them. Nothing here
// knows a format: the words are include/duet.h's. GPL-2.0-or-later — the
// module is a reSID build, and so is any page that links it.

export const DIALECT = ['IT', 'SD', 'DUST', 'DUSK', 'SW'];                       // duet_dialect, by number
export const TARGET = { CHANNEL: 0, IT_SUM: 1, CHIP: 2, DUST: 3, DUSK: 4, VOICE: 5, FX: 6 };   // duet_target
export const FAMILY = { PCM: 0, SW: 1, DUST: 2, DUSK: 3 };                      // duet_family, the keyboard's
export const KIND = ['IT', 'SWM', 'ZON'];                                        // duet_kind
export const QUALITY = ['fast', 'interpolate', 'resample'];                      // duet_sid_quality
export const MODEL = ['6581', '8580'];                                           // duet_sid_model
export const SW_PATTERN = 256;              // DUET_SW_PATTERN: a SID-Wizard module's patterns live above it
export const SONG_EXT = /\.(it|swm|sws|swt|swq|zon)$/i;
const ZON_SONGS = /\.(it|swm)\s*=\s*"([^"]+)"/g;   // the song files a project names, in its own spelling
const baseOf = (p) => p.slice(p.lastIndexOf('/') + 1);
const dirOf = (p) => { const i = p.lastIndexOf('/'); return i < 0 ? '' : p.slice(0, i + 1); };
const normPath = (p) => { const out = []; for (const part of p.split('/')) { if (!part || part === '.') continue; if (part === '..') out.pop(); else out.push(part); } return out.join('/'); };

export class DuetEngine {
  /**
   * @param {object} [opts]
   * @param {number} [opts.sampleRate=48000]  the context's rate (the tracker renders at 48 kHz)
   * @param {AudioContext} [opts.context]     bring your own; otherwise one is made and resumed on the first gesture
   * @param {boolean} [opts.connect=true]     wire `gain` to the destination; false to build your own graph off `gain`
   * @param {string|URL} [opts.base]          where duet-worklet.js and duet.wasm live (default: beside this script)
   * @param {string} [opts.stamp]             a cache stamp for the two files (`?v=`); the page's build passes one on
   *                                          this script's own URL, so it is read from there when not given
   * @param {string} [opts.latencyHint='playback']
   */
  constructor(opts = {}) {
    const { sampleRate = 48000, context = null, connect = true, base = import.meta.url, latencyHint = 'playback' } = opts;
    this.base = base;
    this.stamp = opts.stamp || new URL(import.meta.url).searchParams.get('v') || '';
    this.context = context || new AudioContext({ sampleRate, latencyHint });
    this.ownsContext = !context;
    this.node = null; this.gain = null;
    this.isReady = false; this.version = ''; this.mode = ''; this.moduleBytes = 0;
    this.stage = 'context up'; this.lastError = '';
    this.info = null; this.position = null; this.load = 0; this.dropped = 0; this.frames = 0; this.ended = false;
    this.loopTimes = -1;                                       // a player loops forever unless told otherwise
    this.playFrames = 0; this.lastFrames = null;               // THE PLAYING TIME — the host's clock, not the engine's
    this.queue = []; this.eventsSeen = 0; this.listeners = new Map();
    this.pats = new Map(); this.patWaiters = new Map();        // pattern id -> the decoded pattern (null: none), or the promise of it
    this.pendingOpen = null; this.readyWaiter = null;
    this.ready = this.boot(connect);
    this.ready.catch(() => {});                                // the host may await it or not; an unhandled reject helps nobody
    if (this.ownsContext && typeof document !== 'undefined') { // a browser starts no audio before a gesture
      const resume = () => { if (this.context.state !== 'running') this.context.resume(); };
      document.addEventListener('pointerdown', resume); document.addEventListener('keydown', resume);
    }
    this.timer = setInterval(() => this.drain(), 16);          // events fire when heard, whether or not the host polls
  }

  url(name) { const u = new URL(name, this.base); if (this.stamp) u.searchParams.set('v', this.stamp); return u.href; }

  async boot(connect) {
    const ctx = this.context;
    await ctx.audioWorklet.addModule(this.url('duet-worklet.js'));
    this.stage = 'worklet added';
    const node = new AudioWorkletNode(ctx, 'duet-processor', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
    const gain = ctx.createGain();
    node.connect(gain);
    if (connect) gain.connect(ctx.destination);
    this.node = node; this.gain = gain;
    node.port.onmessage = (e) => this.onWorklet(e.data);
    const ready = new Promise((res, rej) => { this.readyWaiter = { res, rej }; });
    // the module: with a stamp the URL is the content's own, and the cache may keep it;
    // without one it is revalidated every load, so a rebuilt module is never missed
    const bytes = await (await fetch(this.url('duet.wasm'), { cache: this.stamp ? 'default' : 'no-cache' })).arrayBuffer();
    this.stage = 'wasm fetched';
    node.port.postMessage({ type: 'module', bytes }, [bytes]);    // the worklet compiles it itself (synchronously, once)
    this.stage = 'module posted';
    setTimeout(() => { if (!this.isReady && this.readyWaiter) this.fail('the worklet did not answer in 10 s — is this browser blocking AudioWorklet or WebAssembly?'); }, 10000);
    return ready;
  }

  // ---------------------------------------------------------------- events
  /** `on(kind, fn)`: a ring kind by name — row, order, pattern_loop, song_loop, song_end, note_on,
   *  note_off, effect, volcol, marker — or 'event' for all of them, each fired the moment it is HEARD;
   *  plus 'ended' (the render ran dry), 'position' (every ~11 ms, the engine's position), 'ready',
   *  'opened' (the info; after a subtune/model/quality change too), 'error' (the message), 'log'. */
  on(kind, fn) { if (!this.listeners.has(kind)) this.listeners.set(kind, new Set()); this.listeners.get(kind).add(fn); return () => this.off(kind, fn); }
  off(kind, fn) { const s = this.listeners.get(kind); if (s) s.delete(fn); }
  emit(kind, a, b) { const s = this.listeners.get(kind); if (s) for (const fn of s) { try { fn(a, b); } catch (e) { console.error('[duet-web]', kind, e); } } }
  /** The instant the listener hears: the context's clock less the output latency. */
  heardTime() { const c = this.context; return c.currentTime - (c.outputLatency || c.baseLatency || 0); }
  /** Deliver every event that is due. Runs on a 16 ms timer; a host that draws in
   *  requestAnimationFrame may call it first thing in its frame for zero lag. */
  drain() {
    const now = this.heardTime(); let i = 0;
    while (i < this.queue.length && this.queue[i].t <= now) {
      const ev = this.queue[i++]; this.eventsSeen++;
      if (ev.kind === 'ended') { this.ended = true; this.emit('ended', ev); continue; }
      if (ev.kind === 'song_end') this.ended = true;
      this.emit(ev.kind, ev); this.emit('event', ev);
    }
    if (i) this.queue.splice(0, i);
  }

  onWorklet(m) {
    switch (m.type) {
      case 'ready': {
        this.isReady = true; this.version = m.version; this.mode = m.mode; this.moduleBytes = m.bytes;
        const w = this.readyWaiter; this.readyWaiter = null;
        const r = { version: m.version, mode: m.mode, bytes: m.bytes, sampleRate: m.sampleRate };
        this.emit('ready', r); if (w) w.res(r); break;
      }
      case 'opened': {
        this.info = m.info; this.ended = false; this.queue.length = 0; this.clockZero(); this.pats.clear(); this.patWaiters.clear();
        const p = this.pendingOpen; this.pendingOpen = null;
        this.emit('opened', m.info, !p); if (p) p.res(m.info); break;   // the second argument: a REBUILD, not a fresh open
      }
      case 'error': this.fail((m.name ? m.name + ': ' : '') + m.message); break;
      case 'tick': {
        this.position = m.position; this.clockTick(m.position); this.load = m.load; this.dropped += m.dropped; this.frames = m.position.frames;
        for (const ev of m.events) this.queue.push(ev);
        this.emit('position', m.position); break;
      }
      case 'pattern': this.onPattern(m); break;
      case 'log': this.emit('log', m.text); console.log('[libduet]', m.text); break;
    }
  }
  fail(message) {
    this.lastError = message;
    const w = this.readyWaiter, p = this.pendingOpen; this.readyWaiter = null; this.pendingOpen = null;
    if (w) w.rej(new Error(message)); if (p) p.rej(new Error(message));
    this.emit('error', message);
  }

  // ------------------------------------------------------- the playing time
  // THE POSITION'S `frames` IS THE ENGINE'S OUTPUT CLOCK, NOT A PLAYING TIME: every frame it
  // has rendered since it was built, stopped and paused alike, because the ring's stamps live
  // in it. So the host keeps its own: it advances only while the song really plays, halts on
  // PAUSE, and goes back to zero on PLAY, STOP, REWIND and every newly opened song.
  clockTick(p) {
    if (this.lastFrames !== null && p.playing && !p.paused && p.frames > this.lastFrames) this.playFrames += p.frames - this.lastFrames;
    this.lastFrames = p.frames;
  }
  clockZero() { this.playFrames = 0; this.lastFrames = null; }
  /** Seconds this song has been playing (0 after PLAY, STOP, REWIND; halted while paused). */
  get time() { return this.playFrames / this.context.sampleRate; }

  // ---------------------------------------------------------------- opening
  /**
   * Open a song. `src` is a URL (a `.zon` fetches the song files it names beside itself), a File,
   * a FileList / array of Files (a project finds its song files among them, by path then by name),
   * an array of `{ name, bytes }`, or `{ files: [{ name, bytes }], main }`. Resolves to the info
   * (null if a newer open took over first); rejects with the library's reason. `main` names the entry to open when it is not obvious;
   * `play: true` starts it on arrival.
   */
  async open(src, { main = null, play = false } = {}) {
    await this.ready;
    const set = await this.collect(src, main);
    const enc = new TextEncoder();
    const wire = set.files.map((f) => ({ nameBytes: enc.encode(f.name).buffer, bytes: f.bytes }));
    if (this.context.state !== 'running') this.context.resume();      // a pick or a drop is a gesture too
    const opened = new Promise((res, rej) => {
      if (this.pendingOpen) this.pendingOpen.res(null);                // a newer open took over: the older resolves null, not an error
      this.pendingOpen = { res, rej };
    });
    this.node.port.postMessage({ type: 'open', files: wire, main: { name: set.main, nameBytes: enc.encode(set.main).buffer } });
    const info = await opened;
    if (play && info) this.play();
    return info;
  }
  async collect(src, main) {
    if (typeof src === 'string' || src instanceof URL) return this.collectUrl(new URL(src, typeof document !== 'undefined' ? document.baseURI : this.base));
    if (typeof File !== 'undefined' && src instanceof File) src = [src];
    if (typeof FileList !== 'undefined' && src instanceof FileList) src = [...src];
    if (src && Array.isArray(src.files)) { main = main || src.main; src = src.files; }
    if (!Array.isArray(src) || !src.length) throw new Error('nothing to open');
    if (typeof File !== 'undefined' && src[0] instanceof File) return this.collectFiles(src, main);
    const files = src.map((f) => ({ name: String(f.name), bytes: f.bytes instanceof ArrayBuffer ? f.bytes : f.bytes.buffer.slice(f.bytes.byteOffset, f.bytes.byteOffset + f.bytes.byteLength) }));
    return { files, main: this.pickMain(files, main) };
  }
  pickMain(files, main) {
    if (main) { const m = files.find((f) => f.name === main || baseOf(f.name) === main); if (m) return m.name; throw new Error(main + ' is not among the files'); }
    const z = files.find((f) => /\.zon$/i.test(f.name)) || files.find((f) => SONG_EXT.test(f.name)) || files[0];
    return z.name;
  }
  async collectUrl(url) {
    const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error('the server answered ' + r.status + ' for ' + baseOf(u.pathname)); return r.arrayBuffer(); };
    const name = decodeURIComponent(baseOf(url.pathname)) || 'song';
    const files = [{ name, bytes: await get(url) }];
    if (/\.zon$/i.test(name)) {      // the project's song files travel under the project's own spelling
      const text = new TextDecoder().decode(new Uint8Array(files[0].bytes)), missing = [];
      for (const [, , rel] of text.matchAll(ZON_SONGS)) {
        try { files.push({ name: rel, bytes: await get(new URL(rel, url)) }); } catch { missing.push(rel); }
      }
      if (missing.length) throw new Error('this project names ' + missing.join(', ') + ' — not on the server beside it');
    }
    return { files, main: name };
  }
  async collectFiles(list, main) {
    const entries = list.map((f) => ({ file: f, path: f.webkitRelativePath || f.name }));
    // a folder pick spells every name under the folder itself; drop that first part
    const root = entries[0].path.includes('/') && entries.every((e) => e.path.startsWith(entries[0].path.split('/')[0] + '/')) ? entries[0].path.split('/')[0] + '/' : '';
    for (const e of entries) e.path = root ? e.path.slice(root.length) : e.path;
    const mainE = main ? entries.find((e) => e.path === main || baseOf(e.path) === main) : (entries.find((e) => /\.zon$/i.test(e.path)) || entries.find((e) => SONG_EXT.test(e.path)) || entries[0]);
    if (!mainE) throw new Error((main || 'a song') + ' is not among the files');
    const files = [{ name: baseOf(mainE.path), bytes: await mainE.file.arrayBuffer() }];
    if (/\.zon$/i.test(mainE.path)) {
      const text = new TextDecoder().decode(new Uint8Array(files[0].bytes)), dir = dirOf(mainE.path), missing = [];
      for (const [, , rel] of text.matchAll(ZON_SONGS)) {
        const full = normPath(dir + rel), base = baseOf(rel).toLowerCase();
        const found = entries.find((e) => e.path === full) || entries.find((e) => baseOf(e.path).toLowerCase() === base);
        if (!found) { missing.push(rel); continue; }
        files.push({ name: rel, bytes: await found.file.arrayBuffer() });
      }
      if (missing.length) throw new Error('this project names ' + missing.join(', ') + ' — not among the files you gave it');
    }
    return { files, main: files[0].name };
  }
  /** Forget the song; the node stays. */
  close() { this.send({ type: 'close' }); this.info = null; this.position = null; this.queue.length = 0; this.pats.clear(); this.patWaiters.clear(); this.clockZero(); }
  /** Stop the timer and, if the context is ours, close it. */
  dispose() { clearInterval(this.timer); this.close(); if (this.ownsContext) this.context.close(); }

  // ---------------------------------------------------------------- the verbs
  send(m) { if (this.node) this.node.port.postMessage(m); }
  play() { this.send({ type: 'play' }); this.ended = false; this.clockZero(); }            // from the top
  resume() { this.send({ type: 'resume' }); this.ended = false; }                            // from where it stands
  stop() { this.send({ type: 'stop' }); this.clockZero(); }                                  // dead silence, position kept
  rewind() { this.send({ type: 'rewind' }); this.ended = false; this.clockZero(); }
  pause() { this.send({ type: 'pause' }); }
  unpause() { this.send({ type: 'unpause' }); }
  /** What the page's PAUSE button does: pause / carry on / resume after a stop. */
  togglePause() { const p = this.position; if (!p) return; if (p.paused) this.unpause(); else if (p.playing) this.pause(); else this.resume(); }
  playFrom(order, row = 0) { this.send({ type: 'play_from', order, row }); this.ended = false; this.clockZero(); }
  seek(order, row = 0) { this.send({ type: 'seek', order, row }); }
  /** true = forever, false = once, a number = that many extra times. */
  get loop() { return this.loopTimes; }
  set loop(v) { this.loopTimes = v === true ? -1 : v === false ? 0 : (v | 0); this.send({ type: 'loop', times: this.loopTimes }); }
  mute(target, index, on) { this.send({ type: 'mute', target, index, on: !!on }); }
  solo(target, index, on) { this.send({ type: 'solo', target, index, on: !!on }); }
  /** The song's GLOBAL VOL, 0..128 — the song's own level, not this page's. */
  set globalVolume(v) { this.send({ type: 'gv', volume: v | 0 }); }
  /** This page's output level, 0..1 (the GainNode after the engine). */
  get volume() { return this.gain ? this.gain.gain.value : 1; }
  set volume(v) { if (this.gain) this.gain.gain.value = v; }
  noteOn(family, slot, note, ins = 0) { this.send({ type: 'note_on', family, slot, note, ins }); }
  noteOff(family, slot, note) { this.send({ type: 'note_off', family, slot, note }); }
  allNotesOff() { this.send({ type: 'all_notes_off' }); }
  // STRUCTURAL — the worklet rebuilds the engine between two renders; 'opened' fires again
  set subtune(n) { this.send({ type: 'subtune', subtune: n | 0 }); }
  get subtune() { return this.info ? this.info.subtune : 0; }
  set model(m) { this.send({ type: 'model', model: typeof m === 'string' ? Math.max(0, MODEL.indexOf(m)) : m | 0 }); }
  get model() { return this.info ? MODEL[this.info.model] : ''; }
  set quality(q) { this.send({ type: 'quality', quality: typeof q === 'string' ? Math.max(0, QUALITY.indexOf(q)) : q | 0 }); }
  get quality() { return this.info ? QUALITY[this.info.quality] : ''; }

  // ------------------------------------------------------------- the pattern data
  /** One pattern as the library spells it: `{ rows, channels, cells, dialects }` — `cells[row *
   *  channels + ch]` is the formatted line, `dialects[ch]` the column's duet_dialect — or null
   *  when there is no such pattern. A SID-Wizard module's patterns are `SW_PATTERN + n`. */
  pattern(id) {
    if (this.pats.has(id)) return Promise.resolve(this.pats.get(id));   // decoded, null, or the promise already on its way
    const p = new Promise((res) => { this.patWaiters.set(id, res); });
    this.pats.set(id, p);
    this.send({ type: 'pattern', id });
    return p;
  }
  onPattern(m) {
    let pat = null;
    if (m.rows > 0) {
      const cells = new Array(m.rows * m.channels), t = new Uint8Array(m.text), dec = new TextDecoder();
      for (let i = 0; i < cells.length; i++) {
        const off = i * m.stride; let end = off;
        while (end < off + m.stride && t[end]) end++;
        cells[i] = dec.decode(t.subarray(off, end));
      }
      pat = { rows: m.rows, channels: m.channels, cells, dialects: new Uint8Array(m.dialects) };
    }
    this.pats.set(m.id, pat);
    const w = this.patWaiters.get(m.id); this.patWaiters.delete(m.id);
    if (w) w(pat);
  }
  /** The decoded pattern if it has arrived, undefined if it was never asked for, null if there is none. */
  patternNow(id) { const p = this.pats.get(id); return p instanceof Promise ? undefined : p; }
}

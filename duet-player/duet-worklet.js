// duet-worklet.js — THE ENGINE'S THREAD (XXII.d). An AudioWorkletProcessor
// owns the wasm instance: the whole of libduet runs here, on the audio
// rendering thread, single-threaded — the render road and the value
// verbs on ONE thread, which is what src/atomic.zig's plain words assume
// and what the C header's threading contract allows. The page talks to
// it through the port only: verbs in, batches of ring events + the
// position out. Every event is re-stamped from the engine's output
// clock into the AudioContext's, so the page shows a row the moment it
// is HEARD, not the moment it was rendered.

const KIND = ['row', 'order', 'pattern_loop', 'song_loop', 'song_end', 'note_on', 'note_off', 'effect', 'volcol', 'marker'];
const ENOSYS = 52, EBADF = 8, ENOENT = 44;

// An AudioWorkletGlobalScope is a small world: no text codec is promised
// there, so the page sends names as UTF-8 bytes and this decodes the
// library's C strings by hand.
function utf8(bytes) {
  let out = '', i = 0;
  while (i < bytes.length) {
    const b = bytes[i++];
    if (b < 0x80) out += String.fromCharCode(b);
    else if (b < 0xe0) out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f));
    else if (b < 0xf0) out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
    else { const cp = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f); out += String.fromCodePoint(cp); }
  }
  return out;
}

class DuetProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.E = null;          // the exports, once instantiated
    this.song = 0; this.eng = 0;
    this.buf = 0; this.ev = 0; this.pos = 0; this.opts = 0;
    this.loop = -1;         // a player loops forever unless told otherwise
    this.ended = false;
    this.pending = [];      // events waiting for the next batch
    this.blocks = 0;        // process() calls since the last batch
    this.busy = 0;          // ms spent rendering since the last batch
    this.lastPos = null;
    this.port.onmessage = (e) => this.onMessage(e.data);
    console.log('[duet-worklet] up at', sampleRate, 'Hz');
  }

  // ---------------------------------------------------------- memory
  mem() { return new Uint8Array(this.E.memory.buffer); }
  view() { return new DataView(this.E.memory.buffer); }
  cstr(p) {
    const m = this.mem(); let e = p; while (m[e]) e++;
    return utf8(m.subarray(p, e));
  }
  // `name` is the spelling as UTF-8 bytes (the page encodes it)
  put(name, bytes) {
    const E = this.E, u8 = new Uint8Array(bytes), nb = new Uint8Array(name);
    const p = E.duet_wasm_alloc(u8.length); this.mem().set(u8, p);
    const np = E.duet_wasm_alloc(nb.length); this.mem().set(nb, np);
    const rc = E.duet_wasm_put(np, nb.length, p, u8.length);
    E.duet_wasm_free(np, nb.length);
    return rc === 0;
  }

  // ----------------------------------------------------- the module
  // SYNCHRONOUS on purpose: an AudioWorkletGlobalScope's promise-based
  // WebAssembly.instantiate never settled in headless Chrome (s136), while
  // the constructor forms work everywhere — one ~50 ms compile at load,
  // before any song plays.
  instantiate(bytes) {
    try { this.instantiateOrThrow(bytes); }
    catch (e) {
      this.E = null; // a module that did not finish starting is no module: every verb is refused from here
      console.error('[duet-worklet]', e);
      this.port.postMessage({ type: 'error', message: 'the wasm module could not start: ' + (e && e.message ? e.message : e) });
    }
  }
  instantiateOrThrow(bytes) {
    const self = this;
    // THE WASI STUB. Nothing on the render road calls any of these; libc's
    // start-up does: `_initialize` walks the preopened directories with
    // fd_prestat_get until EBADF — answer anything else (ENOSYS!) and
    // wasi-libc _Exit(71)s (s136b: a Debug module imports twelve of
    // these, a ReleaseSmall one four). A write goes to the page's console.
    const zero32 = (ptr) => { self.view().setUint32(ptr, 0, true); return 0; };
    const wasi = {
      fd_prestat_get: () => EBADF, fd_prestat_dir_name: () => EBADF,   // no preopens: the walk ends
      fd_fdstat_get: () => EBADF, fd_filestat_get: () => EBADF, fd_close: () => EBADF, fd_seek: () => EBADF,
      fd_read: () => EBADF, fd_pwrite: () => EBADF, fd_pread: () => EBADF, fd_sync: () => EBADF,
      path_open: () => ENOENT, path_filestat_get: () => ENOENT, path_unlink_file: () => ENOENT,
      environ_sizes_get: (count, size) => { zero32(count); zero32(size); return 0; }, environ_get: () => 0,
      args_sizes_get: (count, size) => { zero32(count); zero32(size); return 0; }, args_get: () => 0,
      clock_time_get: (id, precision, out) => { self.view().setBigUint64(out, BigInt(Math.round(Date.now() * 1e6)), true); return 0; },
      clock_res_get: (id, out) => { self.view().setBigUint64(out, 1000000n, true); return 0; },
      random_get: (ptr, len) => { const m = self.mem(); for (let i = 0; i < len; i++) m[ptr + i] = (Math.random() * 256) | 0; return 0; },
      sched_yield: () => 0, poll_oneoff: () => ENOSYS,
      fd_write(fd, iovs, iovsLen, nwritten) {
        const v = self.view(); let total = 0, text = '';
        for (let i = 0; i < iovsLen; i++) {
          const ptr = v.getUint32(iovs + i * 8, true), len = v.getUint32(iovs + i * 8 + 4, true);
          text += utf8(self.mem().subarray(ptr, ptr + len)); total += len;
        }
        v.setUint32(nwritten, total, true);
        if (text) self.port.postMessage({ type: 'log', fd, text });
        return 0;
      },
      fd_close: () => EBADF, fd_seek: () => EBADF, fd_filestat_get: () => EBADF,
      proc_exit: (code) => { throw new Error('the library called proc_exit(' + code + ')'); },
    };
    const imports = { wasi_snapshot_preview1: new Proxy(wasi, { get: (t, k) => (k in t ? t[k] : () => ENOSYS) }) };
    console.log('[duet-worklet] compiling', bytes.byteLength, 'bytes');
    const module = new WebAssembly.Module(bytes);
    const inst = new WebAssembly.Instance(module, imports);
    this.E = inst.exports;
    if (this.E._initialize) this.E._initialize();
    this.buf = this.E.duet_wasm_alloc(128 * 2 * 4);
    this.ev = this.E.duet_wasm_alloc(24);
    this.pos = this.E.duet_wasm_alloc(24);
    this.opts = this.E.duet_wasm_alloc(8);
    console.log('[duet-worklet] libduet', this.cstr(this.E.duet_version()), 'instantiated');
    this.port.postMessage({ type: 'ready', version: this.cstr(this.E.duet_version()), mode: this.E.duet_wasm_mode ? this.cstr(this.E.duet_wasm_mode()) : 'unknown', bytes: bytes.byteLength, sampleRate });
  }

  // -------------------------------------------------------- the song
  close() {
    const E = this.E;
    if (this.eng) { E.duet_engine_free(this.eng); this.eng = 0; }
    if (this.song) { E.duet_song_free(this.song); this.song = 0; }
    this.ended = false; this.pending.length = 0; this.lastPos = null;
  }
  open(files, main) {
    const E = this.E;
    this.close();
    for (const f of files) if (!this.put(f.nameBytes, f.bytes)) { E.duet_wasm_clear(); return this.fail('the file table refused ' + utf8(new Uint8Array(f.nameBytes))); }
    const nb = new Uint8Array(main.nameBytes); const np = E.duet_wasm_alloc(nb.length); this.mem().set(nb, np);
    const song = E.duet_wasm_open(np, nb.length);
    E.duet_wasm_free(np, nb.length);
    E.duet_wasm_clear();
    if (!song) {
      const ep = E.duet_wasm_error(), code = this.view().getInt32(ep, true), msg = this.cstr(ep + 4);
      return this.fail(this.cstr(E.duet_error_string(code)) + (msg ? ' - ' + msg : ''), main.name);
    }
    this.song = song; this.lastName = main.name;
    if (!this.build()) return this.fail('could not build the engine', main.name);
    this.port.postMessage({ type: 'opened', info: this.info(main.name) });
  }
  build() {
    const E = this.E, v = this.view();
    v.setInt32(this.opts, this.loop, true); v.setInt32(this.opts + 4, 0, true);
    if (this.eng) E.duet_engine_free(this.eng);
    this.eng = E.duet_engine_new(this.song, sampleRate, this.opts);
    this.ended = false;
    return this.eng !== 0;
  }
  info(main) {
    const E = this.E, s = this.song;
    const markers = [], mk = E.duet_wasm_alloc(8);
    for (let i = 0; i < E.duet_song_num_markers(s); i++) {
      if (E.duet_song_marker(s, i, mk) !== 0) break;
      const v = this.view();
      markers.push({ pattern: v.getUint8(mk), chan: v.getUint8(mk + 1), row: v.getUint16(mk + 2, true), value: v.getUint16(mk + 4, true) });
    }
    E.duet_wasm_free(mk, 8);
    return {
      name: main, kind: E.duet_song_kind(s),
      title: this.cstr(E.duet_song_title(s)), author: this.cstr(E.duet_song_author(s)), message: this.cstr(E.duet_song_message(s)),
      channels: E.duet_song_num_channels(s), orders: E.duet_song_num_orders(s), patterns: E.duet_song_num_patterns(s),
      samples: E.duet_song_num_samples(s), instruments: E.duet_song_num_instruments(s), chips: E.duet_song_num_chips(s),
      subtunes: E.duet_song_num_subtunes(s), subtune: E.duet_song_subtune(s),
      model: E.duet_song_sid_model(s), quality: E.duet_song_sid_quality(s), markers, loop: this.loop,
    };
  }
  fail(message, name) { this.port.postMessage({ type: 'error', message, name }); }

  // --------------------------------------------------------- verbs
  onMessage(m) {
    try { this.dispatch(m); }
    catch (e) { this.port.postMessage({ type: 'error', message: 'the worklet failed on ' + m.type + ': ' + (e && e.message ? e.message : e) }); }
  }
  dispatch(m) {
    const E = this.E;
    if (m.type === 'module') { this.instantiate(m.bytes); return; }
    if (!E) { if (m.type === 'open') this.fail('the wasm module did not start — reload the page; the console has the reason'); return; }
    if (m.type === 'open') { this.open(m.files, m.main); return; }
    if (m.type === 'close') { this.close(); return; }
    if (!this.eng) return;
    switch (m.type) {
      case 'play': E.duet_engine_play(this.eng); this.ended = false; break;
      case 'resume': E.duet_engine_resume(this.eng); this.ended = false; break;
      case 'stop': E.duet_engine_stop(this.eng); break;
      case 'rewind': E.duet_engine_rewind(this.eng); this.ended = false; break;
      case 'pause': E.duet_engine_pause(this.eng); break;
      case 'unpause': E.duet_engine_unpause(this.eng); break;
      case 'play_from': E.duet_engine_play_from(this.eng, m.order, m.row | 0); this.ended = false; break;
      case 'seek': E.duet_engine_seek(this.eng, m.order, m.row | 0); E.duet_engine_events_clear(this.eng); this.pending.length = 0; break;
      case 'loop': this.loop = m.times; E.duet_engine_set_loop(this.eng, m.times); break;
      case 'mute': E.duet_engine_set_mute(this.eng, m.target, m.index, m.on ? 1 : 0); break;
      case 'solo': E.duet_engine_set_solo(this.eng, m.target, m.index, m.on ? 1 : 0); break;
      case 'gv': E.duet_engine_set_global_volume(this.eng, m.volume); break;
      case 'note_on': E.duet_engine_note_on(this.eng, m.family, m.slot | 0, m.note, m.ins | 0); break;
      case 'note_off': E.duet_engine_note_off(this.eng, m.family, m.slot | 0, m.note); break;
      case 'all_notes_off': E.duet_engine_all_notes_off(this.eng); break;
      // STRUCTURAL: between two renders is exactly when no render runs
      case 'subtune': if (E.duet_song_select_subtune(this.song, m.subtune) === 0) this.rebuild(); break;
      case 'model': E.duet_song_set_sid_model(this.song, m.model); this.rebuild(); break;
      case 'quality': E.duet_song_set_sid_quality(this.song, m.quality); this.rebuild(); break;
    }
  }
  rebuild() {
    const wasPlaying = this.position().playing;
    if (this.E.duet_engine_rebuild(this.eng) !== 0) return this.fail('the rebuild failed');
    this.pending.length = 0;
    if (wasPlaying) this.E.duet_engine_play(this.eng);
    this.port.postMessage({ type: 'opened', info: this.info(this.lastName) });
  }
  position() {
    this.E.duet_engine_position(this.eng, this.pos);
    const v = this.view(), p = this.pos;
    return {
      frames: Number(v.getBigUint64(p, true)), order: v.getUint16(p + 8, true), pattern: v.getUint16(p + 10, true), row: v.getUint16(p + 12, true),
      tick: v.getUint8(p + 14), speed: v.getUint8(p + 15), tempo: v.getUint8(p + 16), playing: v.getUint8(p + 17), paused: v.getUint8(p + 18), ended: v.getUint8(p + 19),
    };
  }

  // -------------------------------------------------------- render
  process(inputs, outputs) {
    const E = this.E, out = outputs[0];
    if (!E || !this.eng || !out || out.length < 2) return true;
    const L = out[0], R = out[1], n = L.length;
    const t0 = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    // the engine's clock before this block: the frame `currentFrame` will play
    E.duet_engine_position(this.eng, this.pos);
    const engFrame0 = Number(this.view().getBigUint64(this.pos, true));
    const got = E.duet_engine_render_f32(this.eng, this.buf, n);
    const f = new Float32Array(E.memory.buffer, this.buf, n * 2);
    for (let i = 0; i < got; i++) { L[i] = f[2 * i]; R[i] = f[2 * i + 1]; }
    for (let i = got; i < n; i++) { L[i] = 0; R[i] = 0; }
    // drain the ring, re-stamped into the context's clock
    while (E.duet_engine_next_event(this.eng, this.ev)) {
      const v = this.view(), p = this.ev;
      const frame = Number(v.getBigUint64(p, true));
      this.pending.push({
        t: (currentFrame + (frame - engFrame0)) / sampleRate,
        kind: KIND[v.getUint8(p + 8)] || 'unknown', dialect: v.getUint8(p + 9), channel: v.getUint8(p + 10), tick: v.getUint8(p + 11),
        order: v.getUint16(p + 12, true), pattern: v.getUint16(p + 14, true), row: v.getUint16(p + 16, true),
        a: v.getUint8(p + 18), b: v.getUint8(p + 19), c: v.getUint8(p + 20),
      });
    }
    this.busy += ((typeof performance !== 'undefined') ? performance.now() : Date.now()) - t0;
    if (got < n && !this.ended) { this.ended = true; this.pending.push({ t: (currentFrame + got) / sampleRate, kind: 'ended' }); }
    if (++this.blocks >= 4) { // a batch every ~11 ms at 48 kHz
      const position = this.position();
      const blockMs = this.blocks * n / sampleRate * 1000;
      this.port.postMessage({ type: 'tick', events: this.pending, position, load: this.busy / blockMs, dropped: E.duet_engine_events_dropped(this.eng), at: currentTime });
      this.pending = []; this.blocks = 0; this.busy = 0;
    }
    return true;
  }
}
registerProcessor('duet-processor', DuetProcessor);

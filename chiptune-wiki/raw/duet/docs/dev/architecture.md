# Architecture

DUET is a library with two programs on it. The engine — the formats,
the players, the chips, the synths, the mixer, the bounce — is the Zig
module `duet`, and `libduet` is its C ABI ([libduet](libduet.md)). The
tracker is that library's first program, in one codebase with two
faces: `duet` draws in a kitty-class terminal, `duet-gui` in an SDL3
window. The command line, every headless mode, the session, the key
handling and the audio graph are the same code in both; only the
presenter differs. This page is the map — where the code lives, how
the two faces plug in, which thread owns what, and how a note becomes
a sample. The words are the [glossary](../glossary.md)'s; a name in
backticks is the code's.

## Where does the code live?

Everything under `src/` but `src/app/` is the library; nothing in it
opens a file, prints, or imports the app. `src/app/` is the tracker.

| path | owns |
|---|---|
| `src/duet.zig` | the module's root: every engine name a program reaches, `duet.it` … `duet.version`; its test block reaches the library's three test files |
| `src/song.zig` | `Song`, the document: the two modules, the SID pool, the setup, the mixer's knobs and saved mutes, the chord table, the patch banks, the sync markers, the container's labels; `open` from bytes with a resolver, `shadow` for a bounce |
| `src/graph.zig` | `Engine`, the graph: the players, the chips, the DUST and DUSK racks, the send units, the master chain, the taps, the event ring, the transport verbs, the mute law |
| `src/bounce.zig` | the offline job: the chunk loop, the exact cut, the fade, the stats, into a caller's sink |
| `src/events.zig` | the event ring and the sync markers' type |
| `src/project.zig` | the `.zon` grammar: `parse`, `serialize`, the version gate ([formats](formats-internals.md)) |
| `src/capi.zig`, `include/duet.h` | the C ABI over the same verbs; `src/wasm.zig` roots the browser build over it (`zig build wasm`); `examples/` holds the two example players and the web player, `webplay/` |
| `src/atomic.zig` | the 64-bit atomic: `std.atomic.Value` on every 64-bit target, a plain word on the single-threaded wasm build |
| `src/it/` | the Impulse Tracker format: `format.zig` (the structures), `loader.zig`, `writer.zig`, `dump.zig`, `tests.zig` |
| `src/player/` | `player.zig`: all playback state — the tick machine, effects, envelopes, NNA, the PCM mix; `tables.zig`: IT's pitch tables ([it-engine](it-engine.md)) |
| `src/sid/sid_shim.h`, `.cpp` | the C calls over reSID ([sid-and-resid](sid-and-resid.md)) |
| `src/sid/engine.zig` | `SidEngine`: the reSID instances behind `SidBackend`, the frame lanes (`Lane`), the render spans; `testplayer.zig` is `--sid-test` |
| `src/sid/rig.zig` | the SID setup as data: chips, DUST and DUSK slots, the column map |
| `src/sid/sw*.zig`, `sdfx.zig` | SID-Wizard: `swmod` (the module), `swplayer`/`swvoice` (the player), `swtables`, `swinst`, `swwriter`/`swiwriter`, `swexport`, `swhybrid` (SID columns in an IT song), `swjam`, `swrig`; `sdfx` is the SID column's effect dialect ([sid-wizard-engine](sid-wizard-engine.md)) |
| `src/sid/dust.zig`, `dustrack.zig` | DUST: the pure core, and its reSID side ([dust-dusk-internals](dust-dusk-internals.md)) |
| `src/sid/dusk.zig`, `duskrack.zig` | DUSK: the pure core, and its frame memory |
| `src/audio/dsp.zig`, `fx.zig` | the mixer's stages; the send units, buses and returns ([the mixer](the-mixer.md)) |
| `src/audio/tap.zig`, `wav.zig` | the mix ring and the scope's probe, one per engine; the `.wav` reader and the 16-bit law |
| `src/app/main.zig` | the program: `appMain` (the command line and every headless mode), the `Session` (a `Song`, an `Engine`, the UI's state), the key handling, `runSession` (the frame loop) |
| `src/app/gui_main.zig` | the window build's root — `appMain(.gui)`, four lines |
| `src/app/device.zig`, `ma_shim.c`, `.h` | miniaudio behind a four-function shim; the audio callback |
| `src/app/load.zig`, `config.zig`, `undo.zig`, `wavfile.zig` | the CPU meter; `~/.config/duet/config.zon`; the undo store (UI thread only); the `.wav` file writer and the bounce's file and memory sinks |
| `src/app/frontend/` | `event.zig` (the contract), `term.zig` (the terminal), `sdl.zig` (the window) |
| `src/app/ui/` | `canvas.zig` (the text layer), `theme.zig` (every colour), `hud.zig` (header, grid, footer, `State`), `screens.zig` (the page list), `keymap.zig`, the views (`*view.zig`) and the reducers (`patedit`, `smpedit`, `mixedit`, `dustedit` …) |
| `src/app/tests.zig` | the app's test root: the reducers, the undo store, the meter's ballistics |
| `vendor/` | `miniaudio.h`, `resid/` (GPL-2+), `stb/` (`stb_truetype`) |

## What does `zig build` make?

`build.zig` defines the module `duet` once (`duetModule`: the root file,
reSID's sixteen C++ sources and the shim compiled into it — a program gets the
chips by importing) and builds everything else over it: `duet`, `duet-gui`,
`libduet.a` and `libduet.dylib` (`.so` on Linux) over `src/capi.zig` with
`include/duet.h` beside them, and the two examples — five things and a header.
`duet` (root `src/app/main.zig`) needs movy's terminal layer (termios), so it
exists on POSIX only: `-Dtarget=x86_64-windows-gnu` ships `duet-gui.exe`, the
library (`duet.dll`, its import library `duet.lib`, `duet_static.lib`) and the
examples. `duet-gui` (root `src/app/gui_main.zig`) links SDL3 (fetched from
`castholm/SDL`) and bakes the embedded JetBrains Mono through `stb_truetype`.
miniaudio (`wireMiniaudio`) rides the tracker binaries and `zigplay`, never
the module — the device is the program's; movy (fetched from `M64GitHub/movy` by release tag)
is the presenters', never the library's. `linkOsAudio` links CoreAudio on
macOS; Linux needs no audio dev packages.

`zig build -l` lists the steps: `install` (the default), `run`, `tui`,
`gui`, `run-gui`, `lib`, `examples`, `test` (three roots —
[testing](testing.md)). The build is Debug by default — the safety
checks and the leak counting are the gate; `-Doptimize=ReleaseFast`
is the fast build, for a live session with a heavy song and for a
release. Every render is byte-identical between the two modes.

## How do the two faces plug in?

`appMain(comptime frontend: FrontendTag)` is the whole program; each
root passes `.terminal` or `.gui`. Because the tag is comptime, the
Windows build never analyses termios and the terminal build never
sees SDL — and everything before the frontend is chosen (the argument
loop, the file loading, every `--render`/`--dump-*` mode) is one
function in both. `runSession(comptime FE, fe, …)` then drives the
presenter through `src/app/frontend/event.zig`'s contract:

| call | does |
|---|---|
| `pump(frame_no)` | polls what needs polling: the terminal's resize ioctl, the harness's scripted keys |
| `next()` | the next pending `FeEvent`: `.key` (a movy-shaped key), `.resize` (cols, rows), `.quit` |
| `applyResize(alloc, cols, rows)` | rebuilds the presenter's own stack at the new grid |
| `present(alloc, canvas, frame, st)` | puts the finished `TextCanvas` and pixel `Frame` on the glass |

plus `init`, `deinit` and `hasReleases()` (whether key releases
arrive — the header's `KITTY ON`). The contract is plain data: a
frontend never reaches into the session, and the key handling consumes
movy-shaped keys whoever made them. `MIN_COLS 80`, `MIN_ROWS 24` and
`MAX_COLS 200` live here as shared policy (the window's minimum size).

`term.zig` owns raw mode, the alternate screen, the kitty keyboard protocol,
movy's `Screen` with its threaded diff writer, a ~2.5 s resize poll and the
panic hook that restores the terminal (`panicCleanup`). `sdl.zig` is DUET's
own terminal emulator: the canvas's cells become glyph-atlas quads, the movy
`Frame` a streaming texture, SDL key events movy-shaped keys with kitty
semantics; the window owns its chrome keys (font zoom, fullscreen), and
`--gui-shot` / `--gui-keys` / `--gui-log` run the real session in a hidden
window and save frame N as a BMP — the only headless road that sees colours.

## The frame loop

`runSession` runs at ~60 fps (`FRAME_NS`, a drift-compensating deadline). Each
frame: `fe.pump`; drain `fe.next()` — a `.resize` rebuilds the shared
`TextCanvas` and `movy.Frame`, then `applyResize`; a `.key` goes through the
key handling, which mutates the `Session` and `hud.State` and records undo; a
running export or block bounce is stepped a few blocks (no thread — the frame
loop is its engine); then `canvas.clear()`, `drawPage`, the file dialog if
open, `fe.present`. The text layer is a cell grid whose `ch == 0` cells are
transparent, so the pixel layer shows through; `--dump-screen` prints that
grid — why every popup carries its numbers in text.

The editors are *reducers*: `patedit.zig`, `smpedit.zig`,
`mixedit.zig`, `dustedit.zig` and their siblings are movy-free, the
state lives with the caller (`hud.State`), a keypress comes back as a
value describing the edit, and `main.zig` applies it to the document
and the undo store. The views (`hud.zig`, `mixerview.zig`, …) only draw
— so the reducers run under `zig build test` from `src/app/tests.zig`.

## Which thread owns what?

Two threads matter: the UI thread (the frame loop) and the audio
thread — miniaudio's, which calls `sm_audio_callback` in
`src/app/device.zig`. (`term.zig` adds movy's writer thread, which
only carries bytes to the terminal.)

**The callback takes no lock, allocates nothing and does no I/O.** It
is three lines: `load.begin`, `engine.render(out)`, `load.end` — the
one `Engine` the session holds (`device.active_engine`, set before the
device starts and never while it runs; the four self-tests register a
render thunk in its place). `player.zig`'s state is the audio
thread's, and the UI reaches the engine through the library's value
verbs — each an atomic the render thread takes at its next span head:

| verb, atomic | carries |
|---|---|
| `play`, `playOn`, `stop`, `rewind`, `playFrom`, `playPattern` | the transport: F5/F8, the rewind, F6's pattern loop, F7's play from the selected order |
| `chan_setup_gen`, `room_gen` | generations: the UI edits the module's channel setup or the mixer's knobs, bumps the counter, and the audio thread reloads them at the next span |
| `noteOn`, `noteOff`, `allNotesOff` | the jam ring: notes from the keyboard, one producer, one consumer |
| `position()`; `vu_levels`, `note_trig`, `sum_peak_pub`, `env_pos_pub` | tempo, speed, order, pattern, row and the output clock for the header; what the meters, the note pulse and the envelope editor's playing position draw |
| `setGlances`, `setMute`, `setSolo`, `publishRig`, `setGlobalVol` | the mixer's mutes and solos, the chips' models and pans, the song's volume |

Anything that must allocate or replace part of the graph — a file open, a slot
armed, a sample written into a P## — goes through the **device-stopped
cycle**: `audio.stop()`, `sess.eng.teardown()`, the change to the song,
`graphBuild(sess)` (`Engine.build` over the session's song), `audio.start()` —
all in `src/app/main.zig`. reSID's sampling setup allocates, and DUSK's frame
memory is rebuilt, inside that cycle and nowhere else. The one knob that
allocates without a cycle is QUALITY: `hushedResample` raises the engine's
`hush`, `device.awaitCallbacks` proves the audio thread has left the chips,
and `Engine.resample` re-samples them in the gap.

## How does a note become a sample?

1. **Open.** The app reads the file's bytes and calls `Song.open`
   with the kind its name says and, for a project, a resolver
   (`FsResolver`) that joins the project's spellings to its folder
   and reads the song files — the library opens nothing itself.
   `it/loader.zig` parses the `.it` into an `itf.Module` (everything
   in one arena, every read bounds-checked); `swmod.zig` a SID-Wizard
   module; `project.parse` the `.zon`.
2. **Build.** `Engine.build` creates the `Player`, the `SwPlayer`, the
   live chips (`wireHybrid`, `wireCoPlay`, `addSwmSids` — one recipe
   for every road), the DUST and DUSK slots, and wires the mixer's
   `Room`, the send units (`fx.FxRack`), the master chain, the taps and
   the event ring. The same `build` serves the callback and the bounce.
3. **The callback**: start the CPU stopwatch, `engine.render` — zero
   the buffer, let the send units claim their taps, `player.render`,
   then `fx.process` (the units and returns), `master.process` (MASTER
   and DYN), the master tap for the visualizer — stop the stopwatch.
   With no IT player (a `.swm` played alone, the jam in an empty
   session, `--sid-test`) the engine renders the chips on their own
   lanes instead.
4. **The span.** `Player.render` walks the buffer in spans that end at
   a tick boundary. At each tick: `processTick` (the row machine,
   effects), `updateVoices` (envelopes, NNA), `sidTick`, `dustTick`,
   `duskTick` (the SID and synth columns' notes, dispatched at the
   same sample as the PCM note beside them), in a co-play the
   SID-Wizard player's call with its multispeed sub-calls inside the
   tick — and every dispatch writes its event, stamped with the output
   clock. `mixSpan` then renders the PCM voices and calls the three
   render hooks — `sid_render_fn` (`SidEngine.renderAt`),
   `dust_render_fn`, `dusk_render_fn` — at `level = songLevel()`,
   GV × MV, so every family follows the song's level. Register writes
   land at span boundaries, which makes them sample-accurate
   ([sid-and-resid](sid-and-resid.md)).
5. **Offline** is the same road. `bounce.Job.step` drives an `Engine`
   of its own — over a `shadow` of the song, `loop = .once`, no
   keyboard — in `CHUNK` (4096-frame) blocks into the caller's sink:
   `--render` loops `runToEnd` into `wavfile.FileSink`, the export
   popup steps a few blocks per UI frame, the block bounce renders
   into a `MemSink`, stems are one job per strip. The job owns its own
   mixer state and chips — a live session and a running bounce never
   share mutable state.

## The SID setup as the chip inventory

`src/sid/rig.zig`'s `Rig` is what the PROJECT page's SETUP section
edits and the `.zon` saves: `chips[4]` (a `model` of `null` means
parked; `pan`; the three `chans` the voices stand on), `it_channels`,
`quality` (one for every chip), `dust[4]` and `dusk[8]` slots. It is
pure Zig — no C, no reSID — so its derivations are unit-tested.

Every column has a fixed home in the 64-channel pattern: chip *c*
voice *v* at `SD_BASE + c*3 + v` (channels 52–63), DUST slots at
48–51, DUSK slots at 40–47, PCM below (`IT_CAP` 52, 48 or 40 as the
slots arm); parking a chip or lowering IT CHANNELS never moves a byte.
`columns()` gives the grid its view order and `label()` the headers
(`CH01`, `DUST1`, `DUSK1`, `1:1`); the engine's `sids[]` mirror the
inventory by index, so chip 2's writes reach the second reSID.

## What must a change keep true?

- The callback law: a new field the UI must see is an atomic or a
  generation counter; a new allocation goes into the device cycle.
- The boundary: a library file never imports the app, never opens a
  file, never prints; the app reaches the engine only through
  `@import("duet")` — the compiler refuses the other direction.
- The frontend contract stays data: nothing in `src/app/frontend/`
  reaches into the session, and a key is movy-shaped whoever made it;
  both exes stay byte-identical in every headless mode (render once
  from each and `cmp`).
- Wiring exists once: `Engine.build` in `src/graph.zig` is the one
  recipe the callback and the bounce drive. A road added to one and
  not the other is the defect the one recipe exists to prevent.
- `Player.restart` re-initialises the struct and hand-restores a
  list of fields; a field added to `Player` that must outlive a
  rewind goes on that list.

## How is this verified?

```sh
./zig-out/bin/duet --bench tests/corpus/hybrid/twosid-demo.zon
#   PCM 52 voices, virgin        103.0x realtime  (  9.7 ms/s of audio)
#   4 reSID chips, virgin         21.7x realtime  ( 46.1 ms/s of audio)
duet     --render a.wav --seconds 4 tests/corpus/hybrid/twosid-demo.zon
duet-gui --render b.wav --seconds 4 tests/corpus/hybrid/twosid-demo.zon
cmp a.wav b.wav                    # identical
sh tools/capi-ab.sh                # the examples' bounces vs --render: ALL IDENTICAL
zig build test                     # 909 tests over three roots
```

The bench numbers are a ReleaseFast build's on one machine; the shape
is the claim — every stage it times is the code the callback runs. The
oracles, the screen dumps and the key harness are in [testing](testing.md).

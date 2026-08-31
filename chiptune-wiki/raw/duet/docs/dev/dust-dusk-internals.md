# DUST and DUSK internals

DUST is DUET's SID synth: each armed slot owns one reSID — three voices,
one filter — driven by four table programs and a mod matrix on the
patch's own clock. DUSK is the wavetable synth over the IT sample bank:
a morphing oscillator per note, a software copy of the SID's envelope,
a filter, the same modulation shapes. Both are a **pure core** (no chip,
no allocator, no clock) beside a **rack** — `DustRack`, `DuskRack` —
owning what the core may not. The user's view is [dust](../dust.md) and
[dusk](../dusk.md); the chips are in [sid-and-resid](sid-and-resid.md),
the strips in [the mixer](the-mixer.md), the pins in [testing](testing.md).

## Where it lives

| file | owns |
|---|---|
| `src/sid/dust.zig` | the pure core: `Patch`, the four tables and their clocks, the mod matrix, the chord/strum/grain/hard-restart topologies, `SynCell` (the column's dialect), the write funnel with its `Src` attribution, and `Slot` — a note engine that only ever *emits* `(reg, val, src)` |
| `src/sid/dustrack.zig` | `DustRack`: one `engine.Sid` per armed slot, the span cutting, the strip, the meters, the trace tee |
| `src/sid/dusk.zig` | the pure core: `Patch`, the note-instance pool, the SID-ladder ADSR, the morph oscillator over a `FrameSet` and its mips, the per-instance SVF, the mod matrix, the voice grid, `Cell`, the trace events; `Slot.render` fills a stereo pair |
| `src/sid/duskrack.zig` | `DuskRack`: the frame memory (`buildSets`), the strip per slot, the meters, the add into the bus |
| `src/sid/rig.zig` | the inventory: `MAX_DUST` = 4 slots on channels `DUST_BASE` 48..51, `MAX_DUSK` = 8 on `DUSK_BASE` 40..47; `DustSlot` carries on/patch/model, `DuskSlot` on/patch |
| `src/player/player.zig` | `dustTick`/`duskTick`: a column's cell reaches its slot on the row's own tick; `synCell`/`duskCell` convert the IT cell, so the cores never import the IT format |
| `src/project.zig`, `src/graph.zig` | the D## and K## banks on disk (`RawPatch`, `RawDuskPatch`), the `engine` byte first; `Engine.build` arms the racks the same way for the callback and for `--render`, and the app installs the trace sinks |

## Why a core and a rack?

The core is pure Zig — no `cImport`, so `zig build test` runs it without
reSID; no allocation, so nothing in it can stall the audio thread.
DUST's core decides *what to write*; DUSK's core renders. The player
points straight at the slots (`Player.dust[i]` and `Player.dusk[i]` are
`?*Slot`), which keeps `player.zig` reSID-free.
The rack owns hardware and memory: `DustRack.arm` constructs the
`engine.Sid`, `DuskRack.buildSets` allocates the frame memory — both
only in the device-stopped cycle (`Engine.build`, `src/graph.zig` —
with the device stopped, or in the render job, a stopped world).
Both racks render *inside the player's spans* (`dust_render_fn`,
`dusk_render_fn`), so a note dispatched at a tick boundary is heard
from that boundary's sample.

Two rules cross the thread seam. The UI thread never touches a slot
that writes: it pushes into a lock-free ring (`pushNoteOn`,
`pushNoteOff`, `pushAllOff`, `pushPatch`; `Ring.CAP` = 32, a full ring
drops) and the audio thread drains it at the span head (`drain`, after
`takeReset`). And the bank is read live: `Slot.bank` points into the
session's array, every field is fixed-size, so an edit is audible on
the next note — except DUSK's frame data, rebuilt only device-stopped.

## How does DUST reach the chip?

Every register write goes through `Slot.put`: one shadow compare
(`shadow`/`shadow_set`, 25 registers — write-on-change, so a slow LFO on
a 4-bit resonance writes almost never), one `Src` attribution, one call
to `write_fn` — in the rack `Wire.write`: the trace tee, then
`sid.write(reg, val)`.

The span is cut by the tables. `DustRack.renderAt` loops per slot:
`tickDue()` fires everything due at the span head, `nextEvent(avail)`
says how far it is safe to render (at least one sample, at most what
was asked), reSID renders exactly that far, `advance(n)`. With no table
running the answer is the whole block; with one, a step lands on its
sample.

- **Tables** — `wave`, `pitch`, `pulse`, `filter`, `TABLE_LEN` = 64 steps
  each, one clock per table: `RateMode.hz` (0.1–4000 Hz, free running),
  `.per_tick` and `.per_row` (against the `Clock` the player publishes
  every tick through `setClock`, so they follow a tempo change).
  `ScanDir` is fwd/rev/pingpong/random, random seeded per slot. One
  table serves all three voices, each reading it at its own `phase`. A
  step writes the held value or is a hold, and a hold keeps what the
  table last wrote.
- **Modulation** — `LFOS` = 4, `MOD_ENVS` = 2, `MOD_ROUTES` = 8, `MACROS`
  = 16, ticking at the patch's `control_hz` (default 1000). The resolver
  stacks base → held → route offsets → final, published per voice
  (`ResView`, the MOD tab's panel).
- **Topologies** — `VoiceMode` unison/chord (`CHORD_MAX` 36 semitones),
  `GateSource` wave_table/grain (0.5–250 Hz), `HardRestart` off/soft/full
  over `hr_ms` (1–200 ms; `dustRestartPeek` looks at the next row so the
  attack, not the restart, lands on the beat), `strum_ms` up to 500.
- **Level and mute** — the rack's `GAIN` (0.275) times `Player.songLevel`,
  then the patch's `amp` (0..64, ramped over a millisecond), the strip.
  `mute` is a bit per slot: a muted slot renders and advances, only its
  arrival is dropped, so unmuting continues.
- **Model and quality** — the chip is the slot's, never the patch's:
  `rig.DustSlot.model` lands in `model_want` and `applyModels` swaps it
  at the next span head, mid-note. QUALITY rebuilds reSID's filter
  tables, which allocates, so `hushedResample` in `main.zig` raises
  `hush` on both racks, waits two callbacks, resamples and drops it; a
  hushed rack returns early, silent for those spans.

## How does DUSK make a note?

A note is an **instance** (`Inst`) out of a pool of `POOL` = 16
oscillators per slot. Each instance owns its envelope (`EnvRun`), its
own scanners for the morph, pitch and filter tables (every note reads
them from the top; a released tail keeps walking its own), its own SVF
pair, and up to `MAX_VOICES` = 8 oscillators (`Voice`: phase, increment,
strum delay, width gains, mip level). Note-on releases whatever is held
— the tail sings under the newcomer — and `claim` takes the patch's
voices out of the budget, stealing the oldest note *whole* until they fit.

- **The envelope** is the 6581's, in software: `RATE_CYCLES` are the
  chip's rate-counter periods in PAL cycles, the level an 8-bit counter,
  and `ladderDiv` slows the fall at the chip's own thresholds — the
  staircase on a long release is deliberate. `^^^` releases at the
  fastest rate (`EnvRun.fast`).
- **The oscillator** reads a `FrameSet`: `frames` frames of `frame_len`
  samples (8–4096, default 2048) at level 0, then band-limited halvings
  down to `MIN_MIP_FLEN` = 16 (`buildMips`, at most `MAX_MIPS` = 9
  levels); `mipLevel` picks the level that fits under Nyquist for the
  voice's pitch, `alias = raw` pins level 0 on purpose, and sample `$00`
  is the built-in table — 32 frames of 512 samples (`fillBuiltin`).
- **The filter** is a two-pole SVF per instance between the oscillator
  and the envelope. Cutoff is the 11-bit register over ten exponential
  octaves from 20 Hz (`cutoffHz`); resonance is a byte whose damping
  reaches zero at `FILTER_RES_EDGE` = 240 and regenerates above it; LP,
  BP and HP are summable bits, and *no output selected* is a bypass.
- **The mod matrix** — `LFOS` = 4 (slot-scoped, shared by every sounding
  note), `MOD_ENVS` = 4 (per instance), `MOD_ROUTES` = 8 — runs on a
  fixed `CTRL_HZ` = 1000 grid inside `Slot.render`; a render is
  split-invariant whatever the span size.
- **The frame memory** — `DuskRack.buildSets` converts every K##'s
  sample into DUSK-owned f32 storage: mono-ized, floored to whole frames
  (the tail dropped), mips built, then every slot silenced — no instance
  survives a rebuild. It runs whenever a patch's `sample` or `frame_len`
  changes, always device-stopped.
- **The strip** — `GAIN` = 0.1633 times the song level; the pot is a
  balance (`balGains`): the far side attenuates, the near side holds.

## What freezes a patch?

Every patch carries an engine byte first: `ENGINE_DUST_V1` = 1,
`ENGINE_DUSK_V1` = 1. A patch with any other value is **left alone**:
`Slot.patch()` returns null, so it makes no sound — never the wrong one;
`buildSets` skips it; the editor refuses with `D07 IS ENGINE v2 - THIS
DUET PLAYS v1: PATCH KEPT AS-IS, NOT EDITED` (the same words for a K##)
and the list tags the row `v2`; `project.zig` writes it back verbatim
(its test saves `.engine = 2` and loads it unchanged). On disk a patch is
its `idx`, its `engine` when not 1, its name, and only the fields that
differ from the default — a blank D## or K## writes nothing at all.

The contract behind the byte: **a v1 patch renders the same forever.**
A change that makes an existing patch sound different is a new engine
version with an explicit migration, never a quiet new truth. Two laws
make that checkable: a render is a pure function of the file (the seeds
are fixed per slot — `0x5EED_D057`, `0x5EED_D05C`, mixed with the slot
index — never a clock), and a render is split-invariant.

## How is it verified?

Neither synth has an external reference, so the pins are the oracle.

- `tests/golden/dust/PINS` and `tests/golden/dusk/PINS`: one row per
  corpus project (`# name seconds wav-sha256 peak`) beside a gzipped
  trace per row — nine each; `gzip -n`, so an unchanged bless writes
  unchanged bytes.
- `sh tools/dust-ab.sh` and `sh tools/dusk-ab.sh` render every row
  (48 kHz PCM16; a DUST row for its pin's seconds, a DUSK row to the
  song's end) with its trace into `/tmp/dust-ab`, `/tmp/dusk-ab`
  (`DUST_AB_DIR`, `DUSK_AB_DIR` move them), compare sha256 and trace
  bytes, and close with `dust-ab: 9/9 renders, 9/9 traces on their
  pins`. The bar is **9/9 + 9/9** on both; a moved pin exits 1. Run them
  after touching any of the four files.
- Reading a miss: `trace MOVED` prints the diff — the register or event,
  the sample, the source. `wav MOVED` with the trace identical means the
  audio side moved (amp ramp, strip, effects; for DUSK the oscillator,
  SVF or envelope): chase it with `tools/wav_level.py` and
  `tools/wav_pitch.py` against a stashed build.
- `bless` re-pins explicitly: `sh tools/dust-ab.sh bless` prints every
  pin and trace diff it blesses away, and a bless ships with a note in
  `tests/corpus/MANIFEST.md` — plus the engine-version conversation if a
  v1 patch now sounds different.
- `--dust-test [out.wav]` and `--dusk-test [out.wav]` render the default
  patch through a real slot for three seconds and say what they play:
  `DUST1 = D01 "THREE SAWS" (MOS 6581, 3 voices, detune 0/-9/9 c)` at
  peak 0.186, `DUSK1 = K01 "AFTERGLOW" (built-in table, 32 frames x 512,
  ADSR 00F6)` at peak 0.188.

## What do the traces show?

Both roads run alone or beside `--render`, and only there — no live
session installs a sink (`trace_fn` stays null). `--dust-trace
out.trace proj.zon` is the register stream, every write attributed:
`<sample>  <register>=<value>  <source>`, the source one of
the `Src` enum — `note_on note_off patch common reset wave_tab pitch_tab
pulse_tab filter_tab mod_route grain hard_restart`. Where a table drives
a register the table keeps the attribution and a route rides on top;
`mod_route` names a register only a route moved. A block per slot, each
closing with its write budget by source:

```
# SYN1  D01 "THREE SAWS"
        0  $D400=$B3  note_on
      960  $D404=$21  wave_tab
# SYN1 budget: 3317 writes over 3.93 s (845/s)
#    note_on 36  note_off 12  patch 30  wave_tab 564  pitch_tab 552  pulse_tab 2088  filter_tab 35
```

The same budget is live on the TABLES tab's status row (`0 writes/s  0
steps/s  peak 0/block  DUST1` — `writes_pub`, `steps_pub`,
`peak_writes_pub`): a scan pushed toward 4 kHz shows its cost first.

`--dusk-trace out.trace proj.zon` has no registers to attribute, so it
records the note engine's **decisions**: `TraceKind` is `reset note mute
rel cut steal glide gate slide_dn slide_up sfx zxx vel patch wait`, and
`TraceSrc` the road an event came in on — `row sdx jam glide xport` (the
pattern, an `SDx` cell expiring, the keyboard, a glide that fell back to
a retrigger, the transport). Everything continuous — scanners, LFOs,
envelopes, the SVF — follows from these events plus the patch, which
the wav pin covers.

```
# DUSK1  K01 "AFTERGLOW"
        0  note C-4 K01 v64 x1   row
    23040  wait 3t               row
    25920  note E-4 K04 v64 x1   sdx
   282857  gate keep             row
```

`v64` is the velocity, `x1` the voices claimed, `sdx` the expired wait.

## What does `zig build test` cover?

The library's root (`src/duet.zig`) reaches `sid/dust.zig`,
`sid/dusk.zig` and `sid/duskrack.zig`, so their tests run there. `dust.zig`'s drive
a `Slot` through `runSamples` — the rack's loop without a chip — into
`Cap`, a write sink recording every `(reg, val, src)`, and assert the
bytes the chip would be handed: the scan laws, hold-is-not-base, the
rate modes, the resolver, each topology, the dialect, the amp envelope.
`dusk.zig`'s drive a `TestBed` and assert on rendered samples: the
ADSR's timing, the steal order, the mips, the filter, the matrix, the
voice grid, the dialect, the trace stamps. `duskrack.zig` pins
`buildSets`, the born-bypassed strip and the stereo width. `dustrack.zig`
is exercised only where a real reSID is linked — the player root's DUST
tests: an armed slot renders and an unarmed rack writes nothing, the
model swaps live mid-note, the sampling knob reaches the rack, a SYN
column's note never reaches the IT side, `SDx` delays the whole cell —
and one pins `dust.PAL_CLOCK` to `engine.PAL_CLOCK`.

## What must a change keep true?

- The cores stay pure: no `cImport`, no allocator, no clock, no IT
  format — the cell conversion lives in `player.zig`. Nothing allocates
  near the audio thread: `arm` and `buildSets` run device-stopped only.
- Every DUST write goes through `put` — shadowed and attributed. The
  bank is read through the live pointer; DUSK's frames are the only
  copy, and a rebuild silences the slots.
- An unknown engine byte is left alone; a saved patch travels verbatim;
  the trace is offline-only.
- A moved pin is a regression unless the change was ruled, and a ruled
  change re-blesses with its note: 9/9 + 9/9 before the change is done.

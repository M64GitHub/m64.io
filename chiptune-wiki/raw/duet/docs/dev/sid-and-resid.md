# SID and reSID

Every SID sound DUET makes — a SID column, a SID-Wizard module, a
DUST slot — comes out of reSID, the MOS 6581/8580 emulator, one
instance per chip. `src/sid/engine.zig` owns the instances, their
clock and the timeline the register writes land on; `src/sid/rig.zig`
owns the inventory the project saves — which chips, which model,
which pan, which QUALITY. What the SID setup looks like on screen is
in [the duet](../the-duet.md); this page is what is underneath it.

## Where it lives

| file | owns |
|---|---|
| `vendor/resid/` | reSID 0.16 as shipped (C++, GPL-2+): oscillators, envelopes, the filter, the sampling front end. Unmodified. |
| `src/sid/sid_shim.h`, `sid_shim.cpp` | the C calls Zig makes into reSID — the only C++ the tree owns |
| `src/sid/engine.zig` | `Sid` (one reSID and its cycle accumulator) and `SidEngine` (up to four `Sid`s, the frame lanes, the register funnel, the chip strips, the values the UI reads) |
| `src/sid/rig.zig` | `Rig`: four `Chip`s (model, pan, the channels their voices stand on), `quality`, the DUST and DUSK slots, the grid's column map. Pure Zig, no C import, unit-tested |
| `src/sid/swrig.zig` | `SidRig.frameFn`: the one frame callback — jam, a stand-alone SID-Wizard song, hybrid |
| `src/app/device.zig` | the audio callback everything renders in, and `awaitCallbacks` |
| `src/sid/dustrack.zig` | DUST's chips: the same `Sid`, one per armed slot, in a `DustRack` of its own ([dust-dusk-internals](dust-dusk-internals.md)) |

## The shim

`sid_shim.h` is the whole surface between Zig and reSID:

| call | does |
|---|---|
| `sm_sid_create` / `sm_sid_destroy` / `sm_sid_reset` | one `SID` object |
| `sm_sid_set_model(s, m)` | `0` = MOS6581, `1` = MOS8580 |
| `sm_sid_set_sampling(s, clock_hz, method, rate)` | `0` fast, `1` interpolate, `2` resample-interpolate, `3` resample-fast; returns `-1` if reSID refuses the clock/rate pair, and then nothing changed |
| `sm_sid_get_model` / `sm_sid_get_sampling` | what the chip was last told — reSID keeps neither readable, so the shim remembers, and the tests ask |
| `sm_sid_write(s, addr, value)` / `sm_sid_read` | one register; `addr & 0x1f` |
| `sm_sid_clock(s, *cycles, buf, buflen)` | clock for up to `*cycles`, write mono `i16` samples; returns the count and hands the unconsumed cycles back |
| `sm_sid_env(s, env[3])` | the three envelope counters, 0–255, from `SID::read_state()` |

Every write is a single register write — no shadow diffing that would
drop a same-value write — and the residual cycles come back to the
caller, so the sample clock never drifts against the chip clock.

## One chip: `Sid`

`Sid.init(model, sampling, sample_rate)` creates the object, sets the
model, sets the sampling method at `PAL_CLOCK` (985248 Hz) against the
engine's rate (the tracker's is 48 000 Hz, `SAMPLE_RATE` in
`src/app/main.zig`; a library program picks its own), and resets;
`cycles_per_sample = PAL_CLOCK / sample_rate` is a float, the budget's unit.

`render(out: []i16)` fills exactly `out.len` samples: it hands reSID a
budget of two samples more than the buffer holds, lets `sm_sid_clock` fill
the buffer and discards the leftover, so reSID never takes its "budget
exhausted" road (which clocks the chip past the last sample and lands the
next register write late): after every call, at any call size, the chip
stands on the last sample's instant. The fraction between calls is reSID's
own fixed-point `sample_offset`; DUET keeps no float accumulator beside it.

`setModel` swaps the chip type in place: reSID rebinds its wave and
filter tables and recomputes the filter; registers, envelopes and
oscillator phases carry over, and nothing allocates. `setSampling`
rebuilds reSID's resampling tables, which allocates — so it may never
run while the audio thread is inside the chip (see the QUALITY row
below). `env` reads the envelope counters; `curModel`/`curSampling`
read the shim's mirror.

## The engine: `SidEngine`

- **`sids: [4]?Sid`** — the index is the SID setup's chip number.
  `setSid(idx, model, sampling)` puts a chip in a NAMED slot and
  `clearSid` parks it; the self-tests use `addSid`'s first-free search.
- **`lanes: [4]Lane`** — frame lanes at absolute rates. `setLane(idx,
  hz)` arms one; at every boundary the engine calls `frame_fn(ctx,
  engine, lane)`, and the writes made inside it land on that sample.
  `swrig.LANE_JAM` (0) runs at 50 Hz in every session; `LANE_SONG` (3)
  runs at 50 Hz × the module's `fspeed` for a stand-alone SID-Wizard
  song; `--sid-test` arms 0, 1 and 2 at 50/100/200 Hz.
- **`renderAt(out, taps, level)`** adds into the interleaved stereo
  bus. In order: `enabled` false renders nothing and zeroes the
  meters; `hush` set returns at once (adding nothing IS the silence);
  `applyModels`; the mixer's chip strips reloaded when their
  generation moved (`loadRoom`); `applyGateMask`; then the span loop —
  fire every lane frame that is due, cut the span at the nearest lane
  boundary (at most 4096 frames, `tmp.len`), `renderSpan`, advance.
- **`renderSpan`** renders each chip into `tmp`, scales by
  `gain × level / 32768`, runs the strip's mono EQ if it is on and the
  fader (ramped over a millisecond), then constant-power pan into the
  bus. The strip meter (`chip_peak_pub`) and the scope's probe take
  the mono signal post-EQ, post-fader, pre-pan; the three envelope
  counters go to `env_pub` after every render, so the SID bars are
  the chip's real ADSR levels ([meters and pulse](meters-and-pulse.md)).
  A chip with a send dialled goes through `stmp` so the tap and the
  mix read the same samples
  ([the mixer's signal path](the-mixer.md)). `gain` is `0.225`: the pin
  that puts a chip on the same level as the IT side — `--sid-test`
  peaks at `0.186`. `panGains` returns exact unity at centre as an
  early out, so a centred chip is bit-identical to a mix with no pan
  at all.
- **`write(sid_idx, addr, value)`** is the ONE register funnel. The
  SID columns (`ChipWire` in `src/graph.zig` carries the chip index),
  a co-played or stand-alone SID-Wizard player, the jam and
  `--sid-test`'s player all write through it — which is what lets one
  mask mute any of them.

In a session with an IT song there is no song lane: `Player.mixSpan`
(`src/player/player.zig`) renders the engine inside its own
tick-bounded spans, so a write made on a tick lands on that tick's
first sample; a co-played module's sub-calls cut the span at their
sub-tick offsets. A stand-alone `.swm` session has no IT player, so
the `Engine` renders the SID engine on its own lanes, driven from
`LANE_SONG`. The offline render (`--render`) drives the same `Engine`
(`src/graph.zig` — one recipe for every road) and so calls the same
`renderAt`.

## Which thread touches what

The audio thread runs `renderAt` and everything it calls, and alone
owns `model_have`, `gate_applied`, `ctrl_shadow`, the ramps and the
scratch buffers. The UI thread stores `model_want[i]`, `pan[i]`,
`gate_mask`, `hush` and `enabled` — all atomics — and reads `env_pub`
and `chip_peak_pub`. A change that moves pointers (a chip appears or
parks, a slot arms) is structural: `applyRig` in `src/app/main.zig` stops
the device, tears the graph down, builds it again and starts the
device; the cycle is unconditional on that road. Everything else is a
byte the audio thread reads at a span head.

## The knobs, and how each one lands

| knob | saved as | lands |
|---|---|---|
| MODEL, per chip | `Chip.model`; `.model = "6581"` in the project | `setModelAt` stores `model_want[i]`; `applyModels` swaps the chip at the next span head — mid-note, allocation-free, no handshake. `model_have` starts null so a chip that just appeared always lands its want on its first render. |
| PAN, per chip | `Chip.pan`, −100..+100 | `engine.pan[i]`, one atomic byte, read once per span |
| QUALITY, one for every chip | `Rig.quality`; `.sid_quality` in the project | `hushedResample` (`src/app/main.zig`), below |
| the mute | `sid_mute` in the project, one bit per voice | the gate mask, below |

`hushedResample` is the one handshake DUET has. The UI thread raises
`hush` on the SID engine and on `DustRack` (`Engine.hush`), calls
`audio.awaitCallbacks(2, 200)` — waits for the callback counter to
advance twice, or 200 ms — then `Engine.resample`, which is
`setSamplingAll` on both, then drops `hush`. (A program using the
library has no such handshake: for it the quality setter is
structural, a rebuild between renders.) The count is the proof: `state.callbacks` is bumped
first thing in the callback and the audio thread is serial, so seeing
it advance once means the callback that was running has returned, and
every later one reads `hush` as set and leaves the chips alone. The
chips are silent for those turnovers; the player, the PCM channels and
DUSK keep running and the transport keeps its place. If any chip
refuses the method, both are put back on the old method and the
status line says `SID QUALITY: reSID refused <method> at 48000 Hz -
staying on <old>`. A stopped device never turns over, so
`awaitCallbacks` returns false at once — and mutating a chip nobody is
clocking was always safe.

The three qualities are reSID's sampling methods: `fast` takes the
sample at the boundary, `interpolate` (the default) interpolates
between two, `resample` band-limits with a windowed sinc. The shim's
fourth method, resample-fast, is not offered. On the PROJECT page the
receipts read `SID 1: MOS 6581`, `SID 1 pan L 55`, `SID QUALITY:
RESAMPLE - band-limited, 16% dearer (the CPU % on the top row says
what it costs)` and, for the off stop, `SID 1 OFF - its columns are
parked, not deleted (switch on to get them back)`.

On the command line `--sid-quality` overrides the project's setting
for the run, and a typed `--sid-model` forces every chip's model the
same way — live, in a render and in a screen dump alike; a DUST slot
keeps its own. Without it a project's chips carry their own model
each, a SID-Wizard module's chips play 8580 (the format carries no
chip type), a session built from `.swi` files 8580, and `--sid-test`
6581. Both flags exist so an A/B is one flag and never a file edit.

## The mute is a gate mask

A muted SID voice is not a silenced strip: the chip keeps running and
only its gate is held shut. `gate_mask: u16` has one bit per voice,
`chip × 3 + voice`. `publishMixMasks` in `src/app/main.zig` gathers
three facts on the UI thread — the project's saved per-voice mutes
(`sid_mute`), the mixer strip's mute for the chip, and the solo set
(a soloed channel, strip or voice keeps its voice open; everything
else is masked) — into the engine's `Glances`, and `Engine.setGlances`
(`src/graph.zig`) composes the mask in one place. It is the one choke
point: every mute edit, solo flip, undo replay and graph rebuild lands
there, and a library program's `setMute`/`setSolo` land in the same
composition.

The audio thread latches it at every span head in `applyGateMask`. A
bit that RISES writes the voice's last control byte (`ctrl_shadow`,
register `voice × 7 + 4`) back with the GATE bit cleared, so a note
that was sustaining closes; a bit that falls does nothing — the next
real gate-on passes on its own. While a bit is set, `write` forces
bit 0 of every control write to that voice to zero and lets the rest
through: frequency, pulse width, waveform, sync and ring-mod all
flow, the oscillator keeps running, and a neighbour voice that syncs
to it or ring-modulates with it keeps its source. The mute cannot
change how the other voices sound.

Offline, a job stores its mask before the first render and calls
`applyGateMask` once at wire time, so a masked voice is born gated
and never sings a first chunk. `--render --bare` runs with
`sid_mute = 0` and an untouched mixer: the engines alone. DUST's slots
are not in this mask — a slot is a whole chip, so its mute is the
strip's: the slot renders on and its arrival in the bus is dropped.

## The roads that prove it

- **`--sid-test [out.wav]`** — `src/sid/testplayer.zig`, no file: a
  gated pulse bass on the 50 Hz lane, a pulse-width sweep and noise
  hats on the 100 Hz lane, an arpeggio on the 200 Hz lane. It prints
  `sid-test: rendered 6s  peak 0.186  frames 1x=303 2x=606 4x=1212`:
  the frame counts prove the lanes fired at 1:2:4, the peak is the
  level pin. Without a path it plays the same six seconds on the
  device. Its defaults are 6581 and `interpolate`.
- **The knobs, offline.** On `tests/corpus/hybrid/twosid-demo.zon`,
  `--render` with `--sid-quality fast`, `interpolate` and `resample`
  gives three different files, and the plain render is byte-identical
  to `interpolate`. On `tests/corpus/swm/bronkosaurus.swm`,
  `--sid-model 6581` and `8580` differ and the plain render equals
  `8580`. A copy of the two-chip project with its second chip changed
  from `6581` to `8580` renders differently: each chip's own model is
  what plays — and `--sid-model 8580` on the unedited project renders
  differently from the plain render, because it forces chip 2.
- **Born bypassed.** On a project with nothing dialled, `--render
  --bare` is byte-identical to the plain render.
- **Tests** (`zig build test`): `rig.zig` pins the model ring, the
  fixed home, the caps and the sampling ring; `src/tests.zig`
  proves a chip's model swaps at the span head with no device cycle,
  that the hush silences the chips without disturbing what they hold,
  and that the sampling knob reaches `DustRack`; `src/bounce.zig`
  proves a masked voice is born gated.
- **The register scoreboard** (`tools/swm-ab.sh reg`) drives a
  SID-Wizard module through this engine and compares every write and
  its timing with the original player: `off=0` on every row. It is
  [the SID-Wizard engine](sid-wizard-engine.md)'s bar, and it is what
  proves the lanes land where they claim.

## What a change must keep true

- Nothing allocates on the audio thread inside a chip. `setSampling`
  runs only inside `hushedResample`; `setModel` is free and lands at a
  span head; a chip is created or destroyed only with the device
  stopped.
- Every register write goes through `SidEngine.write`. A drive source
  that writes a `Sid` directly escapes the mute.
- Writes land at span heads — a lane frame or a player tick — never
  in the middle of a span; that is what makes them sample-accurate.
- The chip index is the SID setup's index: `setSid(idx, …)`, so chip
  2's `$D404` reaches the second instance and nothing else.
- Centre pan stays the exact-unity early out; `gain` stays the level
  pin (`--sid-test`'s peak moves if it moves).
- `applyRig`'s device-stopped cycle stays unconditional; a knob that
  can be live gets `publishRigLive` instead, never a conditional cycle.
- `vendor/resid/` stays upstream reSID. The shim is the place for
  anything DUET needs from it.

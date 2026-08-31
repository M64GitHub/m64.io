# The mixer's signal path

The mixer is the set of DSP stages between the engines and the audio
device: a strip per channel, chip and synth slot, four send units with
their returns, and a master chain. The code calls the whole of it *the
room* (`dsp.Room`); this page uses the screen's word. What the pages
look like is in [the mixer](../mixer.md); this is what runs underneath.

## Where it lives

| file | owns |
|---|---|
| `src/audio/dsp.zig` | the knobs (`Room`, the project's `.mixer` block), `Fader` and `GainRamp`, the three-band EQ (`Eq` knobs, `Eq3` processor, `Biquad`), the master dynamics (`Comp`/`Compressor`, `Lim`/`Limiter`), `MasterChain` |
| `src/audio/fx.zig` | the four send units (`DelayUnit`, `PlateUnit`, `ChorusUnit`, `DriveUnit`), the buses and `Taps`, `FxRack` with the return strips and the `Ducker`, the grid's send bytes and the `Auto` layer |
| `src/audio/tap.zig` | the master tap and the probe ring the scope reads — one `Feed` per engine |
| `src/app/load.zig` | the CPU meter's arithmetic |
| `src/graph.zig`, `src/app/device.zig` | `Engine.render`, the one assembly that runs the stages in order for the callback and the bounce alike; the callback that calls it |
| `src/player/player.zig` | the channel strips and IT SUM (`mixPcmSpan`, `mixChannelsEq`) |
| `src/sid/engine.zig` | the chip strips (`renderSpan`) |
| `src/sid/dustrack.zig`, `src/sid/duskrack.zig` | the synth slots' strips |
| `src/bounce.zig` | the same engine offline (`Job`), stems and `--bare` |

A channel strip's `LVL 64`, `PAN 32` and `MUT` are the `.it`'s own
channel volume, pan and mute, applied in the player's voice chain.
Everything else on the two pages is `Room`, saved as the project's
`.mixer` block ([formats internals](formats-internals.md)); a knob
resting on its default writes nothing there.

## In what order do the stages run?

`sm_audio_callback` in `device.zig` zeroes the buffer, then:

1. `FxRack.begin` clears the live buses for this buffer;
2. the player renders — every channel voice into IT SUM, and inside
   each of its spans the chips (`SidEngine.renderAt`), the DUST slots
   and the DUSK slots, all from the same tick boundary;
3. `FxRack.process` runs each live unit over its bus and adds the wet
   back into the buffer;
4. `MasterChain.process`;
5. `tap.master.push` — the final mix, for the visualizer.

`render.zig`'s `Job.step` runs the same list minus the tap, in
`CHUNK`-frame spans, which is why a render is what you hear. Inside a
strip the order is the same everywhere — source, EQ, fader,
placement, the add into the bus — with the send tapped off the
strip's own output:

| strip | source | placement |
|---|---|---|
| channel | the voice chain (volume, envelopes, channel volume, pan, the song level) | already stereo; the send is tapped after the channel's EQ |
| IT SUM | the sum of every channel voice | none: EQ, fader, then the send tap |
| chip | reSID, mono | EQ runs mono before the constant-power pan (`panGains`) |
| DUST slot | one reSID per slot, mono | DC blocker first, then EQ, fader, pan |
| DUSK slot | a stereo pair | DC and EQ per side, one fader ramp for both, then a balance (`balGains`) |
| return | the unit's bus, 100 % wet | return EQ, return level, duck, into the bus |
| master | the bus | EQ, fader, compressor, limiter |

The master fader runs before the compressor on purpose: pushing it
drives the compressor, and the limiter's ceiling is the last word
(`master chain: the fader drives the comp, the ceiling caps the out`
in `dsp.zig`'s tests).

## Born bypassed — what transparent means

Every stage has an `on` switch, and every switch starts off. Bypass
is not "multiply by one": a bypassed stage is the code path that
existed before the stage did — the player's plain voice walk, the
engine's pre-mixer loop, the synths' first loops — and each consumer
branches to it when its stage is off. Float addition is not
associative, so this is the only way an untouched mixer renders
byte-for-byte what a build with no mixer renders. `Room.virgin()`
says whether anything is dialed; the transparency test in
`src/tests.zig` pins it, and so does a render:
`tests/corpus/dust/dust-demo.zon` carries no `.mixer` block, and
`--render` with and without `--bare` gives `cmp`-identical files.

Two stages are transparent even while ARMED: the compressor flushes
a gain reduction closer than `GR_FLUSH_DB` to zero and multiplies by
exactly 1.0, and the limiter under its ceiling does not multiply at
all (`comp: armed but idle is EXACT identity`, `limiter: hard-bypass
at unity`); a 0 dB EQ band is an exact identity too. Arming a stage
starts it clean — a fader snaps to its target (`GainRamp.snap`), an
EQ's ring state is zeroed, the compressor's reduction starts at 0 —
while a knob moved on a running stage keeps the state (zeroing a
biquad mid-song clicks) and a fader move ramps over `rate / 1000`
frames. A biquad's state is flushed to exact zero under `FLUSH_FLOOR`
at span ends, so a silent tail never parks it in denormal territory.

## How does a knob reach the audio thread?

The UI owns the `Room`, writes a field, then bumps a generation
counter with `.release`. Every consumer holds a pointer to the room
and its own `seen` word; at the head of each render call it loads
the counter with `.acquire` and, only when it moved, copies what it
needs (`loadRoom` in the player, the engine and both synths;
`MasterChain.process` and `FxRack.begin` inline); `Eq3.config`
recomputes coefficients only for a band whose dB changed. A mixer
edit lands at the next span boundary, sample-accurate, with no device
stop, no lock and no allocation ([architecture](architecture.md)).

## The level law

A channel voice's gain is the product of its IT terms (`voiceTick` in
`player.zig`): note volume, envelope, fade-out, sample and instrument
global volume, channel volume, then `PCM_MASTER` × GV/128 × MV/128,
split by pan as `tgt_l = amp × (1 − pan)`, `tgt_r = amp × pan`.
`PCM_MASTER` is 1.0, so a centred full-volume voice at MV 48 lands at
0.5 × 48/128 = 0.1875 = −14.5 dBFS — what OpenMPT plays for the same
file. Measured today with a full-scale looped square built by
`tools/mkit.py`: our render peaks at 0.1875 with a plateau of 0.1860;
`openmpt123 --render` of the same `.it` peaks at 0.2241 and plateaus
at 0.1863. Judge parity by the plateau or the RMS, never by the peak
— OpenMPT's interpolation overshoots a square's edges. A real sample
says the same: `tests/corpus/inst/env-decay.it` through
`tools/wav_level.py ab` against OpenMPT's render reads a global
offset of +0.09 dB and a median residual of 0.09 dB.

The other three families are aligned to that number by one constant
each — `SidEngine.gain` (0.225), `dustrack.zig`'s `GAIN` (0.275),
`duskrack.zig`'s `GAIN` (0.1633) — so `--sid-test`, `--dust-test` and
`--dusk-test` all peak near −14.5 dBFS with every fader at 0 dB; one
voice there is headroom. Loudness is the song's knob:
`songLevelOf(global_vol, mix_vol)` = GV/128 × MV/48 — exactly 1.0 at
IT's defaults, pinned by a test in `src/tests.zig` — and the
player hands it into every span (`Player.songLevel`, the `level`
argument of each engine's `renderAt`), so a `Vxx` fade or a GLOBAL
VOL / MIX VOL change moves the chips and the synths with the samples.

## The sends, the buses and the returns

A send is a `Taps` write. `FxRack.begin` clears one bus per live
unit; `FxRack.taps` hands a renderer four slices that run PARALLEL to
the buffer it was given, and `Taps.sub` narrows them to a sub-span. A
renderer writes its strip into the bus at its own frame offsets, so
the PCM side (which slices at tick boundaries) and the SID side
(which slices at lane boundaries) feed the same bus without knowing
each other's arithmetic. A unit that is off has an empty slice, so
"do I tap at all" is one branch, and a strip with no live send never
goes through a scratch buffer.

The send is post-fader by construction: the buffer `addStrip` reads
is the strip's own output — the channel scratch after its EQ, the
chip's placed stereo (`stmp` after EQ, fader and pan), the DUSK pair
after its balance. An amount is 0..100 and linear (`SEND_MAX`): 50
is half the strip.

Each bus runs through its unit, 100 % wet, and comes back through a
return strip — EQ, then the return level (−24..+12 dB,
`RET_MIN_DB`/`RET_MAX_DB`), then the duck, then into the bus — BEFORE
the master chain, so the master EQ, fader and dynamics hear the wet
as you do. The return strips' SOLO drops the dry mix while the sends
keep feeding the units (an audition, not a mute); MUTE drops a return
while its unit keeps running and keeps its tail. The `Ducker` keys
one envelope off the dry mix (`DUCK_THR_DB` −30 dB, 5 ms attack,
150 ms release); each unit says how deep it bows, DUCK 0 skips it.

| unit | what it is |
|---|---|
| DELAY | two lines; MONO, WIDE (the right line at three quarters of the time) or PING (left, right, left; WIDTH parts the sides); TIME in half rows off the transport's speed/tempo word when SYNC is on (`rowFrames`), else milliseconds; feedback through a one-pole TILT; TO REVERB pours the echo into the reverb bus before the tank runs |
| REVERB | a four-line feedback delay network with a Householder matrix, four input allpasses, one damping pole per line, two lines that wander a few samples; ROOM/PLATE/HALL scale the lines, DECAY is an RT60 of 0.25–12 s solved into the line gains, plus a pre-delay and a low cut |
| CHORUS | two to four modulated taps off one mono feed, each with its own LFO phase and place in the field; signed feedback turns it into a flanger |
| DRIVE | a waveshaper bounded at ±1: SOFT (tanh), HARD (clip), FOLD, CRUSH (bits and a sample-hold divisor); the output is trimmed by about a third of the drive |

`FxRack`'s delay lines and buses are about a megabyte, so it lives on
the heap, one per owner (the live callback, each offline job); it is
built for `FX_RATE` (48000), and a device at another rate loses time
range, never memory safety.

A send command in a pattern (`a`–`d` on a channel, `18`–`1B` on a SID
column — [the pattern editor](../pattern-editor.md)) is a performance,
not an edit: the audio thread writes it into `fx.Auto` at row time,
the `Room` is never touched, `Ctrl+Z` has nothing to take back, and
`Player.restart` clears every override so a render hears the same
rows write the same values (`autoChan`/`autoChip`/`autoDust`/
`autoDusk` fold the layer over the room's amounts). A SID column's
send is its CHIP's — three columns share one knob, the last row to
write it wins — because reSID sums three voices into one output. The
bytes are `IT_SEND_FX` and `SD_SEND_FX`, spelled in `src/it/format.zig`.

## The meters and the taps

Every strip meter is a peak the audio thread max-accumulates into an
atomic and the UI swaps to zero once a frame — the exact peak since
the last read: `sum_peak_pub` (IT SUM), `chip_peak_pub`, the synths'
`peak_pub`, `MasterChain.gr_pub` (gain reduction, compressor and
limiter), `FxRack.in_pub`/`ret_pub` (what the sends pour in, what
comes back). A mono strip's meter is read post-EQ, post-fader,
pre-pan — the strip you hear; DUSK's is the louder side of its pair,
pre-balance. The scope's probe (`tap.probe`) takes its samples at the
same point, so the scope and the meter never disagree about a level;
`tap.master` holds the final mix after the master chain, and
`load.zig` times the callback against the audio it produced. What
draws all of it is in [meters and pulse](meters-and-pulse.md).

## What a stem pass includes

`--render out.wav --stems` writes one file per strip into
`out-stems/` (`render.Solo`: a channel, a chip, a DUST slot, a DUSK
slot), everything else silenced by the mute masks (`glance_mute`, the
gate mask, the slot masks), so a silenced voice still advances and
every stem stays sample-aligned with the mix. Linear stages ride
along — faders, EQs, the delay, reverb and chorus returns; the
nonlinear ones are switched off for the pass (`Job.wireUp` sets
`drive.on = false` and every `duck` to 0) and the master DYN is
skipped, so the stems still sum to the mix (`render job: stems sum
to the mix (virgin room, the linear law)`). The command says so:

```
stems: 4 wavs -> out-stems/ (each stem skips the master DYN, the DRIVE and every DUCK - the nonlinear stages)
```

`--bare` hands the job an empty `Room` and no saved SID mutes — the
song files alone; DUST, DUSK and the chord tables are song data and
stay. `tests/corpus/sends.zon` (a reverb armed from the console, fed
only by the grid's `b64`) renders to peak 0.576 with the mixer and
0.278 bare.

## How it is verified

- `zig build test`: 17 tests in `dsp.zig` (each band's dB straight
  off the coefficients, the exact identities, the denormal flush,
  the knee math's own prediction, attack and release at their knobs'
  speed, the master order), 19 in `fx.zig` (the taps, each unit's
  promise, solo/mute/duck/to-reverb, the automation overlay), 5 in
  `tap.zig`, 7 in `load.zig`, and the library root's transparency,
  stem-sum and song-level tests.
- `duet --bench <file>` times every armed stage as the real code
  path, in multiples of real time on one core: today all four send
  units together cost 2.6 ms per second of audio, and 52 channel EQs
  plus the IT SUM EQ take the PCM side from 107× to 29× real time.
- the level probe and the `wav_level.py ab` comparison above, after
  touching the voice chain's master, the pan split, a family gain or
  the mixer's entry point.
- `--render` vs `--render --bare` on a project with no `.mixer`
  block: `cmp` must say nothing.

## The rules a change must keep

- No locks, no allocations, no I/O on the audio thread: every buffer
  is sized at compile time (`SPAN_FRAMES` 4096, `FX_SPAN` 8192 — a
  longer buffer is refused whole — `DELAY_CAP` 96000) and every knob
  travels by generation.
- A new stage is born bypassed, its bypass is the old code path, and
  a byte-identity test pins it.
- A new sound family lands at −14.5 dBFS on its own self-test and
  takes the song level per span.
- A new nonlinear stage joins the stems exclusion in `bounce.Job.create`,
  and the receipt names it.
- The defaults in `dsp.zig`/`fx.zig` are the virgin values: a knob at
  its default must stay out of the saved project.

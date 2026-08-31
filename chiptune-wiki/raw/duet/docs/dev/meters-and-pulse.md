# Meters and the note pulse

Every moving picture on the screen — a level bar, a flash on the
grid, the header's CPU figure, the scope's beam, the visualizer — is
read off a handful of numbers the audio thread publishes, or a window
of samples it copies into a ring. This page says where each picture
is made, which thread writes the fact behind it, and which headless
road can see it. The words are the [glossary](../glossary.md)'s; the
user's view is [visuals](../visuals.md).

## Where it lives

| file | owns |
|---|---|
| `src/audio/tap.zig` | the two lock-free rings — `master` (the final mix) and `probe` (one source) — and the probe's armed-source word |
| `src/app/load.zig` | the CPU meter: the callback's stopwatch and the UI's ballistics |
| `src/player/player.zig` | the channels' levels and note counters, the IT SUM peak, the transport snapshot |
| `src/sid/engine.zig`, `swplayer.zig`, `swhybrid.zig` | the chips' envelope counters and strip peaks, the SID probe push; the note counters of tracks and SID columns |
| `src/sid/dustrack.zig`, `duskrack.zig` | the slots' peaks, envelopes, note counters, and the scope's MOD strip words |
| `src/audio/dsp.zig`, `fx.zig` | the DYN tower's gain-reduction figures; the send units' in/return peaks |
| `src/app/ui/scope.zig`, `oscview.zig` | the scope engine (trigger, timebase, auto-gain — pure), and the band it draws |
| `src/app/ui/vizview.zig`, `vizmath.zig` | the visualizer page; its FFT and bar ballistics, movy-free |
| `src/app/ui/hud.zig`, `mixerview.zig`, `fxview.zig`, `src/app/main.zig` | the header, the grid's pulse layer, the console pages' meter zones; the frame loop that reads every number once a frame |

## Two layers, two threads

The screen is two layers: text in a cell grid (`TextCanvas`,
`src/app/ui/canvas.zig`) over a movy pixel frame with a glow buffer. A
cell whose character is `0` is transparent and shows the pixels —
every meter zone and beam is a run of such cells. The terminal build
renders the pixels into half-block cells and blits the glyphs on top
(`TermFrontend.present`, `src/app/frontend/term.zig`); the window draws
the same frame into a texture (`src/app/frontend/sdl.zig`).

The audio callback (`sm_audio_callback`, `src/app/device.zig`) is
the only writer of every level, counter and ring below, and it never
locks, allocates or blocks: a level is one atomic store, a peak a
max-accumulate, a ring a buffer with an atomic write head. The UI
thread reads once a frame and smooths; a torn float at a ring's seam
is one wrong pixel for one frame. The callback renders the player,
the SID engine and the two synths, returns the send units, runs the
master chain, and only then pushes the buffer into `tap.master` —
post-master, what leaves the program.

## The numbers the audio thread publishes

| number | written where, when | what it is |
|---|---|---|
| `Player.vu_levels[ch]` (0–255) | `updateVoices`, once per tick | the channel's gain (`tgt_l + tgt_r`) times `src_peak`, the loudest sample the voice actually read since the last tick — so a retriggered one-shot still decays; NNA background voices fold into their host channel; divided by the master (`PCM_MASTER` × GV × MV) so a full-volume note reads 255 |
| `Player.note_trig[ch]` (u8, wraps) | every note a cell starts — a tone-portamento row too | "a note happened here" |
| `Player.sum_peak_pub` | `scanSumPeak`, per span | the PCM sum's peak, post-fader |
| `SidEngine.env_pub[chip][voice]` (0–255) | `renderAt`, after every render call | reSID's own envelope counters, read through `sm_sid_env` (`SID::read_state`) — the real ADSR level. A SID voice has no audio of its own (the chip's filter runs on the sum), so its bar is the envelope, never the loudness |
| `SidEngine.chip_peak_pub[chip]` | `renderSpan` | the chip's mono strip peak, post-EQ, post-fader, pre-pan |
| `SwPlayer.note_trig[track]`, `SwHybrid.note_trig[voice]` | every note a row plays — a portamento row, a pending glide, a legato (`L=`), a plain start alike | the note counter of a track or a SID column |
| `DustRack.peak_pub[slot]`, `env_pub[slot]`, `Slot.note_trig` | after every span | the strip peak; the loudest of the slot's three envelope counters; its note counter |
| `DuskRack.peak_pub[slot]`, `env_pub[slot]`, `Slot.note_trig` | after every span | the strip peak; `Slot.envPeak`, the loudest live instance's software envelope; its note counter |
| `DustRack.mod_pub`, `mod_live_pub` (DUSK the same) | with the meters | the four LFO outputs and the mod envelopes packed by `dust.packModStrip`; which of them the patch has switched on |
| `MasterChain.gr_pub[0..1]` | `dsp.zig`, per span | the compressor's and the limiter's gain reduction in dB, span maximum |
| `FxRack.in_pub[unit]`, `ret_pub[unit]`, `time_pub` | `fx.zig`, per span | what each send unit was fed and gave back; the delay's length in samples |
| `Load.busy_ns`, `audio_ns`, `peak_pm` | `load.zig`, first and last line of the callback | time spent in the callback against the audio it produced |

Peaks travel as `f32` bits in a `u32`: the writer stores
`max(peak, previous)`, the reader `swap`s zero in once a frame and
lets its copy fall by `theme.mix_meter_fall` (0.90 per frame);
envelope counters are plain stores. The frame loop swap-reads the
console's peaks only while a console page is up (`page() == .mixer or
.mixer_fx`); elsewhere they max-accumulate.

## The grid's note pulse

`F3` cycles the pattern page's pulse looks; the receipt names each:

```
GRID PULSE CHAR · LINE · PAPER · CLIPPED · OFF · FULL · HALO
```

`hud.Pulse` holds the seven; HALO is the boot default, and the look
is session state, never saved. `pxPulses` says which draw on the
pixel layer (FULL, HALO, PAPER, CLIPPED); CHAR and LINE light text
cells only. The pulse draws only while the pattern on screen is the
playing one (`play_pattern == pattern_idx`). `main.zig`'s frame loop
drives two envelopes:

- **The beat thump**, `pulse_beat`: on every fourth row crossing,
  `0.45 + 3 × RMS` of the master tap's last 1024 frames (what you hear
  scales it), clamped to 1, falling by 0.86 a frame — a pink wash over
  the playhead line (`theme.PULSE_BEAT`); CLIPPED stops it at the IT
  block.
- **A flash per column**, `chan_flash[col]`: lit when the column's own
  `note_trig` changed since the last frame — never on a level jump,
  so one note is one flash; only a column with no counter (a track
  without a running player) falls back to its envelope rising by more
  than 0.10. A silenced column never flashes though its counter
  advances: `colSilent` reads the saved mute, the strip mute, a solo
  exclusion and the SID gate mask, so un-muting replays no backlog.

A flash lights at `FLASH_PEAK` 1.0, holds `FLASH_HOLD_FRAMES` (5),
then falls by `FLASH_DECAY` 0.80 a frame until under `FLASH_MIN` 0.03
— about 0.32 s — on the row it fired on (`chan_flash_row`), not the
moving playhead; ice for a channel or a synth column, amber for a SID
voice or a track (`theme.PULSE_NOTE`, `PULSE_NOTE_SID`).

## The mixer's meters

The console's meter zone is transparent text; `mixerview.drawPixels`
draws one picture per strip kind, decayed UI-side and shaped by
`theme.mix_gamma` (0.60) over a ghost of the full bar (`mix_ghost`):

| strip | bars |
|---|---|
| a channel | one bar: `vu_levels` |
| a chip | its strip peak, and three thin bars — the voices' envelope counters |
| a DUST slot | its strip peak beside one envelope bar (the loudest of the three voices) |
| a DUSK slot | its strip peak beside the loudest instance's envelope |
| IT SUM | `sum_peak_pub` |
| MASTER | L and R, the peaks of the master tap's last 1600 frames; a peak over 0.985 latches the CLIP mark for 120 frames |
| DYN | two bars hanging from the top: the compressor's and the limiter's gain reduction, `theme.mix_gr_range_db` (18 dB) full scale |
| the sends page | the same strip levels, and per unit an IN and a RETURN bar (`in_pub`, `ret_pub`); the echo's time in ms from `time_pub` |

## The CPU figure

The header's `CPU 5%` is the audio callback's load: nanoseconds spent
inside `sm_audio_callback` over the nanoseconds of audio it produced —
100 % is the dropout line. `Load.begin`/`end` read `std.time.Instant`
twice per callback into two lifetime counters plus the worst single
callback in permille; `Meter.sample` differences them once a frame —
the average settles with `SMOOTH` 0.15, the peak-hold falls by
`PEAK_FALL` 0.98, a frame with no callback holds rather than diving
to zero, the display clamps at `MAX_SHOWN` 999. The header prints it
only while a device runs (`audio_rate > 0`), recoloured at
`theme.CPU_WARN_PCT` (50) and `CPU_HOT_PCT` (75); `--audio-test`
prints the same counters:

```
audio: callback load 0.04% of realtime (worst single callback 0%)
```

## The scope

`tap.master` is the whole mix and feeds the visualizer's SCOPE mode.
`tap.probe` holds ONE source and feeds the band: `probe_src` is an
atomic word `kind << 8 | index` over `ProbeKind` — `off`, `pcm_jam`,
`it_chan`, `sid_chip`, `dust_slot`, `dusk_slot`. The UI arms it
(`armProbe` returns the ring position; `copyLatestSince` hides what
the previous source left before it) and disarms it when the band
closes or the page leaves the band's two (the band parks; the way
back re-arms with a fresh floor). `off` is a whole state: nothing
pushes, copies or draws — one relaxed load per render call.

Every renderer reads the word once per render call and pushes its own
strip where that strip exists alone — post-EQ, post-fader, pre-pan,
the same samples its meter scans, so the scope and the meter can never
disagree. A chip and a DUST slot push mono (`pushMono`), a DUSK slot
its stereo pair (`pushPair`), a channel its voices with their NNA
tails folded in, the keyboard's PCM voices as `pcm_jam`. The push sits
inside every render road of a source — a branch that returns early
past it scopes silent.

**The source law** (`oscSourceOf` in `main.zig`;
`hud.State.gridScopeSource` for the grid half, unit-tested): on the
pattern page with the song running, the column under the cursor shows
itself — a channel, a SID column's chip, a track's chip. Otherwise the
band shows what the keyboard plays: the DUST or DUSK slot the selected
patch plays on, the jam chip for an S##, the keys for a P## or I##.
The readout's first word says which; pressed live:

```
CH 01  ---  free run  PEAK -42.7 dBFS                    ESC closes
chip 1  ---  free run  PEAK -20.8 dBFS
keys  C-4  2 cycles  PEAK -56.7 dBFS
slot 1  ---  free run  silent
```

`ALT+O` and the instruments page's `[OSC]` button are one function
(`oscSetOpen`); off the two pages it refuses: `the scope lives on the
pattern and instrument pages`. The note is the keyboard's last
(`osc_note`, set in `jamPianoOn` band or no band); the song's own
notes never set it, so a running column free-runs.

**The engine** (`scope.zig`, shared by both mounts) answers three
questions over a `WIN` of 4096 frames. Where the beam starts:
`triggerStart` walks back at most one period for a rising crossing of
the window's mean (`meanOf` — a DC offset still triggers). How much is
shown: `timebase` takes `periodSamples(note, 48000)` (IT note 70 is
A-5, 440 Hz), two cycles, doubled until there is a sample per pixel,
halved until it fits the window; no note means two samples per pixel,
`cycles = 0`. How tall: `gainTarget` fills 85 % of the half height at
the window's peak, `autoGain` approaches it by 0.06 a frame under a
ceiling — `GAIN_CEIL_MIX` (24) for the mix, `0.85 / SILENCE` for the
band, which snaps to the target on a source's first window. A drawn
column is the min..max of its samples (`column`), so a bass note does
not alias. `oscview.SILENCE` (0.0006, −64 dBFS) is the floor: below it
the readout says `silent` and the trace fades instead of being blown
up into a smear; an unmoved write head means the source rendered
nothing (`osc_still`) — a flat line, never a frozen waveform.

**The band** (`oscview.zig`) takes `hud.OSC_BAND_TALL` (9) rows or
`OSC_BAND_SHORT` (7), plus `OSC_MOD_ROWS` (3) for a DUST or DUSK
source's MOD strip, and needs `OSC_MIN_CONTENT` (12) rows of editor
left. Every reader of the shortened pane — the text pass, the grid's
pixel layer, the sample editor's waveform — asks `State.oscPaneH`, so
nothing lands under the band. The MOD strip draws four LFO rails with
a dot at each output and the mod envelopes as bars (`mod_pub`, dim
where `mod_live_pub` says off) — two for DUST, four for DUSK.

## The visualizer

`vizview.VizState` is filled once a frame from the master tap (a `WIN`
of 2048 frames), `vu_levels`, the chips' and the slots' `env_pub`;
`update` folds the window to mono, takes RMS and peaks, and runs
`vizmath.zig`'s `follow` (attack 0.55 of the step, release × 0.86)
and `peakCap` (rides up, holds 42 frames, falls accelerating).
`hud.Viz` names six modes; `VIZ_ENABLED` is the four `LEFT`/`RIGHT`
cycle — VU BARS, SPECTRUM, SCOPE, PLASMA — and `--viz duo|copper`
reaches the two parked ones. `--bars normal|scanlines|gap`
(`UP`/`DOWN`) styles the two bar modes; the others own their look.

- **VU BARS**: one bar per grid column, in the grid's order, through
  the column map (`barSrc`): a channel reads `vu_levels` (zero while
  stopped), a SID voice its chip's envelope counter, a track the
  module's own chip, a slot its `env_pub`; labelled as the grid labels
  them (`01`, `1:1`, `DUSK1`), the master's L and R pair at the right.
- **SPECTRUM**: a 1024-point radix-2 FFT (`vizmath.fft`) under a Hann
  window, thirty log-spaced bands from 48 Hz to 15.6 kHz, each the
  loudest bin, mapped from −58 dB to −6 dB onto the bar.
- **SCOPE**: the same engine free-running on the master tap, the glow
  decay raised to `GLOW_DECAY_SCOPE` (0.92) so old sweeps linger.

## Which road sees what

| road | sees |
|---|---|
| `--dump-screen` | the text layer alone: labels, readouts, receipts. Every transparent cell is blank — `--page viz` dumps the mode selector, the bar labels and an empty floor; `--page mixer` the strips' values over an empty meter zone. `--page osc --osc-state keys\|chan\|sid\|dust\|dusk` names the band's source family and stages its readout (`oscTwin`: `C-5  2 cycles  PEAK -7.5 dBFS`) |
| `python3 tools/ptydrive.py` | the text layer after real keys, with the real device running; pixel cells read back as `▄` |
| `--shot N out.png` | the pixel and glow layer alone, from a synthesized signal — the pattern page under a scripted transport (cursor, thumps, flashes), `--viz` a demo mix (`synthVizDemo`), `--page osc --osc-state` a pulse wave with a moving width (`oscTwinSignal`); deterministic, so the PNG is an anchor, and never a live meter |
| `duet-gui --gui-shot N out.bmp` | the running session's pixels and text together, colours included — the only road that shows what a meter shows |

## What a change must keep

- The audio thread publishes with a store and never waits; the UI
  decays. A new picture gets a new atomic or a ring, not a lock.
- A meter and the probe scan the same samples at the same point;
  a new render branch in a source carries its probe push.
- The band has one height, `oscPaneH`, and every pass asks it.
- `tap.zig`, `scope.zig`, `vizmath.zig`, `load.zig` and `vizview.zig`
  carry their own tests in `zig build test` (the rings and the arm
  floor, the timebase and trigger, the FFT and caps, the ballistics,
  the column map); a change to one extends them.
- A picture the screen shows is verified with a GUI shot; a dump or a
  pty replay proves only the text around it ([testing](testing.md)).

# The Impulse Tracker engine

The sample side of DUET is a complete Impulse Tracker player: it loads
an `.it`, walks its order list tick by tick, and mixes its voices. This
page is how that engine is built and how it is judged — against
ITTECH.TXT, the format's own reference, and against `openmpt123`'s
render of the same file. The words are the [glossary](../glossary.md)'s;
the save road is in [formats](formats-internals.md).

## Where it lives

| file | owns |
|---|---|
| `src/it/format.zig` | the in-memory module: `Module`, `Pattern`, `Cell`, `Sample`, `Instrument`, `Envelope`; the caps (`MAX_CHANNELS` 64, `ORDERS_CAP` and `PATTERNS_CAP` 256, `ROWS_MAX` 256); the text of a note, a volume, an effect |
| `src/it/loader.zig` | bytes → `Module`, every read bounds-checked (`NotAnItFile`, `UnexpectedEof`, `Corrupt`); 8- and 16-bit, compressed and old-format instrument blocks all land as signed 16-bit PCM |
| `src/it/dump.zig` | `--dump` (header, samples, instruments) and `--dump-pat N` (a pattern as text) |
| `src/it/tests.zig` | the corpus test root — the whole `.it` corpus loads, the parse probe, the writer's round trips |
| `src/player/player.zig` | `Player`: all playback state, the tick machine, the effects, envelopes, NNA, the PCM mix |
| `src/player/tables.zig` | the pitch and waveform tables, generated at compile time from IT's formulas |
| `tools/it-ab.sh` + `tools/swm_compare.py`, `wav_lr.py`, `wav_pitch.py`, `wav_level.py`, `wav_swing.py` | the oracle: the scoreboard and its five judges |
| `tools/mkit.py` | the corpus author — a second, independent implementation of the format, in Python |

## Which thread runs it

`Player` runs entirely on the audio thread — or on the offline render
loop, which is the same code without a device. It never locks and never
allocates after `init`. The UI reaches it through atomics only:
`playing`, `reset_request`, `pattern_request` (play one pattern),
`order_request` (play from an order), `gv_want` (a live GLOBAL VOL),
`chan_setup_gen` (the song's channel setup changed — re-read it), the
jam ring (`jam_head`/`jam_tail`), and back the other way `snapshot`
(tempo, speed, order, pattern and row packed in one `u64`, stored after
every render call), `vu_levels` and `note_trig` per channel.

`restart()` re-initialises the whole struct and hand-restores a list of
fields that must survive a rewind — the chips, the synth slots, the
mixer hooks, the co-play hook, the solo mask. A field you add to
`Player` is wiped by every rewind until you add it to that list.

## The tick machine

`render(out)` walks the output buffer span by span. When
`samples_until_tick` reaches zero it runs `processTick()`,
`updateVoices()`, the SID, DUST and DUSK ticks, and computes the next
tick's length — `nextTickSamples()`: rate × 2.5 / tempo, with the
remainder carried so the clock is exact. Then `mixSpan` mixes up to the
next tick, and the register writes of every other engine land on the
same boundary ([architecture](architecture.md)).

`processTick` counts `tick_count` down from `speed`:

- **at zero, a new row**: `incrementOrder` walks the order list (`+++`
  is skipped, `---` ends the song or wraps it), `latchRow` copies the
  row's cells into the channels, and `processRowEffects` runs tick 0:
  an `SDx` note delay defers the whole cell; the tone-portamento flag
  is set (`Gxx`, `Lxx`, volume-column `g`); `latchRowMemories` seeds
  the effect memories in IT's order; `triggerCell`; the volume column;
  the effect;
- **at zero, an `SEx` repeat**: the same row again — effects re-run,
  notes are not retriggered;
- **otherwise a later tick**: `processLaterTick` fires a pending `SDx`
  at its tick and runs the per-tick half of the volume column and the
  effect.

`Axx` changes the speed on the row it sits on; `Txx` sets the tempo,
`T0x`/`T1x` slide it per tick; `S6x` extends a row by ticks. Flow
commands are candidates until the end of the row, where one
arbitration decides: a pattern-loop jump (`SBx`) cancels a `Bxx` to
its left, a `Bxx` to its right wins over the loop, and a `Cxx` alone
loses to a loop jump. Pattern-loop state is per channel and carries
across patterns and orders; only a rewind clears it.

## Notes, voices and NNA

A channel owns one foreground `Voice`; 192 background voices (`bg`)
hold what NNA moved out of the way — envelopes and fade keep running
there. `allocBgVoice` takes a free one or steals the quietest.

`triggerCell` reads the cell: a note starts a voice; `===` releases it
(`voiceKeyOff`); `~~~` sets it fading; `^^^` stops it; an instrument
number alone retriggers the last note unless it ended. In sample mode
(no instruments in the file) there is no NNA and no fade: `===` stops
a sample that has no sustain loop, `~~~` stops it outright.

`noteOn` does, in this order: the note map (`sampleForNote`); a
tone-portamento glide keeps the voice and only moves its target; the
duplicate check (`DCT` by note, sample or instrument; `DCA` cut, off
or fade) and then the NNA (cut, continue, off, fade — `S73`–`S76`
override it once) move the old voice to the background *before* the
new voice's volume is seeded, so an outgoing voice keeps the volume it
played at; envelope carry keeps the old positions; the filter's enabled
halves re-seed from IFC/IFR and a disabled half keeps the channel's
value; the instrument's default pan applies; PPS and the random
volume/pan swings draw from a fixed-seed generator (`randUnit`), so a
render is the same bytes every time; `Oxx` sets the start (past the
end: clamped with old effects, silent otherwise); and the sample's
default pan is applied last — when both are set, the sample's wins.

## Envelopes, fade, filter, pitch

`envTick` mirrors IT's counter: the position advances *first*, and only
while enabled (`S77`–`S7C` freeze and release it; a frozen value keeps
applying); the window is the sustain loop while the key is held —
read from the previous tick's key-off — and the loop otherwise; a
position of zero applies nothing; an envelope that walks off its last
node ends, which starts the fade, and a volume envelope ending at zero
ends the voice. Volume nodes are 0–64, pan nodes add ±32. The pitch
envelope reads through `envEvalScaled` (a 1/65536 fixed-point
interpolation, rounded once): half a semitone per node unit, magnitude
capped at 255, through the 1/192-octave slide table. With its filter
flag set the same nodes become the cutoff modifier instead.

The fade runs `fadeout_vol` from 65536 down by the instrument's
`fadeout` × 2 per tick; a stop key kills at a fixed 4096 per tick, so a
voice with `fadeout` 0 dies too.

The filter (`voiceFilterSetup`) is IT's: `c = cutoff × (modifier +
256) / 256`, `fc = 110 · 2^(c/48 + 1/4)` Hz, damping `10^(−3·res/320)`;
cutoff 127 with resonance 0 on a new note means no filter. It runs per
voice, after resampling and before gain, its feedback clipped at ±2.
`Zxx` below `$80` sets the cutoff through the default `SF0` macro (any
other `SFx` selection makes `Zxx` a no-op); `Z80`–`Z8F` set the
resonance 0–120 in steps of 8; `Zxx` has no memory — `Z00` is cutoff 0.

Pitch: `frequencyFromNote` scales the sample's C-5 speed by the linear
table; `slideFreq` slides in linear mode (fine 1/768-octave steps below
16, coarse 1/192 above) or in Amiga periods. Vibrato, tremolo and their
`S3x`/`S4x` waveforms, tremor, arpeggio (`Jxy`, one step per tick) and
retrigger sit in `updateVoices` and `handleEffect`; the sample's own
auto-vibrato (`vib_speed`, `vib_depth`, `vib_rate`, `vib_type`) rides in
`voiceTick`. Panbrello (`Yxy`) is not implemented.

## Volume, and the song's level

`voiceTick` composes a voice's gain: note volume (after tremolo and
tremor) × channel volume × volume envelope × fade × sample global
volume / 64 × instrument global volume / 128 (the random-volume swing
folds in here) × `PCM_MASTER` (1.0) × GV / 128 × MV / 128, split by
pan. `mixVoice` interpolates linearly between sample frames and ramps
gains over about 1 ms per tick so a change never clicks.

`songLevelOf(gv, mv)` = (GV / 128) × (MV / 48) — exactly 1.0 at the
defaults GV 128 / MV 48 — is handed to every other engine on every
span, so GLOBAL VOL and MIX VOL level the whole song, not only the
samples ([the mixer's signal path](the-mixer.md) has the level law).
`Vxx`/`Wxx` and the PROJECT page's GLOBAL VOL knob both reach
`global_vol` live.

A channel is muted when the file says so (`chan_pan` bit 7, saved in
the `.it`) or when the mixer's solo or strip mute says so (`glance_mute`,
never saved); `loadChannelSetup` folds both into `Channel.muted`, and a
muted voice keeps running at gain 0.

## Where a render ends

Live, the song loops (`loop_song`). `--render` wires a `VisitedMap`:
arriving at an (order, row) with the same set of in-flight pattern-loop
counts a second time means the song loops, and the render ends there;
`---` and the end of the list wrap like Impulse Tracker does. `--seconds`
caps it (600 s by default), `--fade` ramps the last seconds.

## How it is judged

**The reference** is `openmpt123` (libopenmpt, from brew): durations
from `openmpt123 --info`, audio from `openmpt123 --render --no-float
--samplerate 48000 --channels 2 --force`. OpenMPT and Schism Tracker
are read-only oracles — never copied ([contributing](contributing.md)).

**`zig build test`** runs `src/it/tests.zig` as its own root: 26 tests
today — every `.it` in `tests/corpus/classics`, `openmpt-tests` and
`inst` loads (42 files) with its sample lengths and loops consistent;
`semantics.it`, authored by `mkit.py`, is checked field by field, so a
misreading shared by the loader and the writer cannot hide inside a
round trip; `dk-tune`'s counts match `openmpt123 --info`; non-IT data
is refused; and the writer's round trips. The player's own tests
(the row walk, the pattern-loop laws, the jam, PPS and the swings, the
song level) run from the library's root, `src/tests.zig`
([testing](testing.md)).

**`sh tools/it-ab.sh`** is the scoreboard. It renders every row with
both engines into `IT_AB_DIR` (`/tmp/it-ab`) and prints one line per
row; nothing else is a bar. Five judges, because one number cannot see
everything:

| judge | tool | what it measures | verdict |
|---|---|---|---|
| `corr` | `swm_compare.py` | RMS-envelope correlation, 50 ms windows, mono, ±1 s lag search | `DRIFT` if more than 0.03 from the pinned score |
| `pitch` | `wav_pitch.py ab` | per-window pitch, diffed in cents | `PITCH-DIFF` if the median tops 10 cents |
| `level` | `wav_level.py ab` | per-window dB after removing the engines' gain offset | `LEVEL-DIFF` if the median tops 1.5 dB |
| `pan` | `wav_lr.py` | left/right RMS per third of the file | `PAN-DIFF` if the side signature differs |
| `swing` | `wav_swing.py` | the spread of per-note levels (random volume) | both engines in 0.15–0.35 |

Correlation is blind to pitch, to level and to pan on its own — a
melody at half its intervals scores +0.98 — which is why the other four
exist. Today's board, in part:

```
env-decay        +1.000  expect +1.000
env-pitch        median|d| 0.6c  p90 0.8c  max 4.8c  bar 10c  OK
nna-keepvol      median|d| 0.02dB  p90 0.04dB  max 3.13dB  bar 1.5dB  OK
dpan-priority    ours  1:L  5950/535    2:R   771/5926   3:L  5899/0
                 ref   1:L  5941/834    2:R  1185/5882   3:L  5822/0
moog             +0.899  expect +0.899
```

The rows are the instrument corpus (`tests/corpus/inst/`, one
behaviour per file), the pitch, level and pan rows, five of OpenMPT's
own test modules, the transport laws (`tests/corpus/patloop/`, each
position stream traced against libopenmpt with `tools/omptrace.c`
before it was pinned) and four classics capped at 30 s. A pinned score
below 1.000 is a measured ceiling, not a target: `1_channel_moog` sits
at +0.899 with its level row flat, `EnvLoops` at +0.825.

One row by hand:

```sh
duet --render out/env-decay-ours.wav tests/corpus/inst/env-decay.it
cp tests/corpus/inst/env-decay.it out/ && openmpt123 --render --no-float \
   --samplerate 48000 --channels 2 --force out/env-decay.it
python3 tools/swm_compare.py out/env-decay-ours.wav out/env-decay.it.wav
# envelope correlation +1.000  (lag 0 ms, 7.8s vs 7.8s)
```

## Adding a corpus file

A behaviour gets a file of its own: author it with `tools/mkit.py`
(`Song`, `Instrument`, `Env` — see its docstring; `inst-corpus` and
`patloop-corpus` regenerate the existing sets), write its paragraph in
`tests/corpus/MANIFEST.md` (what it plays, what the oracle must show),
add its row to `tools/it-ab.sh` with the score you measured, and the
loader test's file count moves with it.

## What a change must keep

- The audio-callback law: no lock, no allocation, no I/O in `Player`.
- A render is a pure function of the file — the random swings are
  seeded, the grid's sends clear on rewind. Compare renders with `cmp`
  before and after a change that should not alter the sound.
- The laws the corpus pins, each with the file that would catch you:
  NNA before the volume reset (`nna-keepvol`), the sample's pan over
  the instrument's (`dpan-priority`), the envelope counter advancing
  before it applies (`EnvLoops.it`, `s77.it`), half a semitone per
  pitch node (`pitch-scale`), the end-of-row arbitration
  (`LoopBreak.it`, `sbx-priority.it`, `patloop/`).
- A new `Player` field goes on `restart()`'s keep-list, or a rewind
  eats it.
- A moved score is a regression until you can name the law that moved
  it; then the pin moves with the reason in the same commit.

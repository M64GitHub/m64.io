# The SID-Wizard engine

DUET plays SID-Wizard modules with a player rewritten from SID-Wizard's
own 6502 player, register write for register write, and holds it to
that with a scoreboard against the original. This page: where the code
lives, how a player call runs, how the same machinery drives the SID
columns of an IT song, and how a change is judged. The user's view is
[sid-wizard](../sid-wizard.md) and [the duet](../the-duet.md); the
words are the [glossary](../glossary.md)'s.

## Where it lives

| file | owns |
|---|---|
| `src/sid/swmod.zig` | the module: the four layouts (`LAYOUTS`), the backwards parse, patterns decoded to fixed `Row`s, the loader's refusals |
| `src/sid/swinst.zig` | one instrument: the raw byte block kept exactly as the 6502 indexes it, plus typed header accessors |
| `src/sid/swtables.zig` | the PAL frequency and exponential tables, imaged for every byte index |
| `src/sid/swvoice.zig` | `SwVoice`, one voice's per-frame machinery; `SwChip`, three voices plus the chip's filter and volume state |
| `src/sid/swplayer.zig` | `SwPlayer`, the transport: orderlists, patterns, tempo programs, the tick machine, one to four chips |
| `src/sid/swrig.zig` | `SidRig`, the engine's frame callback: which clock drives jam, the song, or the SID columns |
| `src/sid/swjam.zig` | jamming: the UI's note ring, drained by the audio thread |
| `src/sid/swhybrid.zig` | `HybridSid`: SID columns in an IT song, the same voices on the IT clock |
| `src/sid/swexport.zig` | EXPORT SID -> .SWM: the SID columns as a real module |
| `src/sid/swwriter.zig`, `swiwriter.zig` | the writers — see [formats-internals](formats-internals.md) |

The comments name the `player.asm` routine and lines each function
mirrors; SID-Wizard is WTF-licensed (Hermit), and the port credits it.

## What kind of port is this?

A faithful one. Every counter is a `u8` with wrapping arithmetic
(`+%`), sign is tested on bit 7, and the 6502's carry flag is modelled
where the original leaves it uninitialised: `SwVoice.wr_carry` feeds
`writePitchWave`'s `adc DETUNER` (no `clc` before it), so a hold tick
under a pending instrument effect adds one frequency LSB, and in a
multispeed tune the carry chains voice to voice — across chips — in
the sub-call order. Do not clean any of it up: a rewrite that makes
the arithmetic "correct" moves the scoreboard, and the scoreboard is
the definition of correct.

`swtables.zig` images `player.asm`'s frequency and exponential bytes
for all 256 indices, because the player reads past its tables into its
own code, and that code moves with the chip count — `MEM` is four
images (`SEQFX`).

## The module in memory

`swmod.load` ports `SWMconvert.c`'s `ProcessSWMver1`: after a two-byte
C64 load address the file is header, sequences, patterns, instruments,
chord table, tempo table and funktempo pairs, parsed **backwards from
the end** because every element trails its size byte. The magic's
fourth byte is the chip count — `SWM1`, `SWMS`, `SWMT`, `SWMQ` for
`.swm`/`.sws`/`.swt`/`.swq` — and it decides the track count (three
per chip) and the header layout: the mute/solo block is one byte per
track, and its growth re-homes every other field — `LAYOUTS` lists
each offset per chip count. The caps shrink with the count:

| | 1SID | 2SID | 3SID | 4SID |
|---|---|---|---|---|
| subtunes (`Layout.maxSubtunes`) | 8 | 2 | 1 | 1 |
| instruments (`instBankCap`) | 36 | 29 | 26 | 22 |

Patterns are decoded at load into fixed four-byte `Row`s — note,
instrument, effect, value; the variable-length stream and its `$7X`
packed-empty-row coding exist only at the file boundary, and the raw
header and load address are kept so `write(load(f)) == f`. The header
keeps `fspeed` (1 to 8 player calls per PAL frame), the player type,
the tuning (only 0, 440 Hz PAL, is implemented) and the author line
(`duet --dump tune.swm`: `fspeed 2x  driver 5 (demo)  tuning 0`).

A file the parse cannot walk is refused with one of `LoadError`'s
names (`failed to load bad.swm: error.BadMagic`). A file that loads but
asks for bytes it does not have gets the 6502's answer: an instrument
byte past its block reads `$FF` (table end, `SwInstrument.byte`), a
chord byte past the table `$7E` (chord return, `SwChip.chordByte`), a
pattern number past the count clamps to the last, and instrument 0 is
instrument 1 — the exporter's pointer table starts that way, and two
6502 paths index it without a zero test.

## How does one player call run?

`SwPlayer.playerCall` is one call of the player. The engine schedules
frame callbacks at fixed rates (`engine.setLane`); `swrig.zig` uses
`LANE_SONG` at `fspeed × 50` Hz for the song and `LANE_JAM` at 50 Hz
for jamming (`main.zig`; `render.zig` for an offline render).

- **Multispeed.** `mul_cnt` counts calls; the full player is the
  *last* call of each group of `fspeed`, as the exported player's own
  `frCount` has it. The sub-calls run `SwVoice.tickMulti` per voice;
  the instrument's arp-speed bits say which tables run there.
- **Dispatch order.** `fullTick` runs voice 3 of every chip, then
  voice 2, then voice 1 — the filter belongs to whichever of a chip's
  own three voices claims it first — then `SwChip.writeCommon` writes
  each chip's `$D415`–`$D418`.
- **The tick machine** (`doTrack`). A track's `spd_cnt` counts ticks
  against `tempo_tbl` (main pair, a pair per track, the programs;
  assembled at `setSubtune`). Tick 0 fetches the row and runs the
  hard-restart phase for the instrument's control bit 1; tick 1 applies
  the delayed transpose, walks the orderlist at a pattern end and runs
  the bit-0 phase; tick 2 selects the instrument, starts the note
  (`SwVoice.noteStart`) and runs the row's effects; every later tick
  runs `tickFull` — vibrato or slide, the filter program on the voice
  that owns the filter, the pulse program, the waveform/arpeggio table,
  then the pitch and waveform writes.
- **The guard.** No chain runs on a voice until a pattern has selected
  an instrument — except the hard-restart ticks and the multispeed
  sub-calls, which the 6502 does not guard either: they run over
  instrument 0 (= 1), exactly as it does.

The orderlist (`advanceSequence`, `seqFx`): a byte below `$80` is a
pattern number; `$80`–`$9F` transpose (`$90` = as written), `$A0`–`$AF`
main volume and `$B0`–`$EF` track tempo (both land on the next tick
0), `$F0`–`$FD` visual markers, `$FE` ends the track (it halts, the last
register state sounding on), `$FF` jumps to the byte that follows —
with bit 7 set, a subtune jump for this track alone.

A `Row`'s cells and where each is dispatched:

| cell | values | runs in |
|---|---|---|
| note | `1`–`$5F` a note; `$60`–`$6F` vibrato amplitude; `$78` portamento; `$79`–`$7C` sync and ring on/off; `$7D`/`$7E` gate on/off | `noteFx` |
| instrument | `1`–`$3E` select; `$3F` legato; `$40` and up a small effect | `smallFx` |
| effect below `$20` | with the value byte: `$01`–`$0F` the per-voice effects (slides, waveform, ADSR, chord, vibrato, table jumps, arp speed, detune, pulse high, cutoff), `$10`–`$15` the tempo family, `$16` vibrato type, `$17`–`$1C` filter shift (all alias `$1C`), `$1D`/`$1E` ignored (EXTRA player only), `$1F` raw `$D417` | `bigFx` |
| effect `$20` and up | the nibble families: attack, decay, waveform, sustain, release, chord, vibrato amplitude and rate, main volume, filter band, arp speed, detune, resonance (`$Ex` is dead code in the original too) | `smallFx` |

The player is owned by the audio thread once playback starts. The UI
reads `track_pub` (the *audible* position — the `ui_*` latches, since
the raw counters pre-advance a row), `subtune_pub` and `note_trig`
(notes, not gates), and writes `playing`, `reset_request`, `pattern_req`
(pattern mode: every track loops its own pattern at its own length)
and the tempo-edit flags. Atomics, nothing else.

## The clocks, the jam, and the SID columns

`swrig.SidRig` is the engine's single frame callback; its `Mode` atomic
says what runs: `jam`, `song` (the song lane calls `playerCall`; the
jam lane keeps jamming alive while the song is paused and discards
queued notes while it plays) or `hybrid` (the SID columns' writes come
from the IT player's ticks; only jam lives here).

`swjam.SwJam` takes note events from the UI through a lock-free
single-producer ring, drains them on the audio thread and plays them
through the real pipeline (`--swi-test` scripts it headlessly).

A SID column is `swhybrid.HybridSid`: one `SwChip` per chip in the SID
setup, driven by `player.zig`'s `sidTick` after each IT tick. The IT
player *peeks* the next row two ticks early (every IT transport
decision is made on a row's tick 0, so the peek is exact), runs the two
hard-restart phases on those lead ticks, and starts the note on the row
boundary — SID notes land on the same sample as PCM notes, and each
voice sees the call sequence the real player would produce; at speed 6
and 125 BPM, hybrid tick *c − 2* equals player call *c*, write for
write (a unit test). Notes map `sw = it − 12` (A-5 is index 58), folded
into `1`–`$5F`; the cells carry SID-Wizard's bytes verbatim (a small
effect rides the `$17` escape, unwrapped by `patedit.decodeSdFx` at the
player boundary); the tempo family and `$1D`/`$1E` are inert, because
time belongs to the IT clock; chords are the project's. All chips share
the row clock, so they stay phase-locked.

## The export

`swexport.build` turns the SID columns into a real `SwModule`:
channels in chip-then-voice order, three per chip, and the chip count
picks the format — `--export-swm out.swm` on a two-chip project writes
`out.sws`, whatever the command line said. Instrument and effect bytes
travel verbatim, notes through the same `mapNote`; the instruments are
the S## list, the chord table the project's, the tempo table empty
(the IT speed is the single tempo, `fspeed` 1), the player NORMAL.
What cannot travel is refused or counted, never bent silently: a speed
outside 3..127, more instruments than the cap, more than 127 patterns,
a pattern over 248 rows or more than four chips refuse; tempo-family
bytes, send commands, wrapped notes and dangling instrument numbers
are counted into the receipt:

```
exported exp2.sws  (2SID, 4 patterns, 3 instruments, tempo 6, 35 notes)
```

On a loaded module `--export-swm` refuses — *exports the SID columns
of an IT song (a loaded .swm resaves via --resave)*.

## How is it judged?

**The register scoreboard is the bar.** `sh tools/swm-ab.sh reg` pairs
SID-Wizard's own example modules with SID-Maker's `.sid` exports of
them (the sibling checkout `../SID-Wizard-1.97-sources-examples`;
`sh tools/build-oracle.sh` builds the two tools). Per pair,
`duet --swm-trace t.trace --seconds 30 tune.swm` writes the transport's
register stream (six-byte records: call number, register with the chip
index in bits 5–6, value) and `tools/sidrender` — SID-Wizard's own
libcRSID, patched to log SID writes — plays the export;
`tools/trace_diff.py` reduces both to a per-call map of last values,
paced by cRSID's actual cycle clock, and counts mismatches. Calls are
numbered from 1 because the reference idles one call period before its
first; that is what keeps the offset at 0.

```
bronkosaurus  normal 1x  off=0 score=0      top:
lenore        normal 4x  off=0 score=0      top:
rain8580      normal 1x  off=0 score=1      top: FRQLO1=1
egblues       normal-2SID 1x  off=0 score=470    top: PWLO1=235 PWHI1=235
kicksamule    bare   1x  off=0 score=7967   top: FRQLO3=1443 ...
```

Twenty-seven rows today. Every row must read `off=0` (the streams are
in phase) and every NORMAL row `score=0` — byte-exact over thirty
seconds — with two documented residues, `rain8580` at 1 and `egblues`
at 470. Only the NORMAL player is implemented (`Header.driver_type` 0,
the player SID-Maker embeds); the seven rows whose `.sid` runs another
player score in the hundreds and thousands and document that gap.
`swm-ab.sh audio` replays the trace through the same emulator
(`tools/regplay`) and correlates envelopes (`tools/swm_compare.py`): a
secondary check, blind to a multi-chip tune — read `reg` there.

**The writer's identity.** Every module in the SID-Wizard tree resaved
and compared: 143 files (132 `.swm`, 4 `.sws`, 6 `.swt`, 1 `.swq`), 142
byte-identical. The exception, `sixpack.swm`, holds a 252-byte pattern
over the format's own cap, and the writer refuses it
(`error.PatternTooBig`). `--resave out.sws in.sws` + `cmp` is the
one-file form.

**The tests.** `src/sid/tests.zig` is the SID root of `zig build test`
(69 tests, pure Zig, no reSID): the instrument loader over the 324
`.swi` in `tests/corpus/swi/`, the tables, the voice runtime, the
module loader over `tests/corpus/swm/` (15 modules, all four formats),
the writer's round trip, the transport and the hybrid's spread. The
player root adds the oracles: hybrid against transport, the dialect's
effects against transport, the export replayed through `SwPlayer` for
one chip and for two, and the tick-locked clock against the absolute
one for `fspeed` 1 and 2.

**Debugging a divergence.** `SWM_ROWLOG=1` prints every row and
orderlist transition with its call number; `SWDBG=chip:voice:from:to`
prints one voice's state per call; `CPROBE=<PC> PROBE1= PROBE2=` make
`sidrender` dump the 6502's registers at that address, in the same
call numbers.

## What a change must keep true

- The arithmetic is the 6502's. Prove a change to `swvoice.zig` or
  `swplayer.zig` with `swm-ab.sh reg` at the bar, and put the
  `player.asm` lines in the comment.
- The transport and the hybrid share `SwVoice`/`SwChip`; the hybrid
  stays call-exact with the transport and the export a replay of the
  hybrid — the oracle tests say so.
- The loader keeps raw bytes and the writer stays byte-identical; a
  format limit is a refusal, never a silent trim, and every
  out-of-range read has a defined answer.
- The player belongs to the audio thread; the UI reaches it through
  the atomics above, never a pointer swap while audio runs.

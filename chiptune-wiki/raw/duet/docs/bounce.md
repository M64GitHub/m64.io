# Export and bounce

Audio leaves DUET three ways: EXPORT AUDIO renders the whole song to a
`.wav` (or one per strip), BOUNCE BLOCK renders a marked block to a
`.wav` or into a P## slot, and `--render` does both from the command
line — plus the SAVE REPORT a save may put up. What the renders go
through is [the mixer](mixer.md)'s.

## EXPORT AUDIO

`Ctrl+E` (or `SHIFT+F10`, or `[ EXPORT WAV ]` on the PROJECT page)
opens the popup over whatever page you are on:

```
FILE    hybrid-demo                .wav
LENGTH  AUTO ~0:07      FADE  OFF
MIXER   [ AS YOU HEAR IT ]  FMT  [ PCM16 ]
WRITE   [ MIX ]
the name - written beside the song, never overwrites
        [ RENDER ]                        [ CLOSE ]
```

Arrows move between the fields, every field explains itself on the
line above the buttons, `SHIFT+LEFT/RIGHT` walk a switch, digits type
into the numbers, `ESC` closes.

| field | what it is |
|---|---|
| FILE | the name; `ENTER` edits it (type, `BKSP`, `ENTER` keeps, `ESC` reverts). The file lands beside the song, and a taken name gets `-2`, `-3` ... rather than being overwritten |
| LENGTH | AUTO is the song's own length. Digits type `m:ss` (`130` and `90` both give `1:30`), `0` or `BKSP` put AUTO back, `SHIFT+LEFT/RIGHT` nudge a second, `SHIFT+UP/DOWN` ten. A SID-Wizard module has no end, so there the field starts at `3:00`: *SWM loops forever: digits m:ss set the length* |
| FADE | *fade out over the last N seconds - 0 = off*; digits or `SHIFT+arrows` |
| MIXER | AS YOU HEAR IT renders through the mixer — *MIXER ON - EQ, comp and limiter apply*; RAW SONG leaves it out. With nothing touched on the mixer the hint says so: *mixer untouched - same render either way* |
| FMT | *PCM16 to share, FLOAT32 to master from* |
| WRITE | MIX, STEMS or MIX+STEMS: *stems: one wav per mixer strip* |

With STEMS chosen a checklist of the strips appears under the field
(`xCH01 xCH02 xCH03 xSID1`, `4/4 ticked`) and `DOWN` lands on it:
`LEFT/RIGHT` walk it, `SPACE` or `ENTER` ticks a strip off and on, `A`
ticks all, `N` none, `I` inverts; `UP` is WRITE again, `DOWN` RENDER.

`ENTER` on `[ RENDER ]` renders. The popup shows the file, the format
and the progress — `38%   0:02 / 0:07~   22.4x` — and with stems it
counts the passes, one per strip and one for the mix. `ESC` once asks
(*ESC AGAIN to abort*), twice aborts: *aborted - nothing written*.
When it is done, a report replaces the form:

```
BOUNCED  hybrid-demo.wav
0:07   PCM16 48k   1.5 MB   35.5x realtime
peak -12.7 dB   comp -0.0   lim -0.0   0 clipped
as you hear it
```

The peak is the file's; `comp` and `lim` are the master compressor's
and limiter's gain reduction; `clipped` counts samples that clipped.
Every render is 48 kHz stereo. In a project the popup's choices are
kept: a render writes them into the project, the next SAVE saves them,
and the popup opens where you left it.

### What lands

The mix is `name.wav` beside the song. Stems go into `name-stems/`
beside it, one `.wav` per strip in the mixer's order and names:
`01-CH01.wav` ... for the channels, `SID1` ... `SID4` for the chips
(a SID-Wizard module renders as its chips), `DUST1`, `DUSK1` ... for
the armed synth slots. Stems leave out the master DYN, the DRIVE and
every DUCK — the nonlinear stages — and the report says so; it names
`hybrid-demo-stems/`, or `hybrid-demo.wav + hybrid-demo-stems/`.

## BOUNCE BLOCK

On the pattern page, mark a block ([the pattern
editor](pattern-editor.md): `ALT+B`, walk, `ENTER` holds it) and press
`Ctrl+B` — or pick BOUNCE TO AUDIO from the `Ctrl+P` list. Without a
mark the cursor's whole side is the block, and the receipt says so
(*BOUNCE: no block was marked - the cursor's whole side is the block
(CH01-CH03); ALT+B marks a smaller one*). The block renders at once
(*rendering the block - ESC leaves*) and the popup opens on the result:

```
P00 R00-0F CH01-01 [IT]               SPACE plays it
▁▁▂▃▃▄▄▅▅▅▆▆▆▆▆▆▅▅▅▄▄▃▃▂▂▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁▁
LEN 0:01.920   48k   PEAK -16.1 dB   CLIP 0
NAME   bounce-voices-p00          .wav
MIXER  [ AS YOU HEAR IT ]   TAIL [ CUT ]
FMT    [ PCM16 ]    CHANS [ STEREO ]  LOOP [ OFF ]
SLOT   P02 (blank)
the name - the wav's (never overwrites) and the P##'s
[ WRITE WAV ] [ WRITE P02 ]   [ CLOSE ]
```

The first line names the block — pattern, rows, the channels as the
mixer counts them, and the side: a block on a SID column reads
`CH53-53 [SID]`. Columns outside the block are silent, as if muted.
`SPACE` plays the bounce. The fields, each with its own hint:

| field | what it is |
|---|---|
| NAME | the name of the `.wav` and of the P##; `ENTER` edits |
| MIXER | AS YOU HEAR IT — *MIXER ON - EQ, sends and dynamics apply* — or RAW SONG, *mixer untouched - the raw block* |
| TAIL | *CUT ends at the block edge - +Ns lets releases ring*: `+0.5s`, `+1s` ... `+5s`. A tail is a note off on every column at the block's end, then that much ring-out; the preview renders again and LEN follows at once |
| FMT | *the wav: PCM16 to share, FLOAT32 to master from* |
| CHANS | *the P## sample: STEREO as heard, MONO folds L+R* |
| LOOP | *ON writes the P## looping over its whole length* |
| SLOT | the P## slot to write into; `SHIFT+LEFT/RIGHT` walk the slots, `SHIFT+UP/DOWN` jump ten. `(blank)` says it is empty |

Then:

- `[ WRITE WAV ]` writes it beside the song — `WROTE
  bounce-voices-p00.wav  (1.92s PCM16)`; a taken name gets `-2`.
- `[ WRITE P02 ]` writes it into the slot — `P02 <- BOUNCE p00 r00-0f
  (1.92s stereo)`. The slot gets the NAME, the audio at `C5 48000 Hz`,
  16-bit stereo or mono, and with LOOP ON a FORWARD loop over the whole
  sample; from then on it is a sample of the song's `.it` like any
  other, and SAVE writes it ([impulse-tracker](impulse-tracker.md)).
- `[ CLOSE ]` or `ESC` leaves — *the mark stays where it was*.

A write that cannot open its file says so on the hint line (*could not
open the file*) and the popup stays; a render that fails reports
`FAILED` with the reason and *nothing was written*. The bounce needs
the IT clock: an `[SWM]` session answers *BOUNCE: no IT clock here - an
SWM-only session exports the whole tune with ^E*, and a block on a
co-play's tracks *BOUNCE: that block is the SWM side's - the whole tune
exports with ^E*.

`Ctrl+B` on the instruments page writes the selected P## out as a
`.wav` beside the song at once — `bounced kick.wav (0.50s  8363 Hz
mono)`, never overwriting (`kick-2.wav`).

## From the command line

`--render` is EXPORT AUDIO without a window or an audio device, and it
takes the same choices as options ([cli](cli.md) has the full list):

```sh
duet --render out.wav project.zon              # the mix, as you hear it
duet --render out.wav --stems project.zon      # + out-stems/01-CH01.wav ...
duet --render out.wav --bare project.zon       # RAW SONG: no mixer, no saved SID mutes
duet --render out.wav --seconds 1:30 --fade 3 tune.swm   # a length, and a fade
duet --render blk.wav --bounce-block 00:00-0F:1-2 --tail 1 project.zon
```

`--seconds` caps the length (`mm:ss` or seconds; without it a
SID-Wizard module renders ten minutes); `--fade N` fades the last N
seconds. `--bounce-block P:R0-R1[:C0-C1]` is the block bounce —
pattern and rows in hex as the grid shows them, channels decimal and
1-based as the mixer counts them (the popup's first line gives a
block's numbers), all channels when left out, and the channels left
out are silent, as if muted; rows past the pattern's end are clipped
to it. `--tail secs` adds the ring-out and needs `--bounce-block`
(alone it refuses). The receipt is one line per file:

```
rendered 7.77s  peak 0.232  sid-chans 3  -> out.wav
  stem 01 CH01  7.77s  peak 0.157
  ...
stems: 4 wavs -> out-stems/ (each stem skips the master DYN, the DRIVE and every DUCK - the nonlinear stages)
```

A block bounce refuses with the reason: of a module alone (*needs an
IT-side module (.it/.zon) - the IT transport is the clock*),
malformed (*<P:R0-R1[:C0-C1]> - pattern+rows hex, channels decimal
1-based*), past the song's width (*channels 60-64 lie past the song's
4 used channel(s)*) or silent (*rows 01-1F ch 2-2 hold no notes - the
render would be silent*).

The SID columns can also leave as a SID-Wizard module: `[ EXPORT SID
-> .SWM ]` on the PROJECT page, or `--export-swm` ([sid-wizard](sid-wizard.md)).

## The save report

A save writes the whole song, including patterns that no order-list
position plays. When it has kept one, the SAVE REPORT opens over the
page after the receipt (`SAVED amber.it`, or `SAVED name.zon +
name.it ...` for a project):

```
SAVE REPORT - amber.it
 1 pattern holds content no orderlist places

 PAT 00     38/40 rows     806 bytes

 806 bytes of pattern data
                                          [ CLEAR ALL ]
   UP/DN scroll  ENTER clears all  ESC
```

One line per pattern: its number, how many of its rows hold anything,
its size. `ESC` keeps them all — the file is already saved with them.
`ENTER` asks once (`[ ENTER AGAIN: CLEAR ALL ]`, *ENTER again empties
them (^Z takes it back)*) and `ENTER` again empties them: `CLEARED 1
unplaced - 806 bytes off the next save (^Z)`. The box then says what
happened — *the next save is 806 bytes smaller* — and `Ctrl+Z` puts
them all back in one step; `Ctrl+S` saves again.

An `[SWM]` session gets the same report for phrases (`PHRASE 1B
04/20 rows  37 bytes`), with a line of its own: *SID-Wizard would have
dropped these - DUET keeps them.* The SONG page's footer counts the
same patterns (`1 unused`), and `N` there places the first unused one
in the order list ([impulse-tracker](impulse-tracker.md)).

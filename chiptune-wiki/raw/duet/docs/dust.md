# DUST

DUST is DUET's own SID synth: one whole SID per slot, three voices,
table programs and modulation on the patch's own clock. It lives in a
duet beside the SID columns — a `[DUET]` session — and reaches the
grid as a synth column. Words are the [glossary](glossary.md)'s; the
column's typing rules are the [pattern editor](pattern-editor.md)'s.

## Arming a slot

The PROJECT page's SETUP section has a DUST row under the chips:

```
DUST      DUST1 [ off  ] DUST2 [ off  ] DUST3 [ off  ] DUST4 [ off  ]
```

Each cell is one slot. `SHIFT+LEFT/RIGHT` (or `ENTER`) walk it through
`off > 8580 > 6581` — the chip model is the slot's, not the patch's —
and the receipt names what you got:

```
DUST1 ON (MOS 8580) - a whole SID for one voice, on CH49  patch D01  IT cap 48
```

An armed slot is a reSID of its own, beyond the four chips of the SID
setup; it puts a synth column headed `DUST1` on the grid, a strip on
the mixer, and a `1 DUST column · a whole SID each, driven by
software · IT cap 48` line under the row. The four slots stand on
channels 49–52, so a song with DUST keeps at most 48 IT channels.
Switching a slot off parks its column — `its column is parked, not
deleted (switch on to get it back)` — and the notes wait in the song.
QUALITY reaches the slots as it reaches the chips.

Only a project can hold a patch. An `[IT]` session refuses the row —
`[IT] is a bare Impulse song - DUST's patches live in the .zon, so
SAVE AS a project (or NEW) first` — and a session with a SID-Wizard
module (`[SWM]`, `[CO]`) has no DUST row at all: *the module brings
its own chips*.

## The DUST column

`ALT+LEFT/RIGHT` jumps to the synth block (`DUST1 - the DUST block`).
The column's fields are note · instrument · volume · effect:

| field | takes | the screen says |
|---|---|---|
| note | a note; `===` gates off, `~~~` fades, `.` clears | `the DUST note column plays notes - the FX column carries DUST's own vocabulary` |
| instrument | a patch number, `01`–`20` | `a DUST ins is a PATCH ADDRESS (D01-D20) - the patch is where its knobs live` |
| volume | velocity 0–64, empty = 64 | `a DUST cell's volume IS velocity, 0-64 - it has no commands, only the number` |
| effect | letter + value, DUST's own list | `ENTER` opens it — see *The column's effects* |

The slot plays the patch a note names; `ENTER` on a filled instrument
field jumps into that patch's editor (`D01 VELOCITY SAWS on DUST1 -
TAB back to the pattern`). `SPACE` turns JAM on and the piano rows
play through the column's slot — the scope, if it is up, reads
`OSC  DUST slot 1`.

## The D## patches

The instruments page's D## list holds twenty slots, every one born as
the default patch `THREE SAWS`; the header counts the ones you have
changed (`D## DUST PATCHES - 03 of 20 slots in use`). `RIGHT` or
`ENTER` steps into the editor, `ESC` steps back; `SPACE` jams the
patch from either place; `Ctrl+D` copies the patch into the next
`THREE SAWS` slot and `BKSP` puts `THREE SAWS` back (`CLEARED D02
"THE CLOUD" - back to THREE SAWS, no other number moved - ^Z takes it
back`). `[EXPAND +10]`/`[SHRINK]` show more of the twenty or only the
ones in use, and `[IMPORT]` brings a patch in from another project
([instruments](instruments.md)).

The editor's title row is a strip of four faces — `VOICE · TABLES ·
MOD · MACRO` — then `[OSC]` (the scope on this slot,
[visuals](visuals.md)) and `SLOT ◀ 1/4 ▶`: which armed slot the piano
plays and whose live numbers the faces show (`SHIFT+LEFT/RIGHT` picks
it — `DUST2 - the tabs show D02 TWO MACROS, the piano plays this
slot`). `UP` from the first field reaches the strip, `LEFT/RIGHT` pick
a face, `DOWN` enters it. Every field reads its meaning back on the
`▸` line; digits type, `SHIFT+arrows` nudge.

### VOICE

| field | what it is |
|---|---|
| NAME | what the D## list and the instrument column call it |
| CLOCK | the control clock, 250–4000 Hz: how often modulation is resolved |
| VOL | the chip's own volume nibble, `0`–`F` — it clicks when it moves |
| LEVEL | this patch's own level, 0–64, before the mixer; where velocity lands |
| MODE | UNISON (one note on all three voices) or CHORD (each voice takes its interval below) |
| GATE | WAVE TBL (bit 0 of each wave step is the gate) or GRAIN (the engine gates on the grain clock) |
| RESTART | OFF, SOFT (gate down for the window) or FULL (gate down and the envelope slammed to zero), and the window in ms, spent before the note |
| V1 V2 V3 · WAVE | each voice's waveform byte, hex, with its bits spelled under it (`..S.....` is a saw); the gate bit is never yours |
| PW | pulse width, `000`–`FFF` — `800` is a square |
| ADSR | the four nibbles side by side, attack decay sustain release |
| SRC · RETRIG | CHIP (the SID's own ADSR shapes the note) or ENV A/B (the envelope owns the level); KEEP or ZERO on retrigger |
| DETUNE | cents per voice — three saws a few cents apart |
| CHORD · STRUM | semitones per voice in CHORD mode, and how many ms each gate rises after the one before |
| ON | is this voice part of the patch at all |
| GRAIN | RATE, SPREAD and WINDOW — live when GATE is GRAIN, dim otherwise |
| FILTER | CUT (`000`–`7FF`), RES (`0`–`F`), ROUTE (a bit per voice: 1 V1, 2 V2, 4 V3), LP BP HP |

### TABLES

Four tables side by side — WAVE, PITCH, PULSE, FILTER — each with its
own header:

- **the clock**: `50 Hz fwd` — `this table's own speed, decoupled
  from the frame tick`. The unit is `Hz` (free-running), `tk` (ticks
  per step) or `rw` (rows per step); the direction `fwd`, `rev`,
  `png` (ping-pong) or `rnd`.
- **`L04  00 - 03`**: how many steps the table has (`0 disables it
  entirely`), then the loop's start and end (`put it on the LAST step
  for a one-shot`; an end of `00` means the last step).
- **`OFS 00 00 00`**: each voice's read offset into the table —
  three grains, one table.

Below, the steps, one cursor for all four tables: `ENTER` adds a step
after the cursor and `SHIFT+BKSP` one above (a HOLD — *this step says
nothing and the waveform stays where the table left it*), `.` turns
a step into a hold, `BKSP` removes one, and the row past the end is
the APPEND row — type into it and a step is born. Each step reads
itself back: a WAVE step is the waveform byte (`$41 -> $D404: pulse
gate UP`); a PITCH step is `+3` semitones off the played note, `=` an
absolute note, `~` cents or `>` a glide; a PULSE step `=100` sets the
width and `+018` adds to it every step (a sweep), `-` holds; a FILTER
step sets the cutoff and carries three marks for resonance, mode
(`1 LP, 2 BP, 4 HP`) and routing, `.` leaving each alone. On a header
cell `f` makes the table scroll with its own playhead (`FOLLOW on`);
on a step it is a hex digit. The line under the tables counts the
slot's work live: `720 writes/s  272 steps/s  peak 22/block  DUST1`.

### MOD

Four LFOs, two envelopes and eight routes:

- **LFO A–D**: SHAPE (off, triangle, saw up, saw down, square, sine,
  sample and hold, smooth random), RATE with its unit (Hz, ticks or
  rows per cycle), DPTH (% of full swing), RTRG (`free` breathes
  across the notes, `note` locks the phase), QNT (`N` quantises the
  output into N steps), PH (where in the cycle it starts, `00`–`FF`)
  and FADE (the depth ramps in over this many ms). An LFO that is off
  costs nothing.
- **ENV A–B**: DLY, ATK, HLD, DEC in ms, SUS% (a mod source, never
  the chip's ADSR), REL, CRV (lin, exp, log) and LOOP (the decay's
  end goes back to the delay).
- **RTE 1–8**: SOURCE and DESTINATION — `ENTER` picks each from a
  list (sources: the LFOs and envelopes, the table positions, note,
  random, velocity, the last `Zxx` the column sent; destinations:
  cutoff, resonance, the pulse widths, frequencies, detune, the ADSR
  nibbles, the tables' rates and jumps, the master volume, the grain
  knobs, sync and ring, amp) — AMOUNT in the destination's own units,
  CRV (`lin` lands as it is, `exp` squared, `log` rooted, `bipolar`
  passes a source that already swings both ways) and the TARGET the
  destination implies. There is no vibrato effect on the column: an
  LFO on the pitch is the vibrato.

The RESOLUTION pane under the routes shows, while a note sounds, each
moved parameter's BASE, HELD, MOD and FINAL value and what moved it.

### MACRO

A macro is a knob the grid turns. The VEL row binds velocity — the
volume column — to `amp` between MIN and MAX in level steps; M01–M10
are yours: a LABEL, a DESTINATION from the same list, MIN (where a
`Z00` lands), MAX (where `Z7F` lands) and CRV. The pane says how the
column reaches them: `SF0 picks the slot   Z00-Z7F sends into it`.

## The column's effects

`ENTER` on a DUST column's effect field opens THE DUST COLUMN'S
EFFECTS:

| effect | does |
|---|---|
| `Gxx` GLIDE TO NOTE | xx = cents per tick toward the cell's note, no retrigger |
| `Fxx` PITCH SLIDE UP | xx = cents per tick, while the command is on the row |
| `Exx` PITCH SLIDE DOWN | xx = cents per tick — `00` repeats this column's last one |
| `Zxx` MACRO VALUE | `00`–`7F` into the macro `SFx` picked; MACRO binds it |
| `SFx` SELECT MACRO | x picks the macro `Zxx` sends into — `SF0` = M01, sixteen slots |
| `SDx` NOTE DELAY | x = ticks the whole cell waits; the restart follows it |
| `a`–`d` DUET FX | the mixer's four send units ([mixer](mixer.md)) |

`Sxx` opens a second list, *DUST'S TWO*, holding `SFx` and `SDx`.

## The strip, the scope, the command line

Every armed slot has a strip on the mixer, headed by its name and
patch (`DUST1 01`), with a dB fader, its own PAN and an EQ like any
other ([mixer](mixer.md)). `[OSC]` on the editor's title row, or
`ALT+O`, puts the scope on the slot ([visuals](visuals.md)). Headless,
`duet --dust-test out.wav` renders the default patch through a real
slot, and `--render` plays a project's DUST as the session would
([the command line](cli.md)).

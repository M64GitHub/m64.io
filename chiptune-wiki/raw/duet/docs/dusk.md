# DUSK

DUSK is DUET's wavetable synth: a K## patch plays a sample of the
song as a **wavetable** — a row of equal single-cycle frames — and
morphs through them, with a SID-style envelope and a filter in
software. It lives in a duet: an armed DUSK slot is a column on the
grid, a strip on the mixer, and a K## list on the instruments page.
Words are the [glossary](glossary.md)'s; the grid itself is the
[pattern editor](pattern-editor.md)'s.

## Arming a slot

The PROJECT page's SETUP section has a DUSK row of eight switches,
`DUSK1` .. `DUSK8`. On one, `SHIFT+LEFT/RIGHT` turns it on:

```
DUSK1 ON - a morphing wavetable voice, on CH41  patch K01  IT cap 40
```

The summary line under the switches counts the result (`1 DUSK
column · IT's samples as morphing wavetables · IT cap 40`): each slot
takes one of the song's channels, `CH41` for DUSK1 up to `CH48`, and
the IT side stops at 40. On the grid the column stands in the synth
block, between the channels and the SID columns, headed `DUSK1`.
Switching a slot off parks its column — `DUSK1 OFF - its column is
parked, not deleted (switch on to get it back)` — the notes stay.

Only a project can hold a patch. A bare `[IT]` session refuses —
`[IT] is a bare Impulse song - DUSK's patches live in the .zon, so
SAVE AS a project (or NEW) first` — and a session with a SID-Wizard
module (`[SWM]`, `[CO]`) has no DUSK row at all: the module brings
its own chips.

## The DUSK column

Its fields are note · instrument · volume · effect. `ALT+LEFT/RIGHT`
jumps into the block (`DUSK1 - the DUSK block (4 synths)`), and
`ENTER` on each field says what it takes:

- **note** — *the DUSK note column plays notes - one cell is a whole
  CHORD when the patch's VOICES say so.* `===` releases the note and
  its tail plays out; `^^^` cuts it.
- **instrument** — a K## number. A typed note stamps the slot's
  current patch (the footer's `P01` is the IT side's). `ENTER` on a
  filled field jumps to the patch: `K01 SLIDE303 on DUSK1 - TAB back
  to the pattern`.
- **volume** — *a DUSK cell's volume IS velocity, 0-64 - the VEL
  binding on the MACRO tab ranges it.* An empty cell is full velocity.
- **effect** — the column's own list, THE DUSK COLUMN'S EFFECTS:

| effect | does |
|---|---|
| `Gxx` GLIDE TO NOTE | xx = cents per TICK toward the cell's note, no retrigger |
| `Fxx` PITCH SLIDE UP | xx = cents per TICK, while the command is on the row |
| `Exx` PITCH SLIDE DOWN | xx = cents per TICK - 00 repeats this column's last one |
| `Zxx` MACRO VALUE | xx = 00-7F into the macro SFx picked; MACRO binds it |
| `SFx` SELECT MACRO | x picks the macro Zxx sends into - SF0 = M01, sixteen slots |
| `SDx` NOTE DELAY | x = ticks the WHOLE cell waits before it lands |
| `a`–`d` DUET FX | the four send levels, as on a channel ([mixer](mixer.md)) |

`SFx` and `SDx` sit under `Sxx THE S FAMILY` in the picker. `ALT+F9`
mutes the slot (`DUSK1 MUTED (never saved)`), `ALT+F10` solos it
(`SOLO DUSK1 on (1 soloed)`); `SPACE` turns JAM on here as on every
column (`JAM MODE - piano plays, SPACE returns`).

## The K## list

`F4` opens the instruments page; `TAB` rotates to `K## PATCHES
05/20` — the list exists while a slot is armed, and holds `K01` ..
`K20` (hex: thirty-two). Every slot holds a patch: a fresh one is
`AFTERGLOW`, the built-in default (built-in table, ADSR `00F6`, no
filter). `RIGHT` edits, `SPACE` jams (*the piano plays this patch on
the selected slot*), `Ctrl+D` copies, `BKSP` puts `AFTERGLOW` back,
`[IMPORT]` imports from another project ([instruments](instruments.md)).

The editor's top strip is `DUSK · VOICE TABLES MOD MACRO · [OSC] ·
K01 SLOT ◀ 1/8 ▶`. `UP` reaches it, `LEFT/RIGHT` walk the four tabs
and the face follows; `[OSC]` puts the scope band up — *it draws what
the keyboard plays (ALT+O does the same)* ([visuals](visuals.md));
the SLOT selector picks the armed slot the keys play — `SHIFT+LEFT/
RIGHT`, or a digit `1`–`8` — and the tabs show that slot's patch
(`DUSK2 - the tabs show K02 CHORD, the piano plays this slot`).
Everywhere: arrows move, digits type, `SHIFT+arrows` nudge, the `▸`
line explains, `ESC` goes back to the list. On NAME the keys type the
name; step down a row before `SPACE` to jam.

## VOICE

| field | what it is |
|---|---|
| SAMPLE | `BUILT-IN` (`$00`) is the built-in morph table, saw > pulse > sine; a P## number names the song's sample slot the frames come from |
| FRAME | samples per cycle: frames = sample length / FRAME; 2048 is the Polyend standard |
| MORPH | the position across the frames in %, a blend of the two nearest — never a jump |
| ALIAS | `clean`: high notes read band-limited copies; `raw`: every note reads the unfiltered frames, the aliasing on purpose |
| ADSR | four nibbles, the 6581's own times: attack 2 ms .. 8 s, decay 6 ms .. 24 s, sustain level (F = full), release 6 ms .. 24 s (6 = ~204 ms) |
| LEVEL | the patch's own gain, 0..64; 64 is unity |
| AMP SRC | `adsr`: the nibbles shape the note; `env a`..`d`: that envelope becomes the VCA, the nibbles dim, the gate is held until it ends |
| TRIG | what a `Gxx` onto a released tail does: `keep` re-attacks from where the release stands, `zero` from silence |
| FILTER / RES | the cutoff a note starts from, `000`–`7FF` = 20 Hz–20 kHz, and the resonance `00`–`FF`: `B4` rings, `F0` is the edge — past it the loop self-oscillates |
| LP BP HP | the outputs; they sum (LP+HP is a notch), all off = no filter in the path |
| DRV | the drive into the filter, 64 = unity: low sings a whistle true, high bites |

A sample is read as frames of FRAME samples each; a patch on an
empty sample slot plays nothing.

### VOICES — the chord from one cell

`VOICES` is how many oscillators a note gets, 1 to 8; a new note
picks the count up. The rows below shape them: `STRUM` starts each
voice so many ms after the one before, left to right; `WIDTH` spreads
them across the slot's own stereo (0..64, the far side only
attenuates); `PHASE` is `spread` (voices 2..n start at random phases)
or `align` (every oscillator starts at phase 0, the coherent punch);
`INT` gives each voice its interval in semitones — a chord from one
cell — and `DET` its detune in cents (the default ladder is DUST's
own, grown outward). Cells past the VOICES count are dimmed.

The line under the grid is the slot's pool, live: `pool: 1 notes, 7 of
16 voices · a new note releases the last · when full, the oldest is
stolen whole`.

## TABLES

*MORPH, PITCH and FILTER scanned per NOTE: every note reads them
from the top* — three tables side by side, one cursor. Each has a
header row and a loop row:

| cell | what it is |
|---|---|
| clock | the table's own speed per sounding note, in `Hz` (free-running), `/tk` (ticks per step) or `/rw` (rows per step); the number converts when the unit changes |
| direction | `fwd` forward · `rev` reverse · `png` ping-pong · `rnd` random |
| `L04` | how many steps the table has; 0 disables it |
| `00 - 03` | where the loop starts (put it on the last step for a one-shot) and ends (00 = the last step) |

A MORPH step is a mode and a value: `-` hold, `=` set the morph to a
% of the frame axis, `+` add every step (a sweep). A PITCH step: `+`
semitones, `=` absolute note, `~` cents, `>` glide to. A FILTER step
is three cells — the cutoff (`.` leaves it where the table put it),
the resonance, and the outputs as bits (1 LP, 2 BP, 4 HP). The row
after the last step is the APPEND row: type a value or nudge it and
the step is born. The line under the tables converts every clock into
steps per second at the song's tempo (`morph 4.2/s  pitch 50.0/s
filt 50.0/s  per NOTE`).

## MOD

*4 LFOs (slot-wide) + 4 envelopes (per note) + 8 routes; the panel
below says which layer did what.*

- **LFO A–D**: SHAPE (`off`, `tri`, `saw+`, `saw-`, `sqr`, `sine`,
  `s&h`, `rand`; an LFO costs nothing while off), RATE and its UNIT
  (Hz, ticks per cycle or rows per cycle), DPTH — the LFO's own level
  in % of full swing, RTRG (`free` breathes across the notes, `note`
  restarts the shared run at every note-on), QNT (0 smooth, N steps),
  PH (where in the cycle it starts, `00`–`FF`), FADE (the depth ramps
  in over this many ms from the note). One LFO per slot, shared by
  every sounding note.
- **ENV A–D**: DLY, ATK, HLD, DEC in ms, SUS% (a fresh envelope is a
  constant 100), REL in ms from where it stood when the note let go,
  CRV (`lin` walks, `exp` starts slow, `log` arrives slow), LOOP (on:
  the decay's end goes back to the delay). They run per note; a tail
  keeps its own.
- **RTE 1–8**: SOURCE → DESTINATION by AMOUNT with a CRV; `ENTER` on
  either opens its list. Sources: `lfo_a`..`d`, `env_a`..`d`,
  `morph_pos` (the read position on this note), `note` (centred on
  C-5), `velocity` (the vol column, 0-64 as 0-1), `random` (per note,
  seeded), `chan_fx` (what the column sent). Destinations: `cutoff`
  (on top of what the FILTER table holds), `resonance`, `drive`,
  `morph` (a slow LFO here is the classic wavetable sweep), `pitch`
  (cents, summed — vibrato), `amp` (the level before the mixer).

The RESOLUTION panel under the routes lists every parameter something
moves — BASE (the patch), HELD (what a table holds), MOD (what the
routes add), FINAL, and FROM, the layer that did it — live while a
note sounds (`CUTOFF 17C 190 000 190 filter 06`), `(nothing
sounding)` otherwise.

## MACRO

*What the PATTERN can say to this patch: the vol column's binding +
the 16 SFx slots.* One row per binding — LABEL, DESTINATION, MIN, MAX,
CRV and NOW, the live value:

- **VEL** is the velocity binding, fed by the vol column whatever you
  call it: MIN is where a volume of zero lands, MAX where full
  velocity lands, in level steps 0–64 — keep MAX at 0 and a full note
  is untouched; by default `amp -64 .. 0`.
- **M01**–**M10** (sixteen, in hex) are the macros: `SFx` on the
  column selects one (`SF0` = M01) and `Zxx` sends `00`–`7F` into
  it, walked from MIN to MAX in the destination's own units (cutoff
  `0`–`2047`, for one) on the CRV: `lin`, `exp` or `log`.

## Elsewhere

Every armed slot has a strip on [the mixer](mixer.md) — a fader in
dB and a stereo BALANCE. The scope band shows a slot from its `[OSC]`
button or `ALT+O` ([visuals](visuals.md)). From the command line,
`duet --dusk-test out.wav` renders the built-in patch through the
built-in table (`dusk-test: DUSK1 = K01 "AFTERGLOW" (built-in table,
32 frames x 512, ADSR 00F6)`) — [cli](cli.md) has the rest.

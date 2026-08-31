# The mixer

The mixer is the console every sound in a session passes through: a
strip for each column of the grid, each chip and each armed synth
slot, then the sum, the master and its dynamics — with four send FX
units behind them, and send levels you can write into the pattern.
`Ctrl+UP/DOWN` walks the page list to THE MIXER; `TAB` there turns its
three pages: the strips, the sends, the units and their returns.
Words are the [glossary](glossary.md)'s.

![The mixer, playing](img/mixer.png)

## The strips

Left to right, in the order the sound flows: every channel (`CH01`
…), every chip that is on (`SID1`), every armed DUST slot (`DUST1 01`
— the slot and its patch) and DUSK slot (`DUSK1 01`), then, pinned at
the right behind a `│` seam, the output section: `IT SUM`, `MASTER`
and `DYN`. When more strips exist than fit, they scroll under the
seam and it draws as `>`. Above every strip stands its meter; a DUSK
strip's and the master's are stereo pairs, and `DYN`'s bar hangs from
the top, showing how much the compressor takes away.

`ALT+LEFT/RIGHT` jump between the sections, and each names itself:
*THE IT CHANNELS - faders, pans and mutes belong to the song* · *THE
SID CHIPS - one strip per live chip* · *THE DUST SYNTHS - one strip
per armed slot* · *THE DUSK SYNTHS - one STEREO strip per armed slot*
· *THE OUTPUT SECTION - IT-SUM, MASTER, DYN*. An `[SWM]` session has
its chip, MASTER and DYN, and no IT SUM.

Every strip has the same rows; the top two mean something different
per kind of strip, and every focused cell says what it holds on the
status line, with its steps:

| row | what it holds |
|---|---|
| LVL | a channel: VOL 0–64, the channel's own volume. A chip, a synth slot, IT SUM, MASTER: a fader in dB — `+`/`-` 0.5, `SHIFT+UP/DOWN` 3, `0` = 0 dB |
| PAN | a channel: PAN 0–64 (`0` centres). A chip: its PAN L100..R100, the same knob the SONG page shows. A DUST slot: the synth's PAN. A DUSK slot: a stereo BALANCE — *far side turns down*. The output strips have none |
| MUT | `on`, or `MUTE` |
| SOL | `-`, or `SOLO` |
| EQ | `BYP` or `ON`: the strip's three-band EQ |
| LO · MID · HI | LOW shelf 120 Hz, MID peak 1.2 kHz, HIGH shelf 8 kHz — ±1 dB a step, `SHIFT+UP/DOWN` 3, up to ±12 |

| key | does |
|---|---|
| `LEFT/RIGHT` | the next strip; `Ctrl+LEFT/RIGHT` hop CH-HOP strips at a time |
| `ALT+LEFT/RIGHT` | the next section |
| `UP/DOWN` | the strip's rows |
| `+`/`-`, `SHIFT+LEFT/RIGHT` | nudge; `SHIFT+UP/DOWN` is the coarse step; hold a nudge to sweep |
| `ENTER`, `b` | bypass — a fader, the EQ (from any of its rows), the compressor, the limiter |
| `0` | 0 dB on a fader, centre on a pan, flat on a band, the default on a dynamics knob |
| `m`, `s` | mute and solo this strip; `ALT+F9`/`ALT+F10`, the pattern page's own mute and solo, do the same here |
| `TAB` | the sends page, then the units, then back |

## Born bypassed

Every stage that is not the song's own starts bypassed: a chip's or a
synth's fader reads `BYP`, so do IT SUM, MASTER, every EQ, the
compressor and the limiter. Untouched, the mixer changes nothing —
the mix is the engines' own. A nudge arms the stage it touches: `+`
on a `BYP` LO band puts `EQ ON` and `LO +1` at once. `ENTER` or `b`
switches a stage out again and back; a bypassed EQ keeps its bands on
screen and brings them back when armed.

## The output section

**IT SUM** is the channels' sum — the whole PCM side on one strip —
with a fader, a mute and an EQ. **MASTER** is the mix's own fader and
EQ. **DYN** is the master's dynamics, after the MASTER fader, in two
parts: the compressor — `CMP`, then `THR` (where reduction starts, dB,
default −18), `RAT` (dB in per dB out above THR, 1.5 to 20, with a
6 dB soft knee), `ATK` (0.1–30 ms), `REL` (50–1600 ms), `MK` (makeup
dB after reduction) — and the limiter, `LIM` with `CEI`, the ceiling
in dB that the output *NEVER passes* (default −0.3). `ENTER`/`b`
bypass either from any of its rows, a nudge on any knob arms it, and
`0` puts a knob back to its default. The bar above DYN shows the
squeeze.

## Mute and solo

`m` and `s` act on the strip you stand on and say what they did:
`CH01 MUTED (saved in the song)`, `SID1 MUTED (never saved)`, `DUSK1
MUTED (never saved)`, `IT SUM MUTED (never saved)`; `SOLO CH01 on (1
soloed)`, and again `SOLO CH01 off (0 soloed - all play)`. These are
the pattern page's mutes seen from the other side ([the
duet](the-duet.md)): a channel's mute is the song's and travels in the
`.it`; a chip strip's mute silences the whole chip and is not saved,
while the grid's mute of one voice is the project's and shows on the
chip strip's title as dots — `SID1 x..` is voice 1 muted — and a
soloed voice on its SOL row as `s..`. Solo is never saved.

## The sends

`TAB` opens MIXER FX SENDS. Four rows per strip — `A DLY`, `B REV`,
`C CHO`, `D DRV` — say how much of the strip goes into each unit, 0
to 100. Every channel, chip and synth strip sends, and IT SUM sends
the whole PCM side at once; MASTER and DYN have no sends.

| key | does |
|---|---|
| `+`/`-` | 1; `SHIFT+UP/DOWN` 10 — the receipt reads `CH01 -> REVERB 10` |
| `ENTER` | this send off, and back at the amount it had |
| `a` | this send on every strip: `REVERB SEND 10 on 4 strip(s)` |
| `0` | off |
| `m`, `s` | mute and solo the strip, as on the mixer |
| `ALT+LEFT/RIGHT` | the channels, the chips, IT SUM |

A unit that is bypassed still takes the amount, and the status line
says so: *this strip into the DELAY - which is BYPASSED: TAB to
switch it on*. Beside each strip's meter a thin lane per unit shows
what the strip feeds it; the four bars at the right edge are the
units' own. A send taps the strip after its own fader, pan and EQ,
and the returns land in the mix before the MASTER chain.

## The units and their returns

`TAB` again opens FX AND RETURN SETTINGS: four blocks side by side —
DELAY A, REVERB B, CHORUS C, DRIVE D — each a return strip on the
left and the unit's knobs on the right. `LEFT/RIGHT` walk the eight
columns, `ALT+LEFT/RIGHT` jump unit to unit (*THE REVERB - its
return, then its knobs*).

The return strip is a strip like the others: METER (the bar above it
shows IN, what the sends pour in, or OUT, what comes back — this row
is the switch), LEVEL (how loud the effect comes back, ±0.5 dB, `0` =
unity), MUT — *drop what comes back - the effect keeps running, tail
and all* — SOL — *hear this return alone: the dry drops, the sends
keep feeding* — and an EQ that shapes what comes back before the
level.

The unit's own column starts with its state, `ON` or `BYP`: `ENTER`,
`b` or `m` toggle the bypass, `s` hears all four returns alone
(*press s again for the whole mix*), a nudge on any knob arms a
bypassed unit, and `0` puts a knob back to its born value. The
knobs, as their own hints describe them:

| unit | knobs |
|---|---|
| DELAY, the echo | TIME in rows — `3R` is 360 ms at speed 6, tempo 125, and the hint names the ms — or free-running ms with SYNC at MS · FEEDBACK, 95 at most · TONE (minus darker, plus thinner) · MODE MONO / WIDE / PING (bounces left and right) · WIDTH · TO REVERB (pours the echo into the reverb) · DUCK |
| REVERB, the ROOM | SPACE ROOM / PLATE / HALL · DECAY, 0.25 to 12 s · DAMPING (more is darker) · PRE-DELAY · WIDTH · LOW CUT · DUCK |
| CHORUS | RATE, 0.05 to 8 Hz · DEPTH · VOICES 2, 3 or 4 · SPREAD · FEEDBACK (past about 40 it flanges) · TONE · DUCK |
| DRIVE, distortion on a bus | SHAPE SOFT / HARD / FOLD / CRUSH · AMOUNT · TONE · BITS and RATE — bits left, or every Nth sample held; dialing either picks CRUSH · DUCK |

DUCK bows the return under the dry mix while the dry is loud; `0` is
never.

`F8` empties them. Stopping kills every voice, and the units go with
it: a long reverb or a delay at high feedback does not ring on over
the silence, and playing again starts from an empty tank rather than
from what the last take left behind.

## Sends from the grid

The four send levels are pattern commands too: `a`–`d`, one letter
per unit, at the end of a channel's effect list. On a channel's or a
synth column's effect field, `ENTER` opens the FX picker; its last
entry, `a-d DUET FX (the SEND FX)`, opens the four — `a SEND A ->
DELAY` … `d SEND D -> DRIVE` — and `ENTER` places the letter with a
starting amount of `23` (the receipt says so: *starts at $23 (35 of
100), type the amount over it*). The value stop takes the amount,
`00`–`64` in hex for 0–100, so `b40` sends 64 % of the strip into the
reverb. Typing a letter on the letter stop gives Impulse Tracker's own
`A`; the four lowercase letters come from the picker, and reopening it
on a placed send lands on the `a-d` entry again. A SID column takes all
four the SID-Wizard way — effect `18`, `19`, `1A` or `1B` with the
amount as its data, `a 40` … `d 40` — or through the same picker entry,
whose teaching line names the four bytes; a co-play's tracks take none.

Placing a send arms its unit, and says why: *SEND A armed the DELAY -
it was bypassed, so this cell would have been silent*. While the song
plays, the command sets the strip's send on the sends page — CH02
reads `100 ███` at its `b64` — and holds until the next send command
on that column; when playback stops, the console's own amounts are
back.

## What lands when, and what is saved

Every change lands the moment you make it, playing or not: nudge a
fader mid-song and the receipt reads `CH01 VOL 63` while the meter
keeps moving. A channel's VOL, PAN and mute are the song's and are
written into the `.it`; every fader in dB, every EQ, DYN, the sends
and the units are the project's and are written into the `.zon` — in
an `[IT]` session SAVE says so: *SAVED sends.it - MIXER and FX
settings are .zon-only, NOT written (a SID chip on the PROJECT page
makes a project)*. Solo, and the mute of a chip, a synth, IT SUM or a
return, are never saved.

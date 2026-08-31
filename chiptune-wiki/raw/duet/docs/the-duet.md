# The duet

A duet is the session neither original tracker can be: samples and
real SID voices on one grid, one transport, one save. This page is the
SID half's manual — the chips, the SID columns and their language, the
co-play with a real SID-Wizard module, and the PROJECT page that holds
it together. Words are the [glossary](glossary.md)'s; what SAVE writes
per session kind is in
[sessions and formats](sessions-and-formats.md).

## The SID setup

The PROJECT page's SETUP section holds the chips:

```
SIDS       MODEL      PAN       COLUMNS        QUALITY [ INTERP ] [ MOVE SIDS HOME ]
  1       [ 8580 ]   [   C  ]   1:1 1:2 1:3
  2       [ off  ]   --
DUST      DUST1 [ off ] ...
DUSK      DUSK1 [ off ] ...
  4 PCM + 3 SID cols · 1SID exports .it + .swm · ins cap 36 · IT cap 52
```

`SHIFT+LEFT/RIGHT` walk a chip through `off > 8580 > 6581 > off`.
Switching the first chip on turns an `[IT]` session into a `[DUET]`
and puts the chip's three SID columns on the grid; each further chip
adds three more, up to four chips. Every chip has its own MODEL and
PAN — on its PAN, `SHIFT+LEFT/RIGHT` nudge and `SHIFT+UP/DOWN` jump a
whole stop — and the SONG page's channels table grows a SID row per
chip for the same placement. `[ MOVE SIDS HOME ]` puts the SID columns
back at their fixed home at the end of the grid.

QUALITY is one knob for every chip: how reSID turns the chip's clock
into the audio rate — FAST costs the least and aliases, RESAMPLE
band-limits at the highest cost, INTERP sits between. The summary line
under the tables counts the grid and names what this setup exports and
its instrument caps. The DUST and DUSK rows arm the synth slots — the
two synths have pages of their own.

All of it changes live: a model, a pan or the quality lands without
stopping the song, and all of it is the project's — saved in the
`.zon`.

## The SID columns' language

A SID column plays S## instruments — SID-Wizard instruments held in
the project's pool; load a `.swi` (or import from a module) and jam or
type as on any column. The fields speak SID-Wizard, not Impulse
Tracker:

- The **instrument field** takes an S## number, `$3F` for legato
  (`L=` — the next note slurs in without a restart), or a nibble
  effect `$4x`–`$7F` (waveform, sustain, release, chord) — `ENTER` on
  an empty field lists them.
- The **effect field** is two hex bytes, effect and data, from
  SID-Wizard's own numbered list (`ENTER` shows it): slides,
  portamento, vibrato, waveform and ADSR sets, table jumps, detune,
  pulse width, cutoff. The nibble families ride effect `$17` — a
  volume translated from an IT block lands as `17 5x`, a sustain.
- The **note field** carries no effects here — `ENTER` says so:
  *SID columns in an IT song carry no note-FX — only a real `.swm`
  has them.* Note off (`===`) gates the voice.

The cells live in the song's `.it` as ordinary pattern bytes; the
project's SID setup is what makes them SID. Only with the rig present
do they mean what they say — which is why a duet is saved as a project.

## The co-play

A co-play pairs the `.it` with a real `.swm` instead: the module's
tracks appear beside the channels, playing on the IT song's clock, and
the [SID-Wizard side](sid-wizard.md) is all there — subtunes, tempo
programs, the W## bank. `+ CO-PLAY (SWM...)` on the PROJECT page adds
the module to a plain `[IT]` session (and, pressed again, drops the
pairing); opening `duet song.it tune.swm` starts paired.

A session has one SID half or the other. A duet's armed chips *are*
its SID half, and the button says so rather than pairing: *CO-PLAY:
switch this project's own SID chips off first — the SIDS table on the
PROJECT page does it.* The grid views a co-play adds are the
[pattern editor](pattern-editor.md)'s.

## Mute and solo, by voice

`Ctrl+M` (or `ALT+F9`) mutes the column under the cursor and
`ALT+F10` solos it — and on the SID side the column is a *voice*:

- `1:1 MUTED (saved in the project)` — one voice of one chip;
- `SW01 MUTED (saved in the project)` — one track of the co-play's
  module, which is one voice of its SID;
- `CH01 MUTED (saved in the song)` — an IT channel, kept in the `.it`
  as other trackers keep it.

`SOLO 1:1 on (1 soloed)` leaves one voice ringing alone; solo again to
lift it. The receipts name where each mute is saved, and the mixer
carries the same mutes on its strips.

## The project page

`F12` is the duet's home. Top to bottom:

- **SONG** — name, author, GLOBAL VOL and MIX VOL, speed and tempo,
  IT CHANNELS and the hops
  ([the Impulse Tracker side](impulse-tracker.md)).
- **FILE OPERATIONS** — `[ OPEN ]` (a file that replaces the session),
  `[ NEW ]`, `[ NEW IT ]`, `[ NEW SWM... ]`, `[ + CO-PLAY (SWM...) ]`,
  `[ SAVE ]`, `[ SAVE AS ]`, `[ EXPORT WAV ]`, and — with chips on —
  `[ EXPORT SID -> .SWM ]`, the SID columns leaving as a real module.
- **SETUP** — the SID setup above.
- **FILES** — what the open project holds and where: the `.it` song
  with its counts, the project with its S## pool (and any synth
  patches), the co-play's `.swm` when there is one.

Every focused field explains itself on the `▸` line, digits type into
the numeric ones, and `SHIFT+arrows` nudge — the same grammar as
everywhere else.

From the command line, `duet --sid-channels 4,5,6 song.it a.swi ...`
binds SID voices onto IT channels directly; the full option list is in
[cli](cli.md).

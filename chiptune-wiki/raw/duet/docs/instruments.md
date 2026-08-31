# Instruments

Every sound a session can play lives on one page: the instruments
page, `F4` from anywhere, `TAB` from the pattern page. Up to six lists
stand on its left — samples, Impulse Tracker instruments, SID-Wizard
instruments, synth patches — and the right half is the editor of the
selected slot. This page is about the lists: what they hold, how a
sound gets in and out, and how you play one from anywhere. The editors
are the side pages' ([Impulse Tracker](impulse-tracker.md),
[SID-Wizard](sid-wizard.md), [DUST](dust.md), [DUSK](dusk.md)); the
words are the [glossary](glossary.md)'s.

## The six lists

| list | holds | shown when |
|---|---|---|
| `I## INSTRUMENTS` | Impulse Tracker instruments | the song is in INSTRUMENTS mode (the PROJECT page's SOUNDS switch) |
| `P## SAMPLES` | the song's samples | every session with an `.it`: `[IT]`, `[DUET]`, `[CO]` |
| `S## SID POOL` | the SID-Wizard instruments the project holds | `[DUET]` |
| `W## SWM BANK` | the loaded module's own instruments | `[SWM]`, `[CO]` |
| `D## PATCHES` | DUST patches | a DUST slot is armed |
| `K## PATCHES` | DUSK patches | a DUSK slot is armed |

The header's right end counts them (`I 02  P 02  S 00`; a co-play
adds `W 21`). `TAB` and `F4` step to the next list in this order; past
the last one `TAB` goes on to the pattern page and `F4` wraps to the
first. `SHIFT+TAB` is the pattern page from anywhere on the page. The
title line names the list you are on: `P## IT SAMPLES - 04 of 10
slots in use`.

A list header reads `P## SAMPLES 04/10`: four slots in use, sixteen
drawn (both numbers hex). The lists are longer than they draw —
`[EXPAND +10]` and `[SHRINK]` under a list show more or fewer of its
slots, and the receipt says how many exist: `EXPANDED: I## shows 20 of
FF slots (02 in use)`. There are 255 I## and 255 P## slots, 36 in the
S## pool with one chip (the list's own line: `a second chip costs
seven slots`), a bank of 36 in a one-SID module, 32 D## and 32 K##.

## Slots

Every slot exists from the start. An empty one reads `- empty -`; a
patch slot is never empty — an untouched D## holds the default patch
`THREE SAWS`, an untouched K## `AFTERGLOW`, and the header counts the
ones that differ from it. Clearing never renumbers the others: the
number a cell in the grid types keeps meaning the same slot.

`UP/DOWN` walk a list, `HOME` returns to it, `END` (or `PGDN`) goes to
the button row under it. `RIGHT` or `ENTER` steps into the selected
slot's editor; `LEFT` or `ESC` steps back out. Two verbs act on the
slot the cursor is on without entering it:

- `Ctrl+D` copies it into the next free slot and opens the copy's
  name for typing: `P03 COPY of EstEps@mail.ru - name it`.
- `BKSP` clears it: `CLEARED P01 "EstEps@mail.ru" - the slot stays,
  no other number moved - ^Z takes it back`.

The patch lists have the same pair one bank over: `Ctrl+D` copies the
patch into the next slot still at its default (`K06 COPY of AC1D - name
it; on the list, ^Z takes it back`), `BKSP` puts the default patch back
(`CLEARED K01 "AC1D" - back to AFTERGLOW, no other number moved - ^Z
takes it back`), `DEL` also wipes the cells naming the slot on its
columns (`+ 18 note(s)`); a slot already at its default refuses. A name
longer than the list column ends in `…`; the slot's NAME row has it whole.

## The buttons in a slot

The editor's title row holds the slot's name and its buttons; `RIGHT`
walks along them and the `▸` line reads each one back:

| button | on | does |
|---|---|---|
| `[CLEAR]` | I##, P##, S##, W## | *blank THIS slot and touch nothing else - every cell keeps the number it types* |
| `[CLR+NOTES]` | I##, P##, S##, W## | *blank the slot AND wipe every cell that used it*; the receipt counts them: `CLEARED P01 "EstEps@mail.ru" + 96 note(s)` |
| `[LOAD]` | P##, S##, W## | a file *INTO this slot* — the same dialog as `I` below, but the sound lands here, not in the next free slot |
| `[SAVE]` | P##, S##, W## | a sample is written at once, as a `.wav` beside the song at its own C5 rate: `bounced EstEps@mail.ru.wav (0.00s 22050 Hz mono)`; an S## or W## asks for a name first (`SAVE INSTRUMENT: name.swi`), then `SAVED bassguit.swi - a copy; S01 stays in the project` |
| `[EDIT]` | P## | the sample surgery ([Impulse Tracker](impulse-tracker.md)) |
| `[OSC]` | every list | the scope band over the page, drawing what the keyboard plays; `ALT+O` does the same ([visuals](visuals.md)) |

An I## has no `[LOAD]` or `[SAVE]`: it is made from samples, not
loaded from a file. A D## or K## has its four faces and `[OSC]`.

## Loading a file into a slot

`I` on the instruments page opens the instrument dialog; `Ctrl+F4`
opens it from any page — and in JAM, where `I` is a piano key. Its
title says what this session takes; a kind the session has no home
for is not listed at all:

| session | `OPEN: INSTRUMENT (...)` |
|---|---|
| `[IT]` | `.wav` |
| `[SWM]` | `.swi` |
| `[DUET]`, `[CO]` | `.swi .wav` |

Type part of a name to filter the listing; `ENTER` opens the
highlighted entry — a directory, or the file — and `BKSP` goes up one
directory. `SPACE` plays the highlighted file without loading it, at
the note the frame names (`spc play C-4`); `SHIFT+UP/DOWN` move that
octave. While the song plays, a `.swi` cannot be auditioned:
`AUDITION: stop playback first - the song is using every SID voice`.
`TAB` opens the FAVORITES list — eight directories; `s` stores the
current one in the highlighted row (`FAV 1 = ...`), `x` clears it,
`ENTER` goes there — and `1`–`8` jump to them from the listing. The
directory each kind of dialog last used is remembered as well
([getting started](getting-started.md)).

A loaded file goes to the next free slot of its list, and the receipt
names it:

- `IMPORTED kick.wav -> P03 (8363 Hz mono)` — a sample, converted into
  the song;
- `OPENED agogo.swi -> S04` — a SID-Wizard instrument, copied into the
  project's pool;
- `OPENED agogo.swi -> W07 (this tune's own bank)` — the same file in
  an `[SWM]` or `[CO]` session lands in the module's bank instead.

Nothing stays linked to the file: the sound is in the song or the
project from then on. `[LOAD]` inside a slot is the same dialog aimed
at that slot (`IMPORTED kick.wav -> P02`).

## Importing parts of another file

`[IMPORT]` — the first button under every list; `END`, then `ENTER` —
reads parts out of a file without opening it as the session. The
dialog's title again lists what can be taken: `.it` in an `[IT]`
session, `.swm .sws .swt .swq` in an `[SWM]`, both in a `[DUET]` or
`[CO]`, and `.zon` as well once a DUST or DUSK slot is armed. Picking
a file opens a picker over what it holds:

```
IMPORT FROM congabeat.swm
  21 instruments  2 chords  1SID                [/] OCT 3
  01 BRASS...   33B
  02 VOCAL...   39B
  ...
  [ ] +CHORDS  c brings the chord it arps along
                           SPACE plays  ENTER imports  ESC
```

`SPACE` plays the highlighted part, `[` and `]` move its octave,
`ENTER` imports it — the picker stays up, so several parts can be
taken in a row (every `ENTER` lands one more), and `ESC` closes it
with the cursor on the newcomer's name. The bottom line says what
comes along: a sample brings its own settings (`COMES WITH:  C5 8363
Hz  vol 64/64`); for a module's instrument, `c` toggles `+CHORDS`,
which brings the chord it arpeggiates into this session's chord bank.
The receipts: `P03 IMPORTED harmonix - 8 KB, 8363 Hz` · `S04 IMPORTED
- name it; it is saved with the project` · `W07 IMPORTED - this
tune's own bank, saved with the .swm`. A part always lands in the
next free slot, whatever the cursor stands on.

**Patches.** A saved project is a preset bank: pick a `.zon` and the
picker lists its D## and K## patches — only of the families that have
a slot armed here, so a duet with DUSK alone sees `2 patches  2 DUSK`.
Each row says what it needs:

```
D01 IMPBASS    SID patch                 COMES WITH:  everything - a D## patch is self-contained
K01 IMPGLASS   built-in table            COMES WITH:  the built-in morph table - no sample needed
K02 IMPWAVE    + wavetable impwave 1 KB
```

A K## that plays a sample brings it — its `COMES WITH` line names
the free P## slot it will take, and the receipt names both halves:
`K01 IMPORTED IMPWAVE + wavetable -> P01 (1 KB)`. That sample lives in
the `.it` beside the source `.zon`; a `.zon` picked without its `.it`
shows `wavetable 01 MISSING` on the row and refuses: `IMPORT REFUSED:
IMPWAVE reads sample 01, which the source .zon's .it does not have`.
Patches have no audition — `SPACE` answers `AUDITION: no preview for
patches - import, then jam it on its page`.

## A new I## from a sample

In INSTRUMENTS mode the I## list has a second button, `[+I##]`. It
opens `NEW INSTRUMENT I03` over the song's samples (`2 samples - pick
what every key plays`; `SPACE` plays one, `SEEDS WITH:` shows the
settings it starts from) and `ENTER` makes the instrument in the
first empty slot: `I03 created - every key plays P01`. In SAMPLES
mode the button is absent and the help under the list says why:
`+I## needs INSTRUMENT mode - the PROJECT page's SOUNDS switch turns
it on`.

## Playing a sound from anywhere

`SPACE` switches JAM on, on the instruments page as on the pattern
page (`JAM MODE - piano plays, SPACE returns`): the letter rows are a
piano — `Z S X D C V ...` the lower octave, `Q 2 W 3 E R ...` the
upper, `[` and `]` change the octave — and every letter is a key, so
`I` plays a note until `SPACE` returns to EDIT. On the instruments
page the piano plays the selected slot through its own engine, and
the status line's right end names it: `[jam: PCM]`, `[jam: SID
8580]`, `[jam: DUST]`, `[jam: DUSK]`. `;` and `'` step the selection
(`INS S02 SYNBRASS`); the hint under the list adds `SH+SPACE all off`.

On the pattern page a typed or jammed note carries the jam
instrument, which the footer names per side — `P01 S02`: the sample
side, the SID side. `;` and `'` step the sample side from any column
(`INS P02 snare`); the SID side is the slot selected on the S## list.
`ENTER` on a filled instrument field in the grid jumps here, to that
slot: `P01 kick - TAB back to the pattern`.

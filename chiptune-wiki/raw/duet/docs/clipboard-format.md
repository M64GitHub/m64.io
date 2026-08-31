# The DUET clipboard format — for programs that produce it

This page is for a **program that wants to hand DUET a pattern** — a
melody generator, a web app, a script — by putting text on the system
clipboard. In DUET you then stand on the grid, press `ALT+SHIFT+V` (or
open the `ALT+SHIFT+X` list and pick PASTE), and the notes land at the
cursor. It is the same text OpenMPT and Schism Tracker use, so it
pastes into those too. The reading side is [the system
clipboard](system-clipboard.md); this side is how to WRITE it.

This page is self-contained: everything a producer needs is here.

## Two formats, two buttons

Give your app two copy buttons:

- **COPY IT** — the OpenMPT format. Notes and IT effects; pastes into
  DUET, OpenMPT and Schism. Use this by default.
- **COPY SID** — DUET's own SID flavour, for the SID columns of a duet
  project, where a portamento lands directly.

Both are plain text. Put the text on the clipboard exactly as shown —
one header line, then one line per pattern row.

**Two buttons is all you need.** DUET has two kinds of SID column —
the SID columns of a duet project, and the tracks of a real SID-Wizard
`.swm` module — but for the clipboard they are **interchangeable**:
either header pastes whole onto either one, notes and effects alike.
Send `DUET SID` and stop thinking about it.

| you are pasting onto | header line |
|---|---|
| IT channels (a normal `.it` song) | `ModPlug Tracker  IT` |
| any SID column — a duet project's, or a `.swm` module's track | `DUET SID` (or `DUET SW`; they are equivalent) |

The one thing that does *not* travel between the two is the
**instrument number**, because the same byte selects a different
instrument bank on each side. Your app writes no instruments, so this
costs you nothing — and in DUET, `ALT+S` stamps the notes with the
instrument you have selected.

## COPY IT (the OpenMPT format)

```
ModPlug Tracker  IT
|C-5........
|...........
|G-5.....G08
```

- **Line 1 is the header, exactly `ModPlug Tracker  IT`** — note the
  two spaces before `IT`. (DUET also accepts Schism's `Pasted Pattern
  - IT`; the rule is that the line's last three characters are ` IT`.)
- **Then one line per row.** Each channel is a `|` followed by **11
  characters** in four fields:

| field | width | what to write |
|---|---|---|
| note | 3 | `C-5`, `C#5`, … — letter, then `-` (natural) or `#` (sharp), then the octave digit `0`–`9`. `...` for no note. `C-5` is middle C. |
| instrument | 2 | `..` — your app has none (see [instruments](#notes-without-instruments)). |
| volume | 3 | `...` — unused. |
| effect | 3 | `...` for none, or a portamento (below). |

  A bare note cell is therefore `C-5........` (note + `..` + `...` +
  `...`). One melody = one `|…` per line; more channels = more `|…`
  groups on the same line.

- **Portamento** is IT's tone portamento, the letter `G` and a
  two-digit **hex** speed, in the effect field: `G08`. Put it on the
  row of the note you are gliding **to** — the glide runs from the note
  already sounding on that channel up or down to this row's note:

  ```
  ModPlug Tracker  IT
  |C-5........       <- play C-5
  |...........
  |G-5.....G08       <- glide to G-5 at speed 08
  ```

  A higher speed glides faster. `G08` reads as note + `..` + `...` +
  `G08` = 11 characters.

- **End every row with a newline.** `\r\n` is what OpenMPT writes; a
  bare `\n` is fine for DUET.

## COPY SID (DUET's SID format)

```
DUET SID
|C-5......
|.........
|G-5..0308
```

- **Line 1 is exactly `DUET SID`.** (`DUET SW` is accepted as an
  equivalent spelling — DUET treats the two as the same for pasting.)
- **Then one line per row**, each channel a `|` followed by **9
  characters** in four fields:

| field | width | what to write |
|---|---|---|
| note | 3 | the same note names as above — `C-5`, `F#4`, `...` for none. A note reads the same in both formats. |
| instrument | 2 | `..` — none. |
| effect | 2 | `..` for none, or `03` for portamento. |
| parameter | 2 | `..`, or the portamento speed. |

  A bare note cell is `C-5......` (note + `..` + `..` + `..`).

- **Portamento** is SID-Wizard's tone portamento, effect **`03`**, with
  a two-digit **hex** speed in the parameter field. On the row of the
  target note:

  ```
  DUET SW
  |C-5......
  |.........
  |G-5..0308       <- glide to G-5, effect 03, speed 08
  ```

  `G-5..0308` reads as note + `..` + `03` + `08` = 9 characters.

- Newlines as above.

## Which button

- Pasting onto **IT channels** (a plain `.it` song): use **COPY IT**.
- Pasting onto **any SID column** — a duet project's, or a real `.swm`
  module's track: use **COPY SID**. One button covers both.

Notes land correctly whatever you send: DUET converts them across every
seam. If you send **COPY IT** text at a SID column, the notes land but
the IT effects do not — those two really are different languages; paste
with **`ALT+SHIFT+T`** (TRANSLATE PASTE) to have them respelled.

When in doubt, **COPY IT** is the most portable: it also pastes into
OpenMPT and Schism.

## Notes without instruments

Your app writes notes with no instrument (`..`). That is fine — the
notes carry across, silent until they are voiced. After pasting in
DUET, mark the block and press `ALT+S` to set every note to the
instrument you have selected. (This matches how DUET's own blocks work;
the clipboard never carries instruments, samples or chord tables.)

## The rules in one place

- Header line first: `ModPlug Tracker  IT` for IT channels, `DUET SID`
  for any SID column (`DUET SW` is the same thing), exactly.
- One `|` per channel per row; write **all** the characters of every
  cell (11 for IT, 9 for SWM) — pad empty fields with dots.
- Note = letter + `-`/`#` + octave `0`–`9`; `...` = empty; `C-5` is
  middle C; the same name is the same note in both formats.
- Portamento to a note: IT `Gxx`, SWM effect `03` param `xx`, `xx` a
  hex speed, on the destination note's row.
- Rows end in a newline.

## Verified examples

These paste correctly today (checked against the running tracker). A
four-note phrase with a glide into the last note:

**COPY IT** — the clipboard holds:
```
ModPlug Tracker  IT
|C-5........
|E-5........
|...........
|G-5.....G08
```
DUET pastes `C-5`, `E-5`, then `G-5` with effect `G08` on the fourth
row.

**COPY SID** — the same phrase for any SID column:
```
DUET SID
|C-5......
|E-5......
|.........
|G-5..0308
```
DUET pastes `C-5`, `E-5`, then `G-5` with effect `0308` — onto a duet
project's SID columns and onto a `.swm` module's tracks alike.

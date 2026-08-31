# Sessions and formats

DUET has no song format of its own. A song is an Impulse Tracker
module or a SID-Wizard module, in those programs' own file formats,
and what DUET saves, those programs open. What DUET adds — SID
instruments beside a sample song, a co-play, the mixer, the synths —
lives in a **project** file that holds those parts and names the song
files it plays.

## The files

| extension | what it is | where it goes when loaded |
|---|---|---|
| `.it` | an Impulse Tracker module: patterns, samples, instruments, the order list | the session's song; its I## and P## lists |
| `.swm` | a SID-Wizard module for one SID; `.sws`, `.swt`, `.swq` are the same for two, three and four chips | the session's SID-Wizard song: tracks, phrases, the W## bank, subtunes, chord tables |
| `.swi` | one SID-Wizard instrument | copied into the S## list (or, beside an `.swm`, imported into its W## bank); nothing stays linked to the file |
| `.wav` | a sample: PCM 8/16/24/32-bit or float, mono or stereo, any rate | a P## slot of the song, converted to 16-bit; the song's `.it` carries it from then on |
| `.zon` | a DUET project | the whole session: see below |

Files are told apart by their extension. The file dialogs show only
what the current session can take (see *What a session can take*).

## The four kinds of session

The badge at the top right of every page names the kind, and the kind
decides what SAVE writes:

| badge | you opened | SAVE writes |
|---|---|---|
| `[IT]` | an `.it` alone | the `.it`, and nothing else |
| `[SWM]` | an `.swm` (`.sws`/`.swt`/`.swq`) alone | the module, and nothing else |
| `[DUET]` | a project, or nothing, or an `.it` that you then gave a SID chip | the project (`name.zon`) and its song (`name.it`) |
| `[CO]` | an `.it` and a module together, or a project that holds both | the project, the `.it`, and the `.swm` if it changed |

`[IT]` and `[SWM]` are strict: the session holds one document and
SAVE writes that document back in its own format. An `[IT]` session
becomes a `[DUET]` when you switch a SID chip on in the SID setup —
something only a project can keep — and the next SAVE asks for a
project name. The DUST and DUSK slots arm only in a `[DUET]`: a bare
`[IT]` refuses and says SAVE AS a project (or NEW) first; a session
with a SID-Wizard module in it (`[SWM]`, `[CO]`) has no place for a
patch and says so. SAVE AS picks a new name at any time; the first
save of a fresh project always asks.

A co-play (`[CO]`) is an `.it` and a SID-Wizard module playing on one
clock, the IT song's. Open them together on the command line, or pair
a loaded song with `+ CO-PLAY (SWM...)` on the PROJECT page; the same
button drops the pairing again.

## What a project holds

A project is a small text file (`.zon`). It names the song files it
plays — the `.it`, and in a co-play the `.swm` — by file name, so
they sit in the same folder as the project and stay real modules. It
*holds* everything that has no home in a song file:

- the project's name, author and comment;
- the SID setup: which chips are on, their models and pans, the
  channels their columns stand on, the sampling QUALITY;
- the S## list — every SID-Wizard instrument's bytes, inside the
  file, with the name of the `.swi` it came from as a label;
- the DUST and DUSK patch lists, and which slots are armed;
- the mixer: every strip's settings, the sends, the units;
- the saved mutes, the IT CHANNELS count, the hop sizes;
- the sync markers: inaudible points with a value that a program
  playing the song through DUET's library receives when their row
  plays ([the pattern editor](pattern-editor.md)).

The PROJECT page's FILES section lists what the open project holds.
A project written by an older DUET loads and is saved back in the
current form; a project written by a newer one is refused rather than
read with parts missing.

## What comes back the same

Saving is not an export. A module DUET loads and saves again is the
same module:

- an `.swm` saved by SID-Wizard loads and saves back **byte for
  byte** (every module in the test corpus does); a `.swi` likewise;
- an `.it` saves in DUET's own layout of the same format — OpenMPT
  and Schism open it — and it **plays back identically**: a render of
  the resaved file is byte for byte the render of the original;
- a project loads, saves and loads again to the same session.

`duet --resave out.ext in.ext` does this from the command line for
all four kinds.

## What a session can take

Loading into a session — with `O`/`F9` (a file that *replaces* the
session), `I` on the instruments page (an instrument or sample *into*
a slot), or `[IMPORT]` (parts of another file into slots) — is limited
by the kind:

- `[IT]` takes `.wav` samples; `.swi` files need a SID chip, which
  makes the session a `[DUET]`.
- `[SWM]` takes `.swi` instruments into its W## bank; it has no
  samples.
- `[DUET]` and `[CO]` take both.

`[IMPORT]` reads parts out of another file without opening it:
instruments out of an `.swm`/`.sws`/`.swt`/`.swq`, samples out of an
`.it`, DUST and DUSK patches out of a `.zon`. The picker auditions a
part with `SPACE` before it is taken.

## Exports

An export writes a new file and leaves the session as it is:

- **EXPORT WAV** (`Ctrl+E`, or the PROJECT page): the song as audio,
  the whole mix or one file per strip (`--render` and `--stems` are
  the same road headless: [the command line](cli.md)).
- **EXPORT SID -> .SWM** (the PROJECT page, or `--export-swm`): a
  duet's SID columns as a stand-alone SID-Wizard module; the number of
  chips picks `.swm`, `.sws`, `.swt` or `.swq`.
- **SAVE** on an S## or P## slot: the instrument as a `.swi`, the
  sample as a `.wav`.

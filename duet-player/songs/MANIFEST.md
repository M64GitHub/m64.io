# THE GALLERY — what ships with the web player, and where it came from

`gallery/` is a **product**, not a fixture. `tests/corpus/` holds files
that exist to be measured; this folder holds music that exists to be
*heard* — the songs `zig build wasm` installs into `zig-out/web/songs/`
and the page lists under [FILES].

**The rule for everything here: a song ships only if its licence allows
redistribution, and only with its author, its licence and its source
written down.** `songs.json` is that list in machine-readable form — the
page reads it, and every row shows the licence in the file list. This
file is the same thing in prose. `songs.json` is written by
`node tools/gallery-manifest.mjs`, which reads each file's own header
(a module's `AUTHOR:TITLE`, an `.it`'s title, a project's `.name`) and
merges it with the hand-kept tables in that script; `--check` says
whether it is current, and `--verify` opens and plays every file here
through `zig-out/web/duet.wasm`.

Ninety songs, 2.6 MB: 13 DUET demos, 70 SID-Wizard examples, 7 IT modules.

**The layout is load-bearing.** `duet/co-demo.zon` names its SID half as
`"../swm/congabeat.swm"`, and that is exactly where Hermit's examples
live — so the co-play demo is also the gallery's own test of the
resolver road, on the real relative spelling, with no copy of the file.

---

## `swm/` — the SID-Wizard examples (70 modules, 240 KB)

Every module in `resources/examples/` of the **SID-Wizard 1.97 sources +
examples** package: 62 `.swm` (1 chip), 3 `.sws` (2), 4 `.swt` (3), 1
`.swq` (4).

**Licence: WTF licence.** SID-Wizard is by **Hermit (Mihaly Horvath)**,
and its `README.txt` ends: *"2026 Hermit (Mihaly Horvath) with WTF
licence (Do what the frick you want with this code, but mentioning me if
you use it would still be nice.)"* — quoted in full in the web
directory's `LICENSES/SID-Wizard-WTFPL.txt`, where the mention is made.
Source: <https://csdb.dk/release/?id=137580> and
<https://sourceforge.net/projects/sid-wizard/>.

**The credit is the module's own.** Each file carries a 40-character
`AUTHOR:TITLE` field, and the gallery shows it verbatim, which is how
the fifteen names in the folder get their credit: Hermit (35 modules),
Spider Jerusalem, C0zmo, Necropolo, Triton, Gaetano Chiummo, Chabee,
Toggle, Uctumi, Shokey and the rest. Twelve modules put the composer in
that field *without* a colon (`TOGGLE  EUPHORIA`, `VINCENZO - PIMASZ C64
REMIX`, `MUSIC BY ADAM/ONSLAUGHT`); the field is shown whole, so the
name is still there.

Two of these are the SWM oracle's documented residues (`internal_docs/
BATTERY.md`): **`rain8580.swm`** scores 1 and **`egblues.sws`** 470 on
the register scoreboard. They play — the note is here so nobody
mistakes a known residue for a broken gallery entry. All 70 load and
render (checked with `--render` and again with `--verify`).

`congabeat.swm` does double duty: Hermit's own example, and the SID half
of `duet/co-demo.zon`.

## `duet/` — DUET's own demos (13 entries, 690 KB)

DUET's demonstration songs, copied from `tests/corpus/` (and, for
`test1`, from m64's own working folder). Part of this repository:
**GPL-2.0-or-later**, © m64. A project (`.zon`) and its song file
(`.it`) are one song, so only the project is listed.

| entry | what it shows |
|---|---|
| `co-demo.zon` + `co-demo.it` + `../swm/congabeat.swm` | **THE CO-PLAY** (M8): an `.it` and a SID-Wizard module on ONE clock — PCM drums riding Hermit's Conga Beat, IT is the clock |
| `co3-demo.zon` + `co3-demo.it` | the same idea with three chips, driven by the SD effect columns |
| `hybrid-demo.it` | **THE HYBRID** (M7): SID voices living in an ordinary `.it`'s channels |
| `bam1.zon` + `bam1.it` | m64's hand save: 4 IT channels and an 8580, four SW instruments carried inside the project (the container form) |
| `test1.zon` + `test1.it` | m64's own working project — 58 channels, 2 chips, the heaviest thing in the gallery and the one that says whether your browser keeps up |
| `dust-demo` `dust-topos` `dust-cloud` `dust-wobble` (+ `.it`) | **DUST** (block XIII), the DUET-native SID synth: the default patch, the table engine, the grain engine, the wobble |
| `dusk-first` `acid-demo` `acid-demo2` (+ `.it`) | **DUSK** (block XIV), the wavetable synth over the IT sample bank — and the two 303-style acid demos m64 dialled by ear |
| `sends.zon` + `sends.it` | the mixer's sends automated from the grid (M33) |

## `it/` — Impulse Tracker modules by other musicians (7, 1.6 MB)

Found on **The Mod Archive** in August 2026, filtered to the modules
that carry a licence deed allowing redistribution (the site's own
licence browser: Public Domain, CC0, Attribution). Each is
redistributed **unmodified**, with author, licence and source page. The
Mod Archive's licensing FAQ is the ground: the composer keeps the
copyright *unless* a deed is attributed — which is why no demoscene
classic is here, and why `tests/corpus/classics/` stays out of the
gallery entirely.

Every one was auditioned against `openmpt123` before it was taken
(`duet --render` vs the oracle, 60 s, RMS-envelope correlation per
quarter) — a gallery song has to be one DUET plays *right*.

| file | title | by | licence | source | correlation |
|---|---|---|---|---|---|
| `tix0.it` | TIXO | NEPTUNIUM237 | Public Domain | [208927](https://modarchive.org/index.php?request=view_by_moduleid&query=208927) | 0.997 · 0.997 · 0.997 · 0.997 |
| `neptunium237_-_stars.it` | stars | NEPTUNIUM237 | Public Domain | [213283](https://modarchive.org/index.php?request=view_by_moduleid&query=213283) | 1.000 · 1.000 · 1.000 · 1.000 |
| `breakingthrough.it` | BreakingThrough…Finally | Beyond | Public Domain | [172073](https://modarchive.org/index.php?request=view_by_moduleid&query=172073) | 0.997 · 0.994 · 0.991 · 0.994 |
| `ekorren_-_littledanyjel.it` | Little Danyjel | Beyond | Public Domain | [176209](https://modarchive.org/index.php?request=view_by_moduleid&query=176209) | 0.998 · 0.994 · 0.991 · 0.994 |
| `pxf_squarevox.it` | Squarevox | elPatrixF | CC BY 4.0 | [175472](https://modarchive.org/index.php?request=view_by_moduleid&query=175472) | 0.993 · 1.000 · 0.999 · 0.999 |
| `djfl_-_unafraid.it` | Unafraid | Djego Flochs (djfl) | CC BY 4.0 | [210671](https://modarchive.org/index.php?request=view_by_moduleid&query=210671) | 0.997 · 0.973 · 0.979 · 0.987 |
| `k_jose_-_a_light_waltz.it` | A Light Waltz | K. Jose | CC0 1.0 | [209322](https://modarchive.org/index.php?request=view_by_moduleid&query=209322) | 0.996 · 1.000 · 0.996 · 0.998 |

Seven songs, seven shapes: 6-channel chiptune (`tix0`), 8-channel
(`stars`), 17-channel house (`squarevox`), 15-channel easy listening
(`breakingthrough`), 32 channels (`littledanyjel` — the widest thing in
the gallery, and what the note strip's column packing gets tested on),
9-channel chiptune (`unafraid`), and an 18-channel orchestral piece with
sampled strings (`a light waltz`). Four artists; two CC BY songs whose
attribution the page carries in its file list, its `songs.json` and here.

**If you wrote one of these and want it gone, say so — it goes, no
argument, no delay.** (`LICENSES/README.txt` in the web directory says
the same thing to whoever is reading the served page.)

## What is deliberately NOT here

- **`tests/corpus/classics/`** — other people's music with no licence
  deed. Age is not a licence: a 1996 `.it` is still under copyright.
- **The famous scene modules.** Checked in s137: no free-release
  statement exists for the big names (Skaven's modules carry
  "(C) Peter Hajba"; Jogeir Liljedahl licenses through a royalty-free
  library today). They stay out until an artist says otherwise.
- **`beyond_-_spacerace.it`**, rated 10/10 and public domain: its own
  sample names say it needs a DirectX plugin, and without it our render
  drifts to 0.77 against the oracle. A gallery is not the place for a
  song we play wrong.

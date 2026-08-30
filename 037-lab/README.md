# 0 3 7 — music theory lab for tracker people

A one-file browser app that teaches music theory **in semitones** — no staff notation, no
sheet music, nothing you'd have to translate before typing it into a tracker. Built for
chiptune / tracker musicians, and named after the question that started it:

> Is the chip-arp formula `0 3 7` the right chord on *every* note of the scale?

**No.** It's the minor triad. Stack thirds through the scale and the formula changes with
the degree — that's the whole idea of the app in one table (C major):

| degree | I     | ii    | iii   | IV    | V     | vi    | vii°  |
| ------ | ----- | ----- | ----- | ----- | ----- | ----- | ----- |
| type   | `0 4 7` | `0 3 7` | `0 3 7` | `0 4 7` | `0 4 7` | `0 3 7` | `0 3 6` |

Digits that were bent to stay in scale show up **amber** in the app; anything that leaves the
scale shows **red**. Every chord, every scale, every key.

## Run it

```
open 037-lab.html
```

That's it. No build, no server, no dependencies — works from `file://` and offline (the only
network request is the JetBrains Mono web font, and it degrades gracefully). Sound starts on
your first click; everything is synthesised with pulse / triangle / saw waves in the Web Audio API.

## What's inside

Global controls up top — **root, scale, waveform, arp rate, volume** — drive all four tabs.

**Scale & Chords** — a keyboard that lights up the scale, then every chord shape
(triads, sus, power chords, 7ths, 6ths, add9) built on every scale note, shown as the digits you
type in your arp. Toggle *snap to scale* to see the raw formula vs. the diatonic one. Common
progressions play as fast arps, one bar each, in the current key.

**Melody Lab** — a melody generator that thinks like a tracker: 16 rows per bar, hex step numbers,
`C-4`-style notes, `|` for a note still ringing, `···` for a rest. Pick length, tempo, density,
range, rests and leaps; it writes chord tones on the strong steps, walks stepwise in between,
and shapes phrases (A B A B′). Click a note to reroll it, double-click to mute it, space to
play. Chord arps and a triangle octave bass come along for the ride — the bass has its own
column so you can see exactly what plays under the melody — and each column has **IT** / **SWM**
buttons in its header that copy it to the clipboard in OpenMPT's `ModPlug Tracker  IT` text or
DUET's `DUET SW` format, slides included (`Gxx` / `03xx`), ready to paste into DUET, OpenMPT or
Schism. *Copy as text* still gives you a plain readable dump.

- **Slides** — set *Some* or *Lots* and the generator places tone portamento where it belongs:
  sliding up into the peak of a phrase, down into the cadence, bending across leaps. The amber
  `3xx` column is the value to type; speeds follow SID-Wizard's calculated-slide timing, so the
  number is tempo-aware and realistic. Untick **Hear slides** to A/B the same melody without them.
  Playback is real legato — the running note bends, nothing retriggers.

**Techniques** — the chip tricks that make three channels sound like a band, most with a
*Hear it* button: chord arps, inversions for the top note, fake echo, delayed vibrato, slides,
octave bass, detune, PWM, sidechain pump, one channel doing two jobs, arrangement in 4s and 8s.

**Theory** — semitones as the only unit, scales as a palette, why chords aren't always `0 3 7`,
inversions, progressions, writing melodies that work, rhythm & groove, and a cheat sheet.

## Conventions

Everything is a semitone offset. Notes are MIDI numbers under the hood and tracker names on
screen (`C-4`, `A#3` — sharps only). Scales and chords are arrays like `[0, 3, 7]`. Roman
numerals only appear for 7-note scales; pentatonics and blues just count degrees.

## Hacking on it

It really is one file: `<style>`, the markup, then a `<script>` split by `/* ===== name ===== */`
banners. The interesting bits are data tables:

- `SCALES` — offsets plus a *mood* line; adding a scale is one line.
- `CHORDS` — the raw formula (`iv`) plus which scale steps it stacks (`deg`), which is what makes
  snapping work for any scale length.
- `PROGS` — progressions as 0-based scale degrees.
- `TECH` / `THEORY` — the cards; give one a `d:` key and it gets a *Hear it* button wired to `DEMOS`.

`fitChord()` is the heart of it, `voice()` is the only synth primitive, and all note timing runs
on AudioContext time — never `setTimeout`. Edit, reload, done.

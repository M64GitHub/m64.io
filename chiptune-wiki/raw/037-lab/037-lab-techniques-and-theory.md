# 0 3 7 lab — techniques & theory content (extract)

Source: `037-lab.html` from the local repo `../037-lab` (commit 92cee05b, 2026-08-27),
a single-file browser app "0 3 7 — music theory lab for tracker people" by the wiki's
owner. This file is a mechanical extract of the prose cards (`TECH`, `THEORY` arrays),
the interval table and the data tables (`SCALES`, `CHORDS`, `PROGS`); HTML was converted
to Markdown, nothing was rewritten. Extracted 2026-08-30.


## TECH — Chip & tracker techniques


### Chord arps — the famous 0 3 7 trick
*(demo: arpVsChord)*

Chips rarely have enough channels for real chords, so you cycle through the chord tones extremely fast on one channel. At roughly 25–50 notes per second the ear fuses them into one shimmering chord — the signature chiptune sound.

The numbers are semitone offsets from the base note: `0 3 7` is a minor chord, `0 4 7` major, `0 3 6` diminished. Slower rates (10–15/s) sound like a deliberate arpeggio riff instead of a chord — both are useful.

Which numbers to use on which note of your scale? That is exactly what the **Scale & Chords** tab computes for you.


### Pick the inversion for the top note
*(demo: inversions)*

A fast arp is heard mostly by its **highest** note — it pokes out of the blur. `0 3 7`, `0 4 9` and `0 5 8` are the same minor chord, but each puts a different chord tone on top (and needs a different base note).

Trick: choose inversions so the top notes of successive chords move by small steps. Your chord channel then plays a hidden second melody for free. The demo plays the same chord in all three inversions — listen to the top note climb.


### Echo / fake delay
*(demo: echo)*

Repeat each melody note after a fixed time (say 3 or 6 pattern rows) at much lower volume, and again even quieter. On a spare channel it becomes a lush echo; on the *same* channel, placed in the gaps of your melody, it fills space for free.

Rule of thumb: echo volume ≈ 40% of the original, second echo ≈ 15%. Delay times that match the tempo (dotted 8th = 6 rows of 16ths) always groove.


### Delayed vibrato
*(demo: vibrato)*

Real singers and lead synths don’t wobble immediately — the note lands straight, then vibrato fades in. Most trackers have a vibrato command (often `4xy`); set it a few rows *after* the note starts, or use an instrument envelope with delay.

Straight attack + late vibrato instantly makes long notes sound intentional instead of static. The demo plays the same note plain, then with delayed vibrato.


### Slides & portamento
*(demo: slide)*

Gliding into a note (tone portamento, often `3xx`) is the cheapest way to add emotion. Classic uses: slide up into the highest note of a phrase, slide down at the end of a phrase, or slow bends between two notes for that lead-guitar feel.

Fast slide = accent. Slow slide = drama. EDM leads and basses live on this.

In SID-Wizard the value sets a “calculated” speed, so a slide of N semitones takes about the same time at any pitch: `$30`–`$60` is the everyday portamento zone (a semitone in ~140–40 ms), `$08`–`$20` is a slow, dramatic slide, `$80` and up is a one-frame snap. Every +`$18` doubles the speed.

The **Melody Lab** can place slides for you: set **Slides** to Some or Lots and Generate — the amber `3xx` column is the value to type, hover it for the glide time. Untick **Hear slides** to A/B the same melody without them.


### Octave bass
*(demo: octbass)*

The oldest trick in dance music and chiptune alike: alternate the bass note with the same note one octave up (`0 12 0 12…`) in straight 8ths or 16ths. Instant drive, zero extra channels.

Variants: octave on the off-beats only, or up two octaves every 4th hit. Triangle or 25% pulse works great.


### Detune two channels
*(demo: detune)*

If you can spare a channel, play the lead on two channels a few cents apart (or use a fine-tune setting). The slow beating between them sounds huge — the chip version of a supersaw.

Small detune (5–10 cents) = fat. Large detune (a quarter tone) = seasick — sometimes exactly right. Demo: single voice, then detuned pair.


### PWM — animate the waveform
*(demo: pwm)*

A pulse wave’s character depends on its duty cycle: 50% is hollow and round, 25% brassy, 12.5% thin and nasal. Sweeping the width while a note plays (PWM) makes a single channel sound alive — the classic C64/SID shimmer.

In sample-based trackers, fake it by switching between pulse samples of different widths every row or two, like the demo does.


### Sidechain pump (EDM feel)
*(demo: pump)*

Duck the volume of chords and bass at every beat, then let it swell back before the next one. It creates the breathing, pumping motion of modern dance music — even with no kick drum playing at all.

In a tracker: volume-slide command starting low on each beat (e.g. `Axx` ramps), or an instrument volume envelope retriggered per beat.


### One channel, two jobs
*(demo: interleave)*

When channels are scarce, interleave: bass note on every even 16th, melody notes on the odd ones. Played fast, the ear separates them into two lines — a bassline and a lead — from a single channel.

Same idea works for drums + bass (kick on the beat, bass filling between) and for self-accompanying leads. Masters of 1-channel and 2-channel chip music build entire songs this way.


### Instrument design beats note count

A lot of “chiptune magic” is in the instrument, not the pattern: a fast pitch drop at note start makes a kick out of any voice; a couple of frames of noise before a tone makes a snare or a pluck; a tiny downward pitch envelope makes bass punchy.

Build a small library: pluck, soft lead, hard lead, bass, kick, snare, hat — each just an envelope + waveform recipe. Then writing music becomes fast.


### Arrangement: think in 4s and 8s

Almost all chiptune and EDM breathes in 4- and 8-bar phrases. Introduce or remove one element every 4 or 8 bars: drop the bass out, bring drums in, transpose the whole thing up, add a counter-melody. Repetition is not the enemy — *unchanging* repetition is.

Cheap but killer moves: copy a whole section up a fifth (+7) or up an octave for the finale; strip everything to bass+drums for 4 bars before the big chorus; end phrases on a held note while the chords keep moving.


## INTERVALS table

| semitones | name | character | consonance |
|---|---|---|---|
| 0 | Unison | same note | — |
| 1 | Minor 2nd | maximum tension, horror shark | dissonant |
| 2 | Major 2nd | a step; melody fuel | mild |
| 3 | Minor 3rd | the “sad” interval | consonant |
| 4 | Major 3rd | the “happy” interval | consonant |
| 5 | Perfect 4th | open, heroic fanfare | consonant-ish |
| 6 | Tritone | maximum unrest, metal & sirens | dissonant |
| 7 | Perfect 5th | power chord, stable | very consonant |
| 8 | Minor 6th | bittersweet | consonant |
| 9 | Major 6th | warm, open | consonant |
| 10 | Minor 7th | funky tension, wants to resolve | mild |
| 11 | Major 7th | dreamy tension | mild |
| 12 | Octave | same note, higher | perfect |

## THEORY — Theory, in semitones


### Semitones — the only unit you need

One semitone = one row in your tracker’s note column = one key on a piano (black and white counted equally). Every interval, chord and scale is just a pattern of semitone distances — which is why tracker arps are written as numbers like `0 3 7`.

Each interval has its own emotional flavour. Learn these by ear — press play, sing along:

${intervalTable()}

Intervals keep their character anywhere: +4 sounds “major” whether you start on C or on F#. That’s why everything below transposes freely.


### Scales — your palette of allowed notes

A scale is a subset of the 12 semitones, written as offsets from a root: Major = `0 2 4 5 7 9 11`, Natural Minor = `0 2 3 5 7 8 10`. Stay inside the set and (almost) everything you play fits together — that’s the whole point.

Useful facts:

- **Relative major/minor:** A minor and C major contain the exact same notes (minor starts 3 semitones lower: `A = C − 3`). Same palette, different home base — different mood.

- **Modes** (Dorian, Phrygian, Lydian…) are the same idea: one note set, different root. Each mode has one or two “colour notes” that give it its flavour — Dorian’s bright 6th (+9), Phrygian’s dark ♭2 (+1), Lydian’s floating #4 (+6).

- **Pentatonics** (5 notes) remove the two most friction-prone notes. Great for fast melodic runs that can’t go wrong.

- Notes *outside* the scale aren’t forbidden — they’re spice. Used briefly, on weak beats, passing between two scale notes, they add sophistication (chromatic passing tones).

Changing the root of the same scale type = **transposing**. The pattern of numbers never changes; in a tracker you just shift every note by the same amount.


### Chords — why it is NOT always 0 3 7

A basic chord (triad) = root + a third + a fifth. But “a third” comes in two sizes: minor (+3) or major (+4). And the fifth is usually +7, sometimes +6 or +8. So:

| formula | name | sound |
|---|---|---|
| **0 4 7** | major | bright, resolved |
| **0 3 7** | minor | sad, warm |
| **0 3 6** | diminished | anxious, unstable |
| **0 4 8** | augmented | weird, dreamlike |

Now the key insight: build a chord on *every* note of a scale, using only scale notes, and the formula changes per degree. In C major:

| degree | root | chord | formula |
|---|---|---|---|
| I | C | C major | 0 **4** 7 |
| ii | D | D minor | 0 **3** 7 |
| iii | E | E minor | 0 **3** 7 |
| IV | F | F major | 0 **4** 7 |
| V | G | G major | 0 **4** 7 |
| vi | A | A minor | 0 **3** 7 |
| vii° | B | B dim | 0 3 6 |

If you typed `0 3 7` on every note of C major, the chords on C, F and G would contain notes outside the scale and clash. These in-scale chords are called **diatonic** chords — the Scale & Chords tab computes them for any scale and highlights every adjusted digit in amber.

Beyond triads: add a 4th tone for seventh chords (`0 4 7 10` = dominant 7, `0 3 7 10` = minor 7 — instant funk/jazz). Replace the third for suspended chords (`0 5 7` sus4, `0 2 7` sus2) — neither major nor minor, great for tension before resolving. Drop the third entirely for a power chord `0 7`.


### Inversions — same chord, different stacking

Any chord tone can be the lowest note. Take minor `0 3 7`, move the bottom note up an octave and re-measure from the new lowest note:

| position | formula | A minor example |
|---|---|---|
| root | **0 3 7** | A C E |
| 1st inversion | **0 4 9** | C E A |
| 2nd inversion | **0 5 8** | E A C |

Why care? Two reasons. **Voice leading:** moving between chords sounds smoothest when each note travels a short distance — inversions let chords share or nearly-share notes. **Top note control:** in fast arps the highest note dominates, so inversions choose which chord tone “sings”. Every degree card in Scale & Chords shows its inversions with the numbers ready for your tracker.


### Progressions — chords in motion

Chords have jobs. The chord on degree 1 (**tonic**) is home. Degree 5 (**dominant**) creates pull back home. Degree 4 (**subdominant**) is the scenic route between them. Most songs are just clever trips away from home and back.

Write progressions as scale degrees and they work in every key: 1‑5‑6‑4 is the modern pop anthem, 1‑6‑4‑5 the 50s/8-bit classic, 1‑7‑6‑7 the synthwave loop. The Scale & Chords tab spells them out with real notes and formulas for your current key — press play and steal what you like.

Guidelines, not laws: one chord per bar is a fine default; change chords on strong beats; end sections on degree 1 (or hang on degree 5 to demand a next part). Repeating a 4-chord loop for a whole track is completely legitimate — ask any rave anthem.


### Writing melodies that work

The two ingredients of a melody note: **is it in the current chord?** and **is it on a strong beat?** Chord tones on strong beats (rows 0, 4, 8, 12 of a 16-step bar) make the melody sound anchored. Non-chord scale notes are passing/neighbour tones — put them between chord tones, on weak beats.

- **Steps beat leaps.** Move mostly by 1‑2 scale steps; save a big leap for the emotional peak — then step back down.

- **Phrases are sentences.** 2‑bar or 4‑bar phrases, with a breath (rest) at the end. Classic shape: question (ends off the root, unresolved) → answer (ends on the root).

- **Repeat, then change one thing.** The most reliable trick in all of music: play a phrase again with a different ending, or shifted to the next chord. Listeners love recognizing + being surprised, at the same time.

- **One peak per section.** Give the melody a single highest note per phrase or section — it reads as the emotional target.

- **Land the last note.** End on the root for closure, on the 5th for “to be continued”, on the 3rd for bittersweet.

The Melody Lab follows exactly these rules when generating — use it for raw material, then edit: reroll notes you dislike, mute a few into rests, and keep the phrase you’d hum.


### Rhythm & groove

In 4/4 with 16 rows per bar: rows 0 and 8 are the strong beats, 4 and 12 the medium ones, everything else is weak. Notes on weak positions — especially just *before* a strong beat — create **syncopation**, the engine of all dance music.

- Melody: long notes on strong beats, short runs on weak ones — then break the rule once per phrase.

- Off-beat stabs (chords on rows 2, 6, 10, 14) = instant house/rave energy.

- Rests are notes too. The silence before a downbeat makes the downbeat hit twice as hard.

- Shuffle/swing: delay every second 16th slightly (tracker groove/speed settings) — turns a stiff pattern human.


### Cheat sheet

**Chords:** `0 4 7` maj · `0 3 7` min · `0 3 6` dim · `0 4 8` aug · `0 2 7` sus2 · `0 5 7` sus4 · `0 7` power · `0 4 7 10` 7 · `0 3 7 10` m7 · `0 4 7 11` maj7 · `0 4 7 9` 6 · `0 4 7 14` add9

**Minor inversions:** `0 3 7 → 0 4 9 → 0 5 8`   **Major inversions:** `0 4 7 → 0 3 8 → 0 5 9`

**Scales:** Major `0 2 4 5 7 9 11` · Minor `0 2 3 5 7 8 10` · Min pent `0 3 5 7 10` · Maj pent `0 2 4 7 9` · Blues `0 3 5 6 7 10`

**Progressions (degrees):** 1‑5‑6‑4 · 6‑4‑1‑5 · 1‑6‑4‑5 · 1‑7‑6‑7 · 2‑5‑1

**Transpose:** everything +n semitones = same music, new key. Relative minor = major root − 3.

**Strong rows (16/bar):** 0 > 8 > 4, 12 > the rest. Chord tones on strong rows, passing tones between.


## DATA tables (verbatim JavaScript)

```js
/* ================= data ================= */
const NOTE_NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function tname(midi){const pc=((midi%12)+12)%12,oct=Math.floor(midi/12)-1;const n=NOTE_NAMES[pc];return (n.length===1?n+'-':n)+oct;}
function pcname(pc){return NOTE_NAMES[((pc%12)+12)%12];}

const SCALES=[
 {id:'major',   name:'Major (Ionian)',          iv:[0,2,4,5,7,9,11], mood:'bright, confident, happy end-boss-defeated energy'},
 {id:'nminor',  name:'Natural Minor (Aeolian)', iv:[0,2,3,5,7,8,10], mood:'melancholic, serious — the chiptune default'},
 {id:'hminor',  name:'Harmonic Minor',          iv:[0,2,3,5,7,8,11], mood:'dramatic, gothic, castle-level tension'},
 {id:'mminor',  name:'Melodic Minor',           iv:[0,2,3,5,7,9,11], mood:'smooth minor, slightly jazzy'},
 {id:'dorian',  name:'Dorian',                  iv:[0,2,3,5,7,9,10], mood:'cool, hopeful minor — funk and 90s dance love it'},
 {id:'phrygian',name:'Phrygian',                iv:[0,1,3,5,7,8,10], mood:'dark, menacing, spanish tinge'},
 {id:'phrygdom',name:'Phrygian Dominant',       iv:[0,1,4,5,7,8,10], mood:'exotic, eastern, metal'},
 {id:'lydian',  name:'Lydian',                  iv:[0,2,4,6,7,9,11], mood:'dreamy, floating, sci-fi wonder'},
 {id:'mixo',    name:'Mixolydian',              iv:[0,2,4,5,7,9,10], mood:'bright but laid back, rock/blues'},
 {id:'majpent', name:'Major Pentatonic',        iv:[0,2,4,7,9],      mood:'simple and folky — almost impossible to hit a wrong note'},
 {id:'minpent', name:'Minor Pentatonic',        iv:[0,3,5,7,10],     mood:'riff machine, bluesy'},
 {id:'blues',   name:'Blues',                   iv:[0,3,5,6,7,10],   mood:'gritty, expressive, bend-me notes'}
];

/* deg = which scale steps the chord stacks (0-based). Used to snap the shape into any scale. */
const CHORDS=[
 {id:'min',  name:'Minor',        sfx:'m',     iv:[0,3,7],     deg:[0,2,4]},
 {id:'maj',  name:'Major',        sfx:'',      iv:[0,4,7],     deg:[0,2,4]},
 {id:'dim',  name:'Diminished',   sfx:'dim',   iv:[0,3,6],     deg:[0,2,4]},
 {id:'aug',  name:'Augmented',    sfx:'aug',   iv:[0,4,8],     deg:[0,2,4]},
 {id:'sus2', name:'Sus2',         sfx:'sus2',  iv:[0,2,7],     deg:[0,1,4]},
 {id:'sus4', name:'Sus4',         sfx:'sus4',  iv:[0,5,7],     deg:[0,3,4]},
 {id:'p5',   name:'Power / 5th',  sfx:'5',     iv:[0,7],       deg:[0,4]},
 {id:'m7',   name:'Minor 7',      sfx:'m7',    iv:[0,3,7,10],  deg:[0,2,4,6]},
 {id:'d7',   name:'Dominant 7',   sfx:'7',     iv:[0,4,7,10],  deg:[0,2,4,6]},
 {id:'maj7', name:'Major 7',      sfx:'maj7',  iv:[0,4,7,11],  deg:[0,2,4,6]},
 {id:'m7b5', name:'Half-dim',     sfx:'m7\u266d5', iv:[0,3,6,10], deg:[0,2,4,6]},
 {id:'dim7', name:'Dim 7',        sfx:'dim7',  iv:[0,3,6,9],   deg:[0,2,4,6]},
 {id:'6',    name:'Major 6',      sfx:'6',     iv:[0,4,7,9],   deg:[0,2,4,5]},
 {id:'m6',   name:'Minor 6',      sfx:'m6',    iv:[0,3,7,9],   deg:[0,2,4,5]},
 {id:'add9', name:'Add 9',        sfx:'add9',  iv:[0,4,7,14],  deg:[0,2,4,8]}
];

const PROGS=[
 {name:'1 \u00b7 5 \u00b7 6 \u00b7 4', tag:'the pop anthem',        degs:[0,4,5,3]},
 {name:'6 \u00b7 4 \u00b7 1 \u00b7 5', tag:'emotional pop',         degs:[5,3,0,4]},
 {name:'1 \u00b7 6 \u00b7 4 \u00b7 5', tag:'doo-wop / 8-bit classic', degs:[0,5,3,4]},
 {name:'1 \u00b7 7 \u00b7 6 \u00b7 7', tag:'synthwave loop',        degs:[0,6,5,6]},
 {name:'1 \u00b7 6 \u00b7 3 \u00b7 7', tag:'minor pop loop',        degs:[0,5,2,6]},
 {name:'1 \u00b7 4 \u00b7 5 \u00b7 4', tag:'simple rave',           degs:[0,3,4,3]},
 {name:'2 \u00b7 5 \u00b7 1 \u00b7 1', tag:'jazz cadence',          degs:[1,4,0,0]},
 {name:'1 \u00b7 3 \u00b7 4 \u00b7 6', tag:'wistful',               degs:[0,2,3,5]}
];
```

This is a suite of tests of effects and settings that players tend to implement
incorrectly. These are generally geared toward compatibility with [Impulse
Tracker](Impulse%20Tracker), and many of these tests are specific to the IT
format.

The .wav files included are generated directly from the disk writer for Impulse
Tracker v2.14p5, the latest publicly available version. Any player that claims
to be IT-compatible should be producing (nearly) the same results. Of course,
some variance is acceptable due to different resampling, noise reduction
algorithms, etc. — bitwise-exact output is not the goal, identical playback is.

Keep in mind, most of these tests are fairly obscure, and some are highly
unlikely to come up in practice, so *most* players don't get them all correct.
However, if a player is failing a large portion of them, there's a good chance
that it's not going to play "normal" songs acceptably either.

Note that only the first play through the song is relevant. Since IT doesn't
reset channel settings when the song loops, some tests that expect the channels
to have certain "default" settings (namely #12) will play differently on
repeat.

The first step in achieving better playback is to follow the flowchart and
effect notes in [ITTECH.TXT](ITTECH.TXT). Processing everything in the same
fashion as IT will help to eliminate many common bugs.

In the tables below, normal text means that a player passes the test.
~~Deleted~~ text means that the player failed the test. *Italic* text means
that the player does something in between, or has some other caveat.

## Test modules

#### Arpeggio and pitch slide

<table><tr>
  <td><b>01.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td>dumb</td>
  <td><del>libmodplug</del></td>
  <td><del>mikmod</del></td>
  <td><del>chibi</del></td>
  <td>bassmod</td>
  <td>ocp</td>
  <td>mikit</td>
  <td>xmp</td>
  <td><del>fmod</del></td>
</tr></table>

Some players handle arpeggio incorrectly, storing and manipulating the original
pitch of the note instead of modifying the current pitch. While this has no
effect with "normal" uses of arpeggio, it causes strange problems when
combining arpeggio and a pitch bend.

When this test is played correctly, the first note will portamento upward,
arpeggiate for a few rows, and stay at the higher pitch. If this is played
incorrectly, it is most likely because the arpeggio effect is not checking the
current pitch of the note.

The second note should have a "stepping" effect. Make sure all three notes of
the arpeggio are being altered correctly by the volume-column pitch slide,
*not* just the base note. Also, the pitch after all effects should be
approximately the same as the third note.

Lastly, note that the arpeggio is set on the first row, prior to the note.
Certain players (notably, Modplug) erroneously ignore arpeggio values if no
note is playing.

#### Arpeggio with no value

<table><tr>
  <td><b>02.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td>dumb</td>
  <td><del>libmodplug</del></td>
  <td><del>mikmod</del></td>
  <td>chibi</td>
  <td>bassmod</td>
  <td>ocp</td>
  <td>mikit</td>
  <td>xmp</td>
  <td><del>fmod</del></td>
</tr></table>

*(__Note:__ make sure the previous test passes before trying this one.)*

If this test plays correctly, both notes will sound the same, bending downward
smoothly. Incorrect (but perhaps acceptable, considering the unlikelihood of
this combination of pitch bend and a meaningless arpeggio) handling of the
arpeggio effect will result in a "stutter" on the second note, but the final
pitch should be the same for both notes. *Really* broken players will mangle
the pitch slide completely due to the arpeggio resetting the pitch on every
third tick.

#### Compatible Gxx off

<table><tr>
  <td><b>03.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td>dumb</td>
  <td><del>libmodplug</del></td>
  <td><del>mikmod</del></td>
  <td><del>chibi</del></td>
  <td>bassmod</td>
  <td>ocp</td>
  <td>mikit</td>
  <td>xmp</td>
  <td>fmod</td>
</tr></table>

Impulse Tracker links the effect memories for Exx, Fxx, and Gxx together if
"Compatible Gxx" is NOT enabled in the file header. In other formats,
portamento to note is entirely separate from pitch slide up/down. Several
players that claim to be IT-compatible do not check this flag, and always store
the last Gxx value separately.

When this test is played correctly, the first note will bend up, down, and back
up again, and the final set of notes should only slide partway down. Players
which do not correctly handle the Compatible Gxx flag will not perform the
final pitch slide in the first part, or will "snap" the final notes.

#### Compatible Gxx on

<table><tr>
  <td><b>04.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td>dumb</td>
  <td>libmodplug</td>
  <td>mikmod</td>
  <td>chibi</td>
  <td>bassmod</td>
  <td>ocp</td>
  <td><del>mikit</del></td>
  <td>xmp</td>
  <td>fmod</td>
</tr></table>

If this test is played correctly, the first note will slide up and back down
once, and the final series should play four distinct notes. If the first note
slides up again, either (a) the player is testing the flag incorrectly (Gxx
memory is only linked if the flag is *not* set), or (b) the effect memory
values are not set to zero at start of playback.

#### Gxx, fine slides, effect memory

<table><tr>
  <td><b>05.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td>dumb</td>
  <td><del>libmodplug</del></td>
  <td><del>mikmod</del></td>
  <td><del>chibi</del></td>
  <td>bassmod</td>
  <td>ocp</td>
  <td>mikit</td>
  <td>xmp</td>
  <td>fmod</td>
</tr></table>

*(__Note:__ make sure the Compatible Gxx flag is handled correctly before
performing this test.)*

EFx and FFx are handled as fine slides even if the effect value was set by a
Gxx effect. If this test is played correctly, the pitch should bend downward a
full octave, and then up almost one semitone. If the note is bent *way* upward
(and possibly out of control, causing the note to stop), the player is not
handling the effect correctly.

#### Volume column and fine slides

<table><tr>
  <td><b>06.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td>dumb</td>
  <td><del>libmodplug</del></td>
  <td><del>mikmod</del></td>
  <td><del>chibi</del></td>
  <td>bassmod</td>
  <td>ocp</td>
  <td><del>mikit</del></td>
  <td>xmp</td>
  <td><i>fmod</i></td>
</tr></table>

Impulse Tracker's handling of volume column pitch slides along with its normal
effect memory is rather odd. While the two do share their effect memory, fine
slides are not handled in the volume column.

When this test is played 100% correctly, the note will slide very slightly
downward, *way* up, and then slightly back down.

*(Errata: this description previously indicated that the volume column's
non-fine slide behavior is "given back" to the effect column.)*

*FMOD cuts the sample on the slide up, suggesting that it does implement this
behavior but is incorrectly limiting sample pitches.*

#### Note cut with sample

<table><tr>
  <td><b>07.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td>dumb</td>
  <td>libmodplug</td>
  <td><del>mikmod</del></td>
  <td><del>chibi</del></td>
  <td>bassmod</td>
  <td>ocp</td>
  <td><del>mikit</del></td>
  <td>xmp</td>
  <td>fmod</td>
</tr></table>

Some players ignore sample numbers next to a note cut. When handled correctly,
this test should play a square wave, cut it, and then play the noise sample.

If this test is not handled correctly, make sure samples are checked regardless
of the note's value.

#### Out-of-range note delays

<table><tr>
  <td><b>08.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td><del>dumb</del></td>
  <td><del>libmodplug</del></td>
  <td><del>mikmod</del></td>
  <td><del>chibi</del></td>
  <td><del>bassmod</del></td>
  <td>ocp</td>
  <td><del>mikit</del></td>
  <td>xmp</td>
  <td><del>fmod</del></td>
</tr></table>

This test is to make sure note delay is handled correctly if the delay value is
out of range. The correct behavior is to act as if the entire row is empty.
Some players ignore the delay value and play the note on the first tick.

Oddly, Impulse Tracker *does* save the instrument number, even if the delay
value is out of range. I'm assuming this is a bug; nevertheless, if a player is
going to claim 100% IT compatibility, it needs to copy the bugs as well.

When played correctly, this should play the first *three* notes using the
square wave sample, with equal time between the start and end of each note, and
the last note should be played with the noise sample.

#### Sample change with no note

<table><tr>
  <td><b>09.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td>dumb</td>
  <td><del>libmodplug</del></td>
  <td><del>mikmod</del></td>
  <td><del>chibi</del></td>
  <td>bassmod</td>
  <td>ocp</td>
  <td><del>mikit</del></td>
  <td>xmp</td>
  <td><del>fmod</del></td>
</tr></table>

If a sample number is given without a note, Impulse Tracker will play the old
note with the new sample. This test should play the same beat twice, *exactly
the same way* both times. Players which do not handle sample changes correctly
will produce various interesting (but nonetheless incorrect!) results for the
second measure.

#### Pattern loop

<table><tr>
  <td><b>10.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td>dumb</td>
  <td><del>libmodplug</del></td>
  <td><del>mikmod</del></td>
  <td><del>chibi</del></td>
  <td>bassmod</td>
  <td>ocp</td>
  <td><del>mikit</del></td>
  <td>xmp</td>
  <td><del>fmod</del></td>
</tr></table>

The pattern loop effect is quite complicated to handle, especially when dealing
with multiple channels. Possibly the most important fact to realize is that *no
channel's pattern loop affects any other channel* — each loop's processing
should be entirely contained to the channel the effect is in.

Another trouble spot that some players have is dealing correctly with strange
situations such as two consecutive loopback effects, e.g.:

    000 | ... .. .. SB0
    001 | ... .. .. SB1
    002 | ... .. .. SB1
    003 | ... .. .. .00

To prevent this from triggering an infinite loop, Impulse Tracker sets the
loopback point to the next row after the last SBx effect. This, the player flow
for the above fragment should be 0, 1, 0, 1, 2, 2, 3.

Another point to notice is when a loop should finish if two channels have SBx
effects on the same row:

    000 | ... .. .. SB0 | ... .. .. SB0
    001 | ... .. .. SB1 | ... .. .. SB2

What should happen here is the rows continue to loop as long as ANY of the
loopback counters are nonzero, or in other words, the least common multiple of
the total loop counts for each channel. In this case, the rows will play six
times — two loops for the first channel, and three for the second.

When correctly played, this test should produce a drum beat, slightly
syncopated. The entire riff repeats four times, and should sound the same all
four times.

#### Infinite loop exploit

<table><tr>
  <td><b>11.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td><del>dumb</del></td>
  <td>libmodplug</td>
  <td>mikmod</td>
  <td>chibi</td>
  <td>bassmod</td>
  <td>ocp</td>
  <td>mikit</td>
  <td>xmp</td>
  <td>fmod</td>
</tr></table>

*(__Note:__ on this test, "fail" status is given for players which deadlock
while loading or calculating the duration, and is not based on actual playback
behavior. Incidentally, this will cause Impulse Tracker to freeze.)*

This is a particularly evil pattern loop setup that exploits two possible
problems at the same time, and it will very likely cause any player to get
"stuck".

The first problem here is the duplicated loopback effect on the first channel;
the correct way to handle this is discussed in the previous test. The second
problem, and quite a bit more difficult to handle, is the seemingly strange
behavior after the third channel's loop plays once. What happens is the second
SB1 in the first channel "empties" its loopback counter, and when it reaches
the first SB1 again, the value is reset to 1. However, the second channel
hasn't looped yet, so playback returns to the first row. The next time around,
the *second* channel is done, but the *first* one needs to loop again —
creating an infinite loop situation. Even Impulse Tracker gets snagged by this.

#### Tremor effect

<table><tr>
  <td><b>12.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td>dumb</td>
  <td><del>libmodplug</del></td>
  <td><del>mikmod</del></td>
  <td><del>chibi</del></td>
  <td><del>bassmod</del></td>
  <td><del>ocp</del></td>
  <td><del>mikit</del></td>
  <td><del>xmp</del></td>
  <td><del>fmod</del></td>
</tr></table>

Tremor is probably one of the least predictably implemented effects. Every
player seems to have a different idea of what it's supposed to do. Rather than
try to explain every player's implementation and risk confusing things even
further, we'll simply stick with describing what Impulse Tracker does.

Like many other effects, tremor has an effect memory. This memory stores both
the "on" AND "off" values at once — *they are not saved independently*.

Also, when tremor is given a zero on- or off-value, that value is handled as
*one tick* instead. That is, I03 plays the same way as I13: play for one tick,
off for three.

Another potential snag is what happens when the note is "off" when the row
changes and the new row does not have a tremor effect. In this case, the volume
is always restored to normal, and the next time the effect is used, the
off-tick counter picks up right where it left off.

Finally, the *only* time the current tremor counts are reset is when the
playback is interrupted. Otherwise, the only part of the player code that
should even *touch* these values is the tremor effect handler, and it only ever
*decreases* the values... well, until they hit zero, at that point they are
obviously reset; but also note, the reset is independent for the on-tick and
off-tick counters.

When this test is played correctly, both notes should play at exactly the same
intervals.

#### Tremor with old effects

<table><tr>
  <td><b>13.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td>dumb</td>
  <td><del>libmodplug</del></td>
  <td><del>mikmod</del></td>
  <td><del>chibi</del></td>
  <td><del>bassmod</del></td>
  <td><del>ocp</del></td>
  <td><del>mikit</del></td>
  <td><del>xmp</del></td>
  <td><del>fmod</del></td>
</tr></table>

Just when you think you've figured out tremor, guess what – it's even more
annoying. With Old Effects enabled, all *non-zero* values are incremented, so
I40 with old effects means play for five ticks, and turn off for one; I51 means
play for six and off for two.

When this test is played correctly, both notes should play at exactly the same
intervals.

#### Ping-pong loop and sample number

<table><tr>
  <td><b>14.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td>dumb</td>
  <td><del>libmodplug</del></td>
  <td>mikmod</td>
  <td>chibi</td>
  <td>bassmod</td>
  <td><del>ocp</del></td>
  <td>mikit</td>
  <td>xmp</td>
  <td>fmod</td>
</tr></table>

A lone sample number should not reset ping pong loop direction.

In this test, the sample should loop back and forth in both cases. If the
sample gets "stuck", check that the player is not touching the loop direction
unnecessarily.

#### Retrigger

<table><tr>
  <td><b>15.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td>dumb</td>
</tr></table>

The retrig effect, in theory, should create an internal counter that decrements
from the "speed" value (the 'y' in Qxy) until it reaches zero, at which point
it resets. This timer should be unaffected by changes in the retrig speed –
that is, beginning a retrig and then changing the speed prior to the next
retrig point should not affect the timing of the next note. Additionally,
retrig is entirely independent of song speed, and the counter should reset when
a new note is played.

The bassdrum and snare should be perfectly in sync in both pattern 0 and
pattern 1.

The bassdrum sample in pattern 0 uses a silent loop at the end. This is a
workaround for Impulse Tracker's behavior of ignoring the retrig effect if no
note is currently playing in the channel. Some people seem to have
misinterpreted this, coming to the conclusion that retrig values greater than
the song speed are ignored.

Pattern 1 tests to make sure this behaviour is handled correctly - this pattern
uses a bassdrum sample without a silent loop at the end, and if the retrig
effect _isn't_ ignored there will be some errant bassdrum hits caused by the
sample retriggering despite having ended.

#### Global volume

<table><tr>
  <td><b>16.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td><del>dumb</del></td>
  <td><del>libmodplug</del></td>
  <td><del>mikmod</del></td>
  <td><del>chibi</del></td>
  <td><del>bassmod</del></td>
  <td>ocp</td>
  <td>mikit</td>
  <td><del>xmp</del></td>
  <td><del>fmod</del></td>
</tr></table>

This test checks the overall handling of the global volume (Vxx) and global
volume slide (Wxx) effects. If played properly, both notes should fade in from
silence to full volume, back to silence, and then fade in and out a second
time. (Note that the volume should be fading to and from *maximum*, i.e. two
W80 effects at speed 9 should change the volume from 0 to 128.)

If the notes start at full volume instead of fading in, the V80 in channel 2 is
probably overriding the V00 in channel 3 on the first row. Similarly, if the
volume is suddenly cut on row 4, the V00 is probably incorrectly taking
precedence over the V80. Generally, for effects that alter global state, the
highest-numbered channel takes precedence.

Since two W80 effects at speed 9 raise the volume from zero to the maximum of
128, the V80 on row 3 should not have any effect on the volume.

Also, there are two spurious volume effects in channel 3, on rows 7 and 11.
Both of these effects should be *ignored* as out-of-range data, not clamped to
the maximum (or minimum!) volume.

Finally, the previous value for the global volume slide effect is saved per channel. If the volume fades in and out, and does not fade back in, it is almost certainly because separate global volume slide parameters are not stored for each channel.

#### Pattern row delay

<table><tr>
  <td><b>17.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td><del>dumb</del></td>
  <td><del>libmodplug</del></td>
  <td><del>mikmod</del></td>
  <td><del>chibi</del></td>
  <td><del>bassmod</del></td>
  <td><del>ocp</del></td>
  <td><del>mikit</del></td>
  <td><del>xmp</del></td>
  <td><del>fmod</del></td>
</tr></table>

Impulse Tracker has a slightly idiosyncratic way of handling the row delay and
note delay effects, and it's not very clearly explained in
[ITTECH.TXT](ITTECH.TXT). In fact, row delay *is* mentioned briefly, albeit in
a rather obscure manner, and it's easy to glance over it. Considering this, it
comes as no surprise that this is one of the most strangely and hackishly
implemented behaviors, so much that pretty much everyone has written it off as
an IT replayer bug.

In fact, it's not really a bug, just another artifact of the way Impulse
Tracker works. See, row delay doesn't touch the tick counter at all; it sets
its own counter, which the outer loop uses to repeat the row without processing
notes. The difference seems obscure until you try to replicate the retriggering
behavior of SEx on the same row with SDx. SDx, of course, operates on all ticks
except the first, and SEx repeats a row without handling the first tick, so the
notes and first-tick effects only happen once, while delayed notes play over
and over as many times as the SEx effect says.

Sound weird? Not really. As I said, it's even mentioned in ITTECH.TXT. Check
[the flowchart under "Effect Info"](ITTECH.TXT#effect-info), and look at the
words "Row counter". This particular variable just says how many times the row
plays (without replaying notes) before moving to the next row. That's all. You
just play the row more than once.

The other quirk is how to handle more than one SEx value on the same row. This
is a bit weird, but also straightforward; the first SEx always takes
precedence, no matter what. SE0 means play the row only once, SE1 means play it
twice, etc.

This test plays sets of alternating bassdrum and snare, followed by a short
drum loop. In the first part, the bassdrum should play 2, 1, 7, 5, 1, and 5
times before each respective snare drum.

#### Sample number causes new note

<table><tr>
  <td><b>18.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td>dumb</td>
  <td><del>libmodplug</del></td>
  <td><del>mikmod</del></td>
  <td><del>chibi</del></td>
  <td>bassmod</td>
  <td><del>ocp</del></td>
  <td>mikit</td>
  <td>xmp</td>
  <td><del>fmod</del></td>
</tr></table>

A sample number encountered when no note is playing should restart the last
sample played, and at the same pitch. Additionally, a note cut should clear the
channel's state, thereby disabling this behavior.

This song should play six notes, with the last three an octave higher than the
first three.

#### Random waveform

<table><tr>
  <td><b>19.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td><del>dumb</del></td>
  <td><del>libmodplug</del></td>
  <td><del>mikmod</del></td>
  <td>chibi</td>
  <td>bassmod</td>
  <td><i>ocp</i></td>
  <td><del>mikit</del></td>
  <td><del>xmp</del></td>
  <td><del>fmod</del></td>
</tr></table>

The random waveform for vibrato/tremolo/panbrello should *not* use a static
lookup table, but should be based on some form of random number generator.
Particularly, each playing channel should have a different value sequence.

Correct playback of this song should result in three stereo effects. It might
also be helpful to view the internal player variables in Impulse/Schism
Tracker's info page detail view (page up from the sample VU meters).

*Apparently OpenCP doesn't implement Yxx.*

#### Pan swing and set panning effect

<table><tr>
  <td><b>20.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td><del>dumb</del></td>
  <td><del>libmodplug</del></td>
  <td>mikmod</td>
  <td>chibi</td>
  <td>bassmod</td>
  <td><del>ocp</del></td>
  <td>mikit</td>
  <td><del>xmp</del></td>
  <td><del>fmod</del></td>
</tr></table>

A couple of brief notes about instrument pan swing:

- All of the values are calculated with a range of 0-64.
- Values out of the 0-64 range are clipped.
- The swing simply defines the amount of variance from the current panning value.

Given all of this, a pan swing value of 16 with a center-panned (32) instrument
should produce values between 16 and 48; a swing of 32 with full right panning
(64) will produce values between 0 -- technically -32 -- and 32.

However, when a set panning effect is used along with a note, it should
override the pan swing for that note.

This test should play sets of notes with:

- Hard left panning
- Left-biased random panning
- Hard right panning
- Right-biased random panning
- Center panning with no swing
- Completely random values

#### Pitch slide limits

<table><tr>
  <td><b>21.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td>dumb</td>
  <td><del>libmodplug</del></td>
  <td>mikmod</td>
  <td>chibi</td>
  <td>bassmod</td>
  <td>ocp</td>
  <td>mikit</td>
  <td><del>xmp</del></td>
  <td>fmod</td>
</tr></table>

Impulse Tracker always increases (or decreases, of course) the pitch of a note
with a pitch slide, with no limit on either the pitch of the note or the amount
of increment.

An odd side effect of this test is the harmonic strangeness resulting from
playing frequencies well above the Nyquist frequency. Different players will
seem to play the notes at wildly different pitches depending on the
interpolation algorithms and resampling rates used. Even changing the mixer
driver in Impulse Tracker will result in different apparent playback. The
important part of the behavior (and about the only thing that's fully
consistent) is that the frequency is changed at each step.

#### Zero value for note cut and note delay

<table><tr>
  <td><b>22.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td>dumb</td>
  <td><del>libmodplug</del></td>
  <td><del>mikmod</del></td>
  <td><del>chibi</del></td>
  <td><del>bassmod</del></td>
  <td><del>ocp</del></td>
  <td><del>mikit</del></td>
  <td>xmp</td>
  <td><del>fmod</del></td>
</tr></table>

Impulse Tracker handles SD0 and SC0 as SD1 and SC1, respectively. (As a side
note, Scream Tracker 3 ignores notes with SD0 completely, and doesn't cut notes
at all with SC0.)

If these effects are handled correctly, the notes on the first row should
trigger simultaneously; the next pair of notes should *not*; and the final two
sets should both play identically and cut the notes after playing for one tick.

####  Portamento with no note

<table><tr>
  <td><b>23.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td>dumb</td>
  <td><del>libmodplug</del></td>
  <td><del>mikmod</del></td>
  <td><del>chibi</del></td>
  <td><del>bassmod</del></td>
  <td><del>ocp</del></td>
  <td><del>mikit</del></td>
  <td><del>xmp</del></td>
  <td>fmod</td>
</tr></table>

Stray portamento effects with no target note should do nothing. Relatedly, a
portamento should clear the target note when it is reached.

The first section of this test should first play the same increasing tone three
times, with the last GFF effect *not* resetting the note to the base frequency;
the next part should play two rising tones at different pitches, and finish an
octave lower than it started.

####  Short envelope loops

<table><tr>
  <td><b>24.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td><del>dumb</del></td>
  <td><del>libmodplug</del></td>
  <td><del>mikmod</del></td>
  <td>chibi</td>
  <td>bassmod</td>
  <td>ocp</td>
  <td>mikit</td>
  <td><del>xmp</del></td>
  <td>fmod</td>
</tr></table>

Envelope loops should include both of the loop points. Each instrument in this
test should play differently: first with no envelope, then a stuttering effect,
a rapid left/right pan shift, and finally an arpeggio effect.

#### Portamento and pitch slide

<table><tr>
  <td><b>25.</b></td>
  <td>schism</td>
  <td>openmpt</td>
  <td>xmplay</td>
  <td>dumb</td>
  <td><del>libmodplug</del></td>
  <td><del>mikmod</del></td>
  <td><del>chibi</del></td>
  <td><del>bassmod</del></td>
  <td><del>ocp</del></td>
  <td><del>mikit</del></td>
  <td><del>xmp</del></td>
  <td><del>fmod</del></td>
</tr></table>

The first two segments of this test should both play identically, with a slight
downward slide followed by a faster slide back up, and then remain at the
starting pitch. The third and fourth are provided primarily for reference for
possible misimplementations. (The third slides down and then continually rises;
the fourth slides down slightly and then plays a constant pitch.)

If the first and third segment are identical, then either Fx and Gxx aren't
sharing their values, or the Fx values aren't being multiplied (volume column
F1 should be equivalent to a "normal" F04).

Impulse Tracker generally initializes effect parameters, effect working memory and similar stuff once per row, before the effects actually run. When using (tone) portamento commands simulatenously in the effect column and volume column, this can lead to the surprising results observed in this test, and in order to emulate them correctly, it is crucial to implement the effect memory initialization in the exact same order as Impulse Tracker does:

1. Evaluate effect column Gxx parameter
2. Evaluate volume column gx parameter
3. Evaluate volume column ex / fx parameter
4. Evaluate effect column Exx / Fxx parameter

Then run the effects with these evaluated parameters, and don't evaluate them again.

## Application versions tested

For reference, the above results were tested with:

- Schism Tracker 20241013
- OpenMPT 1.32.00.27
- XMPlay 3.8.2.3
- DUMB 0.9.3
- libmodplug 0.8.7 (Linux GStreamer plugin)
- MikMod 3.2.2-beta1
- Chibi Tracker 1.3
- BASSMOD 2.0-Linux
- Open Cubic Player 0.1.17
- MikIT 1.00-Linux
- XMP 3.2.0
- FMOD Ex 4.24.07

If you would like to submit test results for a newer version of a player,
download the tarball linked at the bottom of this page and run the test suite
on whatever version of the player you currently have (preferably the latest
stable version).

## Version history

- 20050522: First release
- 20050525: Added test #12
- 20050527: Added test #13
- 20090516: Added tests #14 and #15
- 20090613: Added test #16
- 20090618: Added test #17
- 20090711: Removed test #13 (everything plays arpeggios right, don't remember
	why I added this); *changed* #15 to check Q00 with no prior value; and added
	tests #18 through #24
- 20090720: Modified #6 to do what it was supposed to do in the first place;
	made #23 somewhat more thorough; replaced #13 with a new test; added #25
- 20090801: Modified #1 to check that arpeggio is still set if no note was
	playing; added more stuff to #3 and #4; replaced #13 again.
- 20160513: Modified #15 to also check that retrig effect is correctly ignored
	if sample playback has ended.
- 20241013: Files were resaved in Impulse Tracker 2.14, so that trackers that support emulation of old Schism Tracker quirks don't play the files like Schism Tracker 0.50 would.

## External links

- [Download](files/player-abuse-tests.zip)
- [More test cases](https://wiki.openmpt.org/Development:_Test_Cases/IT) from the OpenMPT test case library
- [tracker_notes.txt from xmp](https://sourceforge.net/p/xmp/libxmp/ci/master/tree/docs/tracker_notes.txt)
	- lots of notes comparing playback of different trackers

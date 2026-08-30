#### Is it possible to sync Schism Tracker to a midi clock, or sync something else to Schism Tracker?

Schism Tracker currently responds to MIDI Start, Continue, Stop, and Reset
messages by starting/stopping the song. However, Schism Tracker does not
respond to MIDI clock tick events, nor does it broadcast its own ticks. This is
somewhat tricky to implement, since tracked modules generally have a very
different concept of speed and tempo from MIDI, and most effects are dependent
on the song's speed.

Note: if all you want to do is record live MIDI into patterns, try Ctrl-Z on
the pattern editor. This turns on a MIDI-trigger mode that starts the
song/pattern and enables playback tracing when a MIDI note is received.

#### I'm a Linux console junkie. Can I use Schism Tracker without starting up X11?

Sure! If you set up a console framebuffer, it should run just fine. Try adding
`vga=768` to your boot line for a 640x400 video mode with 80x25 text and no
letterboxing effect. (This doesn't work on all video cards, unfortunately.)

#### My Mac is missing a bunch of keys! How do I use Insert, Delete, etc.?

[DoubleCommand](http://doublecommand.sourceforge.net/) might be of interest to
you. Also, if your keyboard has a "Fn" key, you can use that along with
backspace and the arrow keys to get Home, End, Page Up/Down, and Del. Use "Fn"
and M (which is 0) for Insert key! Scroll Lock is additionally mapped to
Ctrl-F, and the normal + - * / keys *should* work identically to the ones on
the number pad.

Various reports have suggested that the Insert key might also be tucked away
under Fn-Shift-M, Fn-0 (that's zero), or Fn-Return.

Of course, the easiest answer is to get a cheap USB keyboard and use it
instead.

#### Can I load my `font.cfg` file from my Impulse Tracker folder?

Not really, no. There's a [config option](https://github.com/schismtracker/schismtracker/blob/master/docs/configuration.md)
to change the font file, but it's limited to within Schism Tracker's settings
directory. It might be possible to "trick" it, e.g.
`font=../../../../../../../../dos/it214/font.cfg`, but whether this sort of
hackery will actually work, and *continue* to work, is a crapshoot.

By the way, making the font editor respect the default font is on my personal
TODO list.

#### What file formats does Schism Tracker recognize?

Use the Source, Luke! Check near the bottom of [include/fmt-types.h](https://github.com/schismtracker/schismtracker/blob/master/include/fmt-types.h)
for a list of each file format.

(And yes, I recognize that this is a completely lame answer, and plan to make a
cute little table of supported file types in the future.)

#### That sample display is so tiny it's useless! How do you set a loop point with something that small?

That paintbrush is so quiet it's useless! How do you expect to paint a picture
with something that quiet?

(Or more seriously: stop looking and start listening. Make a rough guess, type
it in, play the sample, and use the + and - keys to adjust until it sounds
good. Works great, and with practice you can get really fast at it. I usually
take less than ten seconds setting a sample loop.)

#### I want to draw samples! I can't believe Schism Tracker doesn't have any kind of sample editor!

Tell the Milky Tracker guys to add NNAs ;)

Alternate answer: press Alt-Y and type some stuff. (No, it's still not sample
drawing, but it's just about as useful for generating a "throwaway" sample.)

#### Why would anyone ever use Schism Tracker? (Renoise, OpenMPT, Logic, Ableton, LSDJ) is so much better!

Well, the good news is no one's forcing you to use Schism Tracker. Most of us
who use the IT/ST3 style trackers use them because we're most comfortable and
productive with this style. VST effects and shiny gradients aren't everything,
you know.

A lot of people unfamiliar with the IT way of thinking don't "get" the
interface at first, and are turned off by the multitude of highly nonstandard
keyboard shortcuts. It's often described as unintuitive and outdated. And
really? That's fine! There are tons of trackers out there, and *one of them* is
bound to be the right one for you. Maybe that right one is Schism Tracker;
maybe it isn't. The world would be a boring place indeed if there was only one
tracker.

If you give it some time and *learn* the interface – admittedly a daunting task
– it becomes apparent that it is a very efficient and comfortable way to work,
and lot of thought was put into the design. This isn't really apparent at a
glance, especially if you try to take knowledge of other applications and try
to fit it into Schism Tracker. It's a round peg in a square hole, keys like
Ctrl-C and Ctrl-V definitely do not do what you "want" them to do. (I must
admit, I have the opposite problem sometimes: after a lengthy tracking session
I find myself trying to press Alt-L Alt-C to select all and copy, or press
F2/F3/F4 in a web browser expecting to switch tabs. :)

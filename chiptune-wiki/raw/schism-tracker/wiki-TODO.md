[Storlek](https://bitbucket.org/Storlek/) has a huge file (around 1000 lines)
listing a ton of features that need to be implemented, bugs to be fixed, notes
about specific file formats, platforms, etc. etc. etc. Eventually, this file
will be imported into some sort of proper bug tracker.

Meanwhile, here are a few highlights:

- **Figure out how much of this list is actually up-to-date and add [GitHub
	issues](https://github.com/schismtracker/schismtracker/issues) for the
	outstanding items**
- Fix keyjazz on the instrument list so it plays chords properly
- Fix undo on the pattern editor
- Fix adlib "folding" (see
	[here](http://rigelseven.com/dl/schism-files/sc/12752468805652909.png)
	for illustration of this)
- Better handling of stereo samples (loading only left or right are somewhat
	deficient at the moment)
- Add some sort of undo to the sample list
- Multi-file diskwrite split by *instrument*
- Various enhancements to MIDI support, especially in respect to MIDI input on
	the pattern editor
- Some more obscure instrument-list functions are still unimplemented or
	half-implemented
- ToastyX has been complaining about the volume apparently being very different
	on OS X than elsewhere. I can't confirm this and other people haven't had the
	same problem.
- Handle multiple sound cards in a sensible manner, maybe with a device
	selection list on Shift-F5
- Add a generic "list" widget type, and rewrite all lists to use it
- Rewrite the widget drawing code to support true resizing, instead of just
	scaling the window (but still permit scaling)

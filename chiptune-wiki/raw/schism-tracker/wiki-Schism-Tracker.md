Schism Tracker is a free and open-source reimplementation of [Impulse
Tracker](Impulse%20Tracker), a program used to create high quality music
without the requirements of specialized, expensive equipment, and with a unique
"finger feel" that is difficult to replicate in part. The player is based on a
highly modified version of the [Modplug](https://openmpt.org/legacy_software)
engine, with a number of bugfixes and changes to [improve IT
playback](Player%20abuse%20tests).

Where Impulse Tracker was limited to i386-based systems running MS-DOS, Schism
Tracker runs on almost any platform that [SDL](https://www.libsdl.org/index.php) 
supports. Currently builds are provided for Linux, Mac OS X, and Windows. Most 
development is currently done on 64-bit Linux. Schism will most likely build on
_any_ architecture supported by GCC4 (e.g. alpha, m68k, arm, etc.) but it will 
probably not be as well-optimized on many systems.

## Download

- [Git snapshot](https://github.com/schismtracker/schismtracker/archive/master.zip)
	- Straight from the
		[repository](https://github.com/schismtracker/schismtracker)
- [Windows, OS X, and Linux
	builds](https://github.com/schismtracker/schismtracker/releases)
  - Built from the latest release from this repository

Some older builds are available for other platforms:

- (2016) [FreeBSD](http://www.freshports.org/audio/schism/)
- (2015) [Gentoo ebuild](https://web.archive.org/web/20150222131851/http://schismtracker.org/wiki/Gentoo%20ebuild)
- (2010) [Pandora](http://apps.open-pandora.org/cgi-bin/viewapp.pl?/Application/schismtracker.inf)

## Development

The bleeding-edge current source can be downloaded with Git:

    git clone https://github.com/schismtracker/schismtracker.git

Those interested in development can also point a web browser at [the
repository](https://github.com/schismtracker/schismtracker) to browse the
source tree, change logs, etc.

You may also want to peruse [the build notes for various
platforms](https://github.com/schismtracker/schismtracker/blob/master/docs).

## Requirements

For merely running the program, the above packages should be all you need. If
you are building from source, you will need the following:

- [GCC](http://gcc.gnu.org/) 4.x or newer, [Clang](http://clang.llvm.org/), or [OpenWatcom v2](https://github.com/open-watcom/open-watcom-v2). Other compilers will likely work as well, but these are the most tested.
- [SDL](http://www.libsdl.org/). Development is done with SDL 1.2, SDL 2, and SDL 3.
- Recent versions of [autoconf](http://www.gnu.org/software/autoconf/) and [automake](http://www.gnu.org/software/automake/).

## See also

- [Frequently Asked Questions](Frequently%20Asked%20Questions)
- [What to do if it breaks](Reporting%20bugs)
- [Hidden config file tweaks](https://github.com/schismtracker/schismtracker/blob/master/docs/configuration.md)
- [TODO list](TODO)
- [Contributions](Contributions)
- [Links](Links)

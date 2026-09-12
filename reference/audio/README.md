# Reference — Beryl's recordings

The masters. Three phone recordings made at the real car, kept here so the game
clips can be recut without going back out to the garage:

| file | what it is | length |
|---|---|---|
| `beryl-front.aac` | the engine from in front of the car | 33.3 s |
| `beryl-rear.aac` | the engine from behind, near the exhaust | 30.3 s |
| `beryl-horn.aac` | several presses of the horn | 20.5 s |

All three are 48 kHz stereo AAC. They are **not** loaded by the game: what ships
is three short mono WAVs in `public/assets/`, cut from these.

## What was cut, and why there

The engine loops are the fiddly ones. A loop has to be taken from a passage
where the revs are steady — a loop that drifts in pitch wobbles once per lap of
the buffer, and the ear finds that immediately — and it has to be a whole number
of firing cycles long, or the join beats against itself.

So each recording was tracked for firing frequency by autocorrelation, the
steadiest passage found by correlating a candidate loop's head against every
possible tail, and the join wrapped by crossfading the 140 ms *after* the loop
into the 140 ms at its start. That last step is what makes the buffer joinable
at all: the last sample runs straight into the first with no step, because the
first 140 ms *is* the material that follows the last.

| clip | source | from | length | measured firing rate | join |
|---|---|---|---|---|---|
| `beryl-engine-front.wav` | `beryl-front.aac` | 1.50 s | 2.8636 s | 74.51 Hz ≈ 2235 rpm | 0.950 |
| `beryl-engine-rear.wav` | `beryl-rear.aac` | 21.00 s | 4.1479 s | 82.63 Hz ≈ 2479 rpm | 0.997 |
| `beryl-horn.wav` | `beryl-horn.aac` | 14.45 s | 0.77 s | 315 Hz fundamental | — |

"Join" is the correlation between the material either side of the seam, in the
engine band. Anything under about 0.9 is audible as a lurch once per loop.

Two firings per revolution of a four, hence the rpm. Those two numbers are in
`src/audio/engineVoices.js` as `FRONT_FIRING_HZ` and `REAR_FIRING_HZ`, and they
are how playback rate is worked out — recut a loop from somewhere else in the
recording and its reference frequency moves with it, so change both together or
the whole rev range is transposed.

### Length, and why these are not the shortest good loops

The first cut of these was half the length: 1.87 s and 1.72 s, both from the
steadiest passages either recording has. They were seamless and they were dull,
because a two-second loop announces itself — you hear the same second of engine
thirty times a minute and the ear files it as a machine.

So the search was re-run for the longest passage that still joins, scored on
join quality *and* on the two ends matching in level, and it found much better
ones. The rear loop is now 4.15 s and joins at 0.997 with its ends 0.1 dB apart;
the front is 2.86 s at 0.950. The two lengths are deliberately unrelated —
4.1479 / 2.8636 is nothing like a simple ratio — so the layers only come back
into step about every thirty-seven seconds.

The front loop also keeps a 4 dB swell in the middle of it rather than being
flattened out. Evenness is what a loop is bad at; the variation is the point.

The horn was taken from the fourth press in the recording: the cleanest one,
with silence either side. It has a 6 ms fade in so that retriggering it cannot
click.

That press is 1.13 s long and the clip is 0.77 s, which is not a trim: cutting
the end off a horn removes the release, and a horn that stops dead sounds like
a sample running out rather than like a button being let go. So the note is
shortened in the middle and the real release spliced back on — 0.50 s of held
note, then the 0.285 s from 15.295 s where the driver actually lifts their
hand. The splice is phase-aligned against the sustain (a 315 Hz tone joined out
of phase cancels into an audible dip) and crossfaded over 15 ms; the largest
sample-to-sample step in the result is identical to the largest in the
untouched press, and it is in the attack, not at the joint.

Processing, in order: trim, 28 Hz highpass (80 Hz for the horn), gain to a mean
of −14 dBFS for both engine loops so the two layers balance against each other
in code, downmix to mono, resample to 22.05 kHz, wrap the loop.

The highpass is at 28 Hz rather than the 45 Hz of the first cut because a four
has a strong once-per-revolution component — 41 Hz on the rear loop, half its
firing rate — and that is the lump in a slow engine's idle. There is almost
nothing below it: highpassing at 45 Hz instead changes the level of either clip
by 0.2 dB, so the only thing it was removing was the character.

## Why WAV

mp3 and AAC both carry encoder delay and padding, and `decodeAudioData` turns
that into silence at the head and tail of the decoded buffer. On a one-shot that
is inaudible; on a loop it is a gap in the middle of the engine note every 1.8
seconds. WAV has no such thing. Mono at 22.05 kHz keeps all three under 210 kB
together, against 3.5 MB for the music.

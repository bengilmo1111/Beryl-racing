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

| clip | source | from | length | measured firing rate |
|---|---|---|---|---|
| `beryl-engine-front.wav` | `beryl-front.aac` | 28.20 s | 1.8703 s | 77.33 Hz ≈ 2320 rpm |
| `beryl-engine-rear.wav` | `beryl-rear.aac` | 3.60 s | 1.7170 s | 74.93 Hz ≈ 2248 rpm |
| `beryl-horn.wav` | `beryl-horn.aac` | 14.45 s | 1.13 s | 315 Hz fundamental |

Two firings per revolution of a four, hence the rpm. Those two numbers are in
`src/audio/engineVoices.js` as `FRONT_FIRING_HZ` and `REAR_FIRING_HZ`, and they
are how playback rate is worked out — recut a loop from somewhere else in the
recording and its reference frequency moves with it, so change both together or
the whole rev range is transposed.

The horn was taken from the fourth press in the recording: the cleanest one,
with silence either side. It has a 6 ms fade in and a 70 ms fade out so that
retriggering it cannot click.

Processing, in order: trim, 45 Hz highpass (30 Hz for the horn's own 80 Hz
highpass), gain to a mean of −14 dBFS for the engine loops so the two layers
balance against each other in code, downmix to mono, resample to 22.05 kHz,
wrap the loop.

## Why WAV

mp3 and AAC both carry encoder delay and padding, and `decodeAudioData` turns
that into silence at the head and tail of the decoded buffer. On a one-shot that
is inaudible; on a loop it is a gap in the middle of the engine note every 1.8
seconds. WAV has no such thing. Mono at 22.05 kHz keeps all three under 210 kB
together, against 3.5 MB for the music.

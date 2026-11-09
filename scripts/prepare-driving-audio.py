#!/usr/bin/env python3
"""Cut the supplied Morris Minor driving master. Requires numpy and scipy.

Usage: python scripts/prepare-driving-audio.py /path/to/V0d03d64399913477c1bb.wav
The large master stays outside the shipped game; provenance is saved alongside
its existing audio references. No source audio is overwritten.
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from scipy import signal
from scipy.io import wavfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
sr, raw = wavfile.read(args.source)
if sr != 96000 or raw.ndim != 2 or raw.shape[1] != 4 or raw.dtype != np.int32:
    raise ValueError('Expected the supplied 96 kHz, four-channel, 24-bit PCM master')
# Channel 1 has the strongest engine harmonics. Other channels contain more
# broadband vibration relative to the engine; averaging them would dilute it.
rate = 22050
start = 27.5
region = raw[int(26.5 * sr):int(33 * sr), 0].astype(np.float64) / 2147483648
region = signal.resample_poly(region, 147, 640)
region = signal.sosfiltfilt(signal.butter(2, 45, 'highpass', fs=rate, output='sos'), region)
region = signal.sosfiltfilt(signal.butter(2, 4800, 'lowpass', fs=rate, output='sos'), region)
offset = rate
width = round(.14 * rate)
# Find a phase-aligned tail near three seconds; compare the engine band and
# penalise a level change at the join. Keep the natural variation in between.
band = signal.sosfiltfilt(signal.butter(2, [80, 900], 'bandpass', fs=rate, output='sos'), region)
head = band[offset:offset + width]
candidates = np.arange(round(2.9 * rate), round(3.5 * rate))
tail_corr = signal.correlate(band[offset + candidates[0]:offset + candidates[-1] + width], head, mode='valid', method='fft')
power = np.convolve(band**2, np.ones(width), mode='valid')
corr = tail_corr / np.sqrt(np.dot(head, head) * power[offset + candidates])
level_ratio = np.sqrt(power[offset + candidates] / np.dot(head, head))
score = corr - .2 * abs(np.log(level_ratio))
length = int(candidates[np.argmax(score)])
y = region[offset:offset + length].copy()
# The wrapped head begins exactly where the tail would continue. Raised cosine
# fades have zero slope at their ends, avoiding a click at either boundary.
w = .5 - .5 * np.cos(np.linspace(0, np.pi, width))
y[:width] = region[offset + length:offset + length + width] * (1 - w) + y[:width] * w
y *= min(10**(-14/20) / np.sqrt(np.mean(y*y)), .94 / np.max(abs(y)))
# Measure the actual dominant firing line, with sub-bin interpolation.
f, p = signal.welch(y, rate, nperseg=len(y), nfft=rate * 8)
ids = np.where((f > 110) & (f < 125))[0]
k = int(ids[np.argmax(p[ids])])
q = np.log(p[k-1:k+2])
adjust = .5 * (q[0] - q[2]) / (q[0] - 2*q[1] + q[2])
firing = float(f[k] + adjust * (f[1] - f[0]))
asset = root / 'public/assets/beryl-engine-driving.wav'
wavfile.write(asset, rate, np.round(y * 32767).astype(np.int16))
metadata = dict(source=args.source.name, source_sha256=hashlib.sha256(args.source.read_bytes()).hexdigest(), channel=1,
                start_seconds=start, duration_seconds=length/rate, firing_hz=round(firing, 3),
                inferred_rpm=round(firing*30), join_correlation=round(float(corr[np.argmax(score)]),4),
                rms_dbfs=round(float(20*np.log10(np.sqrt(np.mean(y*y)))),2), peak=round(float(max(abs(y))),4),
                sample_rate=rate, asset=asset.name)
(root / 'reference/audio/beryl-driving-loop.json').write_text(json.dumps(metadata, indent=2) + '\n')
print(json.dumps(metadata, indent=2))

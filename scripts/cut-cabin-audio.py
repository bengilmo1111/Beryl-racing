"""Rebuild the driving loop. Requires ffmpeg, NumPy and SciPy."""
from pathlib import Path
import subprocess
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfiltfilt

ROOT = Path(__file__).resolve().parents[1]
SR = 22050
raw = subprocess.check_output([
    'ffmpeg', '-v', 'error', '-i', str(ROOT / 'reference/audio/morris-minor-cabin.flac'),
    '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-',
])
x = np.frombuffer(raw, dtype='<f4').astype(float)
# Remove the cabin mic's low-frequency road rumble, preserve engine harmonics.
x = sosfiltfilt(butter(2, 70, 'highpass', fs=SR, output='sos'), x)
x = sosfiltfilt(butter(2, 4500, 'lowpass', fs=SR, output='sos'), x)
# A steady cruise, rather than baking an acceleration/gearchange into every lap.
start = round(27.0 * SR)
fade = round(0.14 * SR)
head = x[start:start + fade]
# Find a phase-aligned tail in the same steady passage.
best = (-np.inf, 0)
for length in range(round(3.0 * SR), round(4.0 * SR)):
    tail = x[start + length:start + length + fade]
    score = np.dot(head, tail) / (np.linalg.norm(head) * np.linalg.norm(tail))
    if score > best[0]:
        best = (score, length)
score, length = best
clip = x[start:start + length].copy()
# At wrap, the beginning continues directly from the original tail. Linear
# overlap keeps correlated engine pulses at constant gain.
w = np.linspace(0, 1, fade)
clip[:fade] = x[start + length:start + length + fade] * (1 - w) + head * w
clip *= min(0.16 / np.sqrt(np.mean(clip ** 2)), 0.85 / np.max(np.abs(clip)))
out = ROOT / 'public/assets/morris-minor-cabin.wav'
wavfile.write(out, SR, np.round(clip * 32767).astype(np.int16))
freq = np.fft.rfftfreq(length, 1 / SR)
spec = abs(np.fft.rfft(clip * np.hanning(length)))
sel = (freq > 110) & (freq < 125)
peak = freq[sel][np.argmax(spec[sel])]
print(f'{out.name}: start 27 s; length {length / SR:.6f} s; join {score:.4f}; firing {peak:.2f} Hz')
print(f'RMS {np.sqrt(np.mean(clip ** 2)):.4f}; peak {max(abs(clip)):.4f}; seam {abs(clip[-1] - clip[0]):.6f}')

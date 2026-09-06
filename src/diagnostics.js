// A bounded diagnostic trace, not a physics replay: normal scenery is unseeded.
export class DrivingTrace {
  constructor() { this.samples = []; }
  record(sample) {
    this.samples.push(structuredClone(sample));
    const cutoff = sample.timeMs - 20000;
    while (this.samples.length && (this.samples[0].timeMs < cutoff || this.samples.length > 6000)) {
      this.samples.shift();
    }
  }
  snapshot(metadata) {
    return structuredClone({ schemaVersion: 1, kind: 'beryl-driving-trace', ...metadata, samples: this.samples });
  }
}

export function installDrivingReport(scene, settings) {
  if (new URLSearchParams(location.search).get('playtest') !== '1') return null;
  const trace = new DrivingTrace();
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Report this moment';
  button.title = 'Download the last 20 seconds (F8). Attach the file in chat with what felt wrong.';
  button.style.cssText = 'position:absolute;bottom:12px;left:50%;transform:translateX(-50%);z-index:2000;padding:10px 14px;border:2px solid #15314b;border-radius:8px;background:#fff8e7;color:#15314b;font:600 14px sans-serif;cursor:pointer';
  const report = () => trace.snapshot({
    courseId: scene.def.id,
    build: typeof __BUILD_SHA__ === 'string' ? __BUILD_SHA__ : 'development',
    capturedAt: new Date().toISOString(),
    viewport: { width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio },
    settings, obstacles: scene.obstacles,
    note: 'State/input trace for diagnosis; not a deterministic replay. Add your description when sharing.',
  });
  const download = () => {
    const blob = new Blob([JSON.stringify(report())], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `beryl-${scene.def.id}-${Date.now()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    button.textContent = 'Saved — attach in chat';
  };
  const key = (event) => { if (event.code === 'F8' && !event.repeat) { event.preventDefault(); download(); } };
  button.addEventListener('click', download);
  window.addEventListener('keydown', key);
  document.getElementById('game').append(button);
  scene.events.once('shutdown', () => { button.remove(); window.removeEventListener('keydown', key); });
  return { trace, report };
}

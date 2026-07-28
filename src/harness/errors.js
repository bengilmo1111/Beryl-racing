export function captureHarnessErrors() {
  const entries = [];
  const record = (type, detail) => {
    entries.push({ type, detail: String(detail) });
  };

  const originalConsoleError = console.error;
  console.error = (...args) => {
    record(
      'console',
      args.map((value) => (value instanceof Error ? value.stack || value.message : value)).join(' ')
    );
    originalConsoleError.apply(console, args);
  };

  window.addEventListener('error', (event) => {
    const target = event.target;
    if (target && target !== window && (target.src || target.href)) {
      record('network', target.src || target.href);
      return;
    }
    record('error', event.error?.stack || event.message || 'Unknown window error');
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    record('unhandledrejection', event.reason?.stack || event.reason || 'Unknown rejection');
  });

  const NativeXHR = window.XMLHttpRequest;
  class HarnessXHR extends NativeXHR {
    open(method, url, ...rest) {
      this.__hUrl = url;
      return super.open(method, url, ...rest);
    }

    send(...args) {
      this.addEventListener('loadend', () => {
        if (this.status === 0 || this.status >= 400) {
          record('network', `${this.status || 'failed'} ${this.__hUrl || ''}`);
          return;
        }
        const url = String(this.__hUrl || '').split('?')[0].toLowerCase();
        const contentType = (this.getResponseHeader('content-type') || '').toLowerCase();
        const expectsImage = /\.(png|jpe?g|gif|webp|svg)$/.test(url);
        const expectsAudio = /\.(mp3|ogg|wav|m4a|aac)$/.test(url);
        if (
          (expectsImage && !contentType.startsWith('image/')) ||
          (expectsAudio && !contentType.startsWith('audio/'))
        ) {
          record(
            'network',
            `invalid-content-type ${contentType || 'missing'} ${this.__hUrl || ''}`
          );
        }
      });
      return super.send(...args);
    }
  }
  window.XMLHttpRequest = HarnessXHR;

  return {
    read: () => entries.map((entry) => ({ ...entry })),
    record,
  };
}

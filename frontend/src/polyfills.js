// src/polyfills.js – plain JS for reliable loading

window.global = window;
window.process = {
  env: { DEBUG: undefined, NODE_ENV: 'production' },
  browser: true
};

window.Buffer = require('buffer/').Buffer;

window.crypto = window.crypto || {};

// Stub Node built-ins
const stub = {
  Transform: class {},
  createHash: () => ({ update: () => ({}), digest: () => new Uint8Array() }),
  createHmac: () => ({ update: () => ({}), digest: () => new Uint8Array() }),
  randomBytes: (n) => new Uint8Array(n)
};

['stream', 'crypto', 'http', 'https', 'zlib'].forEach(name => {
  window[name] = stub;
});

// Readable stream
window.readableStream = require('readable-stream');
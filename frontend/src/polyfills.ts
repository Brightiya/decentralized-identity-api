// src/polyfills.ts

(window as any).global = window;
(window as any).process = require('process/browser');
(window as any).Buffer = require('buffer/').Buffer;

// Some libraries check for these
(window as any).setImmediate = setTimeout; // rough polyfill if needed
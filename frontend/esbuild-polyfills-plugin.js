import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** @type {import('esbuild').Plugin} */
const nodePolyfillsPlugin = {
  name: 'node-polyfills',
  setup(build) {
    // Redirect node builtins → browser polyfills
    build.onResolve({ filter: /^crypto$/ }, () => ({
      path: require.resolve('crypto-browserify'),
      external: false,
    }));

    build.onResolve({ filter: /^stream$/ }, () => ({
      path: require.resolve('stream-browserify'),
      external: false,
    }));

    build.onResolve({ filter: /^http$/ }, () => ({
      path: require.resolve('stream-http'),
      external: false,
    }));

    build.onResolve({ filter: /^https$/ }, () => ({
      path: require.resolve('https-browserify'),
      external: false,
    }));

    build.onResolve({ filter: /^zlib$/ }, () => ({
      path: require.resolve('browserify-zlib'),
      external: false,
    }));

    // Optional but often helpful
    build.onResolve({ filter: /^buffer$/ }, () => ({
      path: require.resolve('buffer/'),
      external: false,
    }));

    build.onResolve({ filter: /^process$/ }, () => ({
      path: require.resolve('process/browser'),
      external: false,
    }));

    build.onResolve({ filter: /^events$/ }, () => ({
      path: require.resolve('events/'),
      external: false,
    }));

    // You can add more if new errors appear (util, url, assert, etc.)
  },
};

export default nodePolyfillsPlugin;
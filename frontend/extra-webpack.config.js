const webpack = require('webpack');

module.exports = {
  resolve: {
    fallback: {
      // Polyfills for Node core modules
      "stream": require.resolve("stream-browserify"),
      "crypto": require.resolve("crypto-browserify"),
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "zlib": require.resolve("browserify-zlib"),

      // Optional but often helpful for ethers/web3 libs
      "buffer": require.resolve("buffer/"),
      "process": require.resolve("process/browser"),
      "events": require.resolve("events/"),
      "vm": require.resolve("vm-browserify"),

      // If you get more "not found" errors later, add them here the same way
      // "util": require.resolve("util/"),
      // "url": require.resolve("url/"),
      // "assert": require.resolve("assert/"),
    }
  },

  // Optional: define globals so libraries detect browser context
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
};
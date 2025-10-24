// eslint.config.js
export default [
  {
    languageOptions: {
      ecmaVersion: 2020, // Equivalent to env.es2020
      sourceType: "module", // Enable ESM
      globals: {
        __dirname: "readonly", // Define global variables here
      },
    },
    rules: {
      "no-unused-vars": "warn", // Keep as warn to catch other issues
    },
  },
];
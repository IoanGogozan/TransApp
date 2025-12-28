const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    pool: "threads",
    environment: "node",
    setupFiles: ["./test/setup.js"],
    testTimeout: 10000,
    globals: true,
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 1,
        singleThread: true,
      },
    },
    sequence: {
      concurrent: false,
    },
  },
});

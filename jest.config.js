/** @type {import('jest').Config} */
const config = {
  // Use jsdom environment to simulate browser APIs for React components
  testEnvironment: "jest-environment-jsdom",

  // Setup file to load @testing-library/jest-dom matchers
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  // Module path aliases matching Next.js defaults
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },

  // Collect coverage from unit-testable lib/ files only.
  // API routes and React components are excluded — they require integration/component tests.
  collectCoverageFrom: [
    "lib/**/*.js",
    "!lib/prisma.js",           // Singleton — DB connection, skip in unit tests
    "!lib/authContext.js",      // React Context — covered by component tests
    "!lib/patterns/facade.js",  // Facade — requires DB integration tests
    "!lib/middleware/**",       // Auth middleware — covered by API route tests
    "!prisma/**",
    "!**/*.config.js",
    "!**/node_modules/**",
  ],

  // Coverage output directory and reporters
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],

  // Minimum coverage thresholds (70%)
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Transform JS/JSX files using next/jest transformer
  transform: {
    "^.+\\.(js|jsx)$": ["babel-jest", { presets: ["next/babel"] }],
  },

  // Test file patterns
  testMatch: [
    "<rootDir>/__tests__/**/*.test.js",
    "<rootDir>/__tests__/**/*.spec.js",
  ],

  // Ignore patterns
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
};

module.exports = config;

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: [
    'zgate-script.js', 
    'generate-postman-collection.js', 
    'oneco-script.js',
    'requestBuilder.js'
  ],
  setupFilesAfterEnv: ['./tests/setup.js'],
  // Setup for test organization
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/temp-test/',
    '/output/',
  ],
  // Run tests sequentially to prevent test interference
  maxWorkers: 1,
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
};

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  collectCoverageFrom: ['zgate-script.js', 'generate-postman-collection.js'],
  setupFilesAfterEnv: ['./tests/setup.js'],
};

// Mock setup for Jest tests
const fs = require('fs-extra');
const path = require('path');

// Mock modules that interact with filesystem
jest.mock('fs-extra', () => ({
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  ensureDirSync: jest.fn(),
  readdirSync: jest.fn(() => []),
  statSync: jest.fn(() => ({ isDirectory: () => true })),
  removeSync: jest.fn(),
}));

// Mock xlsx module for Excel processing
jest.mock('xlsx', () => ({
  readFile: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  },
}));

// Mock glob for file searching
jest.mock('glob', () => ({
  sync: jest.fn(() => []),
}));

// Test configuration
const TEST_CONFIG = {
  outputDir: path.join(__dirname, '..', 'test-output'),
  fixturesDir: path.join(__dirname, 'fixtures'),
  tempDir: path.join(__dirname, '..', 'temp-test'),
};

// Utility functions for test setup
const TestSetup = {
  // Clean up test environment
  cleanup: () => {
    jest.clearAllMocks();
  },

  // Setup mock return values
  setupMocks: (mockData = {}) => {
    const fsMock = require('fs-extra');

    if (mockData.files) {
      fsMock.readdirSync.mockReturnValue(mockData.files);
    }

    if (mockData.fileContent) {
      fsMock.readFileSync.mockReturnValue(mockData.fileContent);
    }

    if (mockData.fileExists !== undefined) {
      fsMock.existsSync.mockReturnValue(mockData.fileExists);
    }
  },

  // Create test environment
  createTestEnvironment: () => {
    // Ensure test directories exist in mock
    const fsMock = require('fs-extra');
    fsMock.existsSync.mockImplementation((filePath) => {
      // Test directories should exist
      if (filePath.includes('test-output') || filePath.includes('temp-test')) {
        return true;
      }
      return false;
    });
  },

  // Mock process.argv for CLI testing
  mockProcessArgv: (args) => {
    const originalArgv = process.argv;
    process.argv = ['node', 'script.js', ...args];
    return () => {
      process.argv = originalArgv;
    };
  },
};

module.exports = {
  TEST_CONFIG,
  TestSetup,
};

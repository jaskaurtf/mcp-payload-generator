const fs = require('fs-extra');
const path = require('path');

// Test constants
const TEST_EXCEL_FILE = 'TestScript-test.xlsx';
const TEST_OUTPUT_DIR = 'test-output';

// Generate unique file name for each test run to avoid file locking issues
const TEST_RUN_ID = Date.now().toString();
const UNIQUE_TEST_EXCEL_FILE = `TestScript-test-${TEST_RUN_ID}.xlsx`;

// Export constants for use in test files
exports.TEST_EXCEL_FILE = TEST_EXCEL_FILE;
exports.TEST_OUTPUT_DIR = TEST_OUTPUT_DIR;
exports.UNIQUE_TEST_EXCEL_FILE = UNIQUE_TEST_EXCEL_FILE;

// Test data for Excel file
const TEST_DATA = {
  Sheet1: [
    {
      'transaction type': 'authorization',
      'card type': 'mastercard',
      'payment type': 'credit',
      'entry mode': 'keyed',
      'trans. currency': '840',
      'transaction amount': '10.00',
      'test case number': 'TEST001',
    },
  ],
  Sheet2: [
    {
      'transaction type': 'refund',
      'card type': 'visa',
      'payment type': 'credit',
      'entry mode': 'cof',
      'trans. currency': '978',
      'transaction amount': '20.00',
      'test case number': 'TEST002',
    },
  ],
};

// Export test data for use in test files
exports.TEST_DATA = TEST_DATA;

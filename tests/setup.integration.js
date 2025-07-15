const fs = require('fs-extra');
const path = require('path');
const xlsx = require('xlsx');
const { UNIQUE_TEST_EXCEL_FILE, TEST_DATA, TEST_OUTPUT_DIR } = require('./setup');

// Create test Excel file before all integration tests
beforeAll(async () => {
  const wb = xlsx.utils.book_new();
  // Create sheets with both mandatory and non-mandatory data in the same sheet
  Object.entries(TEST_DATA).forEach(([sheetName, data]) => {
    // Combine both non-mandatory and mandatory data in the same sheet
    const combinedData = [
      ...data.map((row) => ({ ...row, 'entry mode': 'keyed', cof_type: undefined })),
      ...data.map((row) => ({
        ...row,
        'entry mode': 'cof',
        cof_type: 0,
        'test case number': `${row['test case number']}_COF`,
      })),
    ];
    const ws = xlsx.utils.json_to_sheet(combinedData);
    xlsx.utils.book_append_sheet(wb, ws, sheetName);
  });
  // Remove duplicate sheet names by only keeping the last (mandatory will overwrite non-mandatory)
  // This ensures only one sheet per name, always the mandatory version
  // If you want both, use Sheet1 and Sheet1_mandatory, but update your generator and tests to expect both
  await xlsx.writeFile(wb, path.join(__dirname, `../${UNIQUE_TEST_EXCEL_FILE}`));
});

// Clean up test output before each test
beforeEach(async () => {
  try {
    await fs.remove(path.join(__dirname, `../${TEST_OUTPUT_DIR}`));
  } catch (e) {}
});

// Clean up test output and Excel file after all tests
afterAll(async () => {
  try {
    await fs.remove(path.join(__dirname, `../${TEST_OUTPUT_DIR}`));
  } catch (e) {}
  try {
    await fs.remove(path.join(__dirname, `../${UNIQUE_TEST_EXCEL_FILE}`));
  } catch (e) {}
});

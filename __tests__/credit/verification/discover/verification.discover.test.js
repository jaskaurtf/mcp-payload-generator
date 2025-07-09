const xlsx = require('xlsx');
const fs = require('fs-extra');
const path = require('path');

describe('Verification - Discover Payloads', () => {
  const EXCEL_FILE_PATH = 'TestScript-test.xlsx';
  const OUTPUT_BASE_DIR = 'output_jsons';
  const workbook = xlsx.readFile(EXCEL_FILE_PATH);
  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  // Filter for verification + discover
  const filteredRows = rows.filter(
    (row) =>
      (row['transaction_type'] || '').toLowerCase() === 'verification' &&
      (row['card_type'] || '').toLowerCase() === 'discover'
  );

  if (filteredRows.length === 0) {
    test('No matching rows in Excel for this card/transaction type', () => {
      expect(true).toBe(true);
    });
  }

  filteredRows.forEach((row) => {
    const paymentType = (row['payment_type'] || 'unknown').toLowerCase().replace(/\s+/g, '_');
    const transactionType = (row['transaction_type'] || '').toLowerCase();
    const cardType = (row['card_type'] || 'unknown').toLowerCase().replace(/\s+/g, '_');
    const orderNumber = row['test_case_number'] || `unknown`;
    const outputPath = path.join(
      OUTPUT_BASE_DIR,
      paymentType,
      transactionType,
      cardType,
      `${orderNumber}.json`
    );
    test(`Validate JSON for order_number ${orderNumber}`, () => {
      expect(fs.existsSync(outputPath)).toBe(true);
      const json = fs.readJsonSync(outputPath);
      Object.keys(row).forEach((key) => {
        const normalizedKey = key
          .replace(/\s+/g, '_')
          .replace(/\r?\n|\r/g, '')
          .trim()
          .toLowerCase();
        if (json.hasOwnProperty(normalizedKey) || json.hasOwnProperty(key)) {
          expect(String(json[normalizedKey] || json[key] || '')).toBe(String(row[key] || ''));
        }
      });
    });
  });
});

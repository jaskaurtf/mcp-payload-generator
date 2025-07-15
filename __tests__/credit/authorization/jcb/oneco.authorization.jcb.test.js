const xlsx = require('xlsx');
const fs = require('fs-extra');
const path = require('path');

describe('Authorization - JCB Payloads', () => {
  const EXCEL_FILE_PATH = 'TestScript-test.xlsx';
  const OUTPUT_BASE_DIR = 'output/json';
  const workbook = xlsx.readFile(EXCEL_FILE_PATH);
  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  // Filter for authorization + jcb
  const filteredRows = rows.filter(
    (row) =>
      (row['transaction_type'] || '').toLowerCase() === 'authorization' &&
      (row['card_type'] || '').toLowerCase() === 'jcb'
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
        let testKey = key;
        if (key === 'entry_mode_id') testKey = 'entry_mode';
        if (key === 'cvv') testKey = 'ccv_data';
        const normalizedKey = testKey
          .replace(/\s+/g, '_')
          .replace(/\r?\n|\r/g, '')
          .trim()
          .toLowerCase();
        if (
          json.hasOwnProperty(normalizedKey) ||
          json.hasOwnProperty(testKey) ||
          json.hasOwnProperty(key)
        ) {
          expect(String(json[normalizedKey] || json[testKey] || json[key] || '')).toBe(
            String(row[key] || '')
          );
        }
      });
    });
  });
});

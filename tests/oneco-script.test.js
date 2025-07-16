const fs = require('fs-extra');
const path = require('path');
const xlsx = require('xlsx');
const { processSheetData, processExcelFile } = require('../oneco-script');

const TEST_OUTPUT_DIR = 'test-output/json';

describe('Excel to JSON Converter', () => {
  const sampleSheetName = 'Sheet1';
  const sampleData = [
    {
      'Transaction Amount': '1112',
      'Additional Amount': '100,200,300',
      'Notification Email Address': 'aa@aa.com',
      'CCV Data': '999',
      'Entry Mode': 'Keyed',
      'Card Type': 'AMEX',
      'Transaction Type': 'authorization',
      'Payment Type': 'credit',
      'AVS Billing Postal Code': '48178',
      'Test Case Number': 'TC001',
      'Trans. Currency': 'USD',
    },
  ];

  test('processSheetData generates correct JSON structure', () => {
    const result = processSheetData(sampleSheetName, sampleData, TEST_OUTPUT_DIR);

    expect(result).toHaveLength(1);
    const { outputDir, outputPath, jsonOutput } = result[0];

    expect(jsonOutput).toMatchObject({
      transaction_amount: '1112',
      notification_email_address: 'aa@aa.com',
      cvv: '999',
      entry_mode_id: 'K',
      account_number: '{{amex_keyed}}',
      surcharge_amount: '0',
      exp_date: '1226',
      billing_address: {
        postal_code: '48178',
      },
      subtotal_amount: '600.00',
    });

    expect(outputPath).toMatch(/TC001\.json$/);
    expect(outputDir).toContain(path.join(TEST_OUTPUT_DIR, sampleSheetName, 'USD'));
  });

  test('processExcelFile creates files correctly from actual Excel', async () => {
    const testExcelPath = path.join(__dirname, 'test_excel.xlsx');
    const testSheet = xlsx.utils.json_to_sheet(sampleData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, testSheet, sampleSheetName);
    xlsx.writeFile(wb, testExcelPath);

    // Clean up output dir
    await fs.remove(TEST_OUTPUT_DIR);

    processExcelFile(testExcelPath, TEST_OUTPUT_DIR);

    const expectedPath = path.join(
      TEST_OUTPUT_DIR,
      sampleSheetName,
      'USD',
      'credit',
      'authorization',
      'amex',
      'TC001.json'
    );
    const fileExists = await fs.pathExists(expectedPath);
    expect(fileExists).toBe(true);

    const jsonContent = await fs.readJson(expectedPath);
    expect(jsonContent.entry_mode_id).toBe('K');
    expect(jsonContent.account_number).toBe('{{amex_keyed}}');

    // Cleanup
    await fs.remove(TEST_OUTPUT_DIR);
    await fs.remove(testExcelPath);
  });
});

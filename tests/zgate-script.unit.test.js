const { processSheetData } = require('../zgate-script');

// Mock data for a single sheet
const mockSheetName = 'Sheet1';
const mockData = [
  {
    'transaction type': 'authorization',
    'card type': 'mastercard',
    'payment type': 'credit',
    'entry mode': 'keyed',
    'trans. currency': '840',
    'transaction amount': '10.00',
    'test case number': 'TEST001',
  },
  {
    'transaction type': 'refund',
    'card type': 'visa',
    'payment type': 'credit',
    'entry mode': 'cof',
    'trans. currency': '978',
    'transaction amount': '20.00',
    'test case number': 'TEST002',
  },
];

describe('processSheetData (unit, pure, no file I/O)', () => {
  it('should process mock sheet data and return correct output structure', () => {
    const outputs = processSheetData(mockSheetName, mockData, 'mock-output');
    expect(outputs.length).toBe(2);
    // Check first output
    expect(outputs[0].jsonOutput).toMatchObject({
      action: 'sale',
      amount: '10.00',
      card_type: 'mc',
      entry_mode: 'keyed',
      currency_code: '840',
      order_number: 'TEST001',
    });
    // Check second output
    expect(outputs[1].jsonOutput).toMatchObject({
      action: 'return',
      amount: '20.00',
      card_type: 'visa',
      entry_mode: 'cof',
      cof_type: 0,
      currency_code: '978',
      order_number: 'TEST002',
    });
    // Check output paths
    expect(outputs[0].outputPath).toContain('mock-output');
    expect(outputs[1].outputPath).toContain('mock-output');
  });
});

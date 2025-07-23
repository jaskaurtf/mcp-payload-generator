const { processSheetData } = require('../../oneco-script');

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
    'account number': '12345678',
    industry: 'Ecomm',
    'avs billing address': '1307 Broad Hollow Road',
    'avs billing postal code': '11747',
    'bill payment indicator': 'Recurring',
  },
  {
    'transaction type': 'refund',
    'card type': 'visa',
    'payment type': 'credit',
    'entry mode': 'cof',
    'trans. currency': '978',
    'transaction amount': '20.00',
    'test case number': 'TEST002',
    'account number': '123456789',
    industry: 'Ecomm',
    'avs billing address': '1307 Broad Hollow Road',
    'avs billing postal code': '11747',
    'bill payment indicator': 'Installment',
  },
];

describe('processSheetData (unit, pure, no file I/O)', () => {
  it('should process mock sheet data and return correct output structure', () => {
    const outputs = processSheetData(mockSheetName, mockData, 'mock-output');
    expect(outputs.length).toBe(2);
    // Check first output (keyed transaction - should NOT have initiation_type)
    expect(outputs[0].jsonOutput).toMatchObject({
      transaction_amount: '1000',
      entry_mode_id: 'K',
      currency_code: 'USD',
      order_number: 'TEST001',
      account_number: '12345678',
      billing_address: {
        city: '',
        country: 'United States',
        phone: '',
        postal_code: '11747',
        state: '',
      },
      bill_payment: true,
      installment: false,
      installment_number: 1,
      installment_count: 1,
      recurring: true,
      recurring_number: 1,
    });
    // Verify keyed transaction does NOT have initiation_type
    expect(outputs[0].jsonOutput).not.toHaveProperty('initiation_type');

    // Check second output (COF transaction - should HAVE initiation_type)
    expect(outputs[1].jsonOutput).toMatchObject({
      transaction_amount: '2000',
      entry_mode_id: 'C',
      currency_code: 'EUR',
      order_number: 'TEST002',
      account_number: '123456789',
      billing_address: {
        city: '',
        country: 'Europe',
        phone: '',
        postal_code: '11747',
        state: '',
      },
      bill_payment: true,
      installment: true,
      installment_number: 1,
      installment_count: 1,
      recurring: false,
      recurring_number: 1,
      initiation_type: '',
    });
    // Verify COF transaction DOES have initiation_type
    expect(outputs[1].jsonOutput).toHaveProperty('initiation_type', '');
    // Check output paths
    expect(outputs[0].outputPath).toContain('mock-output');
    expect(outputs[1].outputPath).toContain('mock-output');
  });
});

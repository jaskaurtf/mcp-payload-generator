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
    'additional amount': '24.00',
    'additional amount type': 'Clinical',
    description: 'Secure Electronic Commerce transaction. Send XML tag with value 01.',
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
    'additional amount': '',
    'additional amount type': '',
    description: '3-D Secure transaction for authentication. Send XML tag with value 02.',
  },
  {
    'transaction type': 'authorization',
    'card type': 'visa',
    'payment type': 'credit',
    'entry mode': 'keyed',
    'trans. currency': '840',
    'transaction amount': '30.00',
    'test case number': 'TEST003',
    'account number': '987654321',
    industry: 'Ecomm',
    'avs billing address': '123 Main Street',
    'avs billing postal code': '12345',
    'bill payment indicator': '',
    'additional amount': '',
    'additional amount type': '',
    description: 'Regular transaction without special handling.',
  },
];

describe('processSheetData (unit, pure, no file I/O)', () => {
  it('should process mock sheet data and return correct output structure', () => {
    const outputs = processSheetData(mockSheetName, mockData, 'mock-output');
    expect(outputs.length).toBe(3);

    // Check first output (keyed transaction with Secure Electronic Commerce - should have secure_auth_data only)
    expect(outputs[0].jsonOutput).toMatchObject({
      transaction_amount: '1000',
      entry_mode_id: 'K',
      currency_code: 'USD',
      order_number: 'TEST001',
      account_number: '12345678',
      secure_auth_data: 'hpqlETCoVYR1CAAAiX8HBjAAAAA=',
      billing_address: {
        city: '',
        country: 'United States',
        phone: '',
        postal_code: '11747',
        state: '',
        street: '1307 Broad Hollow Road',
      },
      bill_payment: true,
      recurring_flag: 'yes',
      installment_counter: 1,
      additional_amounts: [
        {
          type: 'clinical',
          amount: '2400',
        },
      ],
    });
    // Verify keyed transaction does NOT have initiation_type
    expect(outputs[0].jsonOutput).not.toHaveProperty('initiation_type');
    // Verify it has secure_auth_data but not threedsecure
    expect(outputs[0].jsonOutput).toHaveProperty(
      'secure_auth_data',
      'hpqlETCoVYR1CAAAiX8HBjAAAAA='
    );
    expect(outputs[0].jsonOutput).not.toHaveProperty('threedsecure');

    // Check second output (COF transaction with 3-D Secure - should have both threedsecure and secure_auth_data)
    expect(outputs[1].jsonOutput).toMatchObject({
      transaction_amount: '2000',
      entry_mode_id: 'C',
      currency_code: 'EUR',
      order_number: 'TEST002',
      account_number: '123456789',
      threedsecure: '1',
      secure_auth_data: 'hpqlETCoVYR1CAAAiX8HBjAAAAA=',
      billing_address: {
        city: '',
        country: 'Europe',
        phone: '',
        postal_code: '11747',
        state: '',
        street: '1307 Broad Hollow Road',
      },
      bill_payment: true,
      installment: true,
      installment_number: 1,
      installment_count: 1,
      installment_counter: 1,
      installment_total: 1,
      recurring_flag: 'yes',
      initiation_type: '',
    });
    // Verify COF transaction DOES have initiation_type
    expect(outputs[1].jsonOutput).toHaveProperty('initiation_type', '');
    // Verify it has both threedsecure and secure_auth_data
    expect(outputs[1].jsonOutput).toHaveProperty('threedsecure', '1');
    expect(outputs[1].jsonOutput).toHaveProperty(
      'secure_auth_data',
      'hpqlETCoVYR1CAAAiX8HBjAAAAA='
    );

    // Check third output (regular transaction - should have neither field)
    expect(outputs[2].jsonOutput).toMatchObject({
      transaction_amount: '3000',
      entry_mode_id: 'K',
      currency_code: 'USD',
      order_number: 'TEST003',
      account_number: '987654321',
      billing_address: {
        city: '',
        country: 'United States',
        phone: '',
        postal_code: '12345',
        state: '',
        street: '123 Main Street',
      },
    });
    // Verify regular transaction does NOT have special fields
    expect(outputs[2].jsonOutput).not.toHaveProperty('initiation_type');
    expect(outputs[2].jsonOutput).not.toHaveProperty('secure_auth_data');
    expect(outputs[2].jsonOutput).not.toHaveProperty('threedsecure');
    // Since bill payment indicator is empty, these fields should not exist
    expect(outputs[2].jsonOutput).not.toHaveProperty('bill_payment');
    expect(outputs[2].jsonOutput).not.toHaveProperty('installment');
    expect(outputs[2].jsonOutput).not.toHaveProperty('recurring_flag');

    // Check output paths
    expect(outputs[0].outputPath).toContain('mock-output');
    expect(outputs[1].outputPath).toContain('mock-output');
    expect(outputs[2].outputPath).toContain('mock-output');
  });

  it('should handle secure_auth_data and threedsecure fields based on description content', () => {
    const testData = [
      {
        'test case number': 'SECURE001',
        description: 'Test with Secure Electronic Commerce transaction. for validation',
        'trans. currency': '840',
        'transaction amount': '15.00',
        'entry mode': 'keyed',
        'card type': 'visa',
        'payment type': 'credit',
        'transaction type': 'authorization',
      },
      {
        'test case number': 'THREEDS001',
        description: 'Test with 3-D Secure transaction for authentication',
        'trans. currency': '840',
        'transaction amount': '25.00',
        'entry mode': 'keyed',
        'card type': 'visa',
        'payment type': 'credit',
        'transaction type': 'authorization',
      },
      {
        'test case number': 'REGULAR001',
        description: 'Regular test transaction without special handling',
        'trans. currency': '840',
        'transaction amount': '35.00',
        'entry mode': 'keyed',
        'card type': 'visa',
        'payment type': 'credit',
        'transaction type': 'authorization',
      },
      {
        'test case number': 'VOID001',
        description: 'This is a void transaction for testing PUT method',
        'trans. currency': '840',
        'transaction amount': '45.00',
        'entry mode': 'keyed',
        'card type': 'visa',
        'payment type': 'credit',
        'transaction type': 'void',
      },
    ];

    const outputs = processSheetData('TestSheet', testData, 'test-output');

    // First transaction: Secure Electronic Commerce
    expect(outputs[0].jsonOutput.order_number).toBe('SECURE001');
    expect(outputs[0].jsonOutput).toHaveProperty(
      'secure_auth_data',
      'hpqlETCoVYR1CAAAiX8HBjAAAAA='
    );
    expect(outputs[0].jsonOutput).not.toHaveProperty('threedsecure');

    // Second transaction: 3-D Secure
    expect(outputs[1].jsonOutput.order_number).toBe('THREEDS001');
    expect(outputs[1].jsonOutput).toHaveProperty('threedsecure', '1');
    expect(outputs[1].jsonOutput).toHaveProperty(
      'secure_auth_data',
      'hpqlETCoVYR1CAAAiX8HBjAAAAA='
    );

    // Third transaction: Regular
    expect(outputs[2].jsonOutput.order_number).toBe('REGULAR001');
    expect(outputs[2].jsonOutput).not.toHaveProperty('secure_auth_data');
    expect(outputs[2].jsonOutput).not.toHaveProperty('threedsecure');
  });
});

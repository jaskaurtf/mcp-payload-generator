const { processSheetData } = require('../../oneco-script');
const { TEST_DATA, TestHelpers } = require('../fixtures/testFixtures');
const { TestSetup } = require('../mocks/testMocks');

describe('OneCo Script - Security Authentication', () => {
  beforeEach(() => {
    TestSetup.cleanup();
  });

  describe('Secure Electronic Commerce Detection', () => {
    const securityTestCases = [
      {
        name: 'should detect standard Secure Electronic Commerce',
        description: 'Secure Electronic Commerce transaction.',
        expectedFields: { secure_auth_data: 'hpqlETCoVYR1CAAAiX8HBjAAAAA=' },
        notExpectedFields: ['threedsecure'],
      },
      {
        name: 'should handle typo in "transaction" (transction)',
        description: 'Secure Electronic Commerce transction',
        expectedFields: { secure_auth_data: 'hpqlETCoVYR1CAAAiX8HBjAAAAA=' },
        notExpectedFields: ['threedsecure'],
      },
      {
        name: 'should handle case insensitive detection',
        description: 'SECURE ELECTRONIC COMMERCE TRANSACTION',
        expectedFields: { secure_auth_data: 'hpqlETCoVYR1CAAAiX8HBjAAAAA=' },
        notExpectedFields: ['threedsecure'],
      },
      {
        name: 'should handle multiple typos',
        description: 'secure electronik commerce transction',
        expectedFields: { secure_auth_data: 'hpqlETCoVYR1CAAAiX8HBjAAAAA=' },
        notExpectedFields: ['threedsecure'],
      },
    ];

    securityTestCases.forEach(({ name, description, expectedFields, notExpectedFields }) => {
      it(name, () => {
        const testData = TestHelpers.createTestData({ description });
        const result = processSheetData('test', [testData]);
        const output = result[0].jsonOutput;

        // Verify expected fields are present
        Object.entries(expectedFields).forEach(([field, value]) => {
          expect(output[field]).toBe(value);
        });

        // Verify fields that should not be present
        notExpectedFields.forEach((field) => {
          expect(output[field]).toBeUndefined();
        });
      });
    });
  });

  describe('3-D Secure Detection', () => {
    const threeDSecureTestCases = [
      {
        name: 'should detect standard 3-D Secure',
        description: '3-D Secure transaction',
        expectedFields: {
          secure_auth_data: 'hpqlETCoVYR1CAAAiX8HBjAAAAA=',
          threedsecure: '1',
        },
      },
      {
        name: 'should detect alternative 3D format',
        description: '3D secure transaction',
        expectedFields: {
          secure_auth_data: 'hpqlETCoVYR1CAAAiX8HBjAAAAA=',
          threedsecure: '1',
        },
      },
      {
        name: 'should handle case variations',
        description: '3-d SECURE transaction for authentication',
        expectedFields: {
          secure_auth_data: 'hpqlETCoVYR1CAAAiX8HBjAAAAA=',
          threedsecure: '1',
        },
      },
    ];

    threeDSecureTestCases.forEach(({ name, description, expectedFields }) => {
      it(name, () => {
        const testData = TestHelpers.createTestData({ description });
        const result = processSheetData('test', [testData]);
        const output = result[0].jsonOutput;

        Object.entries(expectedFields).forEach(([field, value]) => {
          expect(output[field]).toBe(value);
        });
      });
    });
  });

  describe('No Security Authentication', () => {
    const noSecurityTestCases = [
      'Regular transaction without security',
      'Simple payment processing',
      'Basic transaction test',
      'Void transaction processing',
    ];

    noSecurityTestCases.forEach((description) => {
      it(`should not add security fields for: "${description}"`, () => {
        const testData = TestHelpers.createTestData({ description });
        const result = processSheetData('test', [testData]);
        const output = result[0].jsonOutput;

        expect(output.secure_auth_data).toBeUndefined();
        expect(output.threedsecure).toBeUndefined();
      });
    });
  });

  describe('Currency-Specific Amount Processing', () => {
    const currencyAmountTests = [
      {
        name: 'should convert USD amounts to cents',
        currency: '840',
        amount: '10.50',
        expectedAmount: '1050',
        additionalAmount: '5.25',
        expectedAdditional: '525',
      },
      {
        name: 'should keep JPY amounts as-is (no decimal conversion)',
        currency: '392',
        amount: '589',
        expectedAmount: '589',
        additionalAmount: '100',
        expectedAdditional: '100',
      },
      {
        name: 'should convert EUR amounts to cents',
        currency: '978',
        amount: '25.99',
        expectedAmount: '2599',
        additionalAmount: '12.50',
        expectedAdditional: '1250',
      },
    ];

    currencyAmountTests.forEach(
      ({ name, currency, amount, expectedAmount, additionalAmount, expectedAdditional }) => {
        it(name, () => {
          const testData = TestHelpers.createTestData({
            'trans. currency': currency,
            'transaction amount': amount,
            'additional amount': additionalAmount,
            'additional amount type': 'clinical',
          });

          const result = processSheetData('test', [testData]);
          const output = result[0].jsonOutput;

          expect(output.transaction_amount).toBe(expectedAmount);

          if (output.additional_amounts && output.additional_amounts.length > 0) {
            expect(output.additional_amounts[0].amount).toBe(expectedAdditional);
          }
        });
      }
    );
  });

  describe('Edge Cases', () => {
    it('should handle empty description', () => {
      const testData = TestHelpers.createTestData({ description: '' });
      const result = processSheetData('test', [testData]);
      const output = result[0].jsonOutput;

      expect(output.secure_auth_data).toBeUndefined();
      expect(output.threedsecure).toBeUndefined();
    });

    it('should handle undefined description', () => {
      const testData = TestHelpers.createTestData();
      delete testData.description;
      const result = processSheetData('test', [testData]);
      const output = result[0].jsonOutput;

      expect(output.secure_auth_data).toBeUndefined();
      expect(output.threedsecure).toBeUndefined();
    });

    it('should handle description with only partial security keywords', () => {
      const testData = TestHelpers.createTestData({ description: 'Secure transaction only' });
      const result = processSheetData('test', [testData]);
      const output = result[0].jsonOutput;

      expect(output.secure_auth_data).toBeUndefined();
      expect(output.threedsecure).toBeUndefined();
    });
  });
});

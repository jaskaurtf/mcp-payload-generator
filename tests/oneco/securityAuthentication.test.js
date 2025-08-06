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

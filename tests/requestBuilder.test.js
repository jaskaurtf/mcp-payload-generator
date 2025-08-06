const { buildRequest } = require('../requestBuilder');
const { TEST_DATA, TestHelpers } = require('./fixtures/testFixtures');

describe('RequestBuilder', () => {
  describe('buildRequest', () => {
    let mockJsonBody;

    beforeEach(() => {
      mockJsonBody = JSON.stringify({
        location_id: '{{location_id}}',
        product_transaction_id: '{{product_transaction_id_ecommerce}}',
        account_number: '4264281500006662',
        transaction_amount: '21001',
        entry_mode_id: 'K',
        currency_code: 'AUD',
        order_number: '100392430031',
      }, null, 2);
    });

    describe('HTTP Method Determination', () => {
      const testCases = [
        {
          name: 'should use POST method for non-void transactions',
          description: 'Regular transaction',
          expectedMethod: 'POST',
        },
        {
          name: 'should use PUT method for void transactions',
          description: 'Void transaction test',
          expectedMethod: 'PUT',
        },
        {
          name: 'should be case insensitive for void detection',
          description: 'VOID Transaction Test',
          expectedMethod: 'PUT',
        },
      ];

      testCases.forEach(({ name, description, expectedMethod }) => {
        it(name, () => {
          const result = buildRequest('oneCo', mockJsonBody, description, '100392430031');
          expect(result.method).toBe(expectedMethod);
        });
      });
    });

    describe('URL Generation for oneCo', () => {
      const transactionTypeTests = [
        {
          name: 'Authorization',
          transactionType: 'Authorization',
          expectedEndpoint: '/sale/keyed',
        },
        {
          name: 'Refund', 
          transactionType: 'Refund',
          expectedEndpoint: '/refund/keyed',
        },
        {
          name: 'Verification',
          transactionType: 'Verification', 
          expectedEndpoint: '/avs-only/keyed',
        },
        {
          name: 'Unknown (defaults to Authorization)',
          transactionType: 'Unknown',
          expectedEndpoint: '/sale/keyed',
        },
      ];

      transactionTypeTests.forEach(({ name, transactionType, expectedEndpoint }) => {
        it(`should generate correct URL for POST requests with ${name}`, () => {
          const result = buildRequest('oneCo', mockJsonBody, 'Regular transaction', '100392430031', transactionType);
          
          expect(result.url.raw).toBe(`{{url}}/{{namespace}}/transactions/cc${expectedEndpoint}`);
          expect(result.url.path).toEqual(['{{namespace}}', `transactions/cc${expectedEndpoint}`]);
        });
      });

      it('should generate correct URL for POST requests (backward compatibility)', () => {
        const result = buildRequest('oneCo', mockJsonBody, 'Regular transaction', '100392430031');

        expect(result.url.raw).toBe('{{url}}/{{namespace}}/transactions/cc/sale/keyed');
        expect(result.url.path).toEqual(['{{namespace}}', 'transactions/cc/sale/keyed']);
      });

      it('should generate correct URL for PUT requests with dynamic value', () => {
        const result = buildRequest('oneCo', mockJsonBody, 'Void transaction test', '100392430031');

        expect(result.url.raw).toBe('{{url}}/{{namespace}}/transactions/{{100392430030}}/void');
        expect(result.url.path).toEqual([
          '{{namespace}}',
          'transactions',
          '{{100392430030}}',
          'void',
        ]);
      });

      const dynamicValueTests = [
        {
          name: 'should handle numeric order numbers correctly',
          orderNumber: 123456789,
          expectedDynamic: '{{123456788}}',
        },
        {
          name: 'should handle edge case of order number 1',
          orderNumber: '1',
          expectedDynamic: '{{0}}',
        },
      ];

      dynamicValueTests.forEach(({ name, orderNumber, expectedDynamic }) => {
        it(name, () => {
          const result = buildRequest('oneCo', mockJsonBody, 'Void test', orderNumber);
          expect(result.url.raw).toBe(`{{url}}/{{namespace}}/transactions/${expectedDynamic}/void`);
        });
      });
    });

    describe('URL Generation for zgate', () => {
      it('should generate correct URL for POST requests', () => {
        const result = buildRequest('zgate', mockJsonBody, 'Regular transaction', '100392430031');

        expect(result.url.raw).toBe('{{url}}/{{namespace}}/transactions');
        expect(result.url.path).toEqual(['{{namespace}}', 'transactions']);
      });

      it('should generate correct URL for PUT requests with dynamic value', () => {
        const result = buildRequest('zgate', mockJsonBody, 'Void transaction test', '100392430031');

        expect(result.url.raw).toBe('{{url}}/{{namespace}}/transactions/{{100392430030}}/void');
        expect(result.url.path).toEqual([
          '{{namespace}}',
          'transactions',
          '{{100392430030}}',
          'void',
        ]);
      });
    });

    describe('Headers Validation', () => {
      it('should include correct headers for oneCo requests', () => {
        const result = buildRequest('oneCo', mockJsonBody, 'Regular transaction', '100392430031');
        
        const headerKeys = result.header.map(h => h.key);
        const expectedHeaders = ['user-id', 'user-api-key', 'Content-Type', 'developer-id', 'Accept', 'access-token'];
        
        expectedHeaders.forEach(header => {
          expect(headerKeys).toContain(header);
        });
      });

      it('should include correct headers for zgate requests', () => {
        const result = buildRequest('zgate', mockJsonBody, 'Regular transaction', '100392430031');
        
        const headerKeys = result.header.map(h => h.key);
        const expectedHeaders = ['user-id', 'user-key', 'Content-Type'];
        
        expectedHeaders.forEach(header => {
          expect(headerKeys).toContain(header);
        });
      });
    });

    describe('Request Body Handling', () => {
      it('should include the JSON body in raw format for non-void transactions', () => {
        const result = buildRequest('oneCo', mockJsonBody, 'Regular transaction', '100392430031');

        expect(result.body.mode).toBe('raw');
        expect(result.body.raw).toBe(mockJsonBody);
      });

      const voidTests = [
        { type: 'oneCo', description: 'should have empty body for oneCo void transactions' },
        { type: 'zgate', description: 'should have empty body for zgate void transactions' },
      ];

      voidTests.forEach(({ type, description }) => {
        it(description, () => {
          const result = buildRequest(type, mockJsonBody, 'Void transaction test', '100392430031');

          expect(result.body.mode).toBe('raw');
          expect(result.body.raw).toBe('');
        });
      });
    });

    describe('Edge Cases', () => {
      const edgeCases = [
        {
          name: 'should handle empty description',
          params: ['oneCo', mockJsonBody, '', '100392430031'],
          expectations: (result) => {
            expect(result.method).toBe('POST');
            expect(result.url.raw).toBe('{{url}}/{{namespace}}/transactions/cc/sale/keyed');
          },
        },
        {
          name: 'should handle empty order number for non-void requests',
          params: ['oneCo', mockJsonBody, 'Regular transaction', ''],
          expectations: (result) => {
            expect(result.method).toBe('POST');
            expect(result.url.raw).toBe('{{url}}/{{namespace}}/transactions/cc/sale/keyed');
          },
        },
        {
          name: 'should handle empty order number for void requests',
          params: ['oneCo', mockJsonBody, 'Void transaction', ''],
          expectations: (result) => {
            expect(result.method).toBe('PUT');
            expect(result.url.raw).toBe('{{url}}/{{namespace}}/transactions/{{dynamicValue}}/void');
          },
        },
      ];

      edgeCases.forEach(({ name, params, expectations }) => {
        it(name, () => {
          const result = buildRequest(...params);
          expectations(result);
        });
      });

      it('should throw error for unknown request type', () => {
        expect(() => {
          buildRequest('unknown', mockJsonBody, 'Regular transaction', '100392430031');
        }).toThrow('Unknown request type: unknown');
      });
    });

    describe('Complex Void Descriptions', () => {
      const voidDescriptions = [
        'Void No encryption or tokenization SSL transaction',
        'This is a void transaction with additional details',
        'Account verification void transaction test',
        'Refund void with secure authentication',
        'VOID transaction in uppercase',
      ];

      voidDescriptions.forEach((description) => {
        it(`should detect void in: "${description}"`, () => {
          const result = buildRequest('oneCo', mockJsonBody, description, '100392430031');
          expect(result.method).toBe('PUT');
          expect(result.url.raw).toContain('/void');
        });
      });
    });
  });
});

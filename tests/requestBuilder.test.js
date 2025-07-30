const { buildRequest } = require('../requestBuilder');

describe('requestBuilder', () => {
  describe('buildRequest', () => {
    const mockJsonBody = JSON.stringify(
      {
        location_id: '{{location_id}}',
        product_transaction_id: '{{product_transaction_id_ecommerce}}',
        account_number: '4264281500006662',
        transaction_amount: '21001',
        entry_mode_id: 'K',
        currency_code: 'AUD',
        order_number: '100392430031',
      },
      null,
      2
    );

    describe('HTTP Method Determination', () => {
      it('should use POST method for non-void transactions', () => {
        const result = buildRequest('oneCo', mockJsonBody, 'Regular transaction', '100392430031');
        expect(result.method).toBe('POST');
      });

      it('should use PUT method for void transactions', () => {
        const result = buildRequest('oneCo', mockJsonBody, 'Void transaction test', '100392430031');
        expect(result.method).toBe('PUT');
      });

      it('should be case insensitive for void detection', () => {
        const result = buildRequest('oneCo', mockJsonBody, 'VOID Transaction Test', '100392430031');
        expect(result.method).toBe('PUT');
      });
    });

    describe('URL Generation for oneCo', () => {
      it('should generate correct URL for POST requests', () => {
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

      it('should handle numeric order numbers correctly', () => {
        const result = buildRequest('oneCo', mockJsonBody, 'Void test', 123456789);

        expect(result.url.raw).toBe('{{url}}/{{namespace}}/transactions/{{123456788}}/void');
        expect(result.url.path).toEqual(['{{namespace}}', 'transactions', '{{123456788}}', 'void']);
      });

      it('should handle edge case of order number 1', () => {
        const result = buildRequest('oneCo', mockJsonBody, 'Void test', '1');

        expect(result.url.raw).toBe('{{url}}/{{namespace}}/transactions/{{0}}/void');
        expect(result.url.path).toEqual(['{{namespace}}', 'transactions', '{{0}}', 'void']);
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

    describe('Headers', () => {
      it('should include correct headers for oneCo requests', () => {
        const result = buildRequest('oneCo', mockJsonBody, 'Regular transaction', '100392430031');

        expect(result.header).toEqual([
          { key: 'user-id', value: '{{user-id}}' },
          { key: 'user-api-key', value: '{{user-api-key}}' },
          { key: 'Content-Type', value: 'application/json' },
          { key: 'developer-id', value: '{{developer-id}}' },
          { key: 'Accept', value: 'application/json' },
          { key: 'access-token', value: '{{access-token}}' },
        ]);
      });

      it('should include correct headers for zgate requests', () => {
        const result = buildRequest('zgate', mockJsonBody, 'Regular transaction', '100392430031');

        expect(result.header).toEqual([
          { key: 'user-id', value: '{{ecomm_user_id}}' },
          { key: 'user-key', value: '{{ecomm_user_key}}' },
          { key: 'Content-Type', value: 'application/json' },
        ]);
      });
    });

    describe('Request Body', () => {
      it('should include the JSON body in raw format for non-void transactions', () => {
        const result = buildRequest('oneCo', mockJsonBody, 'Regular transaction', '100392430031');

        expect(result.body).toEqual({
          mode: 'raw',
          raw: mockJsonBody,
        });
      });

      it('should have empty body for void transactions', () => {
        const result = buildRequest('oneCo', mockJsonBody, 'Void transaction test', '100392430031');

        expect(result.body).toEqual({
          mode: 'raw',
          raw: '',
        });
      });

      it('should have empty body for zgate void transactions', () => {
        const result = buildRequest('zgate', mockJsonBody, 'Void transaction test', '100392430031');

        expect(result.body).toEqual({
          mode: 'raw',
          raw: '',
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty description', () => {
        const result = buildRequest('oneCo', mockJsonBody, '', '100392430031');
        expect(result.method).toBe('POST');
      });

      it('should handle empty order number for non-void requests', () => {
        const result = buildRequest('oneCo', mockJsonBody, 'Regular transaction', '');
        expect(result.method).toBe('POST');
        expect(result.url.raw).toBe('{{url}}/{{namespace}}/transactions/cc/sale/keyed');
      });

      it('should handle empty order number for void requests', () => {
        const result = buildRequest('oneCo', mockJsonBody, 'Void transaction test', '');
        expect(result.method).toBe('PUT');
        expect(result.url.raw).toBe('{{url}}/{{namespace}}/transactions/{{dynamicValue}}/void');
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

      voidDescriptions.forEach((description, index) => {
        it(`should detect void in: "${description}"`, () => {
          const orderNumber = `10039243003${index}`;
          const expectedDynamic = `{{${String(Number(orderNumber) - 1)}}}`;
          const result = buildRequest('oneCo', mockJsonBody, description, orderNumber);

          expect(result.method).toBe('PUT');
          expect(result.url.raw).toContain('/void');
          expect(result.url.raw).toBe(`{{url}}/{{namespace}}/transactions/${expectedDynamic}/void`);
        });
      });
    });
  });
});

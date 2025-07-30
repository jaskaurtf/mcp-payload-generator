function buildRequest(type, jsonBody, description = '', orderNumber = '') {
  // Determine HTTP method based on description
  const method = description.toLowerCase().includes('void') ? 'PUT' : 'POST';

  // Calculate dynamic value for PUT requests (order_number - 1) as a placeholder
  const dynamicValue =
    method === 'PUT' && orderNumber
      ? `{{${String(Number(orderNumber) - 1)}}}`
      : method === 'PUT'
        ? '{{dynamicValue}}'
        : '';

  switch (type) {
    case 'zgate':
      const zgateUrl =
        method === 'PUT'
          ? `{{url}}/{{namespace}}/transactions/${dynamicValue}/void`
          : '{{url}}/{{namespace}}/transactions';
      const zgatePath =
        method === 'PUT'
          ? ['{{namespace}}', 'transactions', dynamicValue, 'void']
          : ['{{namespace}}', 'transactions'];

      return {
        method: method,
        header: [
          { key: 'user-id', value: '{{ecomm_user_id}}' },
          { key: 'user-key', value: '{{ecomm_user_key}}' },
          { key: 'Content-Type', value: 'application/json' },
        ],
        body: method === 'PUT' ? { mode: 'raw', raw: '' } : { mode: 'raw', raw: jsonBody },
        url: {
          raw: zgateUrl,
          host: ['{{url}}'],
          path: zgatePath,
        },
      };

    case 'oneCo':
      const oneCoUrl =
        method === 'PUT'
          ? `{{url}}/{{namespace}}/transactions/${dynamicValue}/void`
          : '{{url}}/{{namespace}}/transactions/cc/sale/keyed';
      const oneCoPath =
        method === 'PUT'
          ? ['{{namespace}}', 'transactions', dynamicValue, 'void']
          : ['{{namespace}}', 'transactions/cc/sale/keyed'];

      return {
        method: method,
        header: [
          { key: 'user-id', value: '{{user-id}}' },
          { key: 'user-api-key', value: '{{user-api-key}}' },
          { key: 'Content-Type', value: 'application/json' },
          { key: 'developer-id', value: '{{developer-id}}' },
          { key: 'Accept', value: 'application/json' },
          { key: 'access-token', value: '{{access-token}}' },
        ],
        body: method === 'PUT' ? { mode: 'raw', raw: '' } : { mode: 'raw', raw: jsonBody },
        url: {
          raw: oneCoUrl,
          host: ['{{url}}'],
          path: oneCoPath,
        },
      };

    default:
      throw new Error(`Unknown request type: ${type}`);
  }
}

module.exports = { buildRequest };

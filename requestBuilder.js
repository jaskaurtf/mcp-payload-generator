function buildRequest(type, jsonBody, description = '') {
  // Determine HTTP method based on description
  const method = description.toLowerCase().includes('void') ? 'PUT' : 'POST';
  
  switch (type) {
    case 'zgate':
      return {
        method: method,
        header: [
          { key: 'user-id', value: '{{ecomm_user_id}}' },
          { key: 'user-key', value: '{{ecomm_user_key}}' },
          { key: 'Content-Type', value: 'application/json' },
        ],
        body: { mode: 'raw', raw: jsonBody },
        url: {
          raw: '{{url}}/{{namespace}}/transactions',
          host: ['{{url}}'],
          path: ['{{namespace}}', 'transactions'],
        },
      };

    case 'oneCo':
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
        body: { mode: 'raw', raw: jsonBody },
        url: {
          raw: '{{url}}/{{namespace}}/transactions/cc/sale/keyed',
          host: ['{{url}}'],
          path: ['{{namespace}}', 'transactions/cc/sale/keyed'],
        },
      };

    default:
      throw new Error(`Unknown request type: ${type}`);
  }
}

module.exports = { buildRequest };

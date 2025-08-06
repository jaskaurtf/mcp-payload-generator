// Test fixtures and mock data
const TEST_DATA = {
  // Base test data structure
  baseTransaction: {
    'transaction type': 'authorization',
    'card type': 'visa',
    'payment type': 'credit',
    'entry mode': 'keyed',
    'trans. currency': '840',
    'transaction amount': '10.00',
    'test case number': 'TEST001',
    'account number': '4111111111111111',
    industry: 'Ecomm',
    'avs billing address': '123 Main St',
    'avs billing postal code': '12345',
    'bill payment indicator': '',
    'additional amount': '',
    'additional amount type': '',
    description: 'Regular transaction',
  },

  // Transaction type variations
  transactionTypes: {
    authorization: { 'transaction type': 'authorization' },
    refund: { 'transaction type': 'refund' },
    verification: { 'transaction type': 'verification' },
  },

  // Card type variations
  cardTypes: {
    visa: { 'card type': 'visa', 'account number': '4111111111111111' },
    mastercard: { 'card type': 'mastercard', 'account number': '5555555555554444' },
    amex: { 'card type': 'amex', 'account number': '378282246310005' },
    discover: { 'card type': 'discover', 'account number': '6011111111111117' },
  },

  // Currency variations
  currencies: {
    usd: { 'trans. currency': '840' },
    eur: { 'trans. currency': '978' },
    gbp: { 'trans. currency': '826' },
    jpy: { 'trans. currency': '392' },
  },

  // Security authentication scenarios
  securityDescriptions: {
    secureCommerce: 'Secure Electronic Commerce transaction.',
    secureCommerceTypo: 'Secure Electronic Commerce transction',
    secureCommerceCase: 'SECURE ELECTRONIC COMMERCE TRANSACTION',
    threeDSecure: '3-D Secure transaction',
    threeDSecureAlt: '3D secure transaction',
    typoTolerant: 'secure electronik commerce transction',
    noSecurity: 'Regular transaction without security',
  },

  // Void transaction scenarios
  voidDescriptions: {
    basicVoid: 'Void transaction',
    detailedVoid: 'Void No encryption or tokenization SSL transaction',
    uppercaseVoid: 'VOID Transaction Test',
    mixedVoid: 'This is a void transaction with additional details',
  },
};

// Expected output structures
const EXPECTED_OUTPUTS = {
  requestBuilder: {
    oneCoPost: {
      method: 'POST',
      expectedHeaders: [
        'user-id',
        'user-api-key', 
        'Content-Type',
        'developer-id',
        'Accept',
        'access-token'
      ],
      urlPattern: /^{{url}}\/{{namespace}}\/transactions\/cc\/(sale|refund|avs-only)\/keyed$/,
    },
    oneCoPut: {
      method: 'PUT',
      expectedHeaders: [
        'user-id',
        'user-api-key',
        'Content-Type', 
        'developer-id',
        'Accept',
        'access-token'
      ],
      urlPattern: /^{{url}}\/{{namespace}}\/transactions\/{{[0-9]+}}\/void$/,
      emptyBody: true,
    },
    zgatePost: {
      method: 'POST',
      expectedHeaders: ['user-id', 'user-key', 'Content-Type'],
      urlPattern: /^{{url}}\/{{namespace}}\/transactions$/,
    },
    zgatePut: {
      method: 'PUT', 
      expectedHeaders: ['user-id', 'user-key', 'Content-Type'],
      urlPattern: /^{{url}}\/{{namespace}}\/transactions\/{{[0-9]+}}\/void$/,
      emptyBody: true,
    },
  },
};

// Test helpers
const TestHelpers = {
  // Create test data by merging base with overrides
  createTestData: (...overrides) => {
    return Object.assign({}, TEST_DATA.baseTransaction, ...overrides);
  },

  // Create multiple test cases
  createTestCases: (baseData, variations) => {
    return Object.entries(variations).map(([key, override]) => ({
      name: key,
      data: TestHelpers.createTestData(baseData, override),
    }));
  },

  // Validate request structure
  validateRequestStructure: (request, expectedType) => {
    const expected = EXPECTED_OUTPUTS.requestBuilder[expectedType];
    
    expect(request).toHaveProperty('method', expected.method);
    expect(request).toHaveProperty('header');
    expect(request).toHaveProperty('body');
    expect(request).toHaveProperty('url');
    
    // Validate headers
    const headerKeys = request.header.map(h => h.key);
    expected.expectedHeaders.forEach(headerKey => {
      expect(headerKeys).toContain(headerKey);
    });
    
    // Validate URL pattern
    expect(request.url.raw).toMatch(expected.urlPattern);
    
    // Validate empty body for PUT requests
    if (expected.emptyBody) {
      expect(request.body.raw).toBe('');
    }
  },

  // Mock filesystem operations
  createMockFs: () => ({
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(),
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    ensureDirSync: jest.fn(),
  }),

  // Mock console methods
  mockConsole: () => {
    const originalConsole = { ...console };
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    return originalConsole;
  },

  // Restore console
  restoreConsole: (originalConsole) => {
    Object.assign(console, originalConsole);
  },
};

module.exports = {
  TEST_DATA,
  EXPECTED_OUTPUTS,
  TestHelpers,
};

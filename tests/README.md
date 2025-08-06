# Test-Driven Development (TDD) Structure

This document outlines the clean TDD approach implemented in this project.

## Test Organization

### Directory Structure
```
tests/
├── fixtures/
│   └── testFixtures.js          # Centralized test data and helpers
├── mocks/
│   └── testMocks.js             # Mock configurations and utilities
├── oneco/
│   ├── oneco-script.test.js            # Core OneCo functionality tests
│   ├── oneco-script.unit.test.js       # Unit tests for OneCo
│   ├── oneco-script-integration.test.js # Integration tests for OneCo
│   └── securityAuthentication.test.js  # Security authentication logic tests
├── generate-postman-collection.test.js # Postman collection generation tests
├── requestBuilder.test.js              # Request builder unit tests
├── zgate-script.test.js                # Core Zgate functionality tests
├── zgate-script.unit.test.js           # Unit tests for Zgate
├── zgate-script-integration.test.js    # Integration tests for Zgate
├── setup.js                            # Global test setup
└── setup.integration.js               # Integration test setup
```

## Key Improvements

### 1. Centralized Test Data (`fixtures/testFixtures.js`)
- **Reusable test data structures** for consistent testing
- **Helper functions** for creating test variations
- **Expected output patterns** for validation
- **Request structure validators** for API testing

### 2. Mock System (`mocks/testMocks.js`)
- **Filesystem mocking** for file operations
- **Excel processing mocks** for XLSX operations  
- **Test environment setup** utilities
- **Process.argv mocking** for CLI testing

### 3. Organized Test Suites
- **Descriptive test names** that explain what's being tested
- **Grouped test cases** using `describe` blocks for logical organization
- **Parameterized tests** using `forEach` for testing multiple scenarios
- **Proper setup/teardown** with `beforeEach` and `afterEach`

### 4. Enhanced Assertions
- **Specific expectations** rather than generic checks
- **Error message validation** for better debugging
- **Structure validation** for complex objects
- **Edge case coverage** for robust testing

## Test Categories

### Unit Tests
- Test individual functions in isolation
- Use mocks for external dependencies
- Focus on specific business logic
- Fast execution and deterministic results

### Integration Tests  
- Test component interactions
- Use real file operations where appropriate
- Validate end-to-end workflows
- Test data flow between modules

### Security Tests
- Specialized tests for authentication logic
- Typo tolerance validation
- Case sensitivity testing
- Pattern matching verification

## Best Practices Implemented

### 1. DRY (Don't Repeat Yourself)
- Centralized test data reduces duplication
- Reusable helper functions for common operations
- Parameterized tests for similar test cases

### 2. Clear Test Names
- Descriptive names that explain the test purpose
- Consistent naming conventions
- Grouped related tests logically

### 3. Isolated Tests
- Each test is independent
- Proper cleanup between tests
- Mocked external dependencies

### 4. Comprehensive Coverage
- Edge cases and error conditions
- Different input combinations
- Backward compatibility testing

## Usage Examples

### Creating Test Data
```javascript
const { TestHelpers } = require('./fixtures/testFixtures');

// Create base test data with overrides
const testData = TestHelpers.createTestData(
  { 'transaction type': 'refund' },
  { 'card type': 'visa' }
);

// Create multiple test cases
const testCases = TestHelpers.createTestCases(
  baseData,
  TEST_DATA.transactionTypes
);
```

### Validating Request Structure
```javascript
const result = buildRequest('oneCo', jsonBody, description, orderNumber);
TestHelpers.validateRequestStructure(result, 'oneCoPost');
```

### Using Mocks
```javascript
const { TestSetup } = require('./mocks/testMocks');

beforeEach(() => {
  TestSetup.cleanup();
  TestSetup.setupMocks({
    fileContent: mockJsonContent,
    fileExists: true
  });
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- tests/requestBuilder.test.js

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Coverage Goals

- **Statement Coverage**: > 85%
- **Branch Coverage**: > 65%  
- **Function Coverage**: > 80%
- **Line Coverage**: > 85%

Current coverage: **88.01% statements, 68.77% branches, 82.6% functions**

## Maintenance

### Adding New Tests
1. Use existing fixtures and helpers when possible
2. Follow the established naming conventions
3. Add test data to `testFixtures.js` if reusable
4. Group related tests in appropriate `describe` blocks

### Updating Tests
1. Update test fixtures when data structures change
2. Maintain backward compatibility where possible
3. Update documentation when test structure changes
4. Keep test names descriptive and current

const fs = require('fs-extra');
const path = require('path');
const { TEST_OUTPUT_DIR } = require('./setup');

describe('Postman Collection Generation', () => {
  let originalArgv;
  let generatePostmanCollectionsByTransactionType;

  beforeAll(() => {
    // Save original argv
    originalArgv = process.argv;
  });

  afterAll(() => {
    // Restore original argv
    process.argv = originalArgv;
  });

  afterEach(() => {
    // Clean up module cache
    delete require.cache[require.resolve('../generate-postman-collection')];
  });

  // Create test JSON files
  beforeEach(async () => {
    // Mock process.argv to pass the test output directory - clear all extra args first
    process.argv = process.argv.slice(0, 2); // Keep only node and script name
    process.argv.push(TEST_OUTPUT_DIR); // Add our test output directory

    process.argv.push('--requestType=zgate');
    process.argv.push('--name=Zgate');

    delete require.cache[require.resolve('../generate-postman-collection')];
    const postmanModule = require('../generate-postman-collection');
    generatePostmanCollectionsByTransactionType =
      postmanModule.generatePostmanCollectionsByTransactionType;

    const testData = {
      Sheet1: {
        keyed: {
          data: {
            action: 'sale',
            amount: '10.00',
            card_type: 'mc',
            entry_mode: 'keyed',
            currency_code: '840',
            order_number: 'TEST001',
          },
          // Place under non-mandatory with new currency-country structure
          path: `${TEST_OUTPUT_DIR}/json/non-mandatory/Sheet1/USD_UnitedStates_840/credit/authorization/mc/TEST001_USD_UnitedStates_840.json`,
        },
        cof: {
          data: {
            action: 'sale',
            amount: '15.00',
            card_type: 'visa',
            entry_mode: 'cof',
            cof_type: 0,
            currency_code: '840',
            order_number: 'TEST002',
          },
          // Place under mandatory with new currency-country structure
          path: `${TEST_OUTPUT_DIR}/json/mandatory/Sheet1/USD_UnitedStates_840/credit/authorization/visa/TEST002_USD_UnitedStates_840.json`,
        },
        void: {
          data: {
            action: 'void',
            amount: '25.00',
            card_type: 'visa',
            entry_mode: 'keyed',
            currency_code: '840',
            order_number: 'TEST004',
            description: 'This is a void transaction',
          },
          // Place under mandatory with new currency-country structure
          path: `${TEST_OUTPUT_DIR}/json/mandatory/Sheet1/USD_UnitedStates_840/credit/void/visa/TEST004_USD_UnitedStates_840.json`,
        },
      },
      Sheet2: {
        keyed: {
          data: {
            action: 'return',
            amount: '20.00',
            card_type: 'amex',
            entry_mode: 'keyed',
            currency_code: '978',
            order_number: 'TEST003',
          },
          // Place under non-mandatory with new currency-country structure
          path: `${TEST_OUTPUT_DIR}/json/non-mandatory/Sheet2/EUR_Europe_978/credit/refund/amex/TEST003_EUR_Europe_978.json`,
        },
      },
    };

    // Create test JSON files
    for (const [sheet, types] of Object.entries(testData)) {
      for (const { data, path: filePath } of Object.values(types)) {
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeJson(filePath, data);
      }
    }
  });

  const findCollections = async (dir) => {
    const collections = [];
    if (await fs.pathExists(dir)) {
      const walk = async (currentDir) => {
        const items = await fs.readdir(currentDir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(currentDir, item.name);
          if (item.isDirectory()) {
            await walk(fullPath);
          } else if (item.name.endsWith('.json')) {
            collections.push(fullPath);
          }
        }
      };
      await walk(dir);
    }
    return collections;
  };

  test('should generate valid Postman collections with dynamic requestType and name', async () => {
    await generatePostmanCollectionsByTransactionType();

    const allCollections = await findCollections(
      path.join(__dirname, `../${TEST_OUTPUT_DIR}/postman`)
    );

    expect(allCollections.length).toBeGreaterThan(0);

    // Check some structure
    const hasKeyed = allCollections.some((f) => f.toLowerCase().includes('keyed'));
    const hasCof = allCollections.some((f) => f.toLowerCase().includes('cof'));
    expect(hasKeyed).toBeTruthy();
    expect(hasCof).toBeTruthy();

    const sampleCollection = await fs.readJson(allCollections[0]);
    const firstItem = sampleCollection.item[0].item[0];

    // Check structure
    expect(firstItem).toHaveProperty('name');
    expect(firstItem.request).toHaveProperty('method', 'POST');
    expect(firstItem.request).toHaveProperty('url');
    expect(firstItem.request).toHaveProperty('body');
    expect(firstItem.request.body).toHaveProperty('raw');

    // Check request URL reflects requestType=zgate
    expect(firstItem.request.url.raw).toContain('{{url}}');
    expect(firstItem.request.header.some((h) => h.key === 'user-id')).toBe(true);
  });

  test('should include correct test scripts in collection', async () => {
    await generatePostmanCollectionsByTransactionType();

    const allCollections = await findCollections(
      path.join(__dirname, `../${TEST_OUTPUT_DIR}/postman`)
    );

    const sampleCollection = await fs.readJson(allCollections[0]);
    const testScript = sampleCollection.item[0].item[0].event[0].script;

    expect(testScript.type).toBe('text/javascript');
    expect(testScript.exec).toEqual([
      'let response = pm.response.json();',
      'let responseCode = pm.response;',
      '',
      'if (responseCode.code === 201) {',
      '    var resp = JSON.parse(responseBody);',
      '    postman.setGlobalVariable("TEST002", resp.data.id);',
      '}',
      '',
      "pm.test(`Transaction status must be 'approved'`, function () {",
      '    pm.expect(response?.data?.verbiage?.toLowerCase()).to.eql("approval");',
      '});',
    ]);
  });

  test('should use PUT method for void transactions', async () => {
    await generatePostmanCollectionsByTransactionType();

    const allCollections = await findCollections(
      path.join(__dirname, `../${TEST_OUTPUT_DIR}/postman`)
    );

    // Find a collection that contains void transactions
    let voidRequest = null;
    for (const collectionPath of allCollections) {
      const collection = await fs.readJson(collectionPath);
      for (const item of collection.item) {
        for (const request of item.item) {
          if (request.name.includes('TEST004') || request.name.toLowerCase().includes('void')) {
            voidRequest = request;
            break;
          }
        }
        if (voidRequest) break;
      }
      if (voidRequest) break;
    }

    expect(voidRequest).not.toBeNull();
    expect(voidRequest.request.method).toBe('PUT');
  });

  test('should use POST method for non-void transactions', async () => {
    await generatePostmanCollectionsByTransactionType();

    const allCollections = await findCollections(
      path.join(__dirname, `../${TEST_OUTPUT_DIR}/postman`)
    );

    const sampleCollection = await fs.readJson(allCollections[0]);
    const nonVoidRequest = sampleCollection.item[0].item[0];

    // This should be a non-void request (TEST002)
    expect(nonVoidRequest.request.method).toBe('POST');
  });
});

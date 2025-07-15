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
    delete require.cache[require.resolve('../zgate-generate-postman-collection')];
  });

  // Create test JSON files
  beforeEach(async () => {
    // Mock process.argv to pass the test output directory - clear all extra args first
    process.argv = process.argv.slice(0, 2); // Keep only node and script name
    process.argv.push(TEST_OUTPUT_DIR); // Add our test output directory

    // Clear module cache and import fresh
    delete require.cache[require.resolve('../zgate-generate-postman-collection')];
    const postmanModule = require('../zgate-generate-postman-collection');
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
          // Place under non-mandatory
          path: `${TEST_OUTPUT_DIR}/json/non-mandatory/Sheet1/credit/authorization/mc/TEST001.json`,
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
          // Place under mandatory
          path: `${TEST_OUTPUT_DIR}/json/mandatory/Sheet1/credit/authorization/visa/TEST002.json`,
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
          // Place under non-mandatory
          path: `${TEST_OUTPUT_DIR}/json/non-mandatory/Sheet2/credit/refund/amex/TEST003.json`,
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

  test('should generate collections for all sheets and currencies', async () => {
    await generatePostmanCollectionsByTransactionType();

    // Function to recursively find all .json files in postman directory
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

    // Find all collections in the postman directory
    const allCollections = await findCollections(
      path.join(__dirname, `../${TEST_OUTPUT_DIR}/postman`)
    );

    expect(allCollections.length).toBeGreaterThan(0);

    // Check for specific collection types
    const hasKeyedAuth = allCollections.some(
      (name) => name.toLowerCase().includes('keyed') && name.toLowerCase().includes('authorization')
    );
    const hasCofAuth = allCollections.some(
      (name) => name.toLowerCase().includes('cof') && name.toLowerCase().includes('authorization')
    );
    const hasKeyedRefund = allCollections.some(
      (name) => name.toLowerCase().includes('keyed') && name.toLowerCase().includes('refund')
    );

    expect(hasKeyedAuth).toBeTruthy();
    expect(hasCofAuth).toBeTruthy();
    expect(hasKeyedRefund).toBeTruthy();

    // Verify collection content
    const collection = await fs.readJson(allCollections[0]);
    expect(collection.item[0].item.length).toBeGreaterThan(0);
    expect(collection.item[0].item[0].request.body.raw).toBeDefined();
  });

  test('should include correct test scripts', async () => {
    await generatePostmanCollectionsByTransactionType();

    // Function to recursively find all .json files in postman directory
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

    const allCollections = await findCollections(
      path.join(__dirname, `../${TEST_OUTPUT_DIR}/postman`)
    );
    expect(allCollections.length).toBeGreaterThan(0);

    const collection = await fs.readJson(allCollections[0]);

    const testScript = collection.item[0].item[0].event[0].script;
    expect(testScript.type).toBe('text/javascript');
    // Fix the test script assertion to match exact array content
    expect(testScript.exec).toEqual([
      'let response = pm.response.json();',
      '',
      "pm.test(`Transaction status must be 'approved'`, function () {",
      '    pm.expect(response.status.toLowerCase()).to.eql("approved");',
      '});',
    ]);
  });
});

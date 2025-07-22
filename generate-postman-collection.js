const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const { v4: uuidv4 } = require('uuid');
const { buildRequest } = require('./requestBuilder');

// === Currency code to country mapping ===
const CURRENCY_COUNTRY_MAP = {
  '036': 'AUD_Australia_036',
  124: 'CAD_Canada_124',
  344: 'HKD_HongKong_344',
  392: 'JPY_Japan_392',
  400: 'JOD_Jordan_400',
  554: 'NZD_NewZealand_554',
  702: 'SGD_Singapore_702',
  764: 'THB_Thailand_764',
  840: 'USD_UnitedStates_840',
  978: 'EUR_Europe_978',
  826: 'GBP_UnitedKingdom_826',
};

// Function to get currency with country name
function getCurrencyWithCountry(currencyCode) {
  return CURRENCY_COUNTRY_MAP[currencyCode] || `${currencyCode}_Unknown`;
}

// === Get command line args requestType ===
const args = process.argv.slice(2);
const requestTypeArg = args.find((arg) => arg.startsWith('--requestType='));
const requestType = requestTypeArg ? requestTypeArg.split('=')[1] : 'zgate';

// === Get command line args for name ===
const nameArg = args.find((arg) => arg.startsWith('--name='));
const collectionName = nameArg ? nameArg.split('=')[1] : 'Zgate';

// Allow override via command line arguments
const BASE_DIR = process.argv[2] || 'output';
const OUTPUT_FOLDER = `${BASE_DIR}/json`;

// Generate timestamped filename for a transaction type
function getTimestampedCollectionPath(groupKey) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const timestamp = `${yyyy}${mm}${dd}_${hh}${min}${ss}`;

  // Parse groupKey to extract information including collectionKey
  const [postmanTypeFolder, sheetName, currencyFolder, collectionKey] = groupKey.split('|');
  const safeType = (postmanTypeFolder + '_' + collectionKey).replace(/[^a-z0-9]/gi, '_').toLowerCase();

  // Build the new name format: CollectionName_ROL021|SheetName|Currency|TransactionType-timestamp
  const newName = `${collectionName}_ROL021|${sheetName}|${currencyFolder}|${collectionKey}-${timestamp}`;

  return {
    path: `${BASE_DIR}/postman/${collectionName.toLowerCase()}_${safeType}_${timestamp}.json`,
    name: newName,
  };
}

const TEST_SCRIPT = [
  'let response = pm.response.json();',
  '',
  "pm.test(`Transaction status must be 'approved'`, function () {",
  '    pm.expect(response.status.toLowerCase()).to.eql("approved");',
  '});',
];

async function generatePostmanCollectionsByTransactionType() {
  const files = glob.sync(`${OUTPUT_FOLDER}/**/*.json`);
  const requestsByTypeAndMode = {};
  const uniqueCurrencyCodes = new Set();

  for (const file of files) {
    const data = await fs.readJson(file);
    const jsonBody = JSON.stringify(data, null, 2);
    const pathParts = file.split(path.sep);
    const pathLength = pathParts.length;
    // Robustly extract sheet name and currency code from file path (folders under 'json')
    const jsonRootIdx = pathParts.findIndex((p) => p === 'json');
    let sheetName = 'UNKNOWN_SHEET';
    let currencyCodeFromPath = '';
    // Detect if the file is under 'mandatory' or 'non-mandatory' for output path
    let postmanTypeFolder = '';
    if (jsonRootIdx !== -1) {
      // Check for mandatory/non-mandatory
      if (pathParts[jsonRootIdx - 1] === 'mandatory') {
        postmanTypeFolder = 'mandatory';
      } else if (pathParts[jsonRootIdx - 1] === 'non-mandatory') {
        postmanTypeFolder = 'non-mandatory';
      }
      // Extract sheet and currency from path
      sheetName = pathParts[jsonRootIdx + 1] || 'UNKNOWN_SHEET';
      currencyCodeFromPath = (pathParts[jsonRootIdx + 2] || '').toUpperCase();
    }
    const paymentType =
      jsonRootIdx !== -1 && pathParts.length > jsonRootIdx + 3
        ? pathParts[jsonRootIdx + 3].toUpperCase()
        : (data.payment_type || 'unknown').toUpperCase();
    const transactionType =
      jsonRootIdx !== -1 && pathParts.length > jsonRootIdx + 4
        ? pathParts[jsonRootIdx + 4].toUpperCase()
        : 'UNKNOWN';
    const cardType =
      jsonRootIdx !== -1 && pathParts.length > jsonRootIdx + 5
        ? pathParts[jsonRootIdx + 5].toUpperCase()
        : (data.card_type || 'unknown').toUpperCase();
    const fileName = path.basename(file, '.json');
    const entryModeRaw = data.entry_mode || data.entry_mode_id || '';
    const entryMode = String(entryModeRaw).trim().toLowerCase();
    const cofType = data.cof_type !== undefined ? String(data.cof_type).trim() : '';
    const orderNumber = data.order_number || fileName;
    // Always use currency code from data for grouping
    const currencyCode = (data.currency_code || currencyCodeFromPath || '')
      .toUpperCase()
      .replace(/\s+/g, '');
    const currencyWithCountry = getCurrencyWithCountry(currencyCode);
    uniqueCurrencyCodes.add(currencyCode);
    let collectionKey = '';
    if ((cofType !== '' && cofType !== '0' && cofType !== 'false') || entryMode === 'c') {
      collectionKey = `COF_${transactionType}_CUR_${currencyWithCountry}`;
    } else if (entryMode === 'keyed' || entryMode === 'k') {
      collectionKey = `KEYED_${transactionType}_CUR_${currencyWithCountry}`;
    } else {
      const entryModeKey = entryMode ? entryMode.toUpperCase().replace(/\s+/g, '') : 'OTHER';
      collectionKey = `${entryModeKey}_${transactionType}_CUR_${currencyWithCountry}`;
    }
    // Group by postmanTypeFolder|sheetName|currencyWithCountry|collectionKey
    const groupKey = `${postmanTypeFolder}|${sheetName}|${currencyWithCountry}|${collectionKey}`;
    if (!requestsByTypeAndMode[groupKey]) {
      requestsByTypeAndMode[groupKey] = [];
    }
    // Create a descriptive name for the Postman request
    const name = `${transactionType} - ${cardType} - ${entryMode.toUpperCase()} - ${currencyWithCountry} - ${orderNumber}`;
    const postmanRequest = {
      name,
      event: [
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: TEST_SCRIPT,
          },
        },
      ],
      request: buildRequest(requestType, jsonBody),
      response: [],
      sheetName: sheetName.toUpperCase(),
      postmanTypeFolder, // Store type for output path
    };
    requestsByTypeAndMode[groupKey].push(postmanRequest);
  }

  for (const [groupKey, requests] of Object.entries(requestsByTypeAndMode)) {
    // Parse groupKey for output path (now includes collectionKey)
    const [postmanTypeFolder, sheetName, currencyFolder, collectionKey] = groupKey.split('|');
    const { path: baseCollectionPath, name: collectionName } =
      getTimestampedCollectionPath(groupKey);
    const collectionPath = postmanTypeFolder
      ? path.join(
          BASE_DIR,
          'postman',
          postmanTypeFolder,
          sheetName,
          currencyFolder,
          path.basename(baseCollectionPath)
        )
      : path.join(
          BASE_DIR,
          'postman',
          sheetName,
          currencyFolder,
          path.basename(baseCollectionPath)
        );
    const postmanCollection = {
      info: {
        _postman_id: uuidv4(),
        name: collectionName,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        _exporter_id: '17429670',
      },
      item: [
        {
          name: 'Test Cases',
          item: requests,
        },
      ],
    };
    fs.ensureDirSync(path.dirname(collectionPath));
    await fs.writeJson(collectionPath, postmanCollection, { spaces: 2 });
  }
}

// Run the script if executed directly
if (require.main === module) {
  generatePostmanCollectionsByTransactionType();
}

// Export for testing
module.exports = {
  generatePostmanCollectionsByTransactionType,
};

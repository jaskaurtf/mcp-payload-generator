const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const { v4: uuidv4 } = require('uuid');
const { buildRequest } = require('./requestBuilder');

// === Currency mapping configuration ===
const CURRENCY_MAP = {
  '036': { code: 'AUD', fullCode: 'AUD_Australia_036' },
  124: { code: 'CAD', fullCode: 'CAD_Canada_124' },
  344: { code: 'HKD', fullCode: 'HKD_HongKong_344' },
  392: { code: 'JPY', fullCode: 'JPY_Japan_392' },
  400: { code: 'JOD', fullCode: 'JOD_Jordan_400' },
  554: { code: 'NZD', fullCode: 'NZD_NewZealand_554' },
  702: { code: 'SGD', fullCode: 'SGD_Singapore_702' },
  764: { code: 'THB', fullCode: 'THB_Thailand_764' },
  840: { code: 'USD', fullCode: 'USD_UnitedStates_840' },
  978: { code: 'EUR', fullCode: 'EUR_Europe_978' },
  826: { code: 'GBP', fullCode: 'GBP_UnitedKingdom_826' },
};

// Function to get currency with country name
function getCurrencyWithCountry(currencyCode) {
  // Try numeric code first
  const numericMatch = CURRENCY_MAP[currencyCode];
  if (numericMatch) return numericMatch.fullCode;

  // Try abbreviation by searching through the map
  const abbreviationMatch = Object.values(CURRENCY_MAP).find(
    (currency) => currency.code === currencyCode
  );
  if (abbreviationMatch) return abbreviationMatch.fullCode;

  // Return unknown format if not found
  return `${currencyCode}_Unknown`;
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
  const safeType = (postmanTypeFolder + '_' + collectionKey)
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();

  // Build the new name format: CollectionName_ROL021|SheetName|Currency|TransactionType-timestamp
  const newName = `${collectionName}_ROL021|${sheetName}|${currencyFolder}|${collectionKey}-${timestamp}`;

  return {
    path: `${BASE_DIR}/postman/${collectionName.toLowerCase()}_${safeType}_${timestamp}.json`,
    name: newName,
  };
}

// Function to generate dynamic TEST_SCRIPT for each request
function generateTestScript(orderNumber) {
  return [
    'let response = pm.response.json();',
    'let responseCode = pm.response;',
    '',
    'if (responseCode.code === 201) {',
    '    var resp = JSON.parse(responseBody);',
    `    postman.setGlobalVariable("${orderNumber}", resp.data.id);`,
    '}',
    '',
    "pm.test(`Transaction status must be 'approved'`, function () {",
    '    pm.expect(response?.data?.verbiage?.toLowerCase()).to.eql("approval");',
    '});',
  ];
}

// Function to read JSON with commented description field
function readJsonWithCommentedDescription(filePath) {
  let fileContent = fs.readFileSync(filePath, 'utf8');

  // Extract commented description before parsing JSON
  let description = '';
  const commentedDescriptionMatch = fileContent.match(
    /\s*\/\/ "description": ("(?:[^"\\]|\\.)*")\s*\n}/
  );
  if (commentedDescriptionMatch) {
    description = JSON.parse(commentedDescriptionMatch[1]);
    // Remove the comment line to make it valid JSON
    fileContent = fileContent.replace(/\s*\/\/ "description": "(?:[^"\\]|\\.)*"\s*\n}/, '\n}');
  }

  const data = JSON.parse(fileContent);
  if (description) {
    data.description = description;
  }

  return data;
}

async function generatePostmanCollectionsByTransactionType() {
  const files = glob.sync(`${OUTPUT_FOLDER}/**/*.json`);
  const requestsByTypeAndMode = {};
  const uniqueCurrencyCodes = new Set();

  for (const file of files) {
    const data = readJsonWithCommentedDescription(file);

    // Extract description for use in building request but remove it from the JSON body
    const extractedDescription = data.description || '';
    const dataForPostman = { ...data };
    delete dataForPostman.description;
    const jsonBody = JSON.stringify(dataForPostman, null, 2);

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
      collectionKey = `COF_${transactionType}`;
    } else if (entryMode === 'keyed' || entryMode === 'k') {
      collectionKey = `KEYED_${transactionType}`;
    } else {
      const entryModeKey = entryMode ? entryMode.toUpperCase().replace(/\s+/g, '') : 'OTHER';
      collectionKey = `${entryModeKey}_${transactionType}`;
    }
    // Group by postmanTypeFolder|sheetName|currencyWithCountry|collectionKey
    const groupKey = `${postmanTypeFolder}|${sheetName}|${currencyWithCountry}|${collectionKey}`;
    if (!requestsByTypeAndMode[groupKey]) {
      requestsByTypeAndMode[groupKey] = [];
    }
    // Create a descriptive name for the Postman request
    const transactionAmount = data.transaction_amount || data.amount || '';
    const description = extractedDescription;
    const name = `${transactionType} - ${cardType} - ${entryMode.toUpperCase()} - ${currencyWithCountry} - ${transactionAmount} - ${orderNumber}`;
    const postmanRequest = {
      name,
      event: [
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: generateTestScript(orderNumber),
          },
        },
      ],
      request: buildRequest(requestType, jsonBody, description, orderNumber, transactionType),
      response: [],
      sheetName: sheetName.toUpperCase(),
      postmanTypeFolder, // Store type for output path
    };
    requestsByTypeAndMode[groupKey].push(postmanRequest);
  }

  for (const [groupKey, requests] of Object.entries(requestsByTypeAndMode)) {
    // Sort requests: POST transactions first, then PUT transactions
    requests.sort((a, b) => {
      const methodA = a.request.method;
      const methodB = b.request.method;

      // POST comes before PUT
      if (methodA === 'POST' && methodB === 'PUT') return -1;
      if (methodA === 'PUT' && methodB === 'POST') return 1;

      // If same method, maintain original order (stable sort)
      return 0;
    });

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

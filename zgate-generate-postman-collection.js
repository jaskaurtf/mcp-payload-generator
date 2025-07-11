const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const { v4: uuidv4 } = require('uuid');

const OUTPUT_FOLDER = 'output/json';

// Generate timestamped filename for a transaction type
function getTimestampedCollectionPath(transactionType) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const timestamp = `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
  const safeType = transactionType.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return {
    path: `output/postman/postman_collection_${safeType}_${timestamp}.json`,
    name: `Automated Zgate Rapid Connect ${transactionType} - ${timestamp}`,
  };
}

const testScript = [
  'let response = pm.response.json();',
  '',
  "pm.test(`Transaction status must be 'approved'`, function () {",
  '    pm.expect(response.status.toLowerCase()).to.eql("approved");',
  '});',
];

async function generatePostmanCollectionsByTransactionType() {
  const files = glob.sync(`${OUTPUT_FOLDER}/**/*.json`);
  const requestsByTypeAndMode = {};

  for (const file of files) {
    const data = await fs.readJson(file);
    const jsonBody = JSON.stringify(data, null, 2);
    const pathParts = file.split(path.sep);
    const pathLength = pathParts.length;
    const transactionType = (pathParts[pathLength - 3] || 'unknown').toUpperCase();
    const paymentType = (pathParts[pathLength - 4] || 'unknown').toUpperCase();
    const cardType = (pathParts[pathLength - 2] || 'unknown').toUpperCase();
    const fileName = path.basename(file, '.json');
    const entryModeRaw = data.entry_mode || '';
    const entryMode = String(entryModeRaw).trim().toLowerCase();
    const cofType = data.cof_type !== undefined ? String(data.cof_type).trim() : '';
    const orderNumber = data.order_number || fileName;
    const currencyCode = (data.trans_currency || '').toUpperCase().replace(/\s+/g, '');
    const name = `[${orderNumber}] ${paymentType} ${transactionType} - ${cardType} ${entryMode}`;
    const postmanRequest = {
      name,
      event: [
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: testScript,
          },
        },
      ],
      request: {
        method: 'POST',
        header: [
          { key: 'user-id', value: '{{ecomm_user_id}}' },
          { key: 'user-key', value: '{{ecomm_user_key}}' },
          { key: 'Content-Type', value: 'application/json' },
        ],
        body: { mode: 'raw', raw: jsonBody },
        url: {
          raw: 'https://{{url}}/{{namespace}}/transactions',
          protocol: 'https',
          host: ['{{url}}'],
          path: ['{{namespace}}', 'transactions'],
        },
      },
      response: [],
    };
    // Determine collection type: 'keyed' or 'cof'
    let collectionKey = '';
    if (cofType !== '' && cofType !== '0' && cofType !== 'false') {
      collectionKey = `COF_${transactionType}`;
    } else if (entryMode === 'keyed') {
      collectionKey = `KEYED_${transactionType}`;
    } else {
      const entryModeKey = entryMode ? entryMode.toUpperCase().replace(/\s+/g, '') : 'OTHER';
      collectionKey = `${entryModeKey}_${transactionType}`;
    }
    if (!requestsByTypeAndMode[collectionKey]) {
      requestsByTypeAndMode[collectionKey] = [];
    }
    requestsByTypeAndMode[collectionKey].push(postmanRequest);
  }

  for (const [collectionKey, requests] of Object.entries(requestsByTypeAndMode)) {
    const { path: collectionPath, name: collectionName } =
      getTimestampedCollectionPath(collectionKey);
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
    console.log(`Postman collection written to: ${collectionPath}`);
  }
}

generatePostmanCollectionsByTransactionType();

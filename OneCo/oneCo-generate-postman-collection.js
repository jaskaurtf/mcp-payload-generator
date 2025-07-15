const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const { v4: uuidv4 } = require('uuid');

const OUTPUT_FOLDER = 'output/json';

const TEST_SCRIPT = [
  'let response = pm.response.json();',
  '',
  "pm.test(`Transaction status must be 'approved'`, function () {",
  '    pm.expect(response.status.toLowerCase()).to.eql("approved");',
  '});',
];

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
    name: `Automated OneCo Rapid Connect ${transactionType} - ${timestamp}`,
  };
}

async function generatePostmanCollectionsByTransactionType() {
  const files = glob.sync(`${OUTPUT_FOLDER}/**/*.json`);
  const requestsByType = {};

  for (const file of files) {
    const data = await fs.readJson(file);
    const jsonBody = JSON.stringify(data, null, 2);

    const pathParts = file.split(path.sep);
    const transactionType = (pathParts[pathParts.length - 3] || 'unknown').toUpperCase();
    const paymentType = (pathParts[pathParts.length - 4] || 'unknown').toUpperCase();
    const cardType = (pathParts[pathParts.length - 2] || 'unknown').toUpperCase();
    const fileName = path.basename(file, '.json');
    const entryMode = (data.entry_mode_id || '').toLowerCase();
    const orderNumber = data.order_number || fileName;

    const name = `[${orderNumber}] ${paymentType} ${transactionType} - ${cardType} ${entryMode}`;

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
      request: {
        method: 'POST',
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
          raw: 'https://{{url}}/{{namespace}}/transactions/cc/sale/keyed',
          protocol: 'https',
          host: ['{{url}}'],
          path: ['{{namespace}}', 'transactions/cc/sale/keyed'],
        },
      },
      response: [],
    };

    if (!requestsByType[transactionType]) {
      requestsByType[transactionType] = [];
    }
    requestsByType[transactionType].push(postmanRequest);
  }

  for (const [transactionType, requests] of Object.entries(requestsByType)) {
    const { path: collectionPath, name: collectionName } = getTimestampedCollectionPath(transactionType);
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

generatePostmanCollectionsByTransactionType();

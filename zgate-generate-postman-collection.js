const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const { v4: uuidv4 } = require('uuid');

const OUTPUT_FOLDER = 'output_jsons';
const FINAL_COLLECTION_PATH = 'postman_collection.json';

const testScript = [
  "if (responseHeaders.hasOwnProperty(\"Access-Control-Allow-Origin\")) {",
  "    tests[\"CORS is present\"] = (responseHeaders['Access-Control-Allow-Origin'] === '*') ? true : false;",
  "} else {",
  "    tests[\"CORS is present\"] = false;",
  "}",
  "",
  "tests[\"Status code is 201\"] = responseCode.code === 201;",
  "",
  "if (responseCode.code === 201) {",
  "    let data = JSON.parse(responseBody);",
  "    pm.test(\"Transaction is Approved or Declined\", function() {",
  "        pm.expect(data.status).to.be.oneOf(['approved','declined']);",
  "    });",
  "    pm.globals.set(\"ecomm_batch\", data.batch);",
  "    pm.globals.set(\"ecomm_last_transaction_id\", data.id);",
  "}"
];

async function generatePostmanCollection() {
  const postmanCollection = {
    info: {
      _postman_id: uuidv4(),
      name: "Zgate Rapid Connect Tests - ROL21",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      _exporter_id: "17429670"
    },
    item: [
      {
        name: "Test Cases",
        item: []
      }
    ]
  };

  const files = glob.sync(`${OUTPUT_FOLDER}/**/*.json`);

  for (const file of files) {
    const data = await fs.readJson(file);
    const jsonBody = JSON.stringify(data, null, 2);

    const pathParts = file.split(path.sep);
    const pathLength = pathParts.length;

    const paymentType = (pathParts[pathLength - 4] || 'unknown').toUpperCase();
    const transactionType = (pathParts[pathLength - 3] || 'unknown').toUpperCase();
    const cardType = (pathParts[pathLength - 2] || 'unknown').toUpperCase();
    const fileName = path.basename(file, '.json');
    const entryMode = (data.entry_mode || 'unknown').toUpperCase();
    const orderNumber = data.order_number || fileName;

    const name = `[${orderNumber}] ${paymentType} ${transactionType} - ${cardType} ${entryMode}`;

    const postmanRequest = {
      name,
      event: [
        {
          listen: "test",
          script: {
            type: "text/javascript",
            exec: testScript
          }
        }
      ],
      request: {
        method: "POST",
        header: [
          {
            key: "user-id",
            value: "{{ecomm_user_id}}"
          },
          {
            key: "user-key",
            value: "{{ecomm_user_key}}"
          },
          {
            key: "Content-Type",
            value: "application/json"
          }
        ],
        body: {
          mode: "raw",
          raw: jsonBody
        },
        url: {
          raw: "https://{{url}}/{{namespace}}/transactions",
          protocol: "https",
          host: ["{{url}}"],
          path: ["{{namespace}}", "transactions"]
        }
      },
      response: []
    };

    postmanCollection.item[0].item.push(postmanRequest);
  }

  await fs.writeJson(FINAL_COLLECTION_PATH, postmanCollection, { spaces: 2 });
}

generatePostmanCollection();

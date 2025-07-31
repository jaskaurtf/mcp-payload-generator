const { processSheetData } = require('../oneco-script.js');
const fs = require('fs-extra');

const testData = [
  {
    description:
      'Void No encryption or tokenization SSL transaction. Send XML tag EcommTxnInd with the value of 03.',
    'test case number': 'TEST123',
    'transaction amount': '10.00',
    'entry mode': 'keyed',
    'trans. currency': '840',
    'account number': '4264281500006662',
  },
];

const result = processSheetData('TestSheet', testData, './temp-test');
fs.ensureDirSync('./temp-test');

const { jsonOutput, description } = result[0];

function writeJsonWithCommentedDescription(filePath, jsonData, description = '') {
  let jsonString = JSON.stringify(jsonData, null, 2);

  if (description) {
    const closingBrace = '\n}';
    const commentLine = `  // "description": ${JSON.stringify(description)}${closingBrace}`;
    jsonString = jsonString.replace(closingBrace, ',\n' + commentLine);
  }

  fs.writeFileSync(filePath, jsonString);
}

writeJsonWithCommentedDescription('./temp-test/test.json', jsonOutput, description);
console.log('Generated file content:');
console.log(fs.readFileSync('./temp-test/test.json', 'utf8'));

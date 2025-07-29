const { processSheetData } = require('./oneco-script.js');
const fs = require('fs-extra');

const testData = [
  {
    description:
      'Void No encryption or tokenization SSL transaction. Send XML tag EcommTxnInd with the value of 03. Send XML tag VisaAuthInd with the value of EstAuth. Please use mid RCTST0000000000 for this testcase',
    'test case number': 'TEST123',
    'transaction amount': '10.00',
    'entry mode': 'keyed',
    'trans. currency': '840',
  },
];

const result = processSheetData('TestSheet', testData, './temp-test');
fs.ensureDirSync('./temp-test');

// Function to write JSON with commented description field (same as in oneco-script.js)
function writeJsonWithCommentedDescription(filePath, jsonData) {
  const { description, ...jsonWithoutDescription } = jsonData;
  let jsonString = JSON.stringify(jsonWithoutDescription, null, 2);

  if (description) {
    const closingBrace = '\n}';
    const commentLine = `  // "description": ${JSON.stringify(description)}${closingBrace}`;
    jsonString = jsonString.replace(closingBrace, ',\n' + commentLine);
  }

  fs.writeFileSync(filePath, jsonString);
}

writeJsonWithCommentedDescription('./temp-test/example.json', result[0].jsonOutput);
console.log('Generated file content:');
console.log(fs.readFileSync('./temp-test/example.json', 'utf8'));

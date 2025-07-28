const { processSheetData } = require('./oneco-script.js');

// Test data with "Secure Electronic Commerce transaction." in description
const testData = [
  {
    'Account Number': '4111111111111111',
    'Transaction Amount': '10.00',
    'Entry Mode': 'keyed',
    'Trans. Currency': '840',
    'Test Case Number': 'TEST001',
    Description: 'Secure Electronic Commerce transaction.',
  },
  {
    'Account Number': '4111111111111112',
    'Transaction Amount': '20.00',
    'Entry Mode': 'keyed',
    'Trans. Currency': '840',
    'Test Case Number': 'TEST002',
    Description: 'Regular transaction',
  },
];

console.log('Testing secure_auth_data functionality...');

const outputs = processSheetData('TestSheet', testData, 'test-output');

outputs.forEach((output, index) => {
  console.log(`\nTest ${index + 1}:`);
  console.log('Description:', testData[index]['Description']);
  console.log('Has secure_auth_data:', output.jsonOutput.hasOwnProperty('secure_auth_data'));
  if (output.jsonOutput.secure_auth_data) {
    console.log('secure_auth_data value:', output.jsonOutput.secure_auth_data);
  }
  console.log('JSON Output:', JSON.stringify(output.jsonOutput, null, 2));
});

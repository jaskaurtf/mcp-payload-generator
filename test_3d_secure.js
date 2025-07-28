const { processSheetData } = require('./oneco-script.js');

// Test data with different description scenarios
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
    Description: '3-D Secure transaction for authentication',
  },
  {
    'Account Number': '4111111111111113',
    'Transaction Amount': '30.00',
    'Entry Mode': 'keyed',
    'Trans. Currency': '840',
    'Test Case Number': 'TEST003',
    Description: 'Regular transaction without special handling',
  },
];

console.log('Testing secure_auth_data and threedsecure functionality...');

const outputs = processSheetData('TestSheet', testData, 'test-output');

outputs.forEach((output, index) => {
  console.log(`\n=== Test ${index + 1} ===`);
  console.log('Description:', testData[index]['Description']);
  console.log('Has secure_auth_data:', output.jsonOutput.hasOwnProperty('secure_auth_data'));
  console.log('Has threedsecure:', output.jsonOutput.hasOwnProperty('threedsecure'));

  if (output.jsonOutput.secure_auth_data) {
    console.log('secure_auth_data value:', output.jsonOutput.secure_auth_data);
  }
  if (output.jsonOutput.threedsecure) {
    console.log('threedsecure value:', output.jsonOutput.threedsecure);
  }

  console.log('Relevant JSON fields:');
  const relevantFields = {
    order_number: output.jsonOutput.order_number,
    description: output.jsonOutput.description,
  };
  if (output.jsonOutput.secure_auth_data)
    relevantFields.secure_auth_data = output.jsonOutput.secure_auth_data;
  if (output.jsonOutput.threedsecure) relevantFields.threedsecure = output.jsonOutput.threedsecure;

  console.log(JSON.stringify(relevantFields, null, 2));
});

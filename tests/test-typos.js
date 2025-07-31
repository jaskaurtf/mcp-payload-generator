const { processSheetData } = require('../oneco-script.js');

console.log('Testing typo-tolerant secure auth detection:');

const tests = [
  { description: 'Secure Electronic Commerce transaction.' },
  { description: 'Secure Electronic Commerce transction' },
  { description: 'SECURE ELECTRONIC COMMERCE TRANSACTION' },
  { description: '3-D Secure transaction' },
  { description: '3D secure transaction' },
  { description: 'secure electronik commerce transction' },
];

tests.forEach((test, i) => {
  const result = processSheetData('test', [test]);
  const output = result[0].jsonOutput;
  console.log(`Test ${i + 1}: '${test.description}'`);
  console.log(`  secure_auth_data: ${output.secure_auth_data || 'not set'}`);
  console.log(`  threedsecure: ${output.threedsecure || 'not set'}`);
  console.log('');
});

const xlsx = require('xlsx');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

const inputFile = 'TestScript-test.xlsx';
const outputFile = 'output/grouped_test_cases.csv';

const workbook = xlsx.readFile(inputFile);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const jsonData = xlsx.utils.sheet_to_json(sheet, { defval: '' });

// === Get command line args requestType ===
const args = process.argv.slice(2);
const countryCodeArg = args.find((arg) => arg.startsWith('--countryCode='));
const countryCode = countryCodeArg.split('=')[1];

// === CURRENCY CODE TO COUNTRY MAPPING ===
const CURRENCY_MAP = {
  '036': { name: 'Australia', code: 'AUD', fullCode: 'AUD_Australia_036', symbol: '$' },
  124: { name: 'Canada', code: 'CAD', fullCode: 'CAD_Canada_124', symbol: '$' },
  344: { name: 'HongKong', code: 'HKD', fullCode: 'HKD_HongKong_344', symbol: '$' },
  392: { name: 'Japan', code: 'JPY', fullCode: 'JPY_Japan_392', symbol: '¥' },
  400: { name: 'Jordan', code: 'JOD', fullCode: 'JOD_Jordan_400', symbol: 'JOD' },
  554: { name: 'NewZealand', code: 'NZD', fullCode: 'NZD_NewZealand_554', symbol: '$' },
  702: { name: 'Singapore', code: 'SGD', fullCode: 'SGD_Singapore_702', symbol: '$' },
  764: { name: 'Thailand', code: 'THB', fullCode: 'THB_Thailand_764', symbol: '฿' },
  840: { name: 'United States', code: 'USD', fullCode: 'USD_UnitedStates_840', symbol: '$' },
  978: { name: 'Europe', code: 'EUR', fullCode: 'EUR_Europe_978', symbol: '€' },
  826: { name: 'United Kingdom', code: 'GBP', fullCode: 'GBP_UnitedKingdom_826', symbol: '£' },
};

// Filter Currency Code based on dynamic param and process
const results = [];

jsonData.forEach((row) => {
  if (String(row['Trans.\r\nCurrency']).trim() === countryCode) {
    const description = row['Description'] || '';
    const testCaseNumber = String(row['Test Case Number']).trim();
    const transactionAmount = CURRENCY_MAP[countryCode].symbol + String(row['Transaction Amount']).trim();
    const cardType = String(row['Card Type']).trim();

    const ecommMatch = description.match(/EcommTxnInd.*?value of (\d{2})/);
    const refundMatch = description.match(/RefundType.*?'(\w+)'/);
    const visaMatch = description.match(/VisaAuthInd.*?'(\w+)'/);

    let txnDesc = '';
    if (description.includes('Secure Electronic Commerce transaction')) {
      txnDesc = 'Secure Electronic Commerce transaction';
    } else if (description.includes('Non-authenticated 3-D Secure transaction')) {
      txnDesc = 'Non-authenticated 3-D Secure transaction';
    } else if (description.includes('SSL transaction')) {
      txnDesc = 'SSL transaction';
    }

    const ecommTxnInd = ecommMatch ? ecommMatch[1] : '';
    const refundType = refundMatch ? refundMatch[1] : '';
    const visaAuthInd = visaMatch ? visaMatch[1] : '';

    const label = description.trim().toLowerCase().startsWith('void')
      ? '(Void)'
      : '(Authorization)';
    const labeledTestCase = `${testCaseNumber} ${label}`;

    results.push({
      testCase: labeledTestCase,
      transactionAmount,
      ecommTxnInd,
      visaAuthInd,
      refundType,
      txnDesc,
      cardType,
    });
  }
});

// Group by keys
const groupedMap = {};

results.forEach((row) => {
  const key = [
    row.transactionAmount,
    row.ecommTxnInd,
    row.visaAuthInd,
    row.refundType,
    row.txnDesc,
    row.cardType,
  ].join('|');

  if (!groupedMap[key]) {
    groupedMap[key] = {
      transactionAmount: row.transactionAmount,
      ecommTxnInd: row.ecommTxnInd,
      visaAuthInd: row.visaAuthInd,
      refundType: row.refundType,
      txnDesc: row.txnDesc,
      cardType: row.cardType,
      testCases: [],
    };
  }

  groupedMap[key].testCases.push(row.testCase);
});

// Format for CSV
const finalData = Object.values(groupedMap).map((group, index) => ({
  'Sr. No.': index + 1,
  'Test Case Numbers': group.testCases.join(' '),
  'Transaction Amount': group.transactionAmount,
  EcommTxnInd: group.ecommTxnInd,
  VisaAuthInd: group.visaAuthInd,
  RefundType: group.refundType,
  'Transaction Description': group.txnDesc,
  'Card Type': group.cardType,
}));

// Write output to CSV
const csvWriter = createCsvWriter({
  path: outputFile,
  header: [
    { id: 'Sr. No.', title: 'Sr. No.' },
    { id: 'Test Case Numbers', title: 'Test Case Numbers' },
    { id: 'Transaction Amount', title: 'Transaction Amount' },
    { id: 'EcommTxnInd', title: 'EcommTxnInd' },
    { id: 'VisaAuthInd', title: 'VisaAuthInd' },
    { id: 'RefundType', title: 'RefundType' },
    { id: 'Transaction Description', title: 'Transaction Description' },
    { id: 'Card Type', title: 'Card Type' },
  ],
});

csvWriter.writeRecords(finalData).then(() => console.log(`✅ Output written to ${outputFile}`));

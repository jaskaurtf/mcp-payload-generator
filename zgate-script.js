const xlsx = require('xlsx');
const fs = require('fs-extra');
const path = require('path');

// === CONFIGURATION ===
const DEFAULT_EXCEL_FILE_PATH = 'TestScript-test.xlsx';
const DEFAULT_OUTPUT_BASE_DIR = 'output/json';

// Allow override via command line arguments
const EXCEL_FILE_PATH = process.argv[2] || DEFAULT_EXCEL_FILE_PATH;
const OUTPUT_BASE_DIR = process.argv[3] ? `${process.argv[3]}/json` : DEFAULT_OUTPUT_BASE_DIR;

// === HEADER -> JSON FIELD MAP ===
const FIELD_MAP = {
  'avs billing address': 'billing_street',
  'avs billing postal code': 'billing_zip',
  'bill payment indicator': 'bill_payment',
  'tax indicator': 'sales_tax',
  'deferred payment plan': 'deferred',
  'transaction amount': 'amount',
  'account number': 'account_number',
  'entry mode': 'entry_mode',
  'trans. currency': 'currency_code',
  'card type': 'card_type',
  'payment type': 'payment_type',
  'test case number': 'order_number',
  'ccv data': 'cvv',
};

// === DEFAULT VALUES ===
const DEFAULTS = {
  terminal_msr_capable: 0,
  debit: 0,
  card_id_code: '01',
  secure_auth_data: 'MDAwMDAwMDAwMDAwMDAwMzIyNzY=',
  exp_date: '1226',
  partial_auth_capability: '1',
  card_present: false,
};

// === TRANSACTION TYPE → ACTION MAP ===
const ACTION_MAP = {
  authorization: 'sale',
  refund: 'return',
  verification: 'avsonly',
};

// === TYPE NORMALIZATION FOR ADDITIONAL AMOUNTS ===
const TYPE_NORMALIZER = {
  hltcare: 'healthcare',
  rx: 'rx',
  clinical: 'clinical',
  dental: 'dental',
};

// === MAIN FUNCTION ===
// Pure function: process a single sheet's data (array of rows)
function processSheetData(sheetName, rawData, outputBaseDir = OUTPUT_BASE_DIR) {
  // Normalize headers and create cleaned row list
  const cleanedData = rawData.map((row) => {
    const cleaned = {};
    Object.entries(row).forEach(([key, value]) => {
      const normalizedKey = key
        .replace(/\s+/g, ' ')
        .replace(/\r?\n|\r/g, ' ')
        .trim()
        .toLowerCase();
      cleaned[normalizedKey] = value;
    });
    return cleaned;
  });

  const outputs = [];
  cleanedData.forEach((row) => {
    const jsonOutput = { ...DEFAULTS };
    // Map direct fields, only add if value is not empty
    for (const [header, jsonKey] of Object.entries(FIELD_MAP)) {
      if (row[header] !== undefined && String(row[header]).trim() !== '') {
        if (jsonKey === 'card_type') {
          let cardTypeValue = String(row[header]).toLowerCase();
          if (cardTypeValue === 'mastercard') {
            cardTypeValue = 'mc';
          } else if (cardTypeValue === 'discover') {
            cardTypeValue = 'disc';
          }
          jsonOutput[jsonKey] = cardTypeValue;
        } else {
          jsonOutput[jsonKey] = String(row[header]);
        }
      }
    }
    // Set action
    const transactionType = (row['transaction type'] || '').toLowerCase();
    jsonOutput.action = ACTION_MAP[transactionType] || transactionType;
    // If entry mode is COF, add cof_type: 0
    if ((row['entry mode'] || '').trim().toLowerCase() === 'cof') {
      jsonOutput.cof_type = 0;
    }
    // Additional Amounts block
    const amtStr = row['additional amount'] || '';
    const typeStr = row['additional amount type'] || '';
    const amountList = amtStr.split(',').map((a) => a.trim());
    const typeList = typeStr.split(',').map((t) => t.trim().toLowerCase());
    const additionalAmounts = [];
    for (let i = 0; i < Math.min(amountList.length, typeList.length); i++) {
      const amount = amountList[i];
      const rawType = typeList[i];
      const normalizedType = TYPE_NORMALIZER[rawType] || rawType;
      if (normalizedType && amount) {
        additionalAmounts.push({
          type: normalizedType,
          amount,
        });
      }
    }
    if (additionalAmounts.length > 0) {
      jsonOutput.additional_amounts = additionalAmounts;
    }
    // Folder structure
    let cardType = (row['card type'] || 'unknown').toLowerCase().replace(/\s+/g, '_');
    if (cardType === 'mastercard') {
      cardType = 'mc';
    } else if (cardType === 'discover') {
      cardType = 'disc';
    }
    const paymentType = (row['payment type'] || 'unknown').toLowerCase().replace(/\s+/g, '_');
    const transTypeFolder = transactionType || 'unknown';
    const orderNumber =
      row['test case number'] || `unknown-${Math.random().toString(36).slice(2, 8)}`;
    // Group by currency code
    const currencyCode = (row['trans. currency'] || 'unknown').toUpperCase().replace(/\s+/g, '');
    // Add sheetName and currencyCode to output path
    const outputDir = path.join(
      outputBaseDir,
      sheetName,
      currencyCode,
      paymentType,
      transTypeFolder,
      cardType
    );
    const outputPath = path.join(outputDir, `${orderNumber}.json`);
    outputs.push({ outputDir, outputPath, jsonOutput });
  });
  return outputs;
}

function processExcelFile(filePath = EXCEL_FILE_PATH, outputBaseDir = OUTPUT_BASE_DIR) {
  const workbook = xlsx.readFile(filePath);
  workbook.SheetNames.forEach((sheetName) => {
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    const outputs = processSheetData(sheetName, rawData, outputBaseDir);
    outputs.forEach(({ outputDir, outputPath, jsonOutput }) => {
      fs.ensureDirSync(outputDir);
      fs.writeJsonSync(outputPath, jsonOutput, { spaces: 2 });
    });
  });
}

if (require.main === module) {
  processExcelFile();
}

module.exports = {
  processExcelFile,
  processSheetData,
};

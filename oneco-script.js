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
  'transaction amount': 'transaction_amount',
  'notification email address': 'notification_email_address',
  'ccv data': 'cvv',
  'entry mode': 'entry_mode_id',
  'avs billing postal code': 'postal_code',
};

// === DEFAULTS ===
const DEFAULTS = {
  location_id: '{{location_id}}',
  product_transaction_id: '{{product_transaction_id_ecommerce_surcharge}}',
  initiation_type: '',
  surcharge_amount: '0',
  notification_email_address: '',
  account_holder_name: '',
  exp_date: "1226",
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
      const row_value = row[header];
      if (row_value !== undefined && String(row_value).trim() !== '') {
        if (jsonKey === 'entry_mode_id') {
          jsonOutput[jsonKey] = row_value.trim().charAt(0).toUpperCase();
        } else if (jsonKey === 'postal_code') {
          jsonOutput.billing_address = { postal_code: String(row_value).trim() };
        } else {
          jsonOutput[jsonKey] = String(row_value).trim();
        }
      }
    }
    // Set action
    const transactionType = (row['transaction type'] || '').toLowerCase();
    // === Calculate subtotal_amount from "Additional Amount" column ===
    const addAmountStr = row['additional amount'] || '';
    const subtotal = addAmountStr
      .split(',')
      .map(val => parseFloat(val.trim()) || 0)
      .reduce((sum, val) => sum + val, 0);
    jsonOutput.subtotal_amount = subtotal.toFixed(2);

    // Folder structure
    let cardType = (row['card type'] || 'unknown').toLowerCase().replace(/\s+/g, '_');
    if (cardType === 'mastercard') {
      cardType = 'mc';
    } else if (cardType === 'discover') {
      cardType = 'disc';
    }

    jsonOutput.account_number = '{{' + cardType + '_' + row['entry mode']?.toLowerCase() + '}}';

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

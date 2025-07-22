const xlsx = require('xlsx');
const fs = require('fs-extra');
const path = require('path');

// === CURRENCY CODE TO COUNTRY MAPPING ===
const CURRENCY_COUNTRY_MAP = {
  '036': 'AUD_Australia_036',
  124: 'CAD_Canada_124',
  344: 'HKD_HongKong_344',
  392: 'JPY_Japan_392',
  400: 'JOD_Jordan_400',
  554: 'NZD_NewZealand_554',
  702: 'SGD_Singapore_702',
  764: 'THB_Thailand_764',
  840: 'USD_UnitedStates_840',
  978: 'EUR_Europe_978',
  826: 'GBP_UnitedKingdom_826',
};

// Function to get currency with country name
function getCurrencyWithCountry(currencyCode) {
  return CURRENCY_COUNTRY_MAP[currencyCode] || currencyCode;
}

// === CONFIGURATION ===
const DEFAULT_EXCEL_FILE_PATH = 'TestScript-test.xlsx';
const DEFAULT_OUTPUT_BASE_DIR = 'output/json';

// Allow override via command line arguments
const EXCEL_FILE_PATH = process.argv[2] || DEFAULT_EXCEL_FILE_PATH;
const OUTPUT_BASE_DIR = process.argv[3] ? `${process.argv[3]}/json` : DEFAULT_OUTPUT_BASE_DIR;

// === HEADER -> JSON FIELD MAP ===
const FIELD_MAP = {
  'account number': 'account_number',
  'transaction amount': 'transaction_amount',
  'notification email address': 'notification_email_address',
  'ccv data': 'cvv',
  'entry mode': 'entry_mode_id',
  'industry': 'industry_type',
  'trans. currency': 'currency_code',
  'test case number': 'test_case_number',
  'avs billing address': 'billing_street',
  'avs billing postal code': 'postal_code',
  'bill payment indicator': 'bill_payment',
  'tax indicator': 'sales_tax',
  'card type': 'card_type',
  'payment type': 'payment_type',
};

// === DEFAULTS ===
const DEFAULTS = {
  location_id: '{{location_id}}',
  product_transaction_id: '{{product_transaction_id_ecommerce}}',
  initiation_type: '',
  surcharge_amount: '0',
  notification_email_address: '',
  account_holder_name: '',
  exp_date: '1226',
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
        } else if (jsonKey === 'bill_payment') {
          jsonOutput.bill_payment = row_value;
          jsonOutput.bill_payment_indicator = {
            installment: row_value === 'Installment' ? true : false,
            installment_number: 1, //default is = 1
            installment_count: 1
          };
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
      .map((val) => parseFloat(val.trim()) || 0)
      .reduce((sum, val) => sum + val, 0);
    jsonOutput.subtotal_amount = subtotal.toFixed(2);

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
    // Get currency with country name (e.g., "400" becomes "JOD_Jordan_400")
    const currencyWithCountry = getCurrencyWithCountry(currencyCode);
    // Add sheetName and currencyWithCountry to output path
    const outputDir = path.join(
      outputBaseDir,
      sheetName,
      currencyWithCountry,
      paymentType,
      transTypeFolder,
      cardType
    );
    // Include the currency with country information in the filename
    const outputPath = path.join(outputDir, `${orderNumber}_${currencyWithCountry}.json`);
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

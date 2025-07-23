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
  'test case number': 'order_number',
  'avs billing address': 'billing_address',
  'bill payment indicator': 'bill_payment',
  'card type': 'card_type',
  'payment type': 'payment_type',
  'ebt type': 'ebt_type',
};

// === DEFAULTS ===
const DEFAULTS = {
  location_id: '{{location_id}}',
  product_transaction_id: '{{product_transaction_id_ecommerce}}',
  exp_date: '1226',
};

// === TYPE NORMALIZATION FOR ADDITIONAL AMOUNTS ===
const TYPE_NORMALIZER = {
  hltcare: 'healthcare',
  rx: 'rx',
  clinical: 'clinical',
  dental: 'dental',
};

// === CARD TYPE MAPPING ===
const CARD_TYPE_MAP = {
  mastercard: 'mc',
  discover: 'disc',
};

// === UTILITY FUNCTIONS ===
function normalizeCardType(cardType) {
  const normalized = (cardType || 'unknown').toLowerCase().replace(/\s+/g, '_');
  return CARD_TYPE_MAP[normalized] || normalized;
}

function createBillingAddress(row) {
  return {
    city: '',
    state: '',
    postal_code: row['avs billing postal code'] || '',
    phone: '',
    country: '',
  };
}

function handleBillPayment(value) {
  return {
    bill_payment: !!value,
    installment: value === 'Installment',
    installment_number: 1,
    installment_count: 1,
    recurring: value === 'Recurring',
    recurring_number: 1,
  };
}

function parseAdditionalAmounts(amtStr, typeStr) {
  if (!amtStr || !typeStr) return [];

  const amountList = amtStr.split(',').map((a) => a.trim());
  const typeList = typeStr.split(',').map((t) => t.trim().toLowerCase());

  const additionalAmounts = [];
  for (let i = 0; i < Math.min(amountList.length, typeList.length); i++) {
    const amount = amountList[i];
    const rawType = typeList[i];
    const normalizedType = TYPE_NORMALIZER[rawType] || rawType;

    if (normalizedType && amount) {
      additionalAmounts.push({ type: normalizedType, amount });
    }
  }

  return additionalAmounts;
}

function mapRowToJson(row) {
  const jsonOutput = { ...DEFAULTS };

  // Map direct fields
  Object.entries(FIELD_MAP).forEach(([header, jsonKey]) => {
    const value = row[header];
    if (value === undefined || String(value).trim() === '') return;

    switch (jsonKey) {
      case 'entry_mode_id':
        jsonOutput[jsonKey] = String(value).trim().charAt(0).toUpperCase();
        break;
      case 'bill_payment':
        Object.assign(jsonOutput, handleBillPayment(value));
        break;
      case 'billing_address':
        jsonOutput.billing_address = createBillingAddress(row);
        break;
      default:
        jsonOutput[jsonKey] = String(value).trim();
    }
  });

  // Add initiation_type only if entry mode is COF
  const entryMode = (row['entry mode'] || '').trim().toLowerCase();
  if (entryMode === 'cof') {
    jsonOutput.initiation_type = '';
  }

  // Handle additional amounts
  const additionalAmounts = parseAdditionalAmounts(
    row['additional amount'],
    row['additional amount type']
  );
  if (additionalAmounts.length > 0) {
    jsonOutput.additional_amounts = additionalAmounts;
  }

  return jsonOutput;
}

function generateOutputPath(row, sheetName, outputBaseDir) {
  const cardType = normalizeCardType(row['card type']);
  const paymentType = (row['payment type'] || 'unknown').toLowerCase().replace(/\s+/g, '_');
  const transactionType = (row['transaction type'] || 'unknown').toLowerCase();
  const orderNumber =
    row['test case number'] || `unknown-${Math.random().toString(36).slice(2, 8)}`;
  const currencyCode = (row['trans. currency'] || 'unknown').toUpperCase().replace(/\s+/g, '');
  const currencyWithCountry = getCurrencyWithCountry(currencyCode);

  const outputDir = path.join(
    outputBaseDir,
    sheetName,
    currencyWithCountry,
    paymentType,
    transactionType,
    cardType
  );

  const outputPath = path.join(outputDir, `${orderNumber}_${currencyWithCountry}.json`);

  return { outputDir, outputPath };
}

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
    const jsonOutput = mapRowToJson(row);
    const { outputDir, outputPath } = generateOutputPath(row, sheetName, outputBaseDir);
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
  getCurrencyWithCountry,
  normalizeCardType,
  parseAdditionalAmounts,
};

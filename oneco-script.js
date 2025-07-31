const xlsx = require('xlsx');
const fs = require('fs-extra');
const path = require('path');

// === CURRENCY CODE TO COUNTRY MAPPING ===
const CURRENCY_MAP = {
  '036': { name: 'Australia', code: 'AUD', fullCode: 'AUD_Australia_036' },
  124: { name: 'Canada', code: 'CAD', fullCode: 'CAD_Canada_124' },
  344: { name: 'HongKong', code: 'HKD', fullCode: 'HKD_HongKong_344' },
  392: { name: 'Japan', code: 'JPY', fullCode: 'JPY_Japan_392' },
  400: { name: 'Jordan', code: 'JOD', fullCode: 'JOD_Jordan_400' },
  554: { name: 'NewZealand', code: 'NZD', fullCode: 'NZD_NewZealand_554' },
  702: { name: 'Singapore', code: 'SGD', fullCode: 'SGD_Singapore_702' },
  764: { name: 'Thailand', code: 'THB', fullCode: 'THB_Thailand_764' },
  840: { name: 'United States', code: 'USD', fullCode: 'USD_UnitedStates_840' },
  978: { name: 'Europe', code: 'EUR', fullCode: 'EUR_Europe_978' },
  826: { name: 'United Kingdom', code: 'GBP', fullCode: 'GBP_UnitedKingdom_826' },
};

// Function to get currency with country name
function getCurrencyWithCountry(currencyCode) {
  const currency = CURRENCY_MAP[currencyCode];
  return currency ? currency.fullCode : currencyCode;
}

// Function to get currency abbreviation
function getCurrencyCode(currencyCode) {
  const currency = CURRENCY_MAP[currencyCode];
  return currency ? currency.code : currencyCode;
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
  'trans. currency': 'currency_code',
  'test case number': 'order_number',
  'avs billing postal code': 'postal_code',
  'bill payment indicator': 'bill_payment',
  description: 'description',
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
  const currencyCode = row['trans. currency'];
  const currency = CURRENCY_MAP[currencyCode];

  return {
    postal_code: row['avs billing postal code'] || '',
    country: currency?.name || '',
    street: row['avs billing address'] || '',
  };
}

function handleBillPayment(value) {
  // Default flags for all payment types
  const defaultFlags = {
    bill_payment: false,
    installment: false,
    installment_number: undefined,
    installment_count: undefined,
    installment_counter: undefined,
    installment_total: undefined,
    deferred_auth: false,
    recurring_flag: undefined,
  };

  // Return default flags if no value provided
  if (!value) return defaultFlags;

  // Base configuration for all payment types (bill_payment = true)
  const baseConfig = { ...defaultFlags, bill_payment: true };

  switch (value) {
    case 'Installment':
      return {
        ...baseConfig,
        installment: true,
        installment_number: 1,
        installment_count: 1,
        installment_counter: 1,
        installment_total: 1,
        recurring_flag: 'yes',
      };

    case 'Recurring':
      return {
        ...baseConfig,
        recurring_flag: 'yes',
        installment_counter: 1,
      };

    case 'Deferred':
      return {
        ...baseConfig,
        deferred_auth: true,
      };

    default:
      return defaultFlags;
  }
}

function parseAdditionalAmounts(amtStr, typeStr) {
  // Return empty array if either parameter is missing
  if (!amtStr || !typeStr) return [];

  const amounts = amtStr.split(',').map((amount) => amount.trim());
  const types = typeStr.split(',').map((type) => type.trim().toLowerCase());

  // Process each amount-type pair
  return amounts
    .map((amountStr, index) => {
      const type = types[index];
      const normalizedType = TYPE_NORMALIZER[type] || type;

      // Skip if either type or amount is missing/invalid
      if (!normalizedType || !amountStr) return null;

      const amount = parseFloat(amountStr) || 0;
      return {
        type: normalizedType,
        amount: String(Math.round(amount * 100)), // Convert to cents
      };
    })
    .filter(Boolean); // Remove null entries
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
      case 'transaction_amount':
        // Convert decimal amount to cents (remove decimal point)
        const amount = parseFloat(value) || 0;
        jsonOutput[jsonKey] = String(Math.round(amount * 100));
        break;
      case 'currency_code':
        // Convert numeric currency code to currency abbreviation
        jsonOutput[jsonKey] = getCurrencyCode(String(value).trim());
        break;
      case 'bill_payment':
        Object.assign(jsonOutput, handleBillPayment(value));
        break;
      case 'postal_code':
        jsonOutput.billing_address = createBillingAddress(row);
        break;
      case 'description':
        // Skip adding description to JSON output - it will be added as a comment
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

  // Add secure_auth_data if description contains "Secure Electronic Commerce transaction."
  // Add threedsecure and secure_auth_data if description contains "3-D Secure transaction"
  const description = (row['description'] || '').toString().trim();
  if (description.includes('Secure Electronic Commerce transaction.')) {
    jsonOutput.secure_auth_data = 'hpqlETCoVYR1CAAAiX8HBjAAAAA=';
  }
  if (description.includes('3-D Secure transaction')) {
    jsonOutput.threedsecure = '1';
    jsonOutput.secure_auth_data = 'hpqlETCoVYR1CAAAiX8HBjAAAAA=';
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
    const description = (row['description'] || '').toString().trim();
    outputs.push({ outputDir, outputPath, jsonOutput, description });
  });

  return outputs;
}

// Function to write JSON with commented description field
function writeJsonWithCommentedDescription(filePath, jsonData, description = '') {
  let jsonString = JSON.stringify(jsonData, null, 2);

  // If there's a description, add it as a comment at the end before the closing brace
  if (description) {
    const closingBrace = '\n}';
    const commentLine = `  // "description": ${JSON.stringify(description)}${closingBrace}`;
    jsonString = jsonString.replace(closingBrace, '\n' + commentLine);
  }

  fs.writeFileSync(filePath, jsonString);
}

function processExcelFile(filePath = EXCEL_FILE_PATH, outputBaseDir = OUTPUT_BASE_DIR) {
  const workbook = xlsx.readFile(filePath);
  workbook.SheetNames.forEach((sheetName) => {
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    const outputs = processSheetData(sheetName, rawData, outputBaseDir);
    outputs.forEach(({ outputDir, outputPath, jsonOutput, description }) => {
      fs.ensureDirSync(outputDir);
      writeJsonWithCommentedDescription(outputPath, jsonOutput, description);
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
  getCurrencyCode,
  normalizeCardType,
  parseAdditionalAmounts,
  writeJsonWithCommentedDescription,
  readJsonWithCommentedDescription: (filePath) => {
    let fileContent = fs.readFileSync(filePath, 'utf8');

    // Extract commented description before parsing JSON
    let description = '';
    const commentedDescriptionMatch = fileContent.match(
      /\s*\/\/ "description": ("(?:[^"\\]|\\.)*")\s*\n}/
    );
    if (commentedDescriptionMatch) {
      description = JSON.parse(commentedDescriptionMatch[1]);
      // Remove the comment line to make it valid JSON
      fileContent = fileContent.replace(/\s*\/\/ "description": "(?:[^"\\]|\\.)*"\s*\n}/, '\n}');
    }

    const data = JSON.parse(fileContent);
    if (description) {
      data.description = description;
    }

    return data;
  },
};

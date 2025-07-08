const xlsx = require('xlsx');
const fs = require('fs-extra');
const path = require('path');

// === configuration ===
const EXCEL_FILE_PATH = 'test_script_test.xlsx';
const OUTPUT_BASE_DIR = 'output_jsons';

// === header -> json field map ===
const FIELD_MAP = {
  avs_billing_address: 'billing_street',
  avs_billing_postal_code: 'billing_zip',
  bill_payment_indicator: 'bill_payment',
  tax_indicator: 'sales_tax',
  deferred_payment_plan: 'deferred',
  amount: 'amount',
  account_number: 'account_number',
  entry_mode: 'entry_mode',
  card_present: 'card_present',
  transaction_currency: 'trans_currency',
  card_type: 'card_type',
  payment_type: 'payment_type',
  test_case_number: 'order_number',
  ccv_data: 'cvv',
};

// === default values ===
const DEFAULTS = {
  terminal_msr_capable: 0,
  debit: 0,
  cof_type: 0,
  card_id_code: '01',
  secure_auth_data: '',
  exp_date: '1226',
  partial_auth_capability: '1',
};

// === transaction type → action map ===
const ACTION_MAP = {
  authorization: 'sale',
  refund: 'refund',
  verification: 'verification',
};

// === type normalization for additional amounts ===
const TYPE_NORMALIZER = {
  hltcare: 'healthcare',
  rx: 'rx',
  clinical: 'clinical',
  dental: 'dental',
};

function normalizeHeaders(row) {
  const cleaned = {};
  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = key
      .replace(/\s+/g, '_')
      .replace(/\r?\n|\r/g, '')
      .trim()
      .toLowerCase();
    cleaned[normalizedKey] = value;
  });
  return cleaned;
}

function mapFields(row) {
  const mapped = { ...DEFAULTS };
  for (const [header, jsonKey] of Object.entries(FIELD_MAP)) {
    mapped[jsonKey] = row[header] !== undefined ? String(row[header]) : '';
  }
  return mapped;
}

function getAction(row) {
  const transactionType = (row['transaction_type'] || '').toLowerCase();
  return ACTION_MAP[transactionType] || transactionType;
}

function getAdditionalAmounts(row) {
  const amtStr = row['additional_amount'] || '';
  const typeStr = row['additional_amount_type'] || '';
  const amountList = amtStr
    .split(',')
    .map((a) => a.trim())
    .filter((a) => a !== '');
  const typeList = typeStr.split(',').map((t) => t.trim().toLowerCase());
  const additionalAmounts = [];
  for (let i = 0; i < Math.min(amountList.length, typeList.length); i++) {
    const amount = amountList[i];
    const rawType = typeList[i];
    const normalizedType = TYPE_NORMALIZER[rawType] || rawType;
    additionalAmounts.push({ type: normalizedType, amount });
  }
  return additionalAmounts.length > 0 ? additionalAmounts : undefined;
}

function getOutputPath(row, transactionType) {
  const paymentType = (row['payment_type'] || 'unknown').toLowerCase().replace(/\s+/g, '_');
  const transTypeFolder = transactionType || 'unknown';
  const cardType = (row['card_type'] || 'unknown').toLowerCase().replace(/\s+/g, '_');
  const orderNumber =
    row['test_case_number'] || `unknown-${Math.random().toString(36).slice(2, 8)}`;
  const outputDir = path.join(OUTPUT_BASE_DIR, paymentType, transTypeFolder, cardType);
  const outputPath = path.join(outputDir, `${orderNumber}.json`);
  return { outputDir, outputPath };
}

function processExcel() {
  const workbook = xlsx.readFile(EXCEL_FILE_PATH);
  const sheetName = workbook.SheetNames[0];
  const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  const cleanedData = rawData.map(normalizeHeaders);

  cleanedData.forEach((row) => {
    const jsonOutput = mapFields(row);
    jsonOutput.action = getAction(row);
    const additionalAmounts = getAdditionalAmounts(row);
    if (additionalAmounts) {
      jsonOutput.additional_amounts = additionalAmounts;
    }
    const transactionType = (row['transaction_type'] || '').toLowerCase();
    const { outputDir, outputPath } = getOutputPath(row, transactionType);
    fs.ensureDirSync(outputDir);
    fs.writeJsonSync(outputPath, jsonOutput, { spaces: 2 });
  });
  console.log('✅ JSON files generated successfully in:', OUTPUT_BASE_DIR);
}

processExcel();

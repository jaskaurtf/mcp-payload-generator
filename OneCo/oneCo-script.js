const xlsx = require('xlsx');
const fs = require('fs-extra');
const path = require('path');

// === CONFIGURATION ===
const EXCEL_FILE_PATH = 'TestScript-test.xlsx';
const OUTPUT_BASE_DIR = 'output/oneco/json';

// === MAPPING ===
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

// === MAIN SCRIPT ===
function generateJsonFiles() {
  const workbook = xlsx.readFile(EXCEL_FILE_PATH);
  const sheetName = workbook.SheetNames[0];
  const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
  
  const cleanedData = rawData.map(row => {
    const cleaned = {};
    Object.entries(row).forEach(([key, value]) => {
      const normalizedKey = key.replace(/\s+/g, " ").replace(/\r?\n|\r/g, " ").trim().toLowerCase();
      cleaned[normalizedKey] = value;
    });
    return cleaned;
  });

  cleanedData.forEach(row => {
    const jsonOutput = { ...DEFAULTS };

    // === Map Fields ===
    for (const [header, jsonKey] of Object.entries(FIELD_MAP)) {
      const value = row[header] || '';
      if (jsonKey === 'entry_mode_id') {
        jsonOutput[jsonKey] = value.trim().charAt(0).toUpperCase();
      } else if (jsonKey === 'postal_code') {
        jsonOutput.billing_address = { postal_code: String(value).trim() };
      } else {
        jsonOutput[jsonKey] = String(value).trim();
      }
    }
    const transactionType = (row["transaction type"] || "").toLowerCase();
    // === Calculate subtotal_amount from "Additional Amount" column ===
    const addAmountStr = row['additional amount'] || '';
    const subtotal = addAmountStr
      .split(',')
      .map(val => parseFloat(val.trim()) || 0)
      .reduce((sum, val) => sum + val, 0);
    jsonOutput.subtotal_amount = subtotal.toFixed(2);

    // === Directory Structure: payment type / transaction type / card type ===
    let cardType = (row["card type"] || "unknown").toLowerCase().replace(/\s+/g, "_");
    if (cardType === 'mastercard') {
      cardType = 'mc';
    } else if (cardType === 'discover') {
      cardType = 'disc';
    }

    jsonOutput.account_number = '{{' + cardType + '_' + row['entry mode']?.toLowerCase() + '}}';

    const paymentType = (row["payment type"] || "unknown").toLowerCase().replace(/\s+/g, "_");
    const transTypeFolder = transactionType || "unknown";

    const orderNumber = row["test case number"] || `unknown-${Math.random().toString(36).slice(2, 8)}`;
    const fileName = `${orderNumber}.json`;

    const outputDir = path.join(OUTPUT_BASE_DIR, paymentType, transTypeFolder, cardType);
    const outputPath = path.join(outputDir, fileName);

    fs.ensureDirSync(outputDir);
    fs.writeJsonSync(outputPath, jsonOutput, { spaces: 2 });

  });

}

generateJsonFiles();

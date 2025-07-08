const xlsx = require('xlsx');
const fs = require('fs-extra');
const path = require('path');

// === CONFIGURATION ===
const excelFilePath = 'TestScript-test.xlsx';
const outputBaseDir = 'output_jsons';

// === HEADER -> JSON FIELD MAP ===
const fieldMap = {
  "avs billing address": "billing_street",
  "avs billing postal code": "billing_zip",
  "bill payment indicator": "bill_payment",
  "tax indicator": "sales_tax",
  "deferred payment plan": "deferred",
  "amount": "amount",
  "account number": "account_number",
  "entry mode": "entry_mode",
  "card present": "card_present",
  "transaction currency": "trans_currency",
  "card type": "card_type",
  "payment type": "payment_type",
  "test case number": "order_number",
  "ccv data": "cvv"
};

// === DEFAULT VALUES ===
const defaults = {
  terminal_msr_capable: 0,
  debit: 0,
  cof_type: 0,
  card_id_code: "01",
  secure_auth_data: "",
  exp_date: "1226",
  partial_auth_capability: "1"
};

// === TRANSACTION TYPE → ACTION MAP ===
const actionMap = {
  authorization: "sale",
  refund: "refund",
  verification: "verification"
};

// === TYPE NORMALIZATION FOR ADDITIONAL AMOUNTS ===
const typeNormalizer = {
  hltcare: "healthcare",
  rx: "rx",
  clinical: "clinical",
  dental: "dental"
};

function normalizeHeaders(row) {
  const cleaned = {};
  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = key.replace(/\s+/g, " ").replace(/\r?\n|\r/g, " ").trim().toLowerCase();
    cleaned[normalizedKey] = value;
  });
  return cleaned;
}

function mapFields(row) {
  const mapped = { ...defaults };
  for (const [header, jsonKey] of Object.entries(fieldMap)) {
    mapped[jsonKey] = row[header] !== undefined ? String(row[header]) : "";
  }
  return mapped;
}

function getAction(row) {
  const transactionType = (row["transaction type"] || "").toLowerCase();
  return actionMap[transactionType] || transactionType;
}

function getAdditionalAmounts(row) {
  const amtStr = row["additional amount"] || "";
  const typeStr = row["additional amount type"] || "";
  const amountList = amtStr.split(",").map(a => a.trim()).filter(a => a !== "");
  const typeList = typeStr.split(",").map(t => t.trim().toLowerCase());
  const additionalAmounts = [];
  for (let i = 0; i < Math.min(amountList.length, typeList.length); i++) {
    const amount = amountList[i];
    const rawType = typeList[i];
    const normalizedType = typeNormalizer[rawType] || rawType;
    additionalAmounts.push({ type: normalizedType, amount });
  }
  return additionalAmounts.length > 0 ? additionalAmounts : undefined;
}

function getOutputPath(row, transactionType) {
  const paymentType = (row["payment type"] || "unknown").toLowerCase().replace(/\s+/g, "_");
  const transTypeFolder = transactionType || "unknown";
  const cardType = (row["card type"] || "unknown").toLowerCase().replace(/\s+/g, "_");
  const orderNumber = row["test case number"] || `unknown-${Math.random().toString(36).slice(2, 8)}`;
  const outputDir = path.join(outputBaseDir, paymentType, transTypeFolder, cardType);
  const outputPath = path.join(outputDir, `${orderNumber}.json`);
  return { outputDir, outputPath };
}

function processExcel() {
  const workbook = xlsx.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
  const cleanedData = rawData.map(normalizeHeaders);

  cleanedData.forEach(row => {
    const jsonOutput = mapFields(row);
    jsonOutput.action = getAction(row);
    const additionalAmounts = getAdditionalAmounts(row);
    if (additionalAmounts) {
      jsonOutput.additional_amounts = additionalAmounts;
    }
    const transactionType = (row["transaction type"] || "").toLowerCase();
    const { outputDir, outputPath } = getOutputPath(row, transactionType);
    fs.ensureDirSync(outputDir);
    fs.writeJsonSync(outputPath, jsonOutput, { spaces: 2 });
  });
  console.log('✅ JSON files generated successfully in:', outputBaseDir);
}

processExcel();

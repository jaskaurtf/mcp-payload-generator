const xlsx = require('xlsx');
const fs = require('fs-extra');
const path = require('path');

// === CONFIGURATION ===
const excelFilePath = 'TestScript-test.xlsx';
const outputBaseDir = 'output/json';

// === HEADER -> JSON FIELD MAP ===
const fieldMap = {
  "avs billing address": "billing_street",
  "avs billing postal code": "billing_zip",
  "bill payment indicator": "bill_payment",
  "tax indicator": "sales_tax",
  "deferred payment plan": "deferred",
  "transaction amount": "amount",
  "account number": "account_number",
  "entry mode": "entry_mode",
  "trans. currency": "trans_currency",
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
  partial_auth_capability: "1",
  card_present: false,
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

// === MAIN FUNCTION ===
function processExcel() {
  const workbook = xlsx.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });

  // Normalize headers and create cleaned row list
  const cleanedData = rawData.map(row => {
    const cleaned = {};
    Object.entries(row).forEach(([key, value]) => {
      const normalizedKey = key.replace(/\s+/g, " ").replace(/\r?\n|\r/g, " ").trim().toLowerCase();
      cleaned[normalizedKey] = value;
    });
    return cleaned;
  });

  cleanedData.forEach(row => {
    const jsonOutput = { ...defaults };

    // Map direct fields
    for (const [header, jsonKey] of Object.entries(fieldMap)) {
      jsonOutput[jsonKey] = row[header] !== undefined ? String(row[header]) : "";
    }

    // Set action
    const transactionType = (row["transaction type"] || "").toLowerCase();
    jsonOutput.action = actionMap[transactionType] || transactionType;

    // Additional Amounts block
    const amtStr = row["additional amount"] || "";
    const typeStr = row["additional amount type"] || "";

    const amountList = amtStr.split(",").map(a => a.trim());
    const typeList = typeStr.split(",").map(t => t.trim().toLowerCase());

    const additionalAmounts = [];

    for (let i = 0; i < Math.min(amountList.length, typeList.length); i++) {
      const amount = amountList[i];
      const rawType = typeList[i];
      const normalizedType = typeNormalizer[rawType] || rawType;

      additionalAmounts.push({
        type: normalizedType,
        amount
      });
    }

    if (additionalAmounts.length > 0) {
      jsonOutput.additional_amounts = additionalAmounts;
    }

    // Folder structure
    const paymentType = (row["payment type"] || "unknown").toLowerCase().replace(/\s+/g, "_");
    const transTypeFolder = transactionType || "unknown";
    const cardType = (row["card type"] || "unknown").toLowerCase().replace(/\s+/g, "_");
    const orderNumber = row["test case number"] || `unknown-${Math.random().toString(36).slice(2, 8)}`;

    const outputDir = path.join(outputBaseDir, paymentType, transTypeFolder, cardType);
    const outputPath = path.join(outputDir, `${orderNumber}.json`);

    fs.ensureDirSync(outputDir);
    fs.writeJsonSync(outputPath, jsonOutput, { spaces: 2 });
  });

}

processExcel();

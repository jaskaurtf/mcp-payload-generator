require('./setup.integration');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { TEST_DATA, UNIQUE_TEST_EXCEL_FILE, TEST_OUTPUT_DIR } = require('./setup');

describe('Excel to JSON Integration', () => {
  test('should process Excel file and generate correct JSON files', async () => {
    // Run the script as a separate process with test output directory
    await new Promise((resolve, reject) => {
      exec(
        `node zgate-script.js ${UNIQUE_TEST_EXCEL_FILE} ${TEST_OUTPUT_DIR}`,
        (error, stdout, stderr) => {
          if (error) {
            console.error(`Execution error: ${error}`);
            reject(error);
            return;
          }
          console.log(`stdout: ${stdout}`);
          if (stderr) console.error(`stderr: ${stderr}`);
          resolve(stdout);
        }
      );
    });

    // Check if files are created for Sheet1 (now with currency code in path)
    const sheet1Path = path.join(
      __dirname,
      `../${TEST_OUTPUT_DIR}/json/Sheet1/USD_UnitedStates_840/credit/authorization/mc/TEST001_USD_UnitedStates_840.json`
    );
    expect(fs.existsSync(sheet1Path)).toBeTruthy();
    const sheet1Data = await fs.readJson(sheet1Path);
    expect(sheet1Data).toMatchObject({
      action: 'sale',
      amount: '10.00',
      card_type: 'mc',
      entry_mode: 'keyed',
      currency_code: '840',
      order_number: 'TEST001',
    });

    // Check if files are created for Sheet2 (now with currency code in path)
    const sheet2Path = path.join(
      __dirname,
      `../${TEST_OUTPUT_DIR}/json/Sheet2/EUR_Europe_978/credit/refund/visa/TEST002_COF_EUR_Europe_978.json`
    );
    expect(fs.existsSync(sheet2Path)).toBeTruthy();
    const sheet2Data = await fs.readJson(sheet2Path);
    expect(sheet2Data).toMatchObject({
      action: 'return',
      amount: '20.00',
      card_type: 'visa',
      entry_mode: 'cof',
      cof_type: 0,
      currency_code: '978',
      order_number: 'TEST002_COF',
    });
  });
});

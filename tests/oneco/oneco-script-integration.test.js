require('../setup.integration');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { UNIQUE_TEST_EXCEL_FILE, TEST_OUTPUT_DIR } = require('../setup');

describe('Excel to JSON Integration', () => {
  test('should process Excel file and generate correct JSON files', async () => {
    // Run the script as a separate process with test output directory
    await new Promise((resolve, reject) => {
      exec(
        `node oneco-script.js ${UNIQUE_TEST_EXCEL_FILE} ${TEST_OUTPUT_DIR}`,
        (error, stdout, stderr) => {
          if (error) {
            console.error(`Execution error: ${error}`);
            reject(error);
            return;
          }

          if (stderr) console.error(`stderr: ${stderr}`);
          resolve(stdout);
        }
      );
    });

    // Check if files are created for Sheet1 (now with currency code in path)
    const sheet1Path = path.join(
      __dirname,
      `../../${TEST_OUTPUT_DIR}/json/Sheet1/840/credit/authorization/mc/TEST001.json`
    );
    expect(fs.existsSync(sheet1Path)).toBeTruthy();
    const sheet1Data = await fs.readJson(sheet1Path);
    expect(sheet1Data).toMatchObject({
      transaction_amount: '10.00',
      entry_mode_id: 'K',
      currency_code: '840',
    });

    // Check if files are created for Sheet2 (now with currency code in path)
    const sheet2Path = path.join(
      __dirname,
      `../../${TEST_OUTPUT_DIR}/json/Sheet2/978/credit/refund/visa/TEST002_COF.json`
    );
    expect(fs.existsSync(sheet2Path)).toBeTruthy();
    const sheet2Data = await fs.readJson(sheet2Path);
    expect(sheet2Data).toMatchObject({
      transaction_amount: '20.00',
      entry_mode_id: 'C',
      currency_code: '978',
    });
  });
});

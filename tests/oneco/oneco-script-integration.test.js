require('../setup.integration');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const { UNIQUE_TEST_EXCEL_FILE, TEST_OUTPUT_DIR } = require('../setup');
const { readJsonWithCommentedDescription } = require('../../oneco-script');

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
      `../../${TEST_OUTPUT_DIR}/json/Sheet1/USD_UnitedStates_840/credit/authorization/mc/TEST001_USD_UnitedStates_840.json`
    );
    expect(fs.existsSync(sheet1Path)).toBeTruthy();
    const sheet1Data = readJsonWithCommentedDescription(sheet1Path);
    expect(sheet1Data).toMatchObject({
      transaction_amount: '1000',
      entry_mode_id: 'K',
      currency_code: 'USD',
      order_number: 'TEST001',
      account_number: '12345678',
      secure_auth_data: 'hpqlETCoVYR1CAAAiX8HBjAAAAA=',
      billing_address: {
        country: 'United States',
        postal_code: '11747',
        street: '1307 Broad Hollow Road',
      },
      bill_payment: true,
      installment_counter: 1,
      recurring_flag: 'yes',
    });
    // Verify keyed transaction does NOT have initiation_type
    expect(sheet1Data).not.toHaveProperty('initiation_type');
    // Verify it has secure_auth_data but not threedsecure
    expect(sheet1Data).toHaveProperty('secure_auth_data', 'hpqlETCoVYR1CAAAiX8HBjAAAAA=');
    expect(sheet1Data).not.toHaveProperty('threedsecure');

    // Check if files are created for Sheet2 (now with currency code in path)
    const sheet2Path = path.join(
      __dirname,
      `../../${TEST_OUTPUT_DIR}/json/Sheet2/EUR_Europe_978/credit/refund/visa/TEST002_COF_EUR_Europe_978.json`
    );
    expect(fs.existsSync(sheet2Path)).toBeTruthy();
    const sheet2Data = readJsonWithCommentedDescription(sheet2Path);
    expect(sheet2Data).toMatchObject({
      transaction_amount: '2000',
      entry_mode_id: 'C',
      currency_code: 'EUR',
      order_number: 'TEST002_COF',
      account_number: '123456789',
      threedsecure: '1',
      secure_auth_data: 'hpqlETCoVYR1CAAAiX8HBjAAAAA=',
      billing_address: {
        country: 'Europe',
        postal_code: '11747',
        street: '1307 Broad Hollow Road',
      },
      bill_payment: true,
      installment: true,
      installment_number: 1,
      installment_count: 1,
      installment_counter: 1,
      installment_total: 1,
      recurring_flag: 'yes',
      initiation_type: '',
    });
    // Verify COF transaction DOES have initiation_type
    expect(sheet2Data).toHaveProperty('initiation_type', '');
    // Verify it has both threedsecure and secure_auth_data
    expect(sheet2Data).toHaveProperty('threedsecure', '1');
    expect(sheet2Data).toHaveProperty('secure_auth_data', 'hpqlETCoVYR1CAAAiX8HBjAAAAA=');
  });
});

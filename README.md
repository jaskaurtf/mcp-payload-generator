# MCP-Payload--Generator

## Overview

This project converts Excel test scripts into structured JSON payloads for payment transaction testing. It supports multiple card brands and transaction types, generating output files for use in automated test suites and API validation.

## Main Script: `zgate-script.js`

### What It Does
- Reads an Excel file (default: `TestScript-test.xlsx`).
- Normalizes headers and maps Excel columns to JSON fields.
- Handles additional amounts and type normalization.
- Outputs JSON files to a structured folder hierarchy by payment type, transaction type, and card brand.

### How It Works
1. **Configuration**: Set the Excel file and output directory at the top of the script.
2. **Field Mapping**: Maps human-readable Excel headers to snake_case JSON keys.
3. **Default Values**: Populates each output with required default fields.
4. **Transaction Type Mapping**: Maps transaction types (e.g., authorization → sale).
5. **Additional Amounts**: Supports multiple additional amounts/types per row, normalizing type names.
6. **Output Structure**: Outputs are written to `output/json/<payment_type>/<transaction_type>/<card_type>/<order_number>.json`.

### Usage

```sh
npm run zgate
```

- This runs `zgate-script.js` and generates JSON payloads from the Excel file.
- Output is written to the `output/json` directory.

### NPM Scripts
- `zgate`: Run the main script to generate JSONs.
- `clean`: Remove all generated output files.
- `test`: Run Jest test suites to validate output JSONs.

### Project Structure
```
MCP-Payload--Generator/
├── zgate-script.js                             # Main Excel-to-JSON script
├── generate-postman-collection.js        # generate postman json 
├── script.js                                   # (Alternate/legacy script)
├── TestScript-test.xlsx                        # Input Excel file
├── output/json/                                # Generated JSON payloads (ignored by git)
├── __tests__/                                  # Jest test scripts (mirrors output structure)
├── package.json                                # NPM scripts and dependencies
├── .gitignore, .prettier*                      # Project config
└── README.md                                   # This file
```

### Testing & Validation
- Tests are organized in `__tests__` to match the output folder structure.
- Run `npm test` to validate that generated JSONs match expected values for all card brands and transaction types.
- Dummy tests are included for empty suites to ensure Jest passes.

### Contributing
- Follow camelCase for variables, UPPER_CASE for constants, and snake_case for JSON keys.
- Use Prettier for code formatting (`npm run format`).
- Update or add test scripts as needed for new requirements.

### Troubleshooting
- If you see merge conflicts or npm errors, see the project history or ask for help.
- For output issues, check the Excel file and field mappings in `zgate-script.js`.

---

For more details, see comments in `zgate-script.js` or open an issue.

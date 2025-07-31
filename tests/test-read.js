const fs = require('fs-extra');

// Function to read JSON with commented description field
function readJsonWithCommentedDescription(filePath) {
  let fileContent = fs.readFileSync(filePath, 'utf8');

  // Extract commented description before parsing JSON
  let description = '';
  const commentedDescriptionMatch = fileContent.match(
    /,\s*\/\/ "description": ("(?:[^"\\]|\\.)*")\s*\n}/
  );
  if (commentedDescriptionMatch) {
    description = JSON.parse(commentedDescriptionMatch[1]);
    // Remove the comment line and the preceding comma to make it valid JSON
    fileContent = fileContent.replace(/,\s*\/\/ "description": "(?:[^"\\]|\\.)*"\s*\n}/, '\n}');
  }

  const data = JSON.parse(fileContent);
  if (description) {
    data.description = description;
  }

  return data;
}

const data = readJsonWithCommentedDescription('./test-output/test.json');
console.log('Parsed data:');
console.log(JSON.stringify(data, null, 2));
console.log('\nDescription extracted:', data.description);

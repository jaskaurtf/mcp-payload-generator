const description = 'secure electronik commerce transction';
const normalizedDesc = description
  .toLowerCase()
  .replace(/[^\w\s]/g, '')
  .replace(/\s+/g, ' ');
console.log('Original:', description);
console.log('Normalized:', normalizedDesc);

const pattern = /secure\s+electronik\s+commerce\s+transact/;
console.log('Pattern matches:', pattern.test(normalizedDesc));
console.log('Pattern:', pattern.toString());

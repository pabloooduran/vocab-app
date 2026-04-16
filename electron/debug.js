const e = require('electron');
console.log('type:', typeof e);
if (typeof e === 'object' && e !== null) {
  console.log('keys:', Object.keys(e).join(','));
} else {
  console.log('value:', String(e).slice(0, 100));
}

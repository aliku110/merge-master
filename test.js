// Simple syntax test for game.js
const fs = require('fs');
const code = fs.readFileSync('game.js', 'utf8');
let errors = [];

// Check key function definitions
const checks = [
  'getClickRatio', 'addFruit', 'initGame', 'onCanvasClick',
  'physicsStep', 'mergeFruits', 'render', 'gameLoop'
];

checks.forEach(fn => {
  if (!code.includes('function ' + fn)) {
    errors.push('Missing function: ' + fn);
  }
});

// Check the main bugs
if (code.includes("x: x * s") && !code.includes("cssX * s")) {
  errors.push('Still has old x*dpr bug');
}
if (code.match(/a\.x - b\.y[^_]/)) {
  errors.push('Still has a.x-b.y collision typo');
}
// Check merge threshold
const thresholdMatch = code.match(/\.radius\s*[\*]\s*([\d.]+)/);
if (thresholdMatch) {
  errors.push('Merge threshold: ' + thresholdMatch[1] + ' (might be too strict)');
}

if (errors.length === 0) {
  console.log('✅ All functions found, no known bug patterns detected');
  console.log('Merge threshold:', thresholdMatch ? thresholdMatch[1] : 'N/A');
} else {
  console.log('❌ Issues found:');
  errors.forEach(e => console.log('  - ' + e));
}

// Count lines
console.log(`Total lines: ${code.split('\n').length}`);

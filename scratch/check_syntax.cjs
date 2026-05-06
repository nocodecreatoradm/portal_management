
const fs = require('fs');
const content = fs.readFileSync('src/components/Samples.tsx', 'utf8');

let braceCount = 0;
let parenCount = 0;
let bracketCount = 0;
let inString = null;
let escaped = false;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (escaped) {
        escaped = false;
        continue;
    }
    if (char === '\\') {
        escaped = true;
        continue;
    }
    if (inString) {
        if (char === inString) {
            inString = null;
        }
        continue;
    }
    if (char === '"' || char === "'" || char === '`') {
        inString = char;
        continue;
    }
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (char === '(') parenCount++;
    if (char === ')') parenCount--;
    if (char === '[') bracketCount++;
    if (char === ']') bracketCount--;

    if (braceCount < 0) console.log(`Extra closing brace at index ${i}, char: ${content.substring(i-10, i+10)}`);
    if (parenCount < 0) console.log(`Extra closing paren at index ${i}, char: ${content.substring(i-10, i+10)}`);
    if (bracketCount < 0) console.log(`Extra closing bracket at index ${i}, char: ${content.substring(i-10, i+10)}`);
}

console.log(`Braces: ${braceCount}`);
console.log(`Parens: ${parenCount}`);
console.log(`Brackets: ${bracketCount}`);

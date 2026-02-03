#!/usr/bin/env node

// This script fixes the index.js file by removing duplicate OCR code

const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.js');
const content = fs.readFileSync(indexPath, 'utf8');
const lines = content.split('\n');

// Find the line with the duplicate code start
let duplicateStart = -1;
let duplicateEnd = -1;

for (let i = 0; i < lines.length; i++) {
    // Look for the duplicate logFile declaration (should be around line 348)
    if (i > 345 && i < 360 && lines[i].trim().startsWith('const logFile = path.join(__dirname')) {
        duplicateStart = i;
        console.log(`Found duplicate code start at line ${i + 1}`);
        break;
    }
}

if (duplicateStart !== -1) {
    // Find the end (the closing of the old endpoint "});" that's NOT the new one)
    for (let i = duplicateStart; i < lines.length; i++) {
        if (lines[i].trim() === '});') {
            // Check if the next non-empty line is "// Delete Receipt"
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                const nextLine = lines[j].trim();
                if (nextLine && nextLine.startsWith('//')) {
                    if (nextLine.includes('Delete Receipt')) {
                        duplicateEnd = i;
                        console.log(`Found duplicate code end at line ${i + 1}`);
                        break;
                    }
                }
                if (nextLine && !nextLine.startsWith('//')) break;
            }
            if (duplicateEnd !== -1) break;
        }
    }
}

if (duplicateStart !== -1 && duplicateEnd !== -1) {
    console.log(`Removing lines ${duplicateStart + 1} to ${duplicateEnd + 1}`);

    const before = lines.slice(0, duplicateStart);
    const after = lines.slice(duplicateEnd + 1);

    const fixed = [...before, '', ...after].join('\n');

    // Backup original
    fs.writeFileSync(indexPath + '.backup', content);
    console.log(`Backup saved to index.js.backup`);

    // Write fixed version
    fs.writeFileSync(indexPath, fixed);
    console.log(`✓ Fixed index.js`);
    console.log(`Removed ${duplicateEnd - duplicateStart + 1} lines of duplicate code`);
} else {
    console.log(`Could not find duplicate code boundaries`);
    console.log(`duplicateStart: ${duplicateStart}, duplicateEnd: ${duplicateEnd}`);
}

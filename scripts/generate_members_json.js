import { createRequire } from 'module';
import * as fs from 'fs';
import * as path from 'path';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const filename = 'NSP Website_ Member Directory (Responses).xlsx';
const outputPath = path.resolve('src/data/members.json');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

try {
    const workbook = XLSX.readFile(filename);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const rawData = XLSX.utils.sheet_to_json(worksheet);

    const imagesDir = path.resolve('public/member images');
    let imageFiles = [];
    if (fs.existsSync(imagesDir)) {
        imageFiles = fs.readdirSync(imagesDir);
    }

    const seenMembers = new Set();
    const uniqueMembers = [];

    // Helper for Title Case
    const toTitleCase = (str) => {
        return str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase());
    };

    rawData.forEach((row, index) => {
        let firstName = (row['First name'] || '').trim();
        let surname = (row['Surname'] || '').trim();

        // Skip empty rows
        if (!firstName && !surname) return;

        // Normalize Case
        firstName = toTitleCase(firstName);
        surname = toTitleCase(surname);

        // Deduplication Key (Phone Number is best, fallback to Name)
        const phone = String(row['Phone Number'] || '').trim();
        const uniqueKey = phone || `${firstName}-${surname}`.toLowerCase();

        if (seenMembers.has(uniqueKey)) return;
        seenMembers.add(uniqueKey);

        let imageUrl = null;

        // Try to find local image
        if (imageFiles.length > 0) {
            const cleanLast = surname.toLowerCase().replace(/[^a-z0-9]/g, '');
            const firstParts = firstName.toLowerCase().split(/\s+/).map(p => p.replace(/[^a-z0-9]/g, '')).filter(p => p.length > 0);

            const match = imageFiles.find(file => {
                const cleanFile = file.toLowerCase().replace(/[^a-z0-9]/g, '');
                const hasSurname = cleanFile.includes(cleanLast);
                const hasFirstPart = firstParts.some(part => cleanFile.includes(part));
                return hasSurname && hasFirstPart;
            });

            if (match) {
                imageUrl = `/member images/${match}`;
            }
        }

        // Fallback to Drive
        if (!imageUrl) {
            const rawLink = row['Preferred profile image'];
            if (rawLink) {
                const idMatch = rawLink.match(/id=([a-zA-Z0-9_-]+)/);
                if (idMatch && idMatch[1]) {
                    imageUrl = `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w400`;
                }
            }
        }

        uniqueMembers.push({
            id: phone || String(index),
            firstName: firstName,
            surname: surname,
            category: row['Category'],
            state: row['State of Origin'],
            image: imageUrl
        });
    });

    fs.writeFileSync(outputPath, JSON.stringify(uniqueMembers, null, 2));
    console.log(`Successfully wrote ${uniqueMembers.length} members to ${outputPath}`);

} catch (e) {
    console.error('Error converting file:', e);
}

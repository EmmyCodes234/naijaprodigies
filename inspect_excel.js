import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const filename = 'NSP Website_ Member Directory (Responses).xlsx';

try {
    const workbook = XLSX.readFile(filename);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get raw JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rawData.length > 0) {
        console.log('Headers:', JSON.stringify(rawData[0]));
        console.log('First Row:', JSON.stringify(rawData[1]));
    } else {
        console.log('Empty File');
    }

} catch (e) {
    console.error('Error reading file:', e);
}

const XLSX = require('xlsx');
const workbook = XLSX.readFile('c:/NSP Website/NSP Website_ Member Directory (updated).xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const json = XLSX.utils.sheet_to_json(sheet); // Default uses first row as header keys

// Log headers (keys of first item)
if (json.length > 0) {
    console.log("Headers:", Object.keys(json[0]));
    console.log("First Row:", JSON.stringify(json[0], null, 2));
} else {
    console.log("Empty sheet");
}

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const MEMBERS_FILE = 'c:/NSP Website/src/data/members.json';
const XLSX_FILE = 'c:/NSP Website/NSP Website_ Member Directory (updated).xlsx';

try {
    // 1. Read existing members
    const membersRaw = fs.readFileSync(MEMBERS_FILE, 'utf8');
    const members = JSON.parse(membersRaw);
    console.log(`Loaded ${members.length} existing members.`);

    // 2. Read XLSX
    const workbook = XLSX.readFile(XLSX_FILE);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const newMembersData = XLSX.utils.sheet_to_json(sheet);
    console.log(`Loaded ${newMembersData.length} rows from XLSX.`);

    let addedCount = 0;

    // Helper to extract Drive ID and format
    const formatImage = (url) => {
        if (!url) return undefined;
        // Standardize drive links
        let id = null;
        if (url.includes('drive.google.com')) {
            const idMatch = url.match(/id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
            if (idMatch) {
                id = idMatch[1];
                return `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
            }
        }
        return url;
    };

    // 3. Process
    newMembersData.forEach(row => {
        const firstName = (row['First name'] || '').trim();
        const surname = (row['Surname'] || '').trim();

        if (!firstName || !surname) return; // Skip empty names

        // Check duplicate
        const exists = members.some(m =>
            (m.firstName || '').toLowerCase() === firstName.toLowerCase() &&
            (m.surname || '').toLowerCase() === surname.toLowerCase()
        );

        if (!exists) {
            const newMember = {
                id: Date.now().toString() + Math.floor(Math.random() * 1000), // Generate ID
                firstName: firstName,
                surname: surname,
                category: row['Category'] || 'Opens',
                state: row['State of Origin'] || '',
                image: formatImage(row['Upload Picture'] || row['Preferred profile image'])
            };
            members.push(newMember);
            addedCount++;
            console.log(`Adding: ${firstName} ${surname}`);
        }
    });

    // 4. Save
    if (addedCount > 0) {
        fs.writeFileSync(MEMBERS_FILE, JSON.stringify(members, null, 2));
        console.log(`Successfully added ${addedCount} new members.`);
    } else {
        console.log("No new members found to add.");
    }

} catch (error) {
    console.error("Error updating members:", error);
}

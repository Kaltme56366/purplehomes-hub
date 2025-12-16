/**
 * Test script to check Airtable connection and list available tables
 *
 * Usage: node test-airtable.js
 */

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

console.log('='.repeat(60));
console.log('Airtable Connection Test');
console.log('='.repeat(60));
console.log('Base ID:', AIRTABLE_BASE_ID);
console.log('API Key:', AIRTABLE_API_KEY.substring(0, 10) + '...' + AIRTABLE_API_KEY.substring(AIRTABLE_API_KEY.length - 10));
console.log('='.repeat(60));
console.log();

async function testConnection() {
  try {
    console.log('1. Testing connection with base metadata...');
    const metaUrl = `${AIRTABLE_API_URL}/meta/bases/${AIRTABLE_BASE_ID}/tables`;
    const metaRes = await fetch(metaUrl, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      }
    });

    if (metaRes.ok) {
      const data = await metaRes.json();
      console.log('✓ Successfully connected to Airtable!');
      console.log();
      console.log('Available tables:');
      console.log('-'.repeat(60));

      if (data.tables && data.tables.length > 0) {
        data.tables.forEach((table, idx) => {
          console.log(`\n${idx + 1}. Table Name: "${table.name}"`);
          console.log(`   Table ID: ${table.id}`);
          console.log(`   Fields:`);
          table.fields.forEach(field => {
            console.log(`     - ${field.name} (${field.type})`);
          });
        });
      } else {
        console.log('No tables found in this base.');
      }

      return data;
    } else {
      const error = await metaRes.json();
      console.log('✗ Failed to connect to Airtable');
      console.log('Status:', metaRes.status);
      console.log('Error:', JSON.stringify(error, null, 2));
      console.log();
      console.log('Common issues:');
      console.log('1. API key is invalid or expired');
      console.log('2. API key does not have permission to access schema (needs "schema.bases:read" scope)');
      console.log('3. Base ID is incorrect');
      console.log();
      console.log('Next steps:');
      console.log('1. Go to https://airtable.com/create/tokens');
      console.log('2. Create a new token with these scopes:');
      console.log('   - data.records:read');
      console.log('   - data.records:write');
      console.log('   - schema.bases:read');
      console.log('3. Add access to your base: ' + AIRTABLE_BASE_ID);
      console.log('4. Copy the token and update AIRTABLE_API_KEY');

      return null;
    }
  } catch (err) {
    console.log('✗ Error connecting to Airtable:', err.message);
    return null;
  }
}

async function testCommonTableNames() {
  console.log('\n\n2. Trying to access common table names...');
  console.log('-'.repeat(60));

  const commonNames = [
    'Buyer Property Matches',
    'BuyerPropertyMatches',
    'Properties',
    'Buyers',
    'Contacts',
    'Table 1',
    'Matches'
  ];

  for (const tableName of commonNames) {
    try {
      const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}?maxRecords=1`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        }
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`✓ Found table: "${tableName}"`);
        if (data.records && data.records.length > 0) {
          console.log('  Record count: ' + data.records.length + ' (showing max 1)');
          console.log('  Fields:', Object.keys(data.records[0].fields).join(', '));
        } else {
          console.log('  (Table is empty)');
        }
      } else {
        console.log(`✗ Table not found: "${tableName}"`);
      }
    } catch (err) {
      console.log(`✗ Error checking "${tableName}":`, err.message);
    }
  }
}

(async () => {
  const result = await testConnection();

  if (!result) {
    // If meta API failed, try common table names
    await testCommonTableNames();
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test complete!');
  console.log('='.repeat(60));
})();

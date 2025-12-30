/**
 * Test script to verify Airtable calculator tables exist
 * Run with: npx ts-node scripts/test-calculator-tables.ts
 */

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

async function testTables() {
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error('❌ Missing environment variables:');
    console.error('   AIRTABLE_API_KEY:', AIRTABLE_API_KEY ? '✓ Set' : '✗ Missing');
    console.error('   AIRTABLE_BASE_ID:', AIRTABLE_BASE_ID ? '✓ Set' : '✗ Missing');
    process.exit(1);
  }

  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  console.log('\n🔍 Testing Airtable Calculator Tables...\n');

  // Test Deal Calculations table
  console.log('1. Testing "Deal Calculations" table...');
  try {
    const calcRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Deal%20Calculations?maxRecords=1`,
      { headers }
    );
    if (calcRes.ok) {
      const data = await calcRes.json();
      console.log('   ✅ Table exists! Records:', data.records?.length || 0);
    } else {
      const error = await calcRes.json();
      console.log('   ❌ Table not found or error:', error.error?.message || calcRes.status);
      console.log('\n   📋 Create this table manually in Airtable with fields:');
      console.log('      - Name (Single line text)');
      console.log('      - Property Code (Single line text)');
      console.log('      - Contact ID (Single line text)');
      console.log('      - Inputs (Long text)');
      console.log('      - Outputs (Long text)');
      console.log('      - Notes (Long text)');
      console.log('      - Created At (Date, include time)');
      console.log('      - Updated At (Date, include time)');
    }
  } catch (e) {
    console.log('   ❌ Error:', e);
  }

  // Test Calculator Defaults table
  console.log('\n2. Testing "Calculator Defaults" table...');
  try {
    const defaultsRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Calculator%20Defaults?maxRecords=1`,
      { headers }
    );
    if (defaultsRes.ok) {
      const data = await defaultsRes.json();
      console.log('   ✅ Table exists! Records:', data.records?.length || 0);
      if (data.records?.length === 0) {
        console.log('   ℹ️  No defaults configured yet - system defaults will be used');
      }
    } else {
      const error = await defaultsRes.json();
      console.log('   ❌ Table not found or error:', error.error?.message || defaultsRes.status);
      console.log('\n   📋 Create this table manually in Airtable with fields:');
      console.log('      - Wholesale Discount (Number)');
      console.log('      - Your Fee (Number)');
      console.log('      - Credit to Buyer (Number)');
      console.log('      - Maintenance Percent (Number)');
      console.log('      - Property Mgmt Percent (Number)');
      console.log('      - DSCR Interest Rate (Number)');
      console.log('      - DSCR Term Years (Number)');
      console.log('      - DSCR Balloon Years (Number)');
      console.log('      - DSCR Points (Number)');
      console.log('      - DSCR Fees (Number)');
      console.log('      - Wrap Interest Rate (Number)');
      console.log('      - Wrap Term Years (Number)');
      console.log('      - Wrap Balloon Years (Number)');
      console.log('      - Wrap Service Fee (Number)');
      console.log('      - Closing Costs (Number)');
      console.log('      - Appraisal Cost (Number)');
      console.log('      - LLC Cost (Number)');
      console.log('      - Servicing Fee (Number)');
      console.log('      - Updated At (Date, include time)');
    }
  } catch (e) {
    console.log('   ❌ Error:', e);
  }

  console.log('\n✨ Done!\n');
}

testTables();

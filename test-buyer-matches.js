/**
 * Test script to check buyer property matches
 * This tests the full flow: Buyers → Property-Buyer Matches → Properties
 *
 * Usage: node test-buyer-matches.js [GHL_CONTACT_ID]
 */

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

const TEST_CONTACT_ID = process.argv[2] || 'test-contact-123';

console.log('='.repeat(70));
console.log('Testing Buyer Property Matches');
console.log('='.repeat(70));
console.log('Contact ID:', TEST_CONTACT_ID);
console.log('Base ID:', AIRTABLE_BASE_ID);
console.log('='.repeat(70));
console.log();

async function testBuyerMatches(contactId) {
  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // Step 1: Find buyer by Contact ID
    console.log('Step 1: Looking up buyer...');
    const buyerFormula = encodeURIComponent(`{Contact ID} = "${contactId}"`);
    const buyerRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Buyers?filterByFormula=${buyerFormula}`,
      { headers }
    );

    if (!buyerRes.ok) {
      throw new Error(`Failed to fetch buyer: ${buyerRes.status}`);
    }

    const buyerData = await buyerRes.json();

    if (!buyerData.records || buyerData.records.length === 0) {
      console.log('✗ No buyer found with Contact ID:', contactId);
      console.log();
      console.log('To create a test buyer, add a record to the Buyers table:');
      console.log('  - Contact ID:', contactId);
      console.log('  - First Name: Test');
      console.log('  - Last Name: Buyer');
      console.log('  - Email: test@example.com');
      return;
    }

    const buyer = buyerData.records[0];
    console.log('✓ Found buyer:');
    console.log('  Record ID:', buyer.id);
    console.log('  Name:', `${buyer.fields['First Name']} ${buyer.fields['Last Name']}`);
    console.log('  Email:', buyer.fields['Email']);
    console.log();

    // Step 2: Find property matches
    console.log('Step 2: Looking up property matches...');
    const matchesFormula = encodeURIComponent(`SEARCH("${buyer.id}", ARRAYJOIN({Contact ID}))`);
    const matchesRes = await fetch(
      `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Property-Buyer%20Matches?filterByFormula=${matchesFormula}`,
      { headers }
    );

    if (!matchesRes.ok) {
      throw new Error(`Failed to fetch matches: ${matchesRes.status}`);
    }

    const matchesData = await matchesRes.json();

    if (!matchesData.records || matchesData.records.length === 0) {
      console.log('✗ No property matches found for this buyer');
      console.log();
      console.log('To create a match:');
      console.log('  1. Go to Property-Buyer Matches table');
      console.log('  2. Add a new record:');
      console.log('     - Contact ID: Link to the buyer record');
      console.log('     - Property Code: Link to a property');
      console.log('     - Match Status: Active');
      return;
    }

    console.log(`✓ Found ${matchesData.records.length} match(es)`);
    console.log();

    // Step 3: Get property details
    console.log('Step 3: Fetching property details...');
    const propertyRecordIds = matchesData.records
      .flatMap(record => record.fields['Property Code'] || []);

    if (propertyRecordIds.length === 0) {
      console.log('✗ Match records exist but have no linked properties');
      return;
    }

    console.log(`Found ${propertyRecordIds.length} linked property record(s)`);
    console.log();

    // Fetch each property
    const properties = [];
    for (const propRecId of propertyRecordIds) {
      try {
        const propRes = await fetch(
          `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/Properties/${propRecId}`,
          { headers }
        );

        if (propRes.ok) {
          const prop = await propRes.json();
          properties.push(prop);
          console.log(`✓ Property ${properties.length}:`);
          console.log('  Property Code:', prop.fields['Property Code']);
          console.log('  Opportunity ID:', prop.fields['Opportunity ID']);
          console.log('  Address:', prop.fields['Address']);
          console.log('  City:', prop.fields['City']);
          console.log('  Beds:', prop.fields['Beds']);
          console.log('  Baths:', prop.fields['Baths']);
        } else {
          console.log(`✗ Failed to fetch property ${propRecId}:`, propRes.status);
        }
      } catch (err) {
        console.log(`✗ Error fetching property ${propRecId}:`, err.message);
      }
    }

    console.log();
    console.log('='.repeat(70));
    console.log('Summary');
    console.log('='.repeat(70));
    console.log('Buyer:', `${buyer.fields['First Name']} ${buyer.fields['Last Name']}`);
    console.log('Email:', buyer.fields['Email']);
    console.log('Matched Properties:', properties.length);

    const propertyCodes = properties
      .map(p => p.fields['Property Code'] || p.fields['Opportunity ID'])
      .filter(Boolean);

    console.log('Property IDs:', propertyCodes.join(', '));
    console.log();
    console.log('✅ Test completed successfully!');
    console.log();
    console.log('This buyer is ready to receive property emails via the Contact Detail Modal.');

  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
  }
}

testBuyerMatches(TEST_CONTACT_ID);

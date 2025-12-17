/**
 * Test script for matching algorithm with real Airtable data
 */

// Import the scorer function
const { generateMatchScore } = require('./api/matching/scorer.ts');

// Simulate the actual buyer record from Airtable
const buyer = {
  id: "recXHph7Aa7skEMmi",
  fields: {
    "Contact ID": "CZAQKLNzfBKu3V8AQXIc",
    "First Name": "HLA",
    "Last Name": "Buyer 2",
    "Email": "hello+buyer2@heymervin.com",
    "Phone": "(504) 555-0102",
    "Preferred Location": "Metairie",
    "City": "Metairie",
    "State": "LA",
    "No. of Bath": 2,
    "No. of Bedrooms": 2,
    "Monthly Income": 6000,
    "Monthly Liabilities": 1800,
    "Downpayment": 30000,
    "Preferred Zip Codes": "70002, 70001, 90210"  // Comma-separated string
  }
};

// Simulate the actual property record from Airtable
const property = {
  id: "recRDeZiEj7rsf6X6",
  fields: {
    "Property Code": "iLLdhYy3h9EUQPibzx56",
    "Address": "147 St. Bernard Hwy",
    "City": "Metairie",
    "Beds": 2,
    "Baths": 2,
    "Sqft": 1400,
    "Stage": "New Lead",
    "Property Type": "Condo",
    "Down Payment": 30000,
    "Monthly Payment": 1746,
    "Property Total Price": 195000,
    "Zip Code": "70002"  // Separate field
  }
};

console.log('Testing Matching Algorithm');
console.log('==========================\n');

console.log('Buyer:', buyer.fields['First Name'], buyer.fields['Last Name']);
console.log('  - Preferred ZIP Codes:', buyer.fields['Preferred Zip Codes']);
console.log('  - Desired Beds:', buyer.fields['No. of Bedrooms']);
console.log('  - Desired Baths:', buyer.fields['No. of Bath']);
console.log('  - Down Payment: $' + buyer.fields['Downpayment'].toLocaleString());
console.log('');

console.log('Property:', property.fields['Property Code']);
console.log('  - Address:', property.fields['Address']);
console.log('  - ZIP Code:', property.fields['Zip Code']);
console.log('  - Beds:', property.fields['Beds']);
console.log('  - Baths:', property.fields['Baths']);
console.log('  - Price: $' + property.fields['Property Total Price'].toLocaleString());
console.log('');

try {
  const score = generateMatchScore(buyer, property);

  console.log('Match Score Results:');
  console.log('===================');
  console.log('Total Score:', score.score + '/100');
  console.log('  - Location Score:', score.locationScore + '/40', score.isPriority ? '(PRIORITY)' : '');
  console.log('  - Beds Score:', score.bedsScore + '/25');
  console.log('  - Baths Score:', score.bathsScore + '/15');
  console.log('  - Budget Score:', score.budgetScore + '/20');
  console.log('');
  console.log('Is Priority Match:', score.isPriority);
  console.log('Reasoning:', score.reasoning);
  console.log('');
  console.log('Highlights:', score.highlights.join(', '));
  if (score.concerns && score.concerns.length > 0) {
    console.log('Concerns:', score.concerns.join(', '));
  }
  console.log('');

  // Verify expected results
  console.log('Expected vs Actual:');
  console.log('==================');
  console.log('✓ Location Score: Expected 40, Got', score.locationScore, score.locationScore === 40 ? '✓' : '✗');
  console.log('✓ Beds Score: Expected 25, Got', score.bedsScore, score.bedsScore === 25 ? '✓' : '✗');
  console.log('✓ Baths Score: Expected 15, Got', score.bathsScore, score.bathsScore === 15 ? '✓' : '✗');
  console.log('✓ Budget Score: Expected 15, Got', score.budgetScore, score.budgetScore === 15 ? '✓' : '✗');
  console.log('✓ Total Score: Expected 95, Got', score.score, score.score === 95 ? '✓' : '✗');
  console.log('✓ Is Priority: Expected true, Got', score.isPriority, score.isPriority === true ? '✓' : '✗');

  const allPassed = score.locationScore === 40 &&
                    score.bedsScore === 25 &&
                    score.bathsScore === 15 &&
                    score.budgetScore === 15 &&
                    score.score === 95 &&
                    score.isPriority === true;

  console.log('');
  console.log(allPassed ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');

  process.exit(allPassed ? 0 : 1);
} catch (error) {
  console.error('❌ Error during matching:', error);
  console.error(error.stack);
  process.exit(1);
}

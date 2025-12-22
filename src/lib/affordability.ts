/**
 * Affordability Calculation Utility
 * Calculates maximum affordable property price based on buyer's down payment
 *
 * Formula:
 * - Fixed costs: $8,310 (other) + $1,990 (fees) = $10,300
 * - Entry factor: 20% down + 1% closing + 1.6% points (80% of 2%) = 22.6%
 * - Max price = ((downPayment - fixed) / entry factor) + $15,000 buffer
 * - Round to nearest $1,000
 */

/**
 * Calculate maximum affordable price based on down payment
 *
 * @param downPayment - Buyer's available down payment
 * @returns Maximum affordable property price (rounded to nearest $1,000)
 *
 * @example
 * calculateMaxAffordablePrice(50000)  // Returns ~$175,000
 * calculateMaxAffordablePrice(100000) // Returns ~$397,000
 */
export function calculateMaxAffordablePrice(downPayment: number): number {
  // Fixed costs
  const fixedOther = 8310;  // Red-box costs (no closing)
  const feesFixed = 1990;   // Loan fees

  // Percentage costs
  const dpPct = 0.20;       // 20% down payment
  const closingPct = 0.01;  // 1% closing costs
  const pointsPct = 0.02;   // 2% points

  // Calculate entry factor (total percentage of price needed upfront)
  const entryFactor = dpPct + closingPct + (pointsPct * 0.80); // = 0.226

  // Calculate total fixed costs
  const fixedTotal = fixedOther + feesFixed; // = 10300

  // Calculate max price: (available funds after fixed costs) / entry factor + buffer
  const maxPrice = ((downPayment - fixedTotal) / entryFactor) + 15000;

  // Round to nearest thousand
  return Math.round(maxPrice / 1000) * 1000;
}

/**
 * Validate if buyer has sufficient down payment for affordability calculation
 * Must cover at least the fixed costs ($10,300)
 *
 * @param downPayment - Buyer's down payment amount
 * @returns True if down payment is sufficient
 */
export function hasValidDownPayment(downPayment: number | undefined): boolean {
  return !!downPayment && downPayment > 10300;
}

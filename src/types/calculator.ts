/**
 * Deal Calculator Type Definitions
 * ~50 input fields organized by section, plus computed outputs
 */

// ============ INPUT SECTION TYPES ============

/**
 * Property Basics - Core property information
 */
export interface PropertyBasicsInputs {
  askingPrice: number;
  arv: number; // After Repair Value
  repairs: number;
  yourFee: number;
  creditToBuyer: number;
  wholesaleDiscount: number; // Percentage (e.g., 70 = 70%)
}

/**
 * Income - Rental income sources
 */
export interface IncomeInputs {
  monthlyRent: number;
  otherIncome: number;
}

/**
 * Purchase Costs - One-time acquisition costs
 */
export interface PurchaseCostsInputs {
  purchasePrice: number;
  closingCosts: number;
  appraisalCost: number;
  llcCost: number;
  servicingFee: number;
  sellerAllowance: number;
}

/**
 * Tax & Insurance - Annual property costs
 */
export interface TaxInsuranceInputs {
  annualTaxes: number;
  annualInsurance: number;
}

/**
 * Operating Expenses - Recurring property costs
 */
export interface OperatingInputs {
  maintenancePercent: number; // Percentage of rent
  propertyMgmtPercent: number; // Percentage of rent
  hoa: number;
  utilities: number;
}

/**
 * Subject-To Loan - Existing loan assumption
 */
export interface SubjectToInputs {
  useSubjectTo: boolean;
  subToLoanType: 'Conventional' | 'FHA' | 'VA' | 'USDA' | 'Other';
  subToPrincipal: number;
  subToInterestRate: number; // Annual percentage
  subToTermYears: number;
  subToStartDate: string; // ISO date string
  subToBalloonYears: number;
}

/**
 * DSCR Loan - Debt Service Coverage Ratio loan
 */
export interface DSCRLoanInputs {
  useDSCRLoan: boolean;
  dscrInterestRate: number; // Annual percentage
  dscrTermYears: number;
  dscrStartDate: string; // ISO date string
  dscrBalloonYears: number;
  dscrPoints: number; // Percentage of loan amount
  dscrFees: number;
}

/**
 * Second Loan - Additional financing
 */
export interface SecondLoanInputs {
  useLoan2: boolean;
  loan2Principal: number;
  loan2InterestRate: number; // Annual percentage
  loan2TermYears: number;
  loan2StartDate: string; // ISO date string
  loan2BalloonYears: number;
  loan2Points: number; // Percentage of loan amount
  loan2Fees: number;
}

/**
 * Wrap Loan - Seller financing wrapper
 */
export interface WrapLoanInputs {
  useWrap: boolean;
  wrapLoanType: 'Amortized' | 'Interest Only';
  wrapInterestRate: number; // Annual percentage
  wrapTermYears: number;
  wrapStartDate: string; // ISO date string
  wrapBalloonYears: number;
  wrapPoints: number; // Percentage of loan amount
  wrapFees: number;
  wrapServiceFee: number; // Monthly servicing fee
}

/**
 * Wrap Sales Terms - Buyer's purchase terms
 */
export interface WrapSalesInputs {
  wrapSalesPrice: number;
  buyerDownPayment: number;
  buyerClosingCosts: number;
}

/**
 * Flip - Fix and flip scenario
 */
export interface FlipInputs {
  projectMonths: number;
  resaleClosingCosts: number;
  resaleMarketing: number;
  contingency: number;
}

/**
 * Complete Calculator Inputs - All sections combined
 */
export interface CalculatorInputs {
  // Metadata
  name: string;
  propertyRecordId?: string; // Link to Airtable property
  buyerRecordId?: string; // Link to Airtable buyer
  propertyCode?: string;
  contactId?: string;

  // All input sections
  propertyBasics: PropertyBasicsInputs;
  income: IncomeInputs;
  purchaseCosts: PurchaseCostsInputs;
  taxInsurance: TaxInsuranceInputs;
  operating: OperatingInputs;
  subjectTo: SubjectToInputs;
  dscrLoan: DSCRLoanInputs;
  secondLoan: SecondLoanInputs;
  wrapLoan: WrapLoanInputs;
  wrapSales: WrapSalesInputs;
  flip: FlipInputs;
}

// ============ OUTPUT TYPES ============

/**
 * Quick Stats - Key metrics displayed prominently
 */
export interface QuickStatsOutputs {
  mao: number; // Maximum Allowable Offer
  monthlyCashflow: number; // Hold strategy cashflow
  wrapCashflow: number; // Wrap strategy cashflow
  flipProfit: number; // Flip strategy profit
  totalEntryFee: number; // Total upfront costs
  fundingGap: number; // Cash needed at closing
  cashOnCashHold: number; // CoC return for hold (percentage)
  cashOnCashFlip: number; // CoC return for flip (percentage)
  cashOnCashWrap: number; // CoC return for wrap (percentage)
}

/**
 * Loan Calculations - Detailed loan outputs
 */
export interface LoanCalcsOutputs {
  dscrLoanAmount: number;
  dscrMonthlyPayment: number;
  dscrBalloonAmount: number;
  dscrDownPayment: number;
  subToMonthlyPayment: number;
  subToCurrentBalance: number;
  loan2MonthlyPayment: number;
  loan2BalloonAmount: number;
  wrapPrincipal: number;
  wrapMonthlyPayment: number;
  wrapBalloonAmount: number;
  buyerMonthlyPITI: number;
}

/**
 * Totals - Aggregated income and expenses
 */
export interface TotalsOutputs {
  totalMonthlyIncome: number;
  totalMonthlyPI: number; // Principal + Interest payments
  totalMonthlyTI: number; // Taxes + Insurance
  totalMonthlyMaintenance: number;
  totalMonthlyPropertyMgmt: number;
  totalMonthlyExpenses: number;
}

/**
 * Deal Checklist - Pass/fail criteria
 */
export interface DealChecklistOutputs {
  entryFeeUnder25k: boolean;
  cashflowOver400: boolean;
  ltvUnder75: boolean;
  equityOver15k: boolean;
  dealDecision: 'DEAL' | 'NO DEAL' | 'NEEDS REVIEW';
}

/**
 * Complete Calculator Outputs - All computed values
 */
export interface CalculatorOutputs {
  quickStats: QuickStatsOutputs;
  loanCalcs: LoanCalcsOutputs;
  totals: TotalsOutputs;
  dealChecklist: DealChecklistOutputs;
}

// ============ SCENARIO & RECORD TYPES ============

/**
 * Calculator Scenario - For side-by-side comparison
 */
export interface CalculatorScenario {
  id: string;
  name: string;
  inputs: CalculatorInputs;
  outputs: CalculatorOutputs;
  isDefault?: boolean;
}

/**
 * Saved Calculation - Full record from Airtable
 */
export interface SavedCalculation {
  id: string;
  name: string;
  propertyRecordId?: string;
  buyerRecordId?: string;
  propertyCode?: string;
  contactId?: string;
  inputs: CalculatorInputs;
  outputs: CalculatorOutputs;
  createdAt: string;
  updatedAt: string;
}

/**
 * Calculator Defaults - User-configurable default values
 */
export interface CalculatorDefaults {
  id?: string;
  wholesaleDiscount: number;
  yourFee: number;
  creditToBuyer: number;
  maintenancePercent: number;
  propertyMgmtPercent: number;
  dscrInterestRate: number;
  dscrTermYears: number;
  dscrBalloonYears: number;
  dscrPoints: number;
  dscrFees: number;
  wrapInterestRate: number;
  wrapTermYears: number;
  wrapBalloonYears: number;
  wrapServiceFee: number;
  closingCosts: number;
  appraisalCost: number;
  llcCost: number;
  servicingFee: number;
  updatedAt?: string;
}

// ============ API RESPONSE TYPES ============

/**
 * API response for list calculations
 */
export interface CalculationsListResponse {
  calculations: SavedCalculation[];
  nextOffset?: string;
}

/**
 * API response for single calculation
 */
export interface CalculationResponse {
  calculation: SavedCalculation;
}

/**
 * API response for defaults
 */
export interface CalculatorDefaultsResponse {
  defaults: CalculatorDefaults;
}

// ============ SLIDER CONFIGURATION ============

/**
 * Slider field configuration
 */
export interface SliderFieldConfig {
  min: number;
  max: number;
  step: number;
  format?: 'currency' | 'percentage' | 'number' | 'months' | 'years';
  prefix?: string;
  suffix?: string;
}

/**
 * Default slider configurations for common fields
 */
export const SLIDER_CONFIGS: Record<string, SliderFieldConfig> = {
  // Property values
  askingPrice: { min: 50000, max: 1000000, step: 5000, format: 'currency' },
  arv: { min: 50000, max: 1500000, step: 5000, format: 'currency' },
  repairs: { min: 0, max: 200000, step: 1000, format: 'currency' },
  purchasePrice: { min: 50000, max: 1000000, step: 5000, format: 'currency' },

  // Fees and costs
  yourFee: { min: 0, max: 50000, step: 500, format: 'currency' },
  creditToBuyer: { min: 0, max: 25000, step: 500, format: 'currency' },
  closingCosts: { min: 0, max: 25000, step: 500, format: 'currency' },
  appraisalCost: { min: 0, max: 2000, step: 100, format: 'currency' },
  llcCost: { min: 0, max: 1000, step: 50, format: 'currency' },
  servicingFee: { min: 0, max: 500, step: 25, format: 'currency' },
  sellerAllowance: { min: 0, max: 25000, step: 500, format: 'currency' },

  // Income
  monthlyRent: { min: 0, max: 10000, step: 50, format: 'currency' },
  otherIncome: { min: 0, max: 2000, step: 50, format: 'currency' },

  // Annual costs
  annualTaxes: { min: 0, max: 25000, step: 100, format: 'currency' },
  annualInsurance: { min: 0, max: 10000, step: 100, format: 'currency' },

  // Operating
  hoa: { min: 0, max: 1000, step: 25, format: 'currency' },
  utilities: { min: 0, max: 500, step: 25, format: 'currency' },

  // Percentages
  wholesaleDiscount: { min: 50, max: 95, step: 1, format: 'percentage' },
  maintenancePercent: { min: 0, max: 20, step: 1, format: 'percentage' },
  propertyMgmtPercent: { min: 0, max: 15, step: 1, format: 'percentage' },

  // Loan amounts
  subToPrincipal: { min: 0, max: 500000, step: 5000, format: 'currency' },
  loan2Principal: { min: 0, max: 200000, step: 5000, format: 'currency' },

  // Interest rates
  subToInterestRate: { min: 0, max: 15, step: 0.125, format: 'percentage' },
  dscrInterestRate: { min: 5, max: 15, step: 0.125, format: 'percentage' },
  loan2InterestRate: { min: 5, max: 18, step: 0.25, format: 'percentage' },
  wrapInterestRate: { min: 5, max: 15, step: 0.125, format: 'percentage' },

  // Terms (years)
  subToTermYears: { min: 5, max: 40, step: 1, format: 'years' },
  dscrTermYears: { min: 5, max: 40, step: 1, format: 'years' },
  loan2TermYears: { min: 1, max: 30, step: 1, format: 'years' },
  wrapTermYears: { min: 5, max: 40, step: 1, format: 'years' },

  // Balloon years
  subToBalloonYears: { min: 0, max: 30, step: 1, format: 'years' },
  dscrBalloonYears: { min: 0, max: 10, step: 1, format: 'years' },
  loan2BalloonYears: { min: 0, max: 10, step: 1, format: 'years' },
  wrapBalloonYears: { min: 0, max: 10, step: 1, format: 'years' },

  // Points
  dscrPoints: { min: 0, max: 5, step: 0.25, format: 'percentage' },
  loan2Points: { min: 0, max: 5, step: 0.25, format: 'percentage' },
  wrapPoints: { min: 0, max: 5, step: 0.25, format: 'percentage' },

  // Loan fees
  dscrFees: { min: 0, max: 10000, step: 100, format: 'currency' },
  loan2Fees: { min: 0, max: 5000, step: 100, format: 'currency' },
  wrapFees: { min: 0, max: 5000, step: 100, format: 'currency' },
  wrapServiceFee: { min: 0, max: 100, step: 5, format: 'currency' },

  // Wrap sales
  wrapSalesPrice: { min: 50000, max: 1500000, step: 5000, format: 'currency' },
  buyerDownPayment: { min: 5000, max: 200000, step: 1000, format: 'currency' },
  buyerClosingCosts: { min: 0, max: 15000, step: 500, format: 'currency' },

  // Flip
  projectMonths: { min: 1, max: 24, step: 1, format: 'months' },
  resaleClosingCosts: { min: 0, max: 50000, step: 1000, format: 'currency' },
  resaleMarketing: { min: 0, max: 25000, step: 500, format: 'currency' },
  contingency: { min: 0, max: 50000, step: 1000, format: 'currency' },
};

// ============ DEFAULT VALUES ============

/**
 * System default values for calculator
 */
export const DEFAULT_CALCULATOR_VALUES: CalculatorDefaults = {
  wholesaleDiscount: 70,
  maintenancePercent: 5,
  propertyMgmtPercent: 10,
  dscrInterestRate: 8,
  dscrTermYears: 30,
  dscrBalloonYears: 5,
  dscrPoints: 2,
  dscrFees: 1500,
  wrapInterestRate: 9,
  wrapTermYears: 30,
  wrapBalloonYears: 5,
  wrapServiceFee: 35,
  closingCosts: 3000,
  appraisalCost: 500,
  llcCost: 200,
  servicingFee: 100,
};

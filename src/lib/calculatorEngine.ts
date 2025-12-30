/**
 * Deal Calculator Calculation Engine
 * All formulas run client-side for instant real-time feedback
 */

import type {
  CalculatorInputs,
  CalculatorOutputs,
  QuickStatsOutputs,
  LoanCalcsOutputs,
  TotalsOutputs,
  DealChecklistOutputs,
  CalculatorDefaults,
  PropertyBasicsInputs,
  IncomeInputs,
  PurchaseCostsInputs,
  TaxInsuranceInputs,
  OperatingInputs,
  SubjectToInputs,
  DSCRLoanInputs,
  SecondLoanInputs,
  WrapLoanInputs,
  WrapSalesInputs,
  FlipInputs,
} from '@/types/calculator';
import { DEFAULT_CALCULATOR_VALUES } from '@/types/calculator';

// ============ CORE FINANCIAL FUNCTIONS ============

/**
 * Calculate monthly loan payment using PMT formula
 * PMT = (PV * r * (1+r)^n) / ((1+r)^n - 1)
 *
 * @param principal - Loan amount (PV)
 * @param annualRate - Annual interest rate as percentage (e.g., 8 for 8%)
 * @param termYears - Loan term in years
 * @returns Monthly payment amount
 */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (principal <= 0 || termYears <= 0) return 0;
  if (annualRate <= 0) return principal / (termYears * 12);

  const monthlyRate = annualRate / 100 / 12;
  const numPayments = termYears * 12;
  const factor = Math.pow(1 + monthlyRate, numPayments);

  return (principal * monthlyRate * factor) / (factor - 1);
}

/**
 * Calculate interest-only monthly payment
 *
 * @param principal - Loan amount
 * @param annualRate - Annual interest rate as percentage
 * @returns Monthly interest-only payment
 */
export function calculateInterestOnlyPayment(
  principal: number,
  annualRate: number
): number {
  if (principal <= 0 || annualRate <= 0) return 0;
  return (principal * annualRate / 100) / 12;
}

/**
 * Calculate balloon balance at specified years
 * Uses amortization schedule to determine remaining balance
 *
 * @param principal - Original loan amount
 * @param annualRate - Annual interest rate as percentage
 * @param termYears - Original loan term in years
 * @param balloonYears - Years until balloon payment
 * @returns Remaining balance at balloon date
 */
export function calculateBalloonBalance(
  principal: number,
  annualRate: number,
  termYears: number,
  balloonYears: number
): number {
  if (principal <= 0 || termYears <= 0) return 0;
  if (balloonYears <= 0) return principal;
  if (balloonYears >= termYears) return 0;

  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termYears);
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = balloonYears * 12;

  if (annualRate <= 0) {
    // Simple calculation for 0% interest
    return principal - (monthlyPayment * numPayments);
  }

  let balance = principal;
  for (let i = 0; i < numPayments; i++) {
    const interest = balance * monthlyRate;
    const principalPaid = monthlyPayment - interest;
    balance -= principalPaid;
  }

  return Math.max(0, balance);
}

/**
 * Calculate current loan balance based on start date
 * Estimates how many payments have been made since loan origination
 *
 * @param originalPrincipal - Original loan amount
 * @param annualRate - Annual interest rate as percentage
 * @param termYears - Original loan term in years
 * @param startDate - ISO date string of loan start
 * @returns Current estimated balance
 */
export function calculateCurrentBalance(
  originalPrincipal: number,
  annualRate: number,
  termYears: number,
  startDate: string
): number {
  if (!startDate || originalPrincipal <= 0) return originalPrincipal;

  const start = new Date(startDate);
  const now = new Date();
  const monthsElapsed = Math.max(0,
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  );

  const yearsElapsed = monthsElapsed / 12;
  if (yearsElapsed >= termYears) return 0;

  return calculateBalloonBalance(originalPrincipal, annualRate, termYears, yearsElapsed);
}

// ============ DEAL CALCULATION FUNCTIONS ============

/**
 * Calculate MAO (Maximum Allowable Offer)
 * MAO = (ARV - repairs - yourFee - creditToBuyer) * (wholesaleDiscount / 100)
 */
export function calculateMAO(propertyBasics: PropertyBasicsInputs): number {
  const { arv, repairs, yourFee, creditToBuyer, wholesaleDiscount } = propertyBasics;
  const netARV = arv - repairs - yourFee - creditToBuyer;
  return netARV * (wholesaleDiscount / 100);
}

/**
 * Calculate DSCR loan amount (typically 80% LTV)
 */
export function calculateDSCRLoanAmount(purchasePrice: number): number {
  return purchasePrice * 0.8;
}

/**
 * Calculate all loan-related outputs
 */
export function calculateLoanCalcs(inputs: CalculatorInputs): LoanCalcsOutputs {
  const { purchaseCosts, subjectTo, dscrLoan, secondLoan, wrapLoan, wrapSales, taxInsurance } = inputs;

  // DSCR Loan calculations
  const dscrLoanAmount = dscrLoan.useDSCRLoan
    ? calculateDSCRLoanAmount(purchaseCosts.purchasePrice)
    : 0;
  const dscrDownPayment = dscrLoan.useDSCRLoan
    ? purchaseCosts.purchasePrice - dscrLoanAmount
    : 0;
  const dscrMonthlyPayment = dscrLoan.useDSCRLoan
    ? calculateMonthlyPayment(dscrLoanAmount, dscrLoan.dscrInterestRate, dscrLoan.dscrTermYears)
    : 0;
  const dscrBalloonAmount = dscrLoan.useDSCRLoan && dscrLoan.dscrBalloonYears > 0
    ? calculateBalloonBalance(dscrLoanAmount, dscrLoan.dscrInterestRate, dscrLoan.dscrTermYears, dscrLoan.dscrBalloonYears)
    : 0;

  // Subject-To Loan calculations
  const subToCurrentBalance = subjectTo.useSubjectTo
    ? (subjectTo.subToStartDate
        ? calculateCurrentBalance(subjectTo.subToPrincipal, subjectTo.subToInterestRate, subjectTo.subToTermYears, subjectTo.subToStartDate)
        : subjectTo.subToPrincipal)
    : 0;
  const subToMonthlyPayment = subjectTo.useSubjectTo
    ? calculateMonthlyPayment(subjectTo.subToPrincipal, subjectTo.subToInterestRate, subjectTo.subToTermYears)
    : 0;

  // Second Loan calculations
  const loan2MonthlyPayment = secondLoan.useLoan2
    ? calculateMonthlyPayment(secondLoan.loan2Principal, secondLoan.loan2InterestRate, secondLoan.loan2TermYears)
    : 0;
  const loan2BalloonAmount = secondLoan.useLoan2 && secondLoan.loan2BalloonYears > 0
    ? calculateBalloonBalance(secondLoan.loan2Principal, secondLoan.loan2InterestRate, secondLoan.loan2TermYears, secondLoan.loan2BalloonYears)
    : 0;

  // Wrap Loan calculations
  const wrapPrincipal = wrapLoan.useWrap
    ? wrapSales.wrapSalesPrice - wrapSales.buyerDownPayment
    : 0;
  const wrapMonthlyPayment = wrapLoan.useWrap
    ? (wrapLoan.wrapLoanType === 'Interest Only'
        ? calculateInterestOnlyPayment(wrapPrincipal, wrapLoan.wrapInterestRate)
        : calculateMonthlyPayment(wrapPrincipal, wrapLoan.wrapInterestRate, wrapLoan.wrapTermYears))
    : 0;
  const wrapBalloonAmount = wrapLoan.useWrap && wrapLoan.wrapBalloonYears > 0
    ? (wrapLoan.wrapLoanType === 'Interest Only'
        ? wrapPrincipal // Interest only = full principal due at balloon
        : calculateBalloonBalance(wrapPrincipal, wrapLoan.wrapInterestRate, wrapLoan.wrapTermYears, wrapLoan.wrapBalloonYears))
    : 0;

  // Buyer Monthly PITI (Principal, Interest, Taxes, Insurance)
  const monthlyTaxes = taxInsurance.annualTaxes / 12;
  const monthlyInsurance = taxInsurance.annualInsurance / 12;
  const buyerMonthlyPITI = wrapMonthlyPayment + monthlyTaxes + monthlyInsurance;

  return {
    dscrLoanAmount,
    dscrDownPayment,
    dscrMonthlyPayment,
    dscrBalloonAmount,
    subToMonthlyPayment,
    subToCurrentBalance,
    loan2MonthlyPayment,
    loan2BalloonAmount,
    wrapPrincipal,
    wrapMonthlyPayment,
    wrapBalloonAmount,
    buyerMonthlyPITI,
  };
}

/**
 * Calculate income and expense totals
 */
export function calculateTotals(inputs: CalculatorInputs, loanCalcs: LoanCalcsOutputs): TotalsOutputs {
  const { income, taxInsurance, operating } = inputs;

  // Total monthly income
  const totalMonthlyIncome = income.monthlyRent + income.otherIncome;

  // Total monthly P&I (all loan payments)
  const totalMonthlyPI =
    loanCalcs.dscrMonthlyPayment +
    loanCalcs.subToMonthlyPayment +
    loanCalcs.loan2MonthlyPayment;

  // Total monthly T&I (taxes and insurance)
  const totalMonthlyTI = (taxInsurance.annualTaxes + taxInsurance.annualInsurance) / 12;

  // Maintenance
  const totalMonthlyMaintenance = income.monthlyRent * (operating.maintenancePercent / 100);

  // Property management
  const totalMonthlyPropertyMgmt = totalMonthlyIncome * (operating.propertyMgmtPercent / 100);

  // Total monthly expenses
  const totalMonthlyExpenses =
    totalMonthlyPI +
    totalMonthlyTI +
    totalMonthlyMaintenance +
    totalMonthlyPropertyMgmt +
    operating.hoa +
    operating.utilities;

  return {
    totalMonthlyIncome,
    totalMonthlyPI,
    totalMonthlyTI,
    totalMonthlyMaintenance,
    totalMonthlyPropertyMgmt,
    totalMonthlyExpenses,
  };
}

/**
 * Calculate quick stats (key metrics)
 */
export function calculateQuickStats(
  inputs: CalculatorInputs,
  loanCalcs: LoanCalcsOutputs,
  totals: TotalsOutputs
): QuickStatsOutputs {
  const { propertyBasics, purchaseCosts, flip, wrapLoan, wrapSales, dscrLoan, secondLoan, subjectTo } = inputs;

  // MAO (Maximum Allowable Offer)
  const mao = calculateMAO(propertyBasics);

  // Monthly Cashflow (Hold strategy)
  const monthlyCashflow = totals.totalMonthlyIncome - totals.totalMonthlyExpenses;

  // Wrap Cashflow
  const underlyingPayments = loanCalcs.subToMonthlyPayment + loanCalcs.dscrMonthlyPayment + loanCalcs.loan2MonthlyPayment;
  const wrapCashflow = wrapLoan.useWrap
    ? loanCalcs.wrapMonthlyPayment - underlyingPayments - wrapLoan.wrapServiceFee
    : 0;

  // Flip Profit
  const carryingCosts = (totals.totalMonthlyPI + totals.totalMonthlyTI) * flip.projectMonths;
  const totalFlipCosts =
    purchaseCosts.purchasePrice +
    propertyBasics.repairs +
    purchaseCosts.closingCosts +
    carryingCosts +
    flip.resaleClosingCosts +
    flip.resaleMarketing +
    flip.contingency;
  const flipProfit = propertyBasics.arv - totalFlipCosts;

  // Total Entry Fee (upfront costs)
  const dscrUpfrontCosts = dscrLoan.useDSCRLoan
    ? (loanCalcs.dscrLoanAmount * dscrLoan.dscrPoints / 100) + dscrLoan.dscrFees
    : 0;
  const loan2UpfrontCosts = secondLoan.useLoan2
    ? (secondLoan.loan2Principal * secondLoan.loan2Points / 100) + secondLoan.loan2Fees
    : 0;
  const wrapUpfrontCosts = wrapLoan.useWrap
    ? (loanCalcs.wrapPrincipal * wrapLoan.wrapPoints / 100) + wrapLoan.wrapFees
    : 0;

  const totalEntryFee =
    purchaseCosts.closingCosts +
    purchaseCosts.appraisalCost +
    purchaseCosts.llcCost +
    purchaseCosts.servicingFee +
    dscrUpfrontCosts +
    loan2UpfrontCosts +
    wrapUpfrontCosts;

  // Funding Gap (cash needed at closing)
  const financingAvailable =
    loanCalcs.dscrLoanAmount +
    loanCalcs.subToCurrentBalance +
    (secondLoan.useLoan2 ? secondLoan.loan2Principal : 0);
  const cashNeeded = purchaseCosts.purchasePrice - financingAvailable;
  const fundingGap = Math.max(0, cashNeeded + totalEntryFee + propertyBasics.repairs);

  // Cash on Cash Returns
  const totalCashInvested = fundingGap > 0 ? fundingGap : 1; // Prevent division by zero

  // Hold CoC: Annual cashflow / cash invested
  const annualCashflow = monthlyCashflow * 12;
  const cashOnCashHold = (annualCashflow / totalCashInvested) * 100;

  // Flip CoC: Annualized profit / cash invested
  const annualizedFlipProfit = flip.projectMonths > 0
    ? (flipProfit / (flip.projectMonths / 12))
    : 0;
  const cashOnCashFlip = (annualizedFlipProfit / totalCashInvested) * 100;

  // Wrap CoC: Wrap net (including down payment received)
  const wrapNetAtClosing = wrapLoan.useWrap
    ? wrapSales.buyerDownPayment - wrapSales.buyerClosingCosts - totalEntryFee
    : 0;
  const wrapTotalInvested = Math.max(1, fundingGap - wrapNetAtClosing);
  const annualWrapCashflow = wrapCashflow * 12;
  const cashOnCashWrap = wrapLoan.useWrap
    ? (annualWrapCashflow / wrapTotalInvested) * 100
    : 0;

  return {
    mao,
    monthlyCashflow,
    wrapCashflow,
    flipProfit,
    totalEntryFee,
    fundingGap,
    cashOnCashHold,
    cashOnCashFlip,
    cashOnCashWrap,
  };
}

/**
 * Calculate deal checklist (pass/fail criteria)
 */
export function calculateDealChecklist(
  inputs: CalculatorInputs,
  quickStats: QuickStatsOutputs,
  loanCalcs: LoanCalcsOutputs
): DealChecklistOutputs {
  const { propertyBasics, purchaseCosts } = inputs;

  // Entry Fee < $25k
  const entryFeeUnder25k = quickStats.totalEntryFee < 25000;

  // Monthly Cashflow > $400
  const cashflowOver400 = quickStats.monthlyCashflow >= 400;

  // LTV < 75% (total loans / ARV)
  const totalLoanAmount =
    loanCalcs.dscrLoanAmount +
    loanCalcs.subToCurrentBalance +
    (inputs.secondLoan.useLoan2 ? inputs.secondLoan.loan2Principal : 0);
  const ltv = propertyBasics.arv > 0 ? (totalLoanAmount / propertyBasics.arv) * 100 : 0;
  const ltvUnder75 = ltv <= 75;

  // Equity > $15k
  const equity = propertyBasics.arv - purchaseCosts.purchasePrice - propertyBasics.repairs;
  const equityOver15k = equity >= 15000;

  // Deal Decision Logic
  const passCount = [entryFeeUnder25k, cashflowOver400, ltvUnder75, equityOver15k].filter(Boolean).length;

  let dealDecision: DealChecklistOutputs['dealDecision'];
  if (passCount === 4) {
    dealDecision = 'DEAL';
  } else if (passCount >= 2) {
    dealDecision = 'NEEDS REVIEW';
  } else {
    dealDecision = 'NO DEAL';
  }

  return {
    entryFeeUnder25k,
    cashflowOver400,
    ltvUnder75,
    equityOver15k,
    dealDecision,
  };
}

// ============ MAIN CALCULATION FUNCTION ============

/**
 * Main calculation function - computes all outputs from inputs
 * This is the primary entry point for real-time calculations
 */
export function calculateAll(inputs: CalculatorInputs): CalculatorOutputs {
  const loanCalcs = calculateLoanCalcs(inputs);
  const totals = calculateTotals(inputs, loanCalcs);
  const quickStats = calculateQuickStats(inputs, loanCalcs, totals);
  const dealChecklist = calculateDealChecklist(inputs, quickStats, loanCalcs);

  return {
    quickStats,
    loanCalcs,
    totals,
    dealChecklist,
  };
}

// ============ DEFAULT INPUT GENERATORS ============

/**
 * Create default property basics inputs
 */
export function createDefaultPropertyBasics(
  propertyData?: { price?: number },
  defaults?: Partial<CalculatorDefaults>
): PropertyBasicsInputs {
  const d = { ...DEFAULT_CALCULATOR_VALUES, ...defaults };
  return {
    askingPrice: propertyData?.price || 0,
    arv: propertyData?.price || 0,
    repairs: 0,
    yourFee: 0,
    creditToBuyer: 0,
    wholesaleDiscount: d.wholesaleDiscount,
  };
}

/**
 * Create default income inputs
 */
export function createDefaultIncomeInputs(): IncomeInputs {
  return {
    monthlyRent: 0,
    otherIncome: 0,
  };
}

/**
 * Create default purchase costs inputs
 */
export function createDefaultPurchaseCostsInputs(
  propertyData?: { price?: number },
  defaults?: Partial<CalculatorDefaults>
): PurchaseCostsInputs {
  const d = { ...DEFAULT_CALCULATOR_VALUES, ...defaults };
  return {
    purchasePrice: propertyData?.price || 0,
    closingCosts: d.closingCosts,
    appraisalCost: d.appraisalCost,
    llcCost: d.llcCost,
    servicingFee: d.servicingFee,
    sellerAllowance: 0,
  };
}

/**
 * Create default tax and insurance inputs
 */
export function createDefaultTaxInsuranceInputs(): TaxInsuranceInputs {
  return {
    annualTaxes: 0,
    annualInsurance: 0,
  };
}

/**
 * Create default operating inputs
 */
export function createDefaultOperatingInputs(
  defaults?: Partial<CalculatorDefaults>
): OperatingInputs {
  const d = { ...DEFAULT_CALCULATOR_VALUES, ...defaults };
  return {
    maintenancePercent: d.maintenancePercent,
    propertyMgmtPercent: d.propertyMgmtPercent,
    hoa: 0,
    utilities: 0,
  };
}

/**
 * Create default subject-to inputs
 */
export function createDefaultSubjectToInputs(): SubjectToInputs {
  return {
    useSubjectTo: false,
    subToLoanType: 'Conventional',
    subToPrincipal: 0,
    subToInterestRate: 0,
    subToTermYears: 30,
    subToStartDate: '',
    subToBalloonYears: 0,
  };
}

/**
 * Create default DSCR loan inputs
 */
export function createDefaultDSCRLoanInputs(
  defaults?: Partial<CalculatorDefaults>
): DSCRLoanInputs {
  const d = { ...DEFAULT_CALCULATOR_VALUES, ...defaults };
  return {
    useDSCRLoan: false,
    dscrInterestRate: d.dscrInterestRate,
    dscrTermYears: d.dscrTermYears,
    dscrStartDate: '',
    dscrBalloonYears: d.dscrBalloonYears,
    dscrPoints: d.dscrPoints,
    dscrFees: d.dscrFees,
  };
}

/**
 * Create default second loan inputs
 */
export function createDefaultSecondLoanInputs(): SecondLoanInputs {
  return {
    useLoan2: false,
    loan2Principal: 0,
    loan2InterestRate: 10,
    loan2TermYears: 5,
    loan2StartDate: '',
    loan2BalloonYears: 5,
    loan2Points: 0,
    loan2Fees: 0,
  };
}

/**
 * Create default wrap loan inputs
 */
export function createDefaultWrapLoanInputs(
  defaults?: Partial<CalculatorDefaults>
): WrapLoanInputs {
  const d = { ...DEFAULT_CALCULATOR_VALUES, ...defaults };
  return {
    useWrap: false,
    wrapLoanType: 'Amortized',
    wrapInterestRate: d.wrapInterestRate,
    wrapTermYears: d.wrapTermYears,
    wrapStartDate: '',
    wrapBalloonYears: d.wrapBalloonYears,
    wrapPoints: 0,
    wrapFees: 0,
    wrapServiceFee: d.wrapServiceFee,
  };
}

/**
 * Create default wrap sales inputs
 */
export function createDefaultWrapSalesInputs(): WrapSalesInputs {
  return {
    wrapSalesPrice: 0,
    buyerDownPayment: 0,
    buyerClosingCosts: 0,
  };
}

/**
 * Create default flip inputs
 */
export function createDefaultFlipInputs(): FlipInputs {
  return {
    projectMonths: 6,
    resaleClosingCosts: 0,
    resaleMarketing: 0,
    contingency: 0,
  };
}

/**
 * Create complete default inputs
 * Auto-populates from property data if provided
 */
export function createDefaultInputs(
  propertyData?: {
    price?: number;
    beds?: number;
    baths?: number;
    sqft?: number;
    address?: string;
    propertyCode?: string;
    recordId?: string;
  },
  defaults?: Partial<CalculatorDefaults>
): CalculatorInputs {
  return {
    name: propertyData?.address || 'New Calculation',
    propertyRecordId: propertyData?.recordId,
    propertyCode: propertyData?.propertyCode,
    propertyBasics: createDefaultPropertyBasics(propertyData, defaults),
    income: createDefaultIncomeInputs(),
    purchaseCosts: createDefaultPurchaseCostsInputs(propertyData, defaults),
    taxInsurance: createDefaultTaxInsuranceInputs(),
    operating: createDefaultOperatingInputs(defaults),
    subjectTo: createDefaultSubjectToInputs(),
    dscrLoan: createDefaultDSCRLoanInputs(defaults),
    secondLoan: createDefaultSecondLoanInputs(),
    wrapLoan: createDefaultWrapLoanInputs(defaults),
    wrapSales: createDefaultWrapSalesInputs(),
    flip: createDefaultFlipInputs(),
  };
}

// ============ UTILITY FUNCTIONS ============

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage for display
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[$,]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Deep clone inputs for scenario duplication
 */
export function cloneInputs(inputs: CalculatorInputs): CalculatorInputs {
  return JSON.parse(JSON.stringify(inputs));
}

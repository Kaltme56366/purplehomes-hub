/**
 * Calculator API Handler
 *
 * Actions:
 * - list: Get all calculations (optionally filtered by property/buyer)
 * - get: Get single calculation by ID
 * - create: Create new calculation
 * - update: Update existing calculation
 * - delete: Delete calculation
 * - get-defaults: Get user's saved defaults
 * - update-defaults: Update user's defaults
 *
 * Updated to match Airtable schema with individual fields
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

const CALCULATIONS_TABLE = 'Deal Calculations';
const DEFAULTS_TABLE = 'Calculator Defaults';

// ============ FIELD MAPPINGS ============
// Maps code field names to Airtable field names

const AIRTABLE_FIELDS = {
  // Metadata
  name: 'Calculation Name',
  propertyCode: 'Property Code',
  contactId: 'Contact ID',
  notes: 'Notes',
  createdAt: 'Created At',
  updatedAt: 'Updated At',

  // Property Basics
  askingPrice: 'Asking Price',
  arv: 'ARV (After Repair Value)',
  repairs: 'Repairs Estimate',
  yourFee: 'Your Fee',
  creditToBuyer: 'Credit to Buyer',
  wholesaleDiscount: 'Wholesale Discount (%)',

  // Income
  monthlyRent: 'Monthly Rent',
  otherIncome: 'Other Income',

  // Purchase Costs
  purchasePrice: 'Purchase Price',
  closingCosts: 'Closing Costs',
  appraisalCost: 'Appraisal Cost',
  llcCost: 'LLC Cost',
  servicingFee: 'Servicing Fee',
  sellerAllowance: 'Seller Allowance',

  // Tax & Insurance
  annualTaxes: 'Property Taxes (Annual)',
  annualInsurance: 'Insurance (Annual)',

  // Operating
  maintenancePercent: 'Maintenance (%)',
  propertyMgmtPercent: 'Property Mgmt (%)',
  hoa: 'HOA',
  utilities: 'Utilities',

  // Subject-To Loan
  useSubjectTo: 'Use Subject-To',
  subToLoanType: 'SubTo Loan Type',
  subToPrincipal: 'SubTo Principal',
  subToInterestRate: 'SubTo Interest Rate (%)',
  subToTermYears: 'SubTo Term (Years)',
  subToStartDate: 'SubTo Start Date',
  subToBalloonYears: 'SubTo Balloon (Years)',

  // DSCR Loan
  useDSCRLoan: 'Use DSCR Loan',
  dscrInterestRate: 'DSCR Interest Rate (%)',
  dscrTermYears: 'DSCR Term (Years)',
  dscrStartDate: 'DSCR Start Date',
  dscrBalloonYears: 'DSCR Balloon (Years)',
  dscrPoints: 'DSCR Points (%)',
  dscrFees: 'DSCR Fees',

  // Second Loan
  useLoan2: 'Use Second Loan',
  loan2Principal: 'Loan 2 Principal',
  loan2InterestRate: 'Loan 2 Interest Rate (%)',
  loan2TermYears: 'Loan 2 Term (Years)',
  loan2StartDate: 'Loan 2 Start Date',
  loan2BalloonYears: 'Loan 2 Balloon (Years)',
  loan2Points: 'Loan 2 Points (%)',
  loan2Fees: 'Loan 2 Fees',

  // Wrap Loan
  useWrap: 'Use Wrap',
  wrapLoanType: 'Wrap Loan Type',
  wrapInterestRate: 'Wrap Interest Rate (%)',
  wrapTermYears: 'Wrap Term (Years)',
  wrapStartDate: 'Wrap Start Date',
  wrapBalloonYears: 'Wrap Balloon (Years)',
  wrapPoints: 'Wrap Points (%)',
  wrapFees: 'Wrap Fees',
  wrapServiceFee: 'Wrap Service Fee',

  // Wrap Sales
  wrapSalesPrice: 'Wrap Sales Price',
  buyerDownPayment: 'Buyer Down Payment',
  buyerClosingCosts: 'Buyer Closing Costs',

  // Flip
  projectMonths: 'Project Months',
  resaleClosingCosts: 'Resale Closing Costs',
  resaleMarketing: 'Resale Marketing',
  contingency: 'Contingency',

  // === OUTPUTS ===

  // Quick Stats
  mao: 'MAO',
  monthlyCashflow: 'Monthly Cashflow',
  wrapCashflow: 'Wrap Cashflow',
  flipProfit: 'Flip Profit',
  totalEntryFee: 'Total Entry Fee',
  fundingGap: 'Funding Gap',
  cashOnCashHold: 'Cash on Cash (Hold) %',
  cashOnCashFlip: 'Cash on Cash (Flip) %',
  cashOnCashWrap: 'Cash on Cash (Wrap) %',

  // Loan Calcs
  dscrLoanAmount: 'DSCR Loan Amount',
  dscrMonthlyPayment: 'DSCR Monthly Payment',
  dscrBalloonAmount: 'DSCR Balloon Amount',
  dscrDownPayment: 'DSCR Down Payment',
  subToMonthlyPayment: 'SubTo Monthly Payment',
  subToCurrentBalance: 'SubTo Current Balance',
  loan2MonthlyPayment: 'Loan 2 Monthly Payment',
  loan2BalloonAmount: 'Loan 2 Balloon Amount',
  wrapPrincipal: 'Wrap Principal',
  wrapMonthlyPayment: 'Wrap Monthly Payment',
  wrapBalloonAmount: 'Wrap Balloon Amount',
  buyerMonthlyPITI: 'Buyer Monthly PITI',

  // Totals
  totalMonthlyIncome: 'Total Monthly Income',
  totalMonthlyPI: 'Total Monthly P&I',
  totalMonthlyTI: 'Total Monthly T&I',
  totalMonthlyMaintenance: 'Total Monthly Maintenance',
  totalMonthlyPropertyMgmt: 'Total Monthly Property Mgmt',
  totalMonthlyExpenses: 'Total Monthly Expenses',

  // Deal Checklist
  entryFeeUnder25k: 'Entry Fee Under 25k',
  cashflowOver400: 'Cashflow Over 400',
  ltvUnder75: 'LTV Under 75',
  equityOver15k: 'Equity Over 15k',
  dealDecision: 'Deal Decision',
};

// Reverse mapping for reading from Airtable
const REVERSE_FIELDS: Record<string, string> = {};
Object.entries(AIRTABLE_FIELDS).forEach(([key, value]) => {
  REVERSE_FIELDS[value] = key;
});

/**
 * Fetch with retry on 429 rate limit
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`[Calculator API] Retry attempt ${attempt} after ${delay}ms`);
      }

      const response = await fetch(url, options);

      if (response.status === 429 && attempt < maxRetries) {
        lastError = new Error(`Rate limited: ${response.statusText}`);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries) throw error;
    }
  }

  throw lastError || new Error('Failed after retries');
}

/**
 * Convert code inputs/outputs to Airtable fields
 */
function inputsToAirtableFields(inputs: Record<string, unknown>, outputs?: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  // Flatten nested input structure
  const flatInputs: Record<string, unknown> = {};

  if (inputs.name) flatInputs.name = inputs.name;
  if (inputs.propertyCode) flatInputs.propertyCode = inputs.propertyCode;
  if (inputs.contactId) flatInputs.contactId = inputs.contactId;

  // Flatten sections
  const sections = ['propertyBasics', 'income', 'purchaseCosts', 'taxInsurance', 'operating',
                    'subjectTo', 'dscrLoan', 'secondLoan', 'wrapLoan', 'wrapSales', 'flip'];

  for (const section of sections) {
    if (inputs[section] && typeof inputs[section] === 'object') {
      Object.assign(flatInputs, inputs[section]);
    }
  }

  // Map input fields
  for (const [codeKey, value] of Object.entries(flatInputs)) {
    const airtableKey = AIRTABLE_FIELDS[codeKey as keyof typeof AIRTABLE_FIELDS];
    if (airtableKey && value !== undefined && value !== null) {
      fields[airtableKey] = value;
    }
  }

  // Flatten and map output fields
  if (outputs) {
    const flatOutputs: Record<string, unknown> = {};
    const outputSections = ['quickStats', 'loanCalcs', 'totals', 'dealChecklist'];

    for (const section of outputSections) {
      if (outputs[section] && typeof outputs[section] === 'object') {
        Object.assign(flatOutputs, outputs[section]);
      }
    }

    for (const [codeKey, value] of Object.entries(flatOutputs)) {
      const airtableKey = AIRTABLE_FIELDS[codeKey as keyof typeof AIRTABLE_FIELDS];
      if (airtableKey && value !== undefined && value !== null) {
        fields[airtableKey] = value;
      }
    }
  }

  // Add timestamps
  fields[AIRTABLE_FIELDS.updatedAt] = new Date().toISOString();

  return fields;
}

/**
 * Convert Airtable fields back to code structure
 */
function airtableFieldsToInputsOutputs(fields: Record<string, unknown>): { inputs: Record<string, unknown>; outputs: Record<string, unknown> } {
  const inputs: Record<string, unknown> = {
    name: fields[AIRTABLE_FIELDS.name] || 'Unnamed Calculation',
    propertyCode: fields[AIRTABLE_FIELDS.propertyCode],
    contactId: fields[AIRTABLE_FIELDS.contactId],
    propertyBasics: {
      askingPrice: fields[AIRTABLE_FIELDS.askingPrice] ?? 0,
      arv: fields[AIRTABLE_FIELDS.arv] ?? 0,
      repairs: fields[AIRTABLE_FIELDS.repairs] ?? 0,
      yourFee: fields[AIRTABLE_FIELDS.yourFee] ?? 5000,
      creditToBuyer: fields[AIRTABLE_FIELDS.creditToBuyer] ?? 5000,
      wholesaleDiscount: fields[AIRTABLE_FIELDS.wholesaleDiscount] ?? 70,
    },
    income: {
      monthlyRent: fields[AIRTABLE_FIELDS.monthlyRent] ?? 0,
      otherIncome: fields[AIRTABLE_FIELDS.otherIncome] ?? 0,
    },
    purchaseCosts: {
      purchasePrice: fields[AIRTABLE_FIELDS.purchasePrice] ?? 0,
      closingCosts: fields[AIRTABLE_FIELDS.closingCosts] ?? 3000,
      appraisalCost: fields[AIRTABLE_FIELDS.appraisalCost] ?? 500,
      llcCost: fields[AIRTABLE_FIELDS.llcCost] ?? 200,
      servicingFee: fields[AIRTABLE_FIELDS.servicingFee] ?? 100,
      sellerAllowance: fields[AIRTABLE_FIELDS.sellerAllowance] ?? 0,
    },
    taxInsurance: {
      annualTaxes: fields[AIRTABLE_FIELDS.annualTaxes] ?? 0,
      annualInsurance: fields[AIRTABLE_FIELDS.annualInsurance] ?? 0,
    },
    operating: {
      maintenancePercent: fields[AIRTABLE_FIELDS.maintenancePercent] ?? 5,
      propertyMgmtPercent: fields[AIRTABLE_FIELDS.propertyMgmtPercent] ?? 10,
      hoa: fields[AIRTABLE_FIELDS.hoa] ?? 0,
      utilities: fields[AIRTABLE_FIELDS.utilities] ?? 0,
    },
    subjectTo: {
      useSubjectTo: fields[AIRTABLE_FIELDS.useSubjectTo] ?? false,
      subToLoanType: fields[AIRTABLE_FIELDS.subToLoanType] ?? 'Conventional',
      subToPrincipal: fields[AIRTABLE_FIELDS.subToPrincipal] ?? 0,
      subToInterestRate: fields[AIRTABLE_FIELDS.subToInterestRate] ?? 4,
      subToTermYears: fields[AIRTABLE_FIELDS.subToTermYears] ?? 30,
      subToStartDate: fields[AIRTABLE_FIELDS.subToStartDate] ?? new Date().toISOString().split('T')[0],
      subToBalloonYears: fields[AIRTABLE_FIELDS.subToBalloonYears] ?? 0,
    },
    dscrLoan: {
      useDSCRLoan: fields[AIRTABLE_FIELDS.useDSCRLoan] ?? false,
      dscrInterestRate: fields[AIRTABLE_FIELDS.dscrInterestRate] ?? 8,
      dscrTermYears: fields[AIRTABLE_FIELDS.dscrTermYears] ?? 30,
      dscrStartDate: fields[AIRTABLE_FIELDS.dscrStartDate] ?? new Date().toISOString().split('T')[0],
      dscrBalloonYears: fields[AIRTABLE_FIELDS.dscrBalloonYears] ?? 5,
      dscrPoints: fields[AIRTABLE_FIELDS.dscrPoints] ?? 2,
      dscrFees: fields[AIRTABLE_FIELDS.dscrFees] ?? 1500,
    },
    secondLoan: {
      useLoan2: fields[AIRTABLE_FIELDS.useLoan2] ?? false,
      loan2Principal: fields[AIRTABLE_FIELDS.loan2Principal] ?? 0,
      loan2InterestRate: fields[AIRTABLE_FIELDS.loan2InterestRate] ?? 10,
      loan2TermYears: fields[AIRTABLE_FIELDS.loan2TermYears] ?? 10,
      loan2StartDate: fields[AIRTABLE_FIELDS.loan2StartDate] ?? new Date().toISOString().split('T')[0],
      loan2BalloonYears: fields[AIRTABLE_FIELDS.loan2BalloonYears] ?? 0,
      loan2Points: fields[AIRTABLE_FIELDS.loan2Points] ?? 0,
      loan2Fees: fields[AIRTABLE_FIELDS.loan2Fees] ?? 0,
    },
    wrapLoan: {
      useWrap: fields[AIRTABLE_FIELDS.useWrap] ?? false,
      wrapLoanType: fields[AIRTABLE_FIELDS.wrapLoanType] ?? 'Amortized',
      wrapInterestRate: fields[AIRTABLE_FIELDS.wrapInterestRate] ?? 9,
      wrapTermYears: fields[AIRTABLE_FIELDS.wrapTermYears] ?? 30,
      wrapStartDate: fields[AIRTABLE_FIELDS.wrapStartDate] ?? new Date().toISOString().split('T')[0],
      wrapBalloonYears: fields[AIRTABLE_FIELDS.wrapBalloonYears] ?? 5,
      wrapPoints: fields[AIRTABLE_FIELDS.wrapPoints] ?? 0,
      wrapFees: fields[AIRTABLE_FIELDS.wrapFees] ?? 0,
      wrapServiceFee: fields[AIRTABLE_FIELDS.wrapServiceFee] ?? 35,
    },
    wrapSales: {
      wrapSalesPrice: fields[AIRTABLE_FIELDS.wrapSalesPrice] ?? 0,
      buyerDownPayment: fields[AIRTABLE_FIELDS.buyerDownPayment] ?? 0,
      buyerClosingCosts: fields[AIRTABLE_FIELDS.buyerClosingCosts] ?? 0,
    },
    flip: {
      projectMonths: fields[AIRTABLE_FIELDS.projectMonths] ?? 6,
      resaleClosingCosts: fields[AIRTABLE_FIELDS.resaleClosingCosts] ?? 0,
      resaleMarketing: fields[AIRTABLE_FIELDS.resaleMarketing] ?? 0,
      contingency: fields[AIRTABLE_FIELDS.contingency] ?? 0,
    },
  };

  const outputs: Record<string, unknown> = {
    quickStats: {
      mao: fields[AIRTABLE_FIELDS.mao] ?? 0,
      monthlyCashflow: fields[AIRTABLE_FIELDS.monthlyCashflow] ?? 0,
      wrapCashflow: fields[AIRTABLE_FIELDS.wrapCashflow] ?? 0,
      flipProfit: fields[AIRTABLE_FIELDS.flipProfit] ?? 0,
      totalEntryFee: fields[AIRTABLE_FIELDS.totalEntryFee] ?? 0,
      fundingGap: fields[AIRTABLE_FIELDS.fundingGap] ?? 0,
      cashOnCashHold: fields[AIRTABLE_FIELDS.cashOnCashHold] ?? 0,
      cashOnCashFlip: fields[AIRTABLE_FIELDS.cashOnCashFlip] ?? 0,
      cashOnCashWrap: fields[AIRTABLE_FIELDS.cashOnCashWrap] ?? 0,
    },
    loanCalcs: {
      dscrLoanAmount: fields[AIRTABLE_FIELDS.dscrLoanAmount] ?? 0,
      dscrMonthlyPayment: fields[AIRTABLE_FIELDS.dscrMonthlyPayment] ?? 0,
      dscrBalloonAmount: fields[AIRTABLE_FIELDS.dscrBalloonAmount] ?? 0,
      dscrDownPayment: fields[AIRTABLE_FIELDS.dscrDownPayment] ?? 0,
      subToMonthlyPayment: fields[AIRTABLE_FIELDS.subToMonthlyPayment] ?? 0,
      subToCurrentBalance: fields[AIRTABLE_FIELDS.subToCurrentBalance] ?? 0,
      loan2MonthlyPayment: fields[AIRTABLE_FIELDS.loan2MonthlyPayment] ?? 0,
      loan2BalloonAmount: fields[AIRTABLE_FIELDS.loan2BalloonAmount] ?? 0,
      wrapPrincipal: fields[AIRTABLE_FIELDS.wrapPrincipal] ?? 0,
      wrapMonthlyPayment: fields[AIRTABLE_FIELDS.wrapMonthlyPayment] ?? 0,
      wrapBalloonAmount: fields[AIRTABLE_FIELDS.wrapBalloonAmount] ?? 0,
      buyerMonthlyPITI: fields[AIRTABLE_FIELDS.buyerMonthlyPITI] ?? 0,
    },
    totals: {
      totalMonthlyIncome: fields[AIRTABLE_FIELDS.totalMonthlyIncome] ?? 0,
      totalMonthlyPI: fields[AIRTABLE_FIELDS.totalMonthlyPI] ?? 0,
      totalMonthlyTI: fields[AIRTABLE_FIELDS.totalMonthlyTI] ?? 0,
      totalMonthlyMaintenance: fields[AIRTABLE_FIELDS.totalMonthlyMaintenance] ?? 0,
      totalMonthlyPropertyMgmt: fields[AIRTABLE_FIELDS.totalMonthlyPropertyMgmt] ?? 0,
      totalMonthlyExpenses: fields[AIRTABLE_FIELDS.totalMonthlyExpenses] ?? 0,
    },
    dealChecklist: {
      entryFeeUnder25k: fields[AIRTABLE_FIELDS.entryFeeUnder25k] ?? false,
      cashflowOver400: fields[AIRTABLE_FIELDS.cashflowOver400] ?? false,
      ltvUnder75: fields[AIRTABLE_FIELDS.ltvUnder75] ?? false,
      equityOver15k: fields[AIRTABLE_FIELDS.equityOver15k] ?? false,
      dealDecision: fields[AIRTABLE_FIELDS.dealDecision] ?? 'NEEDS REVIEW',
    },
  };

  return { inputs, outputs };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    return res.status(500).json({
      error: 'Airtable credentials not configured',
      details: 'Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID environment variables',
    });
  }

  const headers = {
    'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const { action } = req.query;

  try {
    switch (action) {
      case 'list':
        return handleList(req, res, headers);
      case 'get':
        return handleGet(req, res, headers);
      case 'create':
        return handleCreate(req, res, headers);
      case 'update':
        return handleUpdate(req, res, headers);
      case 'delete':
        return handleDelete(req, res, headers);
      case 'get-defaults':
        return handleGetDefaults(req, res, headers);
      case 'update-defaults':
        return handleUpdateDefaults(req, res, headers);
      default:
        return res.status(400).json({
          error: 'Unknown action',
          action,
          validActions: ['list', 'get', 'create', 'update', 'delete', 'get-defaults', 'update-defaults'],
        });
    }
  } catch (error) {
    console.error('[Calculator API] Error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

/**
 * List calculations with optional filters
 */
async function handleList(
  req: VercelRequest,
  res: VercelResponse,
  headers: Record<string, string>
) {
  const { propertyCode, contactId, limit = '50', offset } = req.query;

  const params = new URLSearchParams();
  params.append('maxRecords', limit as string);
  params.append('sort[0][field]', AIRTABLE_FIELDS.updatedAt);
  params.append('sort[0][direction]', 'desc');

  if (offset) {
    params.append('offset', offset as string);
  }

  // Build filter formula
  const filters: string[] = [];
  if (propertyCode) {
    filters.push(`{${AIRTABLE_FIELDS.propertyCode}} = "${propertyCode}"`);
  }
  if (contactId) {
    filters.push(`{${AIRTABLE_FIELDS.contactId}} = "${contactId}"`);
  }

  if (filters.length > 0) {
    const formula = filters.length === 1
      ? filters[0]
      : `AND(${filters.join(', ')})`;
    params.append('filterByFormula', formula);
  }

  const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CALCULATIONS_TABLE)}?${params}`;
  console.log('[Calculator API] List URL:', url);

  const response = await fetchWithRetry(url, { headers });

  if (!response.ok) {
    const error = await response.json();
    console.error('[Calculator API] Airtable error:', error);
    return res.status(response.status).json({
      error: 'Failed to fetch calculations',
      details: error,
    });
  }

  const data = await response.json();

  // Transform records
  const calculations = data.records.map((record: { id: string; fields: Record<string, unknown> }) => {
    const { inputs, outputs } = airtableFieldsToInputsOutputs(record.fields);
    return {
      id: record.id,
      name: inputs.name,
      propertyCode: inputs.propertyCode,
      contactId: inputs.contactId,
      inputs,
      outputs,
      notes: record.fields[AIRTABLE_FIELDS.notes],
      createdAt: record.fields[AIRTABLE_FIELDS.createdAt],
      updatedAt: record.fields[AIRTABLE_FIELDS.updatedAt],
    };
  });

  return res.status(200).json({
    calculations,
    nextOffset: data.offset,
  });
}

/**
 * Get single calculation by ID
 */
async function handleGet(
  req: VercelRequest,
  res: VercelResponse,
  headers: Record<string, string>
) {
  const { recordId } = req.query;

  if (!recordId) {
    return res.status(400).json({ error: 'recordId is required' });
  }

  const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CALCULATIONS_TABLE)}/${recordId}`;
  const response = await fetchWithRetry(url, { headers });

  if (!response.ok) {
    const error = await response.json();
    return res.status(response.status).json({
      error: 'Failed to fetch calculation',
      details: error,
    });
  }

  const record = await response.json();
  const { inputs, outputs } = airtableFieldsToInputsOutputs(record.fields);

  return res.status(200).json({
    calculation: {
      id: record.id,
      name: inputs.name,
      propertyCode: inputs.propertyCode,
      contactId: inputs.contactId,
      inputs,
      outputs,
      notes: record.fields[AIRTABLE_FIELDS.notes],
      createdAt: record.fields[AIRTABLE_FIELDS.createdAt],
      updatedAt: record.fields[AIRTABLE_FIELDS.updatedAt],
    },
  });
}

/**
 * Create new calculation
 */
async function handleCreate(
  req: VercelRequest,
  res: VercelResponse,
  headers: Record<string, string>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { name, propertyCode, contactId, inputs, outputs, notes } = req.body;

  if (!inputs) {
    return res.status(400).json({ error: 'inputs is required' });
  }

  // Add metadata to inputs
  const enrichedInputs = {
    ...inputs,
    name: name || inputs.name || 'New Calculation',
    propertyCode: propertyCode || inputs.propertyCode,
    contactId: contactId || inputs.contactId,
  };

  const fields = inputsToAirtableFields(enrichedInputs, outputs);
  fields[AIRTABLE_FIELDS.createdAt] = new Date().toISOString();

  if (notes) {
    fields[AIRTABLE_FIELDS.notes] = notes;
  }

  console.log('[Calculator API] Creating with fields:', Object.keys(fields));

  const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CALCULATIONS_TABLE)}`;
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[Calculator API] Create error:', error);
    return res.status(response.status).json({
      error: 'Failed to create calculation',
      details: error,
    });
  }

  const record = await response.json();
  const result = airtableFieldsToInputsOutputs(record.fields);

  return res.status(201).json({
    success: true,
    calculation: {
      id: record.id,
      name: result.inputs.name,
      propertyCode: result.inputs.propertyCode,
      contactId: result.inputs.contactId,
      inputs: result.inputs,
      outputs: result.outputs,
      notes: record.fields[AIRTABLE_FIELDS.notes],
      createdAt: record.fields[AIRTABLE_FIELDS.createdAt],
      updatedAt: record.fields[AIRTABLE_FIELDS.updatedAt],
    },
  });
}

/**
 * Update existing calculation
 */
async function handleUpdate(
  req: VercelRequest,
  res: VercelResponse,
  headers: Record<string, string>
) {
  if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use PUT, PATCH, or POST.' });
  }

  const { recordId } = req.query;
  const { name, inputs, outputs, notes } = req.body;

  if (!recordId) {
    return res.status(400).json({ error: 'recordId is required' });
  }

  // Build enriched inputs with name
  const enrichedInputs = inputs ? {
    ...inputs,
    name: name || inputs.name,
  } : { name };

  const fields = inputsToAirtableFields(enrichedInputs, outputs);

  if (notes !== undefined) {
    fields[AIRTABLE_FIELDS.notes] = notes;
  }

  const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CALCULATIONS_TABLE)}/${recordId}`;
  const response = await fetchWithRetry(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ fields }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[Calculator API] Update error:', error);
    return res.status(response.status).json({
      error: 'Failed to update calculation',
      details: error,
    });
  }

  const record = await response.json();
  const result = airtableFieldsToInputsOutputs(record.fields);

  return res.status(200).json({
    success: true,
    calculation: {
      id: record.id,
      name: result.inputs.name,
      propertyCode: result.inputs.propertyCode,
      contactId: result.inputs.contactId,
      inputs: result.inputs,
      outputs: result.outputs,
      notes: record.fields[AIRTABLE_FIELDS.notes],
      updatedAt: record.fields[AIRTABLE_FIELDS.updatedAt],
    },
  });
}

/**
 * Delete calculation
 */
async function handleDelete(
  req: VercelRequest,
  res: VercelResponse,
  headers: Record<string, string>
) {
  const { recordId } = req.query;

  if (!recordId) {
    return res.status(400).json({ error: 'recordId is required' });
  }

  const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(CALCULATIONS_TABLE)}/${recordId}`;
  const response = await fetchWithRetry(url, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[Calculator API] Delete error:', error);
    return res.status(response.status).json({
      error: 'Failed to delete calculation',
      details: error,
    });
  }

  return res.status(200).json({
    success: true,
    deletedId: recordId,
  });
}

// ============ CALCULATOR DEFAULTS ============
// Uses key-value pattern: Setting Key, Setting Value, Setting Type, Category, Display Name, Description

const DEFAULTS_FIELD_MAP: Record<string, { key: string; type: string; category: string; displayName: string }> = {
  wholesaleDiscount: { key: 'wholesale_discount', type: 'number', category: 'Purchase & Fees', displayName: 'Wholesale Discount (%)' },
  yourFee: { key: 'your_fee', type: 'number', category: 'Purchase & Fees', displayName: 'Your Fee' },
  creditToBuyer: { key: 'credit_to_buyer', type: 'number', category: 'Purchase & Fees', displayName: 'Credit to Buyer' },
  maintenancePercent: { key: 'maintenance_percent', type: 'number', category: 'Operating Expenses', displayName: 'Maintenance (%)' },
  propertyMgmtPercent: { key: 'property_mgmt_percent', type: 'number', category: 'Operating Expenses', displayName: 'Property Management (%)' },
  dscrInterestRate: { key: 'dscr_interest_rate', type: 'number', category: 'DSCR Loan', displayName: 'DSCR Interest Rate (%)' },
  dscrTermYears: { key: 'dscr_term_years', type: 'number', category: 'DSCR Loan', displayName: 'DSCR Term (Years)' },
  dscrBalloonYears: { key: 'dscr_balloon_years', type: 'number', category: 'DSCR Loan', displayName: 'DSCR Balloon (Years)' },
  dscrPoints: { key: 'dscr_points', type: 'number', category: 'DSCR Loan', displayName: 'DSCR Points (%)' },
  dscrFees: { key: 'dscr_fees', type: 'number', category: 'DSCR Loan', displayName: 'DSCR Fees' },
  wrapInterestRate: { key: 'wrap_interest_rate', type: 'number', category: 'Wrap Loan', displayName: 'Wrap Interest Rate (%)' },
  wrapTermYears: { key: 'wrap_term_years', type: 'number', category: 'Wrap Loan', displayName: 'Wrap Term (Years)' },
  wrapBalloonYears: { key: 'wrap_balloon_years', type: 'number', category: 'Wrap Loan', displayName: 'Wrap Balloon (Years)' },
  wrapServiceFee: { key: 'wrap_service_fee', type: 'number', category: 'Wrap Loan', displayName: 'Wrap Service Fee' },
  closingCosts: { key: 'closing_costs', type: 'number', category: 'Closing & Setup', displayName: 'Closing Costs' },
  appraisalCost: { key: 'appraisal_cost', type: 'number', category: 'Closing & Setup', displayName: 'Appraisal Cost' },
  llcCost: { key: 'llc_cost', type: 'number', category: 'Closing & Setup', displayName: 'LLC Cost' },
  servicingFee: { key: 'servicing_fee', type: 'number', category: 'Closing & Setup', displayName: 'Servicing Fee' },
};

/**
 * Get calculator defaults from key-value table
 */
async function handleGetDefaults(
  req: VercelRequest,
  res: VercelResponse,
  headers: Record<string, string>
) {
  const url = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(DEFAULTS_TABLE)}?maxRecords=100`;

  try {
    const response = await fetchWithRetry(url, { headers });

    if (!response.ok) {
      console.log('[Calculator API] Defaults table error, returning system defaults');
      return res.status(200).json({
        defaults: getSystemDefaults(),
      });
    }

    const data = await response.json();

    if (!data.records || data.records.length === 0) {
      return res.status(200).json({
        defaults: getSystemDefaults(),
      });
    }

    // Build defaults from key-value records
    const defaults = getSystemDefaults();

    for (const record of data.records) {
      const settingKey = record.fields['Setting Key'];
      const settingValue = record.fields['Setting Value'];

      // Find the code field that matches this setting key
      for (const [codeKey, config] of Object.entries(DEFAULTS_FIELD_MAP)) {
        if (config.key === settingKey && settingValue !== undefined) {
          const parsedValue = config.type === 'number' ? parseFloat(settingValue) : settingValue;
          (defaults as Record<string, unknown>)[codeKey] = parsedValue;
        }
      }
    }

    return res.status(200).json({ defaults });
  } catch (error) {
    console.error('[Calculator API] Get defaults error:', error);
    return res.status(200).json({
      defaults: getSystemDefaults(),
    });
  }
}

/**
 * Update calculator defaults using key-value pattern
 */
async function handleUpdateDefaults(
  req: VercelRequest,
  res: VercelResponse,
  headers: Record<string, string>
) {
  if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use PUT, PATCH, or POST.' });
  }

  const newDefaults = req.body;

  try {
    // First, get existing records to know which to update vs create
    const listUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(DEFAULTS_TABLE)}?maxRecords=100`;
    const listResponse = await fetchWithRetry(listUrl, { headers });
    const listData = await listResponse.json();

    // Build map of existing records by setting key
    const existingRecords: Record<string, string> = {};
    if (listData.records) {
      for (const record of listData.records) {
        const settingKey = record.fields['Setting Key'];
        if (settingKey) {
          existingRecords[settingKey] = record.id;
        }
      }
    }

    // Process each default value
    const updates: { id: string; fields: Record<string, unknown> }[] = [];
    const creates: { fields: Record<string, unknown> }[] = [];

    for (const [codeKey, value] of Object.entries(newDefaults)) {
      const config = DEFAULTS_FIELD_MAP[codeKey];
      if (!config || value === undefined) continue;

      const fields = {
        'Setting Key': config.key,
        'Setting Value': String(value),
        'Setting Type': config.type,
        'Category': config.category,
        'Display Name': config.displayName,
      };

      if (existingRecords[config.key]) {
        updates.push({ id: existingRecords[config.key], fields });
      } else {
        creates.push({ fields });
      }
    }

    // Batch update existing records
    if (updates.length > 0) {
      const updateUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(DEFAULTS_TABLE)}`;
      // Airtable allows max 10 records per batch
      for (let i = 0; i < updates.length; i += 10) {
        const batch = updates.slice(i, i + 10);
        await fetchWithRetry(updateUrl, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ records: batch }),
        });
      }
    }

    // Create new records
    if (creates.length > 0) {
      const createUrl = `${AIRTABLE_API_URL}/${AIRTABLE_BASE_ID}/${encodeURIComponent(DEFAULTS_TABLE)}`;
      for (let i = 0; i < creates.length; i += 10) {
        const batch = creates.slice(i, i + 10);
        await fetchWithRetry(createUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ records: batch }),
        });
      }
    }

    return res.status(200).json({
      success: true,
      defaults: newDefaults,
    });
  } catch (error) {
    console.error('[Calculator API] Update defaults error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update defaults',
    });
  }
}

/**
 * Get system default values
 */
function getSystemDefaults() {
  return {
    wholesaleDiscount: 70,
    yourFee: 5000,
    creditToBuyer: 5000,
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
}

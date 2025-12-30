/**
 * DealChecklistPanel - Pass/fail checklist for deal criteria
 * Shows key thresholds and overall deal decision
 */

import { CheckCircle2, XCircle, AlertCircle, DollarSign, TrendingUp, Percent, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { CalculatorOutputs, CalculatorInputs } from '@/types/calculator';
import { formatCurrency, formatPercentage } from '@/lib/calculatorEngine';

interface DealChecklistPanelProps {
  outputs: CalculatorOutputs;
  inputs?: CalculatorInputs;
  className?: string;
}

interface ChecklistItemProps {
  label: string;
  description: string;
  passed: boolean;
  value: string;
  threshold: string;
  icon?: React.ReactNode;
}

function ChecklistItem({ label, description, passed, value, threshold, icon }: ChecklistItemProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-colors',
        passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
      )}
    >
      <div className="shrink-0 mt-0.5">
        {passed ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <span className="font-medium text-sm">{label}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('text-sm font-semibold', passed ? 'text-green-700' : 'text-red-700')}>
            {value}
          </span>
          <span className="text-xs text-muted-foreground">
            (threshold: {threshold})
          </span>
        </div>
      </div>
    </div>
  );
}

export function DealChecklistPanel({ outputs, inputs, className }: DealChecklistPanelProps) {
  const { quickStats, dealChecklist, loanCalcs, totals } = outputs;

  // Calculate LTV for display
  const totalLoanAmount =
    loanCalcs.dscrLoanAmount +
    loanCalcs.subToCurrentBalance +
    (inputs?.secondLoan.useLoan2 ? inputs.secondLoan.loan2Principal : 0);
  const arv = inputs?.propertyBasics.arv || 0;
  const ltv = arv > 0 ? (totalLoanAmount / arv) * 100 : 0;

  // Calculate equity
  const purchasePrice = inputs?.purchaseCosts.purchasePrice || 0;
  const repairs = inputs?.propertyBasics.repairs || 0;
  const equity = arv - purchasePrice - repairs;

  // Count passed criteria
  const passedCount = [
    dealChecklist.entryFeeUnder25k,
    dealChecklist.cashflowOver400,
    dealChecklist.ltvUnder75,
    dealChecklist.equityOver15k,
  ].filter(Boolean).length;
  const passPercentage = (passedCount / 4) * 100;

  // Get decision badge styling
  const getDecisionStyle = () => {
    switch (dealChecklist.dealDecision) {
      case 'DEAL':
        return 'bg-green-600 text-white hover:bg-green-700';
      case 'NEEDS REVIEW':
        return 'bg-yellow-500 text-black hover:bg-yellow-600';
      case 'NO DEAL':
        return 'bg-red-600 text-white hover:bg-red-700';
      default:
        return '';
    }
  };

  const getDecisionIcon = () => {
    switch (dealChecklist.dealDecision) {
      case 'DEAL':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'NEEDS REVIEW':
        return <AlertCircle className="h-5 w-5" />;
      case 'NO DEAL':
        return <XCircle className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Deal Checklist</CardTitle>
          <Badge className={cn('text-sm px-4 py-1.5 gap-2', getDecisionStyle())}>
            {getDecisionIcon()}
            {dealChecklist.dealDecision}
          </Badge>
        </div>
        <div className="space-y-1 mt-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Criteria Met</span>
            <span className="font-medium">{passedCount} of 4</span>
          </div>
          <Progress value={passPercentage} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Entry Fee Check */}
        <ChecklistItem
          label="Entry Fee Under $25k"
          description="Total upfront costs including closing, appraisal, LLC, and loan fees"
          passed={dealChecklist.entryFeeUnder25k}
          value={formatCurrency(quickStats.totalEntryFee)}
          threshold="< $25,000"
          icon={<DollarSign className="h-4 w-4" />}
        />

        {/* Cashflow Check */}
        <ChecklistItem
          label="Monthly Cashflow Over $400"
          description="Net operating income minus all loan payments and expenses"
          passed={dealChecklist.cashflowOver400}
          value={formatCurrency(quickStats.monthlyCashflow)}
          threshold="> $400/mo"
          icon={<TrendingUp className="h-4 w-4" />}
        />

        {/* LTV Check */}
        <ChecklistItem
          label="LTV Under 75%"
          description="Total loan amount divided by After Repair Value"
          passed={dealChecklist.ltvUnder75}
          value={formatPercentage(ltv)}
          threshold="< 75%"
          icon={<Percent className="h-4 w-4" />}
        />

        {/* Equity Check */}
        <ChecklistItem
          label="Equity Over $15k"
          description="ARV minus purchase price and repairs"
          passed={dealChecklist.equityOver15k}
          value={formatCurrency(equity)}
          threshold="> $15,000"
          icon={<Building className="h-4 w-4" />}
        />

        {/* Summary */}
        <div className="pt-3 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Income</span>
              <p className="font-semibold">{formatCurrency(totals.totalMonthlyIncome)}/mo</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Expenses</span>
              <p className="font-semibold">{formatCurrency(totals.totalMonthlyExpenses)}/mo</p>
            </div>
            <div>
              <span className="text-muted-foreground">Total Loan Debt</span>
              <p className="font-semibold">{formatCurrency(totalLoanAmount)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Funding Gap</span>
              <p className="font-semibold">{formatCurrency(quickStats.fundingGap)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DealChecklistPanel;

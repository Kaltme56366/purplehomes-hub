/**
 * LoanCalcsPanel - Displays detailed loan calculation outputs
 */

import { Landmark, Calculator, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { CalculatorOutputs, CalculatorInputs } from '@/types/calculator';
import { formatCurrency } from '@/lib/calculatorEngine';

interface LoanCalcsPanelProps {
  outputs: CalculatorOutputs;
  inputs?: CalculatorInputs;
  className?: string;
}

interface LoanSummaryRowProps {
  label: string;
  value: string;
  subValue?: string;
  highlight?: boolean;
}

function LoanSummaryRow({ label, value, subValue, highlight }: LoanSummaryRowProps) {
  return (
    <div className={cn('flex items-center justify-between py-1.5', highlight && 'font-medium')}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className={cn('text-sm', highlight && 'font-semibold')}>{value}</span>
        {subValue && (
          <span className="text-xs text-muted-foreground ml-2">({subValue})</span>
        )}
      </div>
    </div>
  );
}

export function LoanCalcsPanel({ outputs, inputs, className }: LoanCalcsPanelProps) {
  const { loanCalcs, totals } = outputs;

  const hasDSCR = inputs?.dscrLoan.useDSCRLoan || false;
  const hasSubTo = inputs?.subjectTo.useSubjectTo || false;
  const hasLoan2 = inputs?.secondLoan.useLoan2 || false;
  const hasWrap = inputs?.wrapLoan.useWrap || false;

  const hasAnyLoan = hasDSCR || hasSubTo || hasLoan2 || hasWrap;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Loan Details</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAnyLoan ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No loans configured</p>
            <p className="text-xs">Enable loans in the Loans tab to see calculations</p>
          </div>
        ) : (
          <>
            {/* DSCR Loan */}
            {hasDSCR && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    DSCR Loan
                  </Badge>
                </div>
                <div className="pl-2 border-l-2 border-blue-200 space-y-1">
                  <LoanSummaryRow
                    label="Loan Amount (80% LTV)"
                    value={formatCurrency(loanCalcs.dscrLoanAmount)}
                  />
                  <LoanSummaryRow
                    label="Down Payment (20%)"
                    value={formatCurrency(loanCalcs.dscrDownPayment)}
                  />
                  <LoanSummaryRow
                    label="Monthly Payment"
                    value={formatCurrency(loanCalcs.dscrMonthlyPayment)}
                    highlight
                  />
                  {loanCalcs.dscrBalloonAmount > 0 && (
                    <LoanSummaryRow
                      label={`Balloon (${inputs?.dscrLoan.dscrBalloonYears}yr)`}
                      value={formatCurrency(loanCalcs.dscrBalloonAmount)}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Subject-To Loan */}
            {hasSubTo && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Subject-To
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {inputs?.subjectTo.subToLoanType}
                  </Badge>
                </div>
                <div className="pl-2 border-l-2 border-green-200 space-y-1">
                  <LoanSummaryRow
                    label="Current Balance"
                    value={formatCurrency(loanCalcs.subToCurrentBalance)}
                  />
                  <LoanSummaryRow
                    label="Monthly Payment"
                    value={formatCurrency(loanCalcs.subToMonthlyPayment)}
                    highlight
                  />
                </div>
              </div>
            )}

            {/* Second Loan */}
            {hasLoan2 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    Second Loan
                  </Badge>
                </div>
                <div className="pl-2 border-l-2 border-orange-200 space-y-1">
                  <LoanSummaryRow
                    label="Principal"
                    value={formatCurrency(inputs?.secondLoan.loan2Principal || 0)}
                  />
                  <LoanSummaryRow
                    label="Monthly Payment"
                    value={formatCurrency(loanCalcs.loan2MonthlyPayment)}
                    highlight
                  />
                  {loanCalcs.loan2BalloonAmount > 0 && (
                    <LoanSummaryRow
                      label={`Balloon (${inputs?.secondLoan.loan2BalloonYears}yr)`}
                      value={formatCurrency(loanCalcs.loan2BalloonAmount)}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Wrap Loan */}
            {hasWrap && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                    Wrap Loan
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {inputs?.wrapLoan.wrapLoanType}
                  </Badge>
                </div>
                <div className="pl-2 border-l-2 border-purple-200 space-y-1">
                  <LoanSummaryRow
                    label="Wrap Principal"
                    value={formatCurrency(loanCalcs.wrapPrincipal)}
                  />
                  <LoanSummaryRow
                    label="Payment from Buyer"
                    value={formatCurrency(loanCalcs.wrapMonthlyPayment)}
                    highlight
                  />
                  <LoanSummaryRow
                    label="Buyer PITI"
                    value={formatCurrency(loanCalcs.buyerMonthlyPITI)}
                    subValue="incl. taxes & insurance"
                  />
                  {loanCalcs.wrapBalloonAmount > 0 && (
                    <LoanSummaryRow
                      label={`Balloon (${inputs?.wrapLoan.wrapBalloonYears}yr)`}
                      value={formatCurrency(loanCalcs.wrapBalloonAmount)}
                    />
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Monthly Totals */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Monthly Summary
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total P&I</p>
                  <p className="text-lg font-semibold">{formatCurrency(totals.totalMonthlyPI)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Total T&I</p>
                  <p className="text-lg font-semibold">{formatCurrency(totals.totalMonthlyTI)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Maintenance</p>
                  <p className="text-lg font-semibold">{formatCurrency(totals.totalMonthlyMaintenance)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Prop Mgmt</p>
                  <p className="text-lg font-semibold">{formatCurrency(totals.totalMonthlyPropertyMgmt)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                <span className="font-medium">Total Expenses</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(totals.totalMonthlyExpenses)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default LoanCalcsPanel;

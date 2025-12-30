/**
 * ScenarioComparison - Side-by-side comparison of calculator scenarios
 */

import { TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { CalculatorScenario } from '@/types/calculator';
import { formatCurrency, formatPercentage } from '@/lib/calculatorEngine';

interface ScenarioComparisonProps {
  scenarios: CalculatorScenario[];
  onRenameScenario?: (scenarioId: string, newName: string) => void;
}

interface ComparisonRowProps {
  label: string;
  values: (number | boolean)[];
  format?: 'currency' | 'percentage' | 'boolean' | 'number';
  higherIsBetter?: boolean;
  threshold?: number;
}

function ComparisonRow({
  label,
  values,
  format = 'currency',
  higherIsBetter = true,
  threshold,
}: ComparisonRowProps) {
  // Find best value for highlighting
  const numericValues = values.filter((v): v is number => typeof v === 'number');
  const bestValue = higherIsBetter
    ? Math.max(...numericValues)
    : Math.min(...numericValues);

  return (
    <div className="grid grid-cols-[1fr,repeat(3,1fr)] items-center gap-2 py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      {values.map((value, idx) => {
        if (typeof value === 'boolean') {
          return (
            <div key={idx} className="flex justify-center">
              {value ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
          );
        }

        const isBest = numericValues.length > 1 && value === bestValue;
        const passesThreshold =
          threshold !== undefined
            ? higherIsBetter
              ? value >= threshold
              : value <= threshold
            : null;

        let formattedValue = '';
        switch (format) {
          case 'currency':
            formattedValue = formatCurrency(value);
            break;
          case 'percentage':
            formattedValue = formatPercentage(value);
            break;
          default:
            formattedValue = value.toLocaleString();
        }

        return (
          <div key={idx} className="flex items-center justify-center gap-1">
            <span
              className={cn(
                'text-sm font-medium',
                isBest && 'text-green-600 font-bold',
                passesThreshold === false && 'text-red-600'
              )}
            >
              {formattedValue}
            </span>
            {isBest && numericValues.length > 1 && (
              <TrendingUp className="h-3 w-3 text-green-600" />
            )}
          </div>
        );
      })}
      {/* Fill empty columns if less than 3 scenarios */}
      {Array.from({ length: 3 - values.length }).map((_, idx) => (
        <div key={`empty-${idx}`} className="flex justify-center">
          <Minus className="h-4 w-4 text-muted-foreground/50" />
        </div>
      ))}
    </div>
  );
}

export function ScenarioComparison({
  scenarios,
  onRenameScenario,
}: ScenarioComparisonProps) {
  // Pad scenarios to always show 3 columns
  const paddedScenarios = [...scenarios];
  while (paddedScenarios.length < 3) {
    paddedScenarios.push(null as unknown as CalculatorScenario);
  }

  return (
    <div className="p-4 space-y-4">
      {/* Scenario Headers */}
      <div className="grid grid-cols-[1fr,repeat(3,1fr)] gap-2">
        <div className="text-sm font-medium text-muted-foreground">Metric</div>
        {paddedScenarios.map((scenario, idx) =>
          scenario ? (
            <div key={scenario.id} className="text-center">
              {onRenameScenario ? (
                <Input
                  value={scenario.name}
                  onChange={(e) =>
                    onRenameScenario(scenario.id, e.target.value)
                  }
                  className="h-8 text-center text-sm font-semibold"
                />
              ) : (
                <span className="text-sm font-semibold">{scenario.name}</span>
              )}
              <Badge
                variant={
                  scenario.outputs.dealChecklist.dealDecision === 'DEAL'
                    ? 'default'
                    : scenario.outputs.dealChecklist.dealDecision === 'NEEDS REVIEW'
                    ? 'secondary'
                    : 'destructive'
                }
                className={cn(
                  'mt-1',
                  scenario.outputs.dealChecklist.dealDecision === 'DEAL' &&
                    'bg-green-600',
                  scenario.outputs.dealChecklist.dealDecision === 'NEEDS REVIEW' &&
                    'bg-yellow-500 text-black'
                )}
              >
                {scenario.outputs.dealChecklist.dealDecision}
              </Badge>
            </div>
          ) : (
            <div
              key={`empty-header-${idx}`}
              className="text-center text-muted-foreground/50"
            >
              -
            </div>
          )
        )}
      </div>

      {/* Quick Stats Comparison */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Key Metrics</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <ComparisonRow
            label="MAO"
            values={scenarios.map((s) => s.outputs.quickStats.mao)}
            format="currency"
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Entry Fee"
            values={scenarios.map((s) => s.outputs.quickStats.totalEntryFee)}
            format="currency"
            higherIsBetter={false}
            threshold={25000}
          />
          <ComparisonRow
            label="Funding Gap"
            values={scenarios.map((s) => s.outputs.quickStats.fundingGap)}
            format="currency"
            higherIsBetter={false}
          />
        </CardContent>
      </Card>

      {/* Hold Strategy Comparison */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            Hold Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <ComparisonRow
            label="Monthly Cashflow"
            values={scenarios.map((s) => s.outputs.quickStats.monthlyCashflow)}
            format="currency"
            higherIsBetter={true}
            threshold={400}
          />
          <ComparisonRow
            label="Cash on Cash"
            values={scenarios.map((s) => s.outputs.quickStats.cashOnCashHold)}
            format="percentage"
            higherIsBetter={true}
          />
          <ComparisonRow
            label="Total Expenses"
            values={scenarios.map((s) => s.outputs.totals.totalMonthlyExpenses)}
            format="currency"
            higherIsBetter={false}
          />
        </CardContent>
      </Card>

      {/* Wrap Strategy Comparison */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            Wrap Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <ComparisonRow
            label="Wrap Cashflow"
            values={scenarios.map((s) => s.outputs.quickStats.wrapCashflow)}
            format="currency"
            higherIsBetter={true}
          />
          <ComparisonRow
            label="Cash on Cash"
            values={scenarios.map((s) => s.outputs.quickStats.cashOnCashWrap)}
            format="percentage"
            higherIsBetter={true}
          />
          <ComparisonRow
            label="Wrap Principal"
            values={scenarios.map((s) => s.outputs.loanCalcs.wrapPrincipal)}
            format="currency"
            higherIsBetter={false}
          />
          <ComparisonRow
            label="Buyer PITI"
            values={scenarios.map((s) => s.outputs.loanCalcs.buyerMonthlyPITI)}
            format="currency"
            higherIsBetter={false}
          />
        </CardContent>
      </Card>

      {/* Flip Strategy Comparison */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            Flip Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <ComparisonRow
            label="Flip Profit"
            values={scenarios.map((s) => s.outputs.quickStats.flipProfit)}
            format="currency"
            higherIsBetter={true}
          />
          <ComparisonRow
            label="Cash on Cash"
            values={scenarios.map((s) => s.outputs.quickStats.cashOnCashFlip)}
            format="percentage"
            higherIsBetter={true}
          />
        </CardContent>
      </Card>

      {/* Deal Checklist Comparison */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Deal Checklist</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <ComparisonRow
            label="Entry Fee < $25k"
            values={scenarios.map(
              (s) => s.outputs.dealChecklist.entryFeeUnder25k
            )}
            format="boolean"
          />
          <ComparisonRow
            label="Cashflow > $400"
            values={scenarios.map(
              (s) => s.outputs.dealChecklist.cashflowOver400
            )}
            format="boolean"
          />
          <ComparisonRow
            label="LTV < 75%"
            values={scenarios.map((s) => s.outputs.dealChecklist.ltvUnder75)}
            format="boolean"
          />
          <ComparisonRow
            label="Equity > $15k"
            values={scenarios.map((s) => s.outputs.dealChecklist.equityOver15k)}
            format="boolean"
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default ScenarioComparison;

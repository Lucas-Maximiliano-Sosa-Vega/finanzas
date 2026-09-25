"use client";

import { PiggyBankIcon } from "lucide-react";
import { useId, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { projectSavings } from "@/lib/finance/rule";
import { formatCurrency, formatPercent } from "@/lib/format";

const HORIZONS = [6, 12, 24] as const;

interface SavingsProjectionProps {
  monthlySavings: number;
  currency: string;
}

export function SavingsProjection({ monthlySavings, currency }: SavingsProjectionProps) {
  const [annualRate, setAnnualRate] = useState(0);
  const rateId = useId();

  return (
    <Card className="gap-6 rounded-2xl py-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PiggyBankIcon className="size-5 text-primary" aria-hidden />
          Proyección de ahorro
        </CardTitle>
        <CardDescription className="text-base">
          Según tu media de {formatCurrency(monthlySavings, currency)} al mes en ahorro e inversión.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor={rateId} className="text-base font-normal">
              Rentabilidad anual estimada
            </Label>
            <span className="text-sm font-medium tabular-nums">{formatPercent(annualRate)}</span>
          </div>
          <Slider
            id={rateId}
            min={0}
            max={15}
            step={0.5}
            value={[annualRate]}
            onValueChange={([value]) => setAnnualRate(value ?? 0)}
            aria-label="Rentabilidad anual estimada"
          />
        </div>

        <dl className="grid gap-3 sm:grid-cols-3">
          {HORIZONS.map((months) => {
            const total = projectSavings(monthlySavings, annualRate, months);
            const contributed = monthlySavings * months;
            const gain = total - contributed;
            return (
              <div key={months} className="space-y-1 rounded-xl bg-success-soft p-4">
                <dt className="text-base font-medium">En {months} meses</dt>
                <dd className="text-2xl font-semibold tracking-tight text-money-in">
                  {formatCurrency(total, currency, { compact: total >= 100_000 })}
                </dd>
                <dd className="text-sm text-muted-foreground">
                  {gain > 0.5 ? `+${formatCurrency(gain, currency, { compact: gain >= 100_000 })} de rendimiento` : "Solo lo que ahorras"}
                </dd>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}

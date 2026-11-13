import { LandmarkIcon, PencilIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";

import { Meter } from "@/components/meter";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { AccountFormDialog } from "@/features/accounts/components/account-form";
import { ACCOUNT_TYPES } from "@/features/accounts/labels";
import { statusFill } from "@/features/dashboard/components/status-label";
import { getAccountBalances, getCreditLimits } from "@/features/accounts/queries";
import { getProfile } from "@/features/settings/queries";
import { getCatalog, type Account } from "@/features/shared/queries";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Cuentas" };

export default async function AccountsPage() {
  const [{ accounts }, balances, limits, { currency }] = await Promise.all([
    getCatalog(),
    getAccountBalances(),
    getCreditLimits(),
    getProfile(),
  ]);
  const active = accounts.filter((a) => !a.is_archived);
  const archived = accounts.filter((a) => a.is_archived);
  const balanceOf = (a: Account) => balances?.get(a.id) ?? a.initial_balance;
  const netWorth = active.reduce((sum, a) => sum + balanceOf(a), 0);

  return (
    <div className="space-y-10">
      <PageHeader title="Cuentas" description="Dónde está tu dinero: efectivo, banco, tarjetas…">
        <AccountFormDialog
          trigger={
            <Button size="lg" className="h-12 px-5 text-base">
              <PlusIcon className="size-5" />
              Nueva cuenta
            </Button>
          }
        />
      </PageHeader>

      <StatCard
        label="Todo tu dinero sumado"
        value={formatCurrency(netWorth, currency)}
        icon={LandmarkIcon}
        tone={netWorth < 0 ? "danger" : "success"}
        hint="Suma de todas las cuentas (las deudas restan)."
        className="sm:max-w-md"
      />

      {!balances && (
        <p role="alert" className="rounded-xl bg-warning-soft px-4 py-3 text-base">
          Los saldos mostrados son los iniciales: aplica la migración{" "}
          <code className="font-medium">supabase/migrations/20260926000000_account_balances.sql</code> para ver el saldo
          actual.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {active.map((account) => (
          <AccountCard
            key={account.id}
            account={account}
            balance={balanceOf(account)}
            creditLimit={limits.get(account.id)}
            currency={currency}
          />
        ))}
      </div>

      {archived.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-muted-foreground">Archivadas</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {archived.map((account) => (
              <AccountCard
            key={account.id}
            account={account}
            balance={balanceOf(account)}
            creditLimit={limits.get(account.id)}
            currency={currency}
          />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

interface AccountCardProps {
  account: Account;
  balance: number;
  creditLimit?: number;
  currency: string;
}

function AccountCard({ account, balance, creditLimit, currency }: AccountCardProps) {
  const { label, icon: Icon } = ACCOUNT_TYPES[account.type];
  const isCredit = account.type === "credit_card" && creditLimit !== undefined;

  // Tarjeta con límite: el saldo es la deuda; lo importante es cuánto queda disponible.
  const used = Math.max(-balance, 0);
  const available = creditLimit === undefined ? 0 : creditLimit - used;
  const usage = creditLimit ? used / creditLimit : 0;
  const meterColor = statusFill(usage > 1 ? "exceeded" : usage >= 0.85 ? "warning" : "ok");
  const negative = balance < 0;

  return (
    <article className={cn("flex flex-col gap-5 rounded-2xl border bg-card p-5", account.is_archived && "opacity-60")}>
      <header className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-info-soft text-primary">
          <Icon className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{account.name}</h3>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </header>

      {isCredit ? (
        <div className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Disponible</p>
            <p className={cn("text-3xl font-semibold tracking-tight", available < 0 ? "text-danger" : "text-foreground")}>
              {formatCurrency(available, currency)}
            </p>
          </div>
          <Meter value={usage} color={meterColor} label={`Uso del límite de ${account.name}`} />
          <dl className="flex justify-between gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Usado</dt>
              <dd className="font-medium tabular-nums">{formatCurrency(used, currency)}</dd>
            </div>
            <div className="text-right">
              <dt className="text-muted-foreground">Límite</dt>
              <dd className="font-medium tabular-nums">{formatCurrency(creditLimit ?? 0, currency)}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div>
          <p className="text-sm text-muted-foreground">{negative ? "Debes" : "Tienes"}</p>
          <p className={cn("text-3xl font-semibold tracking-tight", negative ? "text-danger" : "text-foreground")}>
            {formatCurrency(balance, currency)}
          </p>
        </div>
      )}

      <AccountFormDialog
        account={account}
        creditLimit={creditLimit}
        trigger={
          <Button variant="outline" className="mt-auto h-11 w-full text-base">
            <PencilIcon />
            Editar
          </Button>
        }
      />
    </article>
  );
}

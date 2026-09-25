import { LandmarkIcon, PencilIcon, PlusIcon } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { AccountFormDialog } from "@/features/accounts/components/account-form";
import { ACCOUNT_TYPES } from "@/features/accounts/labels";
import { getAccountBalances } from "@/features/accounts/queries";
import { getProfile } from "@/features/settings/queries";
import { getCatalog, type Account } from "@/features/shared/queries";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Cuentas" };

export default async function AccountsPage() {
  const [{ accounts }, balances, { currency }] = await Promise.all([getCatalog(), getAccountBalances(), getProfile()]);
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
          <AccountCard key={account.id} account={account} balance={balanceOf(account)} currency={currency} />
        ))}
      </div>

      {archived.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-muted-foreground">Archivadas</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {archived.map((account) => (
              <AccountCard key={account.id} account={account} balance={balanceOf(account)} currency={currency} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AccountCard({ account, balance, currency }: { account: Account; balance: number; currency: string }) {
  const { label, icon: Icon } = ACCOUNT_TYPES[account.type];
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

      <div>
        <p className="text-sm text-muted-foreground">{negative ? "Debes" : "Tienes"}</p>
        <p className={cn("text-3xl font-semibold tracking-tight", negative ? "text-danger" : "text-foreground")}>
          {formatCurrency(balance, currency)}
        </p>
      </div>

      <AccountFormDialog
        account={account}
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

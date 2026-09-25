import { ArrowDownLeftIcon, ArrowUpRightIcon } from "lucide-react";

import type { Category } from "@/features/categories/tree";
import type { Account } from "@/features/shared/queries";

import { TransactionFormDialog } from "./transaction-form";

interface EntryButtonsProps {
  accounts: Account[];
  categories: Category[];
  today: string;
}

/** Dos botones grandes y evidentes: registrar un gasto (rojo) o un ingreso (verde). */
export function EntryButtons({ accounts, categories, today }: EntryButtonsProps) {
  const shared = { accounts, categories, today };
  const base =
    "flex h-20 w-full items-center justify-center gap-3 rounded-2xl text-lg font-semibold text-white shadow-sm transition-[transform,filter] hover:brightness-110 active:scale-[0.98] focus-visible:ring-4 focus-visible:outline-none motion-reduce:transition-none";

  // En "Clásico" se ocultan: se usa el botón "Nuevo" de la cabecera.
  return (
    <div className="grid gap-3 sm:grid-cols-2 classic:hidden">
      <TransactionFormDialog
        {...shared}
        defaultKind="expense"
        trigger={
          <button type="button" className={`${base} bg-danger-solid focus-visible:ring-red-300`}>
            <ArrowUpRightIcon className="size-7" aria-hidden />
            Registrar gasto
          </button>
        }
      />
      <TransactionFormDialog
        {...shared}
        defaultKind="income"
        trigger={
          <button type="button" className={`${base} bg-success-solid focus-visible:ring-green-300`}>
            <ArrowDownLeftIcon className="size-7" aria-hidden />
            Registrar ingreso
          </button>
        }
      />
    </div>
  );
}

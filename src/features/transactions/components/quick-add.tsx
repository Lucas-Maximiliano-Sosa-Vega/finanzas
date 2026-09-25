import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCurrentCycle } from "@/features/settings/queries";
import { getCatalog } from "@/features/shared/queries";
import { cn } from "@/lib/utils";

import { TransactionFormDialog } from "./transaction-form";

const trigger = ({ compact = false, disabled = false }) => (
  <Button disabled={disabled} className={cn("text-base", compact ? "h-11 px-4" : "h-12 w-full")}>
    <PlusIcon className="size-5" />
    {compact ? "Nuevo" : "Nuevo movimiento"}
  </Button>
);

/** Botón "Nuevo movimiento": en el menú lateral y en la barra móvil. */
export async function QuickAdd({ compact = false }: { compact?: boolean }) {
  const [{ accounts, categories }, { today }] = await Promise.all([getCatalog(), getCurrentCycle()]);
  return <TransactionFormDialog accounts={accounts} categories={categories} today={today} trigger={trigger({ compact })} />;
}

export function QuickAddFallback({ compact = false }: { compact?: boolean }) {
  return trigger({ compact, disabled: true });
}

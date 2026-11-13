"use client";

import { ConfirmDelete } from "@/components/forms/confirm-delete";

import { deleteTransfer } from "../actions";

export function DeleteTransferButton({ id }: { id: string }) {
  return (
    <ConfirmDelete
      title="¿Eliminar esta transferencia?"
      description="Los saldos de las dos cuentas vuelven a como estaban antes. No se puede deshacer."
      onConfirm={() => deleteTransfer(id)}
    />
  );
}

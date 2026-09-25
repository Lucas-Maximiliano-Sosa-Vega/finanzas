"use client";

import { Loader2Icon, Trash2Icon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/actions";

interface ConfirmDeleteProps {
  title: string;
  description: string;
  onConfirm: () => Promise<ActionState>;
  /** Texto del botón que abre la confirmación. */
  label?: string;
  onDeleted?: () => void;
}

/** Botón "Eliminar" en rojo con confirmación. Se usa dentro de los diálogos de edición. */
export function ConfirmDelete({ title, description, onConfirm, label = "Eliminar", onDeleted }: ConfirmDeleteProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await onConfirm();
      if (result.status === "success") {
        toast.success(result.message);
        setOpen(false);
        onDeleted?.();
      } else {
        toast.error(result.message);
      }
    });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="lg" className="text-danger hover:bg-danger-soft hover:text-danger">
          <Trash2Icon />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={pending} className="h-11 px-5 text-base">
            No, volver
          </AlertDialogCancel>
          {/* Botón propio (no AlertDialogAction) para no cerrar antes de terminar. */}
          <Button variant="destructive" onClick={confirm} disabled={pending} className="h-11 px-5 text-base">
            {pending ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
            Sí, eliminar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

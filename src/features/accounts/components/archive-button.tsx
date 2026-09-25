"use client";

import { ArchiveIcon, ArchiveRestoreIcon, Loader2Icon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { setAccountArchived } from "../actions";

export function ArchiveButton({ id, archived, onDone }: { id: string; archived: boolean; onDone?: () => void }) {
  const [pending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      const result = await setAccountArchived(id, !archived);
      if (result.status === "success") {
        toast.success(result.message);
        onDone?.();
      } else {
        toast.error(result.message);
      }
    });

  const Icon = pending ? Loader2Icon : archived ? ArchiveRestoreIcon : ArchiveIcon;

  return (
    <Button type="button" variant="ghost" size="lg" onClick={toggle} disabled={pending} className="text-muted-foreground">
      <Icon className={pending ? "animate-spin" : undefined} />
      {archived ? "Volver a usar" : "Archivar"}
    </Button>
  );
}

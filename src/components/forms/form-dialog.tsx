"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function FormDialog({ open, onOpenChange, trigger, title, description, children }: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92svh] gap-6 overflow-y-auto p-6 sm:max-w-lg">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className={description ? "text-base" : "sr-only"}>{description ?? title}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  htmlFor: string;
  errors?: string[];
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, errors, hint, className, children }: FieldProps) {
  const error = errors?.[0];
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

/** Clases para inputs y selects de formulario: más altos y legibles. */
export const FIELD_CONTROL = "h-12 text-base md:text-base";

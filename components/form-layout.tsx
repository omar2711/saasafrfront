import type { LucideIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/** Sección con título e ícono. Se usa igual en todos los formularios. */
export function FormSection({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      <div className="border-b pb-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          {title}
        </h4>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** Grilla de 2 columnas (1 en móvil). Usa className="sm:col-span-2" para campos anchos. */
export function FormGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid gap-4 sm:grid-cols-2', className)}>{children}</div>;
}

/** Campo con etiqueta, ayuda y error en posiciones consistentes. */
export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

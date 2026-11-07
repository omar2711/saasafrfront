'use client';

import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Texto del botón principal, p. ej. "Guardar" o "Crear usuario". */
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit: () => void | Promise<void>;
  isSubmitting?: boolean;
  /** Deshabilita el botón principal (p. ej. mientras falta un dato obligatorio). */
  submitDisabled?: boolean;
  /** Mensaje de error general; se muestra sobre los botones. */
  error?: string | null;
  size?: 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

const SIZES = { md: 'sm:max-w-md', lg: 'sm:max-w-xl', xl: 'sm:max-w-3xl' } as const;

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  submitLabel = 'Guardar',
  cancelLabel = 'Cancelar',
  onSubmit,
  isSubmitting = false,
  submitDisabled = false,
  error,
  size = 'lg',
  children,
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
      <DialogContent className={cn('flex max-h-[90vh] flex-col gap-0 p-0', SIZES[size])}>
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="space-y-0.5 text-left">
              <DialogTitle className="text-lg">{title}</DialogTitle>
              {description && (
                <DialogDescription className="text-sm">{description}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit();
          }}
        >
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">{children}</div>

          <div className="space-y-3 border-t bg-muted/30 px-6 py-4">
            {error && (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
              >
                {cancelLabel}
              </Button>
              <Button type="submit" disabled={isSubmitting || submitDisabled} className="min-w-[120px]">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitLabel}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

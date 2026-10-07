import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusVariant = 
  | 'active' 
  | 'inactive' 
  | 'pending' 
  | 'success' 
  | 'warning' 
  | 'error'
  | 'draft'
  | 'trialing';

interface StatusBadgeProps {
  status: StatusVariant;
  label?: string;
  className?: string;
}

const statusConfig: Record<StatusVariant, { label: string; className: string }> = {
  active: {
    label: 'Activo',
    className: 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  },
  inactive: {
    label: 'Inactivo',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
  },
  pending: {
    label: 'Pendiente',
    className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  success: {
    label: 'Completado',
    className: 'bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  },
  warning: {
    label: 'Atención',
    className: 'bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
  },
  error: {
    label: 'Error',
    className: 'bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400',
  },
  draft: {
    label: 'Borrador',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  },
  trialing: {
    label: 'Prueba',
    className: 'bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
  },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant="secondary" 
      className={cn(config.className, 'font-medium', className)}
    >
      {label || config.label}
    </Badge>
  );
}

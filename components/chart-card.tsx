import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function ChartCard({
  title,
  description,
  children,
  className,
  action,
}: ChartCardProps) {
  return (
    <Card className={cn('', className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

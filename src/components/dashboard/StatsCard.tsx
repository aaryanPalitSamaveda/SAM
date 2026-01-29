import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({ title, value, icon, trend, className }: StatsCardProps) {
  return (
    <div className={cn(
      "rounded-lg bg-card border border-border p-5 transition-colors duration-200 hover:border-primary/20",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground tabular-nums">{value}</p>
          {trend && (
            <p className={cn(
              "text-xs font-medium",
              trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}>
              {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}% from yesterday
            </p>
          )}
        </div>
        <div className="p-2.5 rounded-lg bg-muted border border-border">
          {icon}
        </div>
      </div>
    </div>
  );
}

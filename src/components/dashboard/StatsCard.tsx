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
      "relative overflow-hidden rounded-lg bg-card border border-border p-5 transition-all duration-300 hover:shadow-elegant-hover hover:border-primary/20 group",
      className
    )}>
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-gold-subtle opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold font-serif text-foreground tabular-nums">{value}</p>
          {trend && (
            <p className={cn(
              "text-xs font-medium",
              trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}>
              {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}% from yesterday
            </p>
          )}
        </div>
        <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/10 group-hover:bg-primary/15 transition-colors">
          {icon}
        </div>
      </div>
    </div>
  );
}

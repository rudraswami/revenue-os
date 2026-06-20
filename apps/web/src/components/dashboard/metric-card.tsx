"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  delta?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({ title, value, delta, trend = "neutral", icon, className }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn("overflow-hidden border-border/80 shadow-sm", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
              {icon}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
          {delta && (
            <p
              className={cn(
                "mt-1.5 text-xs leading-relaxed",
                trend === "up" && "text-success",
                trend === "down" && "text-destructive",
                trend === "neutral" && "text-muted-foreground",
              )}
            >
              {delta}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"] as const;

export default function PipelinePage() {
  const token = useAuthStore((s) => s.accessToken);

  const { data } = useQuery({
    queryKey: ["pipeline"],
    queryFn: () =>
      apiFetch<Record<string, Array<{ id: string; displayName: string | null; phone: string; score: number }>>>(
        "/leads/pipeline",
        { token: token ?? undefined },
      ),
    enabled: !!token,
  });

  return (
    <div className="flex h-full flex-col p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <p className="text-muted-foreground">AI-powered Kanban across revenue stages</p>
      </header>
      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {STAGES.map((stage) => (
          <div key={stage} className="min-w-[280px] flex-shrink-0">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium">{stage}</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                {data?.[stage]?.length ?? 0}
              </span>
            </div>
            <div className="space-y-2">
              {(data?.[stage] ?? []).map((lead, i) => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="cursor-grab active:cursor-grabbing">
                    <CardHeader className="p-4 pb-1">
                      <CardTitle className="text-sm">
                        {lead.displayName ?? lead.phone}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-xs text-muted-foreground">
                      Score {lead.score} · AI tracked
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

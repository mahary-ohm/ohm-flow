"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";
import type { Metrics, Ticket } from "../components/ohmflow-types";

/** Indicateurs et tickets récents du tableau de bord, chargés à la connexion. */
export function useDashboard(userId: string | undefined, onError: (message: string) => void) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recent, setRecent] = useState<Ticket[]>([]);

  const reload = useCallback(async () => {
    const data = await api<{ metrics: Metrics; recent: Ticket[] }>("/dashboard");
    setMetrics(data.metrics);
    setRecent(data.recent);
  }, []);

  useEffect(() => {
    if (!userId) return;
    reload().catch((e: unknown) => onError(errorMessage(e, "Impossible de charger les données")));
  }, [userId, reload, onError]);

  return { metrics, recent, reload };
}

"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";
import type { AgentOption } from "../components/ohmflow-types";

type AgentPage = { items: AgentOption[]; total: number; page: number };

async function fetchAllAgents() {
  const firstPage = await api<AgentPage>("/users?role=AGENT&page=1");
  const agents = [...firstPage.items];
  let currentPage = firstPage.page + 1;
  while (agents.length < firstPage.total) {
    const nextPage = await api<AgentPage>(`/users?role=AGENT&page=${currentPage}`);
    if (!nextPage.items.length) break;
    agents.push(...nextPage.items);
    currentPage += 1;
  }
  return agents;
}

/**
 * Agents actifs autorisés sur la cellule du ticket ouvert, pour l'affectation
 * par un administrateur. Ne charge rien si `enabled` est faux.
 */
export function useAgentOptions(enabled: boolean, ticketId: string | undefined, cellId: string | undefined) {
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled || !ticketId) {
      setAgents([]);
      setError("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchAllAgents()
      .then((items) => {
        if (!cancelled) setAgents(items);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setAgents([]);
        setError(errorMessage(e, "Chargement des agents impossible"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, ticketId]);

  const eligibleAgents = cellId
    ? agents.filter((agent) => agent.isActive && agent.agentCells.some((membership) => membership.cellId === cellId))
    : [];

  return { eligibleAgents, loading, error };
}

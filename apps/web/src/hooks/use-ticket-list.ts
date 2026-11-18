"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";
import type { Ticket, View } from "../components/ohmflow-types";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 220;

/** Liste paginée des tickets avec recherche et filtre de statut. */
export function useTicketList(userId: string | undefined, view: View, onError: (message: string) => void) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const reload = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (search.trim()) params.set("q", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    // Vue agents : tickets libres ou déjà attribués à l'agent, filtrés côté serveur
    // pour que la pagination et le total restent exacts.
    if (view === "agents") params.set("available", "true");
    const data = await api<{ items: Ticket[]; total: number }>(`/tickets?${params}`);
    setTickets(data.items);
    setTotal(data.total);
  }, [page, search, statusFilter, view]);

  // Un seul chargement (avec anti-rebond pour la saisie) pour tous les critères de liste.
  useEffect(() => {
    if (!userId) return;
    const timer = setTimeout(() => {
      reload().catch((e: unknown) => onError(errorMessage(e, "Erreur")));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [userId, reload, onError]);

  // Tout changement de critère ramène à la première page.
  const changeSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);
  const changeStatusFilter = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  return { tickets, total, page, setPage, search, changeSearch, statusFilter, changeStatusFilter, reload };
}

"use client";

import { useCallback, useState } from "react";
import { api } from "../lib/api";
import type { CategoryOption, CellOption, GrdOption } from "../components/ohmflow-types";

/** Listes de choix des formulaires de ticket : cellules, catégories et GRD actifs. */
export function useTicketOptions() {
  const [cells, setCells] = useState<CellOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [grds, setGrds] = useState<GrdOption[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Charge les options. `currentGrd` reste sélectionnable même s'il a été
   * désactivé depuis (modification d'un ticket existant).
   */
  const load = useCallback(async (currentGrd?: GrdOption | null) => {
    setLoading(true);
    try {
      const [cellData, categoryData, grdData] = await Promise.all([
        api<{ items: CellOption[] }>("/cells"),
        api<{ items: CategoryOption[] }>("/ticket-categories"),
        api<{ items: GrdOption[] }>("/grds"),
      ]);
      const grdItems = grdData.items;
      if (currentGrd && !grdItems.some((grd) => grd.id === currentGrd.id)) grdItems.push(currentGrd);
      setCells(cellData.items);
      setCategories(categoryData.items);
      setGrds(grdItems);
    } finally {
      setLoading(false);
    }
  }, []);

  return { cells, categories, grds, loading, load };
}

export type TicketOptions = ReturnType<typeof useTicketOptions>;

"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage, type ApiClient } from "../lib/api";

export type AdminService = {
  id: string;
  name: string;
  isActive: boolean;
  cells: { id: string; name: string; isActive: boolean }[];
};

/** Services et cellules : liste, création et activation des cellules. */
export function useAdminServices(api: ApiClient) {
  const [items, setItems] = useState<AdminService[]>([]);
  const [error, setError] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [cellName, setCellName] = useState("");
  const [serviceId, setServiceId] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: AdminService[] }>("/services");
      setItems(data.items);
      setError("");
    } catch (e) {
      setError(errorMessage(e, "Chargement impossible"));
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createService() {
    try {
      await api("/services", { method: "POST", body: JSON.stringify({ name: serviceName }) });
      setServiceName("");
      await load();
    } catch (e) {
      setError(errorMessage(e, "Création impossible"));
    }
  }

  async function createCell() {
    try {
      await api("/cells", { method: "POST", body: JSON.stringify({ name: cellName, serviceId }) });
      setCellName("");
      await load();
    } catch (e) {
      setError(errorMessage(e, "Création impossible"));
    }
  }

  async function toggleCell(cell: { id: string; isActive: boolean }) {
    try {
      await api(`/cells/${cell.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !cell.isActive }) });
      await load();
    } catch (e) {
      setError(errorMessage(e, "Modification impossible"));
    }
  }

  return {
    items, error, serviceName, setServiceName, cellName, setCellName,
    serviceId, setServiceId, createService, createCell, toggleCell,
  };
}

"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { errorMessage, type ApiClient } from "../lib/api";

export type ReferenceItem = { id: string; name: string; description: string | null; isActive: boolean };

export type ReferenceListMessages = {
  loadError: string;
  created: string;
  createError: string;
  deactivated: string;
  reactivated: string;
  updateError: string;
};

/**
 * Référentiel simple géré par un administrateur (catégories de tickets, GRD…) :
 * liste, création (nom + description) et activation / désactivation.
 */
export function useReferenceList(api: ApiClient, path: string, messages: ReferenceListMessages) {
  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const { loadError } = messages;

  const load = useCallback(async () => {
    try {
      const data = await api<{ items: ReferenceItem[] }>(path);
      setItems(data.items);
      setError("");
    } catch (e) {
      setError(errorMessage(e, loadError));
    }
  }, [api, path, loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api(path, {
        method: "POST",
        body: JSON.stringify({ name, description: description.trim() || undefined }),
      });
      setName("");
      setDescription("");
      setSuccess(messages.created);
      await load();
    } catch (e) {
      setError(errorMessage(e, messages.createError));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(item: ReferenceItem) {
    setError("");
    setSuccess("");
    try {
      await api(`${path}/${item.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !item.isActive }) });
      setSuccess(item.isActive ? messages.deactivated : messages.reactivated);
      await load();
    } catch (e) {
      setError(errorMessage(e, messages.updateError));
    }
  }

  return { items, name, setName, description, setDescription, error, success, busy, create, toggle };
}

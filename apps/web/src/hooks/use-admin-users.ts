"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Role } from "@ohmflow/shared";
import { errorMessage, type ApiClient } from "../lib/api";

export type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  isActive: boolean;
  cell?: { id: string; name: string } | null;
  agentCells: { cellId: string; cell: { id: string; name: string } }[];
};

const emptyCreateForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  role: "USER" as Role,
  cellId: "",
  agentCellIds: [] as string[],
};

const emptyEditForm = {
  firstName: "",
  lastName: "",
  email: "",
  role: "USER" as Role,
  cellId: "",
  agentCellIds: [] as string[],
  isActive: true,
  newPassword: "",
  confirmNewPassword: "",
};

const SEARCH_DEBOUNCE_MS = 200;

/** Comptes utilisateurs : recherche, création, modification et (dés)activation. */
export function useAdminUsers(api: ApiClient) {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [cells, setCells] = useState<{ id: string; name: string }[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCreateForm);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);

  const load = useCallback(async () => {
    try {
      const [users, cellData] = await Promise.all([
        api<{ items: AdminUser[] }>(`/users?q=${encodeURIComponent(query)}`),
        api<{ items: { id: string; name: string }[] }>("/cells"),
      ]);
      setItems(users.items);
      setCells(cellData.items);
      setError("");
    } catch (e) {
      setError(errorMessage(e, "Chargement impossible"));
    }
  }, [api, query]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/users", {
        method: "POST",
        body: JSON.stringify({ ...form, cellId: form.cellId || undefined }),
      });
      setShowForm(false);
      setForm(emptyCreateForm);
      await load();
    } catch (e) {
      setError(errorMessage(e, "Création impossible"));
    }
  }

  async function activate(user: AdminUser) {
    try {
      await api(`/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !user.isActive }) });
      await load();
    } catch (e) {
      setError(errorMessage(e, "Modification impossible"));
    }
  }

  function startEdit(user: AdminUser) {
    setEditing(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      cellId: user.cell?.id ?? "",
      agentCellIds: user.agentCells.map((membership) => membership.cellId),
      isActive: user.isActive,
      newPassword: "",
      confirmNewPassword: "",
    });
    setError("");
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    if (editForm.newPassword && editForm.newPassword !== editForm.confirmNewPassword) {
      setError("La confirmation du nouveau mot de passe ne correspond pas.");
      return;
    }
    setError("");
    try {
      const { newPassword, confirmNewPassword, ...profile } = editForm;
      await api(`/users/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...profile,
          cellId: profile.role === "USER" ? profile.cellId : null,
          agentCellIds: profile.role === "AGENT" ? profile.agentCellIds : [],
          ...(newPassword ? { newPassword, confirmNewPassword } : {}),
        }),
      });
      setEditing(null);
      setEditForm((current) => ({ ...current, newPassword: "", confirmNewPassword: "" }));
      await load();
    } catch (e) {
      setError(errorMessage(e, "Modification impossible"));
    }
  }

  return {
    items, cells, query, setQuery, error, showForm, setShowForm,
    form, setForm, create, activate,
    editing, setEditing, editForm, setEditForm, startEdit, saveEdit,
  };
}

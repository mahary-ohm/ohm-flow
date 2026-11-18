"use client";

import { useCallback, useState, type FormEvent } from "react";
import { UpdateTicketSchema, type TicketStatus } from "@ohmflow/shared";
import { api, errorMessage } from "../lib/api";
import type { TicketDetail, TicketEditForm } from "../components/ohmflow-types";
import type { Feedback } from "./use-feedback";
import type { TicketOptions } from "./use-ticket-options";

const emptyEditForm: TicketEditForm = {
  title: "",
  description: "",
  cellId: "",
  categoryId: "",
  grdId: "",
  pdlPce: "",
  haulogyTicketNumber: "",
  version: 1,
};

const EDITABLE_STATUSES: TicketStatus[] = ["OPEN", "IN_PROGRESS", "WAITING"];

/**
 * Ticket ouvert et toutes ses actions : modification par le créateur,
 * prise en charge, changement de statut, commentaire et affectation.
 * `refreshLists` recharge le tableau de bord et la liste après une action.
 */
export function useTicketDetail(feedback: Feedback, options: TicketOptions, refreshLists: () => Promise<void>) {
  const { run, setError } = feedback;
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [ticketEditMode, setTicketEditMode] = useState(false);
  const [ticketEditForm, setTicketEditForm] = useState<TicketEditForm>(emptyEditForm);
  const [comment, setComment] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");

  const openTicket = useCallback(
    async (ticket: { id: string }) => {
      setError("");
      try {
        const data = await api<{ ticket: TicketDetail }>(`/tickets/${ticket.id}`);
        setDetail(data.ticket);
        setTicketEditMode(false);
      } catch (e) {
        setError(errorMessage(e, "Impossible de charger le ticket"));
      }
    },
    [setError],
  );

  const closeTicket = useCallback(() => setDetail(null), []);

  async function beginTicketEdit() {
    if (!detail) return;
    setTicketEditMode(true);
    setError("");
    setTicketEditForm({
      title: detail.title,
      description: detail.description,
      cellId: detail.cellId,
      categoryId: detail.categoryId ?? "",
      grdId: detail.grdId ?? "",
      pdlPce: detail.pdlPce ?? "",
      haulogyTicketNumber: detail.haulogyTicketNumber ?? "",
      version: detail.version,
    });
    try {
      await options.load(detail.grd);
    } catch (e) {
      setError(errorMessage(e, "Chargement des options impossible"));
    }
  }

  async function saveTicketEdit(event: FormEvent) {
    event.preventDefault();
    if (!detail) return;
    const parsed = UpdateTicketSchema.safeParse(ticketEditForm);
    if (!parsed.success) {
      setError("Vérifiez l’objet, la description, la cellule, la catégorie et le GRD du ticket.");
      return;
    }
    await run(
      async () => {
        await api(`/tickets/${detail.id}`, { method: "PATCH", body: JSON.stringify(parsed.data) });
        const refreshed = await api<{ ticket: TicketDetail }>(`/tickets/${detail.id}`);
        setDetail(refreshed.ticket);
        setTicketEditMode(false);
        await refreshLists();
      },
      "Modification du ticket impossible",
      "Votre ticket a été modifié.",
    );
  }

  async function claimTicket() {
    if (!detail) return;
    await run(
      async () => {
        await api(`/tickets/${detail.id}/claim`, { method: "POST" });
        await openTicket(detail);
        await refreshLists();
      },
      "Prise en charge impossible",
      "Le ticket vous est attribué.",
    );
  }

  async function changeStatus(status: TicketStatus) {
    if (!detail) return;
    await run(
      async () => {
        await api(`/tickets/${detail.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status, version: detail.version }),
        });
        await openTicket(detail);
        await refreshLists();
      },
      "Mise à jour impossible",
      "Le statut du ticket a été mis à jour.",
    );
  }

  async function addComment() {
    if (!detail || !comment.trim()) return;
    await run(
      async () => {
        await api(`/tickets/${detail.id}/comments`, { method: "POST", body: JSON.stringify({ content: comment }) });
        setComment("");
        await openTicket(detail);
      },
      "Envoi impossible",
      "Commentaire ajouté.",
    );
  }

  async function assignTicket() {
    if (!detail || !selectedAgent) return;
    await run(
      async () => {
        await api(`/tickets/${detail.id}/assignment`, {
          method: "PATCH",
          body: JSON.stringify({ agentId: selectedAgent, version: detail.version }),
        });
        setSelectedAgent("");
        await openTicket(detail);
        await refreshLists();
      },
      "Affectation impossible",
      "Le ticket a été affecté.",
    );
  }

  /** Le créateur peut modifier son ticket tant qu'il n'est ni résolu ni clôturé. */
  const canEdit = (userId: string) =>
    Boolean(detail && detail.creator.id === userId && EDITABLE_STATUSES.includes(detail.status));

  return {
    detail,
    setDetail,
    openTicket,
    closeTicket,
    canEdit,
    ticketEditMode,
    setTicketEditMode,
    ticketEditForm,
    setTicketEditForm,
    beginTicketEdit,
    saveTicketEdit,
    claimTicket,
    changeStatus,
    comment,
    setComment,
    addComment,
    selectedAgent,
    setSelectedAgent,
    assignTicket,
  };
}

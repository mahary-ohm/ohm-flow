"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CreateTicketSchema } from "@ohmflow/shared";
import { api } from "../lib/api";
import type { Feedback } from "./use-feedback";

export type CreateTicketInput = z.input<typeof CreateTicketSchema>;
export type CreateTicketValues = z.output<typeof CreateTicketSchema>;

/** Formulaire « Nouvelle demande ». `onCreated` est appelé après une création réussie. */
export function useCreateTicket(feedback: Feedback, onCreated: () => Promise<void>) {
  const ticketForm = useForm<CreateTicketInput, unknown, CreateTicketValues>({
    resolver: zodResolver(CreateTicketSchema),
  });

  async function createTicket(values: CreateTicketValues) {
    await feedback.run(
      async () => {
        await api("/tickets", { method: "POST", body: JSON.stringify(values) });
        ticketForm.reset();
        await onCreated();
      },
      "Création impossible",
      "Votre demande a bien été créée.",
    );
  }

  return { ticketForm, createTicket };
}

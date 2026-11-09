import { describe, expect, it } from "vitest";
import { ChangeStatusSchema, CreateTicketCategorySchema, CreateTicketSchema, TicketQuerySchema, UpdateTicketSchema } from "@ohmflow/shared";

describe("validation des contrats de tickets", () => {
  it("refuse les tickets trop courts", () => {
    expect(CreateTicketSchema.safeParse({ title: "ok", description: "short" }).success).toBe(false);
  });
  it("exige une cellule choisie pour créer le ticket", () => {
    expect(CreateTicketSchema.safeParse({ title: "Demande valide", description: "Description suffisamment longue", categoryId: "category-1" }).success).toBe(false);
    expect(CreateTicketSchema.safeParse({ title: "Demande valide", description: "Description suffisamment longue", cellId: "cell-1", categoryId: "category-1" }).success).toBe(true);
  });
  it("exige une catégorie choisie pour créer le ticket", () => {
    expect(CreateTicketSchema.safeParse({ title: "Demande valide", description: "Description suffisamment longue", cellId: "cell-1" }).success).toBe(false);
    expect(CreateTicketSchema.safeParse({ title: "Demande valide", description: "Description suffisamment longue", cellId: "cell-1", categoryId: "category-1" }).success).toBe(true);
  });
  it("valide le nom de catégorie administrateur", () => {
    expect(CreateTicketCategorySchema.safeParse({ name: "A" }).success).toBe(false);
    expect(CreateTicketCategorySchema.safeParse({ name: "Incident technique" }).success).toBe(true);
  });
  it("exige une version et des champs valides pour modifier un ticket", () => {
    const update = { title: "Demande mise à jour", description: "Description suffisamment longue", cellId: "cell-1", categoryId: "category-1", version: 2 };
    expect(UpdateTicketSchema.safeParse(update).success).toBe(true);
    expect(UpdateTicketSchema.safeParse({ ...update, version: 0 }).success).toBe(false);
  });
  it("applique la pagination par defaut et la borne maximale", () => {
    expect(TicketQuerySchema.parse({}).pageSize).toBe(20);
    expect(TicketQuerySchema.safeParse({ pageSize: 101 }).success).toBe(false);
  });
  it("exige une version pour eviter les mises a jour concurrentes silencieuses", () => {
    expect(ChangeStatusSchema.safeParse({ status: "RESOLVED" }).success).toBe(false);
  });
});

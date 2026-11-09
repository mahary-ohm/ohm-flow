import { describe, expect, it } from "vitest";
import { ChangeStatusSchema, CreateTicketSchema, TicketQuerySchema } from "@ohmflow/shared";

describe("validation des contrats de tickets", () => {
  it("refuse les tickets trop courts", () => {
    expect(CreateTicketSchema.safeParse({ title: "ok", description: "short" }).success).toBe(false);
  });
  it("applique la pagination par defaut et la borne maximale", () => {
    expect(TicketQuerySchema.parse({}).pageSize).toBe(20);
    expect(TicketQuerySchema.safeParse({ pageSize: 101 }).success).toBe(false);
  });
  it("exige une version pour eviter les mises a jour concurrentes silencieuses", () => {
    expect(ChangeStatusSchema.safeParse({ status: "RESOLVED" }).success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { statusTransitions } from "@ohmflow/shared";
import { buildTicketListWhere, ticketVisibilityScope } from "./ticket-scope.js";

const user = { id: "user-1", role: "USER" as const, cellId: "cell-1" };
const agent = { id: "agent-1", role: "AGENT" as const, cellId: null };
const admin = { id: "admin-1", role: "ADMIN" as const, cellId: null };

describe("périmètre de visibilité des tickets", () => {
  it("conserve le périmètre quand une recherche est appliquée", () => {
    const where = buildTicketListWhere(user, { q: "imprimante" });
    expect(where.AND).toEqual(expect.arrayContaining([ticketVisibilityScope(user)]));
    expect(where.OR).toBeUndefined();
  });

  it("conserve le périmètre de l'agent avec recherche, statut et disponibilité", () => {
    const where = buildTicketListWhere(agent, { q: "TCK", status: "OPEN", available: true });
    const conditions = where.AND as unknown[];
    expect(conditions[0]).toEqual(ticketVisibilityScope(agent));
    expect(conditions).toContainEqual({ status: "OPEN" });
    expect(conditions).toContainEqual({ OR: [{ assigneeId: null }, { assigneeId: "agent-1" }] });
    expect(conditions).toHaveLength(4);
  });

  it("ne restreint pas l'administrateur", () => {
    expect(ticketVisibilityScope(admin)).toEqual({});
  });
});

describe("transitions de statut", () => {
  it("ne propose jamais de transition vers le statut courant", () => {
    for (const [from, targets] of Object.entries(statusTransitions)) expect(targets).not.toContain(from);
  });
});

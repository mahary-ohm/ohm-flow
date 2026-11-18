import type { Prisma } from "@prisma/client";
import type { Role, TicketStatus } from "@ohmflow/shared";

type ScopeUser = { id: string; role: Role; cellId: string | null };

/** Tickets visibles par l'utilisateur selon son rôle. */
export function ticketVisibilityScope(user: ScopeUser): Prisma.TicketWhereInput {
  if (user.role === "ADMIN") return {};
  if (user.role === "USER") return { OR: [{ cellId: user.cellId ?? "" }, { creatorId: user.id }] };
  return { OR: [{ cell: { agents: { some: { agentId: user.id } } } }, { assigneeId: user.id }, { creatorId: user.id }] };
}

/**
 * Filtre de liste. Chaque critère est combiné dans un AND explicite afin qu'aucun
 * filtre (recherche, disponibilité) ne puisse écraser le périmètre de visibilité.
 */
export function buildTicketListWhere(
  user: ScopeUser,
  query: { q?: string; status?: TicketStatus; available?: boolean },
): Prisma.TicketWhereInput {
  const conditions: Prisma.TicketWhereInput[] = [ticketVisibilityScope(user)];
  if (query.status) conditions.push({ status: query.status });
  if (query.q) {
    conditions.push({
      OR: [
        { reference: { contains: query.q, mode: "insensitive" } },
        { title: { contains: query.q, mode: "insensitive" } },
        { pdlPce: { contains: query.q, mode: "insensitive" } },
        { haulogyTicketNumber: { contains: query.q, mode: "insensitive" } },
      ],
    });
  }
  if (query.available) conditions.push({ OR: [{ assigneeId: null }, { assigneeId: user.id }] });
  return { AND: conditions };
}

import "dotenv/config";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import session from "@fastify/session";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import argon2 from "argon2";
import { z, ZodError } from "zod";
import { ChangeStatusSchema, CommentSchema, CreateTicketCategorySchema, CreateTicketSchema, TicketQuerySchema, UpdateTicketCategorySchema, type Role, type TicketStatus } from "@ohmflow/shared";
import { prisma } from "./db.js";

declare module "@fastify/session" {
  interface FastifySessionObject {
    userId?: string;
    sessionVersion?: number;
  }
}

type AuthUser = { id: string; firstName: string; lastName: string; email: string; role: Role; cellId: string | null };
const safeUser = { select: { id: true, firstName: true, lastName: true, email: true, role: true, cellId: true } } as const;
declare module "fastify" {
  interface FastifyRequest { authUser: AuthUser | null }
}

const statusTransitions: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["WAITING", "RESOLVED", "OPEN"],
  WAITING: ["IN_PROGRESS", "RESOLVED", "OPEN"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: ["IN_PROGRESS"],
};

export async function buildServer() {
  const app = Fastify({ logger: true, trustProxy: true });
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) throw new Error("SESSION_SECRET doit contenir au moins 32 caracteres.");
  const webOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:3000").split(",").map((origin) => origin.trim());

  await app.register(helmet);
  await app.register(cors, {
    origin: (origin, callback) => {
      const localDevelopmentOrigin = process.env.NODE_ENV !== "production" && /^http:\/\/localhost:\d+$/.test(origin ?? "");
      callback(null, !origin || webOrigins.includes(origin) || localDevelopmentOrigin);
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  await app.register(cookie);
  await app.register(session, {
    secret: sessionSecret,
    cookieName: "ohmflow.sid",
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 8 * 60 * 60 * 1000 },
    saveUninitialized: false,
  });
  await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await app.register(swagger, { openapi: { info: { title: "OhmFlow API", version: "1.0.0" } } });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.decorateRequest("authUser", null);
  app.addHook("preHandler", async (request) => {
    if (!request.session.userId) return;
    const user = await prisma.user.findFirst({
      where: { id: request.session.userId, isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, cellId: true, sessionVersion: true },
    });
    if (!user || request.session.sessionVersion !== user.sessionVersion) {
      request.authUser = null;
      await request.session.destroy();
      return;
    }
    const { sessionVersion: _sessionVersion, ...authUser } = user;
    request.authUser = authUser;
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) return reply.code(400).send({ error: "Validation invalide", details: error.flatten() });
    app.log.error(error);
    const statusCode = error instanceof Error && "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
    return reply.code(statusCode).send({ error: statusCode < 500 && error instanceof Error ? error.message : "Erreur interne du serveur" });
  });

  const requireUser = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.authUser) return reply.code(401).send({ error: "Authentification requise" });
  };
  const requireRole = (...roles: Role[]) => async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.authUser) return reply.code(401).send({ error: "Authentification requise" });
    if (!roles.includes(request.authUser.role)) return reply.code(403).send({ error: "Permission insuffisante" });
  };
  const canAccessTicket = async (request: FastifyRequest, ticketId: string) => {
    const user = request.authUser;
    if (!user) return false;
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { cellId: true, creatorId: true, assigneeId: true } });
    if (!ticket) return false;
    if (user.role === "ADMIN") return true;
    if (user.role === "USER") return user.cellId === ticket.cellId || ticket.creatorId === user.id;
    if (ticket.assigneeId === user.id) return true;
    return !!(await prisma.agentCell.findUnique({ where: { agentId_cellId: { agentId: user.id, cellId: ticket.cellId } } }));
  };

  app.get("/health", async () => ({ status: "ok" }));
  app.post("/api/v1/auth/login", { config: { rateLimit: { max: 8, timeWindow: "15 minutes" } } }, async (request, reply) => {
    const input = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, input.password))) return reply.code(401).send({ error: "Adresse e-mail ou mot de passe incorrect" });
    await request.session.regenerate();
    request.session.userId = user.id;
    request.session.sessionVersion = user.sessionVersion;
    return { user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, cellId: user.cellId } };
  });
  app.post("/api/v1/auth/logout", { preHandler: requireUser }, async (request, reply) => {
    await request.session.destroy();
    reply.clearCookie("ohmflow.sid", { path: "/" });
    return reply.code(204).send();
  });
  app.get("/api/v1/auth/me", { preHandler: requireUser }, async (request) => ({ user: request.authUser }));

  app.get("/api/v1/dashboard", { preHandler: requireUser }, async (request) => {
    const user = request.authUser!;
    const scope = user.role === "ADMIN" ? {} : user.role === "USER" ? { OR: [{ cellId: user.cellId ?? "" }, { creatorId: user.id }] } : { OR: [{ cell: { agents: { some: { agentId: user.id } } } }, { assigneeId: user.id }] };
    const [total, open, inProgress, waiting, resolved, recent, unassigned, activeUsers] = await Promise.all([
      prisma.ticket.count({ where: scope }),
      prisma.ticket.count({ where: { ...scope, status: "OPEN" } }),
      prisma.ticket.count({ where: { ...scope, status: "IN_PROGRESS" } }),
      prisma.ticket.count({ where: { ...scope, status: "WAITING" } }),
      prisma.ticket.count({ where: { ...scope, status: "RESOLVED" } }),
      prisma.ticket.findMany({ where: scope, orderBy: { updatedAt: "desc" }, take: 8, include: { cell: { include: { service: true } }, category: true, creator: safeUser, assignee: safeUser } }),
      user.role === "ADMIN" || user.role === "AGENT" ? prisma.ticket.count({ where: { ...scope, status: "OPEN", assigneeId: null } }) : Promise.resolve(0),
      user.role === "ADMIN" ? prisma.user.count({ where: { isActive: true } }) : Promise.resolve(null),
    ]);
    return { metrics: { total, open, inProgress, waiting, resolved, unassigned, activeUsers }, recent };
  });

  app.get("/api/v1/tickets", { preHandler: requireUser }, async (request) => {
    const query = TicketQuerySchema.parse(request.query);
    const user = request.authUser!;
    const scope = user.role === "ADMIN" ? {} : user.role === "USER" ? { OR: [{ cellId: user.cellId ?? "" }, { creatorId: user.id }] } : { OR: [{ cell: { agents: { some: { agentId: user.id } } } }, { assigneeId: user.id }] };
    const where = {
      ...scope,
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { OR: [{ reference: { contains: query.q, mode: "insensitive" as const } }, { title: { contains: query.q, mode: "insensitive" as const } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.ticket.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: { cell: { include: { service: true } }, category: true, creator: safeUser, assignee: safeUser } }),
      prisma.ticket.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  });

  app.post("/api/v1/tickets", { preHandler: requireRole("USER") }, async (request, reply) => {
    const input = CreateTicketSchema.parse(request.body);
    const user = request.authUser!;
    const activeCell = await prisma.cell.findFirst({ where: { id: input.cellId, isActive: true, service: { isActive: true } } });
    if (!activeCell) return reply.code(400).send({ error: "La cellule choisie est introuvable ou inactive" });
    const activeCategory = await prisma.ticketCategory.findFirst({ where: { id: input.categoryId, isActive: true } });
    if (!activeCategory) return reply.code(400).send({ error: "La catégorie choisie est introuvable ou inactive" });
    const created = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const counter = await tx.ticketReferenceCounter.upsert({ where: { year }, create: { year, next: 1 }, update: { next: { increment: 1 } } });
      const ticket = await tx.ticket.create({ data: { ...input, reference: `TCK-${year}-${String(counter.next).padStart(5, "0")}`, creatorId: user.id }, include: { cell: { include: { service: true } }, category: true, creator: safeUser } });
      await tx.ticketStatusHistory.create({ data: { ticketId: ticket.id, actorId: user.id, to: "OPEN" } });
      return ticket;
    });
    return reply.code(201).send({ ticket: created });
  });

  app.get("/api/v1/tickets/:id", { preHandler: requireUser }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    if (!(await canAccessTicket(request, id))) return reply.code(404).send({ error: "Ticket introuvable" });
    return { ticket: await prisma.ticket.findUnique({ where: { id }, include: { cell: { include: { service: true } }, category: true, creator: safeUser, assignee: safeUser, statusHistory: { orderBy: { createdAt: "asc" }, include: { actor: safeUser } }, assignmentHistory: { orderBy: { createdAt: "asc" }, include: { actor: safeUser } }, comments: { orderBy: { createdAt: "asc" }, include: { author: safeUser } } } }) };
  });

  app.post("/api/v1/tickets/:id/claim", { preHandler: requireRole("AGENT") }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const user = request.authUser!;
    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findFirst({ where: { id, cell: { agents: { some: { agentId: user.id } } } } });
      if (!ticket) return { error: "Ticket introuvable", status: 404 } as const;
      if (ticket.assigneeId) return { error: "Ce ticket est deja attribue", status: 409 } as const;
      if (ticket.status !== "OPEN") return { error: "Seuls les tickets ouverts peuvent etre pris en charge", status: 409 } as const;
      const updated = await tx.ticket.updateMany({ where: { id, assigneeId: null, version: ticket.version }, data: { assigneeId: user.id, status: "IN_PROGRESS", version: { increment: 1 } } });
      if (!updated.count) return { error: "Le ticket vient d'etre pris en charge", status: 409 } as const;
      await tx.ticketAssignmentHistory.create({ data: { ticketId: id, actorId: user.id, toId: user.id } });
      await tx.ticketStatusHistory.create({ data: { ticketId: id, actorId: user.id, from: ticket.status, to: "IN_PROGRESS" } });
      return { ticket: await tx.ticket.findUnique({ where: { id } }) } as const;
    });
    if ("error" in result) return reply.code(result.status ?? 500).send({ error: result.error });
    return { ticket: result.ticket };
  });

  app.patch("/api/v1/tickets/:id/assignment", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const input = z.object({ agentId: z.string().nullable(), version: z.number().int().positive() }).parse(request.body);
    const actor = request.authUser!;
    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id } });
      if (!ticket) return { error: "Ticket introuvable", status: 404 } as const;
      if (ticket.version !== input.version) return { error: "Le ticket a ete modifie. Rechargez la page.", status: 409 } as const;
      if (input.agentId) {
        const eligible = await tx.agentCell.findFirst({ where: { agentId: input.agentId, cellId: ticket.cellId, agent: { role: "AGENT", isActive: true } } });
        if (!eligible) return { error: "Cet agent n'est pas actif ou autorise pour cette cellule", status: 400 } as const;
      }
      const changed = await tx.ticket.updateMany({ where: { id, version: input.version }, data: { assigneeId: input.agentId, ...(input.agentId && ticket.status === "OPEN" ? { status: "IN_PROGRESS" as const } : {}), version: { increment: 1 } } });
      if (!changed.count) return { error: "Le ticket a ete modifie simultanement", status: 409 } as const;
      await tx.ticketAssignmentHistory.create({ data: { ticketId: id, actorId: actor.id, fromId: ticket.assigneeId, toId: input.agentId } });
      if (input.agentId && ticket.status === "OPEN") await tx.ticketStatusHistory.create({ data: { ticketId: id, actorId: actor.id, from: ticket.status, to: "IN_PROGRESS", comment: "Affectation par un administrateur" } });
      return { ticket: await tx.ticket.findUnique({ where: { id }, include: { assignee: safeUser } }) } as const;
    });
    if ("error" in result) return reply.code(result.status ?? 500).send({ error: result.error });
    return { ticket: result.ticket };
  });

  app.patch("/api/v1/tickets/:id/status", { preHandler: requireRole("ADMIN", "AGENT") }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const input = ChangeStatusSchema.parse(request.body);
    const user = request.authUser!;
    if (!(await canAccessTicket(request, id))) return reply.code(404).send({ error: "Ticket introuvable" });
    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id } });
      if (!ticket) return { error: "Ticket introuvable", status: 404 } as const;
      if (ticket.version !== input.version) return { error: "Le ticket a ete modifie. Rechargez la page.", status: 409 } as const;
      if (user.role === "AGENT" && ticket.assigneeId !== user.id) return { error: "Seul l'agent responsable peut modifier le statut", status: 403 } as const;
      if (!statusTransitions[ticket.status].includes(input.status)) return { error: `Transition ${ticket.status} vers ${input.status} interdite`, status: 409 } as const;
      const changed = await tx.ticket.updateMany({ where: { id, version: input.version }, data: { status: input.status, resolvedAt: input.status === "RESOLVED" ? new Date() : null, version: { increment: 1 } } });
      if (!changed.count) return { error: "Le ticket a ete modifie simultanement", status: 409 } as const;
      await tx.ticketStatusHistory.create({ data: { ticketId: id, actorId: user.id, from: ticket.status, to: input.status, comment: input.comment } });
      return { ticket: await tx.ticket.findUnique({ where: { id } }) } as const;
    });
    if ("error" in result) return reply.code(result.status ?? 500).send({ error: result.error });
    return { ticket: result.ticket };
  });

  app.get("/api/v1/tickets/:id/comments", { preHandler: requireUser }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    if (!(await canAccessTicket(request, id))) return reply.code(404).send({ error: "Ticket introuvable" });
    return { items: await prisma.ticketComment.findMany({ where: { ticketId: id }, orderBy: { createdAt: "asc" }, include: { author: safeUser } }) };
  });
  app.post("/api/v1/tickets/:id/comments", { preHandler: requireRole("ADMIN", "AGENT") }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { content } = CommentSchema.parse(request.body);
    if (!(await canAccessTicket(request, id))) return reply.code(404).send({ error: "Ticket introuvable" });
    return reply.code(201).send({ comment: await prisma.ticketComment.create({ data: { ticketId: id, authorId: request.authUser!.id, content }, include: { author: safeUser } }) });
  });

  app.get("/api/v1/services", { preHandler: requireUser }, async (request) => ({ items: await prisma.service.findMany({ where: request.authUser?.role === "ADMIN" ? {} : { isActive: true }, orderBy: { name: "asc" }, include: { cells: { where: request.authUser?.role === "ADMIN" ? {} : { isActive: true } } } }) }));
  app.get("/api/v1/ticket-categories", { preHandler: requireUser }, async (request) => ({ items: await prisma.ticketCategory.findMany({ where: request.authUser?.role === "ADMIN" ? {} : { isActive: true }, orderBy: { name: "asc" } }) }));
  app.post("/api/v1/ticket-categories", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const input = CreateTicketCategorySchema.parse(request.body);
    return reply.code(201).send({ category: await prisma.ticketCategory.create({ data: input }) });
  });
  app.patch("/api/v1/ticket-categories/:id", { preHandler: requireRole("ADMIN") }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const input = UpdateTicketCategorySchema.parse(request.body);
    return { category: await prisma.ticketCategory.update({ where: { id }, data: input }) };
  });
  app.get("/api/v1/users", { preHandler: requireRole("ADMIN") }, async (request) => {
    const query = z.object({ q: z.string().optional(), role: z.enum(["ADMIN", "USER", "AGENT"]).optional(), page: z.coerce.number().int().min(1).default(1) }).parse(request.query);
    const where = { ...(query.role ? { role: query.role } : {}), ...(query.q ? { OR: [{ firstName: { contains: query.q, mode: "insensitive" as const } }, { lastName: { contains: query.q, mode: "insensitive" as const } }, { email: { contains: query.q, mode: "insensitive" as const } }] } : {}) };
    const [items, total] = await Promise.all([prisma.user.findMany({ where, skip: (query.page - 1) * 25, take: 25, orderBy: { lastName: "asc" }, select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true, cell: true, agentCells: { include: { cell: true } }, createdAt: true, updatedAt: true } }), prisma.user.count({ where })]);
    return { items, total, page: query.page, pageSize: 25 };
  });
  app.post("/api/v1/users", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const input = z.object({ firstName: z.string().min(1), lastName: z.string().min(1), email: z.string().email(), password: z.string().min(12), role: z.enum(["ADMIN", "USER", "AGENT"]), cellId: z.string().optional(), agentCellIds: z.array(z.string()).default([]) }).parse(request.body);
    if (input.role === "USER" && !input.cellId) return reply.code(400).send({ error: "Un utilisateur doit etre rattache a une cellule" });
    if (input.role === "AGENT" && !input.agentCellIds.length) return reply.code(400).send({ error: "Un agent doit etre autorise sur au moins une cellule" });
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { firstName: input.firstName, lastName: input.lastName, email: input.email.toLowerCase(), passwordHash, role: input.role, cellId: input.cellId } });
      if (input.role === "AGENT" && input.agentCellIds.length) await tx.agentCell.createMany({ data: input.agentCellIds.map((cellId) => ({ agentId: user.id, cellId })) });
      return user;
    });
    return reply.code(201).send({ user: { id: created.id, firstName: created.firstName, lastName: created.lastName, email: created.email, role: created.role, cellId: created.cellId } });
  });
  app.patch("/api/v1/users/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const input = z.object({ firstName: z.string().min(1).optional(), lastName: z.string().min(1).optional(), email: z.string().email().optional(), role: z.enum(["ADMIN", "USER", "AGENT"]).optional(), cellId: z.string().nullable().optional(), isActive: z.boolean().optional(), agentCellIds: z.array(z.string()).optional(), newPassword: z.string().min(12).max(128).optional(), confirmNewPassword: z.string().max(128).optional() }).superRefine((data, context) => {
      if (data.newPassword && data.newPassword !== data.confirmNewPassword) context.addIssue({ code: "custom", path: ["confirmNewPassword"], message: "La confirmation du mot de passe ne correspond pas" });
      if (!data.newPassword && data.confirmNewPassword) context.addIssue({ code: "custom", path: ["newPassword"], message: "Saisissez le nouveau mot de passe" });
    }).parse(request.body);
    const newPasswordHash = input.newPassword ? await argon2.hash(input.newPassword, { type: argon2.argon2id }) : undefined;
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id } });
      if (!current) return { error: "Utilisateur introuvable", status: 404 } as const;
      if (current.role === "ADMIN" && current.isActive && ((input.isActive === false) || (input.role && input.role !== "ADMIN"))) {
        const admins = await tx.user.count({ where: { role: "ADMIN", isActive: true } });
        if (admins <= 1) return { error: "Impossible de desactiver ou retrograder le dernier administrateur actif", status: 409 } as const;
      }
      if ((input.role ?? current.role) === "USER" && !(input.cellId ?? current.cellId)) return { error: "Un utilisateur doit etre rattache a une cellule", status: 400 } as const;
      if ((input.role ?? current.role) === "AGENT" && !input.agentCellIds) {
        const assignments = await tx.agentCell.count({ where: { agentId: id } });
        if (assignments === 0) return { error: "Un agent doit etre autorise sur au moins une cellule", status: 400 } as const;
      }
      if ((input.role ?? current.role) === "AGENT" && input.agentCellIds?.length === 0) return { error: "Un agent doit etre autorise sur au moins une cellule", status: 400 } as const;
      const { agentCellIds, newPassword: _newPassword, confirmNewPassword: _confirmNewPassword, ...profileChanges } = input;
      const user = await tx.user.update({ where: { id }, data: { ...profileChanges, ...(profileChanges.email ? { email: profileChanges.email.toLowerCase() } : {}), ...(newPasswordHash ? { passwordHash: newPasswordHash, sessionVersion: { increment: 1 } } : {}) } });
      if (agentCellIds) {
        await tx.agentCell.deleteMany({ where: { agentId: id } });
        if (agentCellIds.length && (input.role ?? current.role) === "AGENT") await tx.agentCell.createMany({ data: agentCellIds.map((cellId) => ({ agentId: id, cellId })) });
      }
      return { user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, isActive: user.isActive, cellId: user.cellId } } as const;
    });
    if ("error" in result) return reply.code(result.status ?? 500).send({ error: result.error });
    return result;
  });
  app.delete("/api/v1/users/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return reply.code(404).send({ error: "Utilisateur introuvable" });
    if (user.role === "ADMIN" && user.isActive && await prisma.user.count({ where: { role: "ADMIN", isActive: true } }) <= 1) return reply.code(409).send({ error: "Impossible de desactiver le dernier administrateur actif" });
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    return reply.code(204).send();
  });

  app.get("/api/v1/cells", { preHandler: requireUser }, async () => ({ items: await prisma.cell.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, include: { service: true } }) }));
  app.post("/api/v1/services", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const input = z.object({ name: z.string().trim().min(2), description: z.string().max(1000).optional() }).parse(request.body);
    return reply.code(201).send({ service: await prisma.service.create({ data: input }) });
  });
  app.patch("/api/v1/services/:id", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const input = z.object({ name: z.string().trim().min(2).optional(), description: z.string().max(1000).nullable().optional(), isActive: z.boolean().optional() }).parse(request.body);
    return { service: await prisma.service.update({ where: { id }, data: input }) };
  });
  app.post("/api/v1/cells", { preHandler: requireRole("ADMIN") }, async (request, reply) => {
    const input = z.object({ name: z.string().trim().min(2), description: z.string().max(1000).optional(), serviceId: z.string() }).parse(request.body);
    return reply.code(201).send({ cell: await prisma.cell.create({ data: input }) });
  });
  app.patch("/api/v1/cells/:id", { preHandler: requireRole("ADMIN") }, async (request) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const input = z.object({ name: z.string().trim().min(2).optional(), description: z.string().max(1000).nullable().optional(), serviceId: z.string().optional(), isActive: z.boolean().optional() }).parse(request.body);
    return { cell: await prisma.cell.update({ where: { id }, data: input }) };
  });

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.API_PORT ?? 4000);
  buildServer().then((app) => app.listen({ port, host: "0.0.0.0" })).catch((error: unknown) => { console.error(error); process.exit(1); });
}

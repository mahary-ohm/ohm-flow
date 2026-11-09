import { z } from "zod";

export const RoleSchema = z.enum(["ADMIN", "USER", "AGENT"]);
export const TicketStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]);
export const TicketQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: TicketStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const CreateTicketSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(10000),
});
export const ChangeStatusSchema = z.object({
  status: TicketStatusSchema,
  comment: z.string().trim().max(2000).optional(),
  version: z.number().int().positive(),
});
export const CommentSchema = z.object({ content: z.string().trim().min(1).max(4000) });

export type Role = z.infer<typeof RoleSchema>;
export type TicketStatus = z.infer<typeof TicketStatusSchema>;
export type CreateTicketInput = z.infer<typeof CreateTicketSchema>;

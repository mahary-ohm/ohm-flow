import { z } from "zod";

export const RoleSchema = z.enum(["ADMIN", "USER", "AGENT"]);
export const TicketStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED"]);
export const statusTransitions: Record<z.infer<typeof TicketStatusSchema>, z.infer<typeof TicketStatusSchema>[]> = {
  OPEN: ["IN_PROGRESS"],
  IN_PROGRESS: ["WAITING", "RESOLVED", "OPEN"],
  WAITING: ["IN_PROGRESS", "RESOLVED", "OPEN"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: ["IN_PROGRESS"],
};
export const TicketQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: TicketStatusSchema.optional(),
  available: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
/** Texte facultatif : une valeur vide est enregistrée comme null. */
const optionalReference = z.string().trim().max(50).nullish().transform((value) => value || null);
export const CreateTicketSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(10000),
  cellId: z.string().min(1),
  categoryId: z.string().min(1),
  grdId: z.string().min(1, "Choisissez un GRD"),
  pdlPce: optionalReference,
  haulogyTicketNumber: optionalReference,
});
export const CreateTicketCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
});
export const UpdateTicketSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(10000),
  cellId: z.string().min(1),
  categoryId: z.string().min(1),
  grdId: z.string().min(1, "Choisissez un GRD"),
  pdlPce: optionalReference,
  haulogyTicketNumber: optionalReference,
  version: z.number().int().positive(),
});
export const CreateGrdSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
});
export const UpdateGrdSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});
export const UpdateTicketCategorySchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
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

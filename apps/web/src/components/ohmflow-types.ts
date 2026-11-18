import type { Role, TicketStatus } from "@ohmflow/shared";

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  cellId: string | null;
};

export type Ticket = {
  id: string;
  reference: string;
  title: string;
  description: string;
  status: TicketStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  /** Fixée par l'API au passage en « Résolu », conservée à la clôture. */
  resolvedAt: string | null;
  cellId: string;
  cell: { name: string; service: { name: string } };
  categoryId: string | null;
  category: { id: string; name: string } | null;
  grdId: string | null;
  grd: { id: string; name: string } | null;
  pdlPce: string | null;
  haulogyTicketNumber: string | null;
  creator: { id: string; firstName: string; lastName: string };
  assignee?: { id: string; firstName: string; lastName: string } | null;
};

export type Metrics = {
  total: number;
  open: number;
  inProgress: number;
  waiting: number;
  resolved: number;
  unassigned: number;
  activeUsers: number | null;
};

export type TicketDetail = Ticket & {
  statusHistory: {
    id: string;
    from: TicketStatus | null;
    to: TicketStatus;
    comment?: string | null;
    createdAt: string;
    actor: User;
  }[];
  comments: { id: string; content: string; createdAt: string; author: User }[];
};

export type View =
  | "dashboard"
  | "tickets"
  | "new"
  | "agents"
  | "users"
  | "services"
  | "categories"
  | "grds"
  | "profile";

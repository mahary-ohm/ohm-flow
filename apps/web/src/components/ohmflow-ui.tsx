import { Activity, ClipboardList } from "lucide-react";
import type { Role, TicketStatus } from "@ohmflow/shared";
import type { User } from "./ohmflow-types";

export { api } from "../lib/api";

export const labels: Record<TicketStatus, string> = {
  OPEN: "À traiter",
  IN_PROGRESS: "En cours",
  WAITING: "En attente",
  RESOLVED: "Résolu",
  CLOSED: "Clôturé",
};

export const roleNames: Record<Role, string> = {
  ADMIN: "Administrateur",
  USER: "Collaborateur",
  AGENT: "Agent de traitement",
};

export const dateShort = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export const initials = (user: User) =>
  `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

export function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <Activity size={19} />
      </div>
      <div>
        <div className="brand-name">OhmFlow</div>
        <div className="brand-sub">ESPACE SUPPORT</div>
      </div>
    </div>
  );
}

export function Status({ status }: { status: TicketStatus }) {
  return <span className={`status status-${status}`}>{labels[status]}</span>;
}

export function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <ClipboardList />
      </div>
      <strong>{title}</strong>
      {text && <div style={{ marginTop: 5 }}>{text}</div>}
    </div>
  );
}
